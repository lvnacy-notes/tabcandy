/**
 * Computes an overlay text color that visually matches the active
 * background image's own dominant color, rather than a fixed neutral
 * literal.
 *
 * Deliberately has no dependency on `obsidian`, `SettingsStore`, or
 * `TabCandySettings` - everything here is pure math (color-space
 * conversion, histogram/weighting, contrast adjustment) or, for
 * `computeOverlayContrast()` alone, browser Canvas/Image APIs. Vault
 * access, cache persistence, and settings live in `hooks.ts`
 * (`useOverlayContrast()`) and `backgrounds.ts`
 * (`pruneStaleOverlayContrastCache()`) instead - partly for separation of
 * concerns, partly to avoid a real import cycle: `types.ts` needs
 * `OverlayContrastResult` for `TabCandySettings['overlayTextContrastCache']`,
 * and `SettingsStore`/`TabCandySettings` both live upstream of this file.
 */

export interface OverlayContrastResult {
	dominantColor: string;
	overlayTextColor: string;
}

export type OverlayContrastCacheEntry = { mtime: number } & OverlayContrastResult;
export type OverlayContrastCache = Record<string, OverlayContrastCacheEntry>;

interface RGB {
	r: number;
	g: number;
	b: number;
}

interface HSL {
	h: number;
	s: number;
	l: number;
}

/**
 * The image is downsampled to this square size before sampling - a
 * color/brightness heuristic, not a precision task, so this stays cheap
 * regardless of the source image's real resolution (§5.2 step 1).
 */
const SAMPLE_SIZE = 32;

/**
 * Quantization bucket size for the dominant-color histogram (§5.2 step: RGB 
 * channels are grouped into buckets of this width before counting, so near-
 * identical shades of the same color collapse into one bucket instead of 
 * splitting weight across dozens of 1-off buckets.
 */
const QUANTIZE_BUCKET = 32;

/**
 * Pixels below this saturation are still counted, but at LOW_SATURATION_WEIGHT
 * rather than their own (low) saturation - this is the "still returns a
 * dominant color, not empty/undefined" floor for a uniformly low-saturation
 * image (§7), not a difference that matters much once a genuinely saturated
 * color is anywhere in the frame.
 */
const SATURATION_FLOOR = 0.15;
const LOW_SATURATION_WEIGHT = 0.1;

/**
 * Fallback dominant/overlay color, used only when there's no Canvas 2D context
 * to sample from. This exists so the feature never breaks the new tab page 
 * outright.
 */
export const DEFAULT_OVERLAY_COLOR = '#dadada';

/**
 * Perceived-brightness (0-255) threshold used both to pick the contrast
 * direction (darken a dominant color against a bright background, lighten it
 * against a dark one) and to choose which legibility-floor literal to fall
 * back to.
 */
const CONTRAST_MID_BRIGHTNESS = 128;

/**
 * How far apart (in perceived-brightness units, 0-255) the adjusted color and
 * the background's average brightness need to land before adjustForContrast()
 * calls it "legible enough" and stops stepping. A starting point, not a
 * finalized constant.
 */
const CONTRAST_MARGIN = 110;

/** Lightness is only ever nudged within this range - a fully-clamped black or
 * white overlay text is its own legibility problem against *any* background.
 */
const L_MIN = 0.1;
const L_MAX = 0.9;
const L_STEP = 0.05;
const MAX_ADJUST_STEPS = Math.ceil((L_MAX - L_MIN) / L_STEP) + 1;

/**
 * Legibility-floor literals: #dadada for light text on a dark background, or a
 * dark literal for the opposite. Exact dark value is another §9 open item - 
 * #1a1a1a is a reasonable starting point, not a finalized brand color.
 */
const LEGIBILITY_FLOOR_LIGHT = '#dadada';
const LEGIBILITY_FLOOR_DARK = '#1a1a1a';

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/**
 * 0.299R + 0.587G + 0.114B - the "average perceived brightness" measure,
 * reused as-is for both the background's own average and any candidate
 * adjusted color's brightness.
 */
function perceivedBrightness(r: number, g: number, b: number): number {
	return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Standard RGB (0-255 per channel) to HSL (h/s/l each 0-1) conversion.
 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
	const rNorm = r / 255;
	const gNorm = g / 255;
	const bNorm = b / 255;
	const max = Math.max(rNorm, gNorm, bNorm);
	const min = Math.min(rNorm, gNorm, bNorm);
	const l = (max + min) / 2;

	if (max === min) {
		return { h: 0, s: 0, l };
	}

	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

	let h: number;
	switch (max) {
		case rNorm:
			h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
			break;
		case gNorm:
			h = (bNorm - rNorm) / d + 2;
			break;
		default:
			h = (rNorm - gNorm) / d + 4;
			break;
	}

	return { h: h / 6, s, l };
}

/**
 * Inverse of rgbToHsl() - HSL (each 0-1) back to RGB (each 0-255, rounded).
 * What adjustForContrast() uses to re-render a color after nudging only its L
 * channel.
 */
export function hslToRgb(h: number, s: number, l: number): RGB {
	if (s === 0) {
		const value = Math.round(l * 255);
		return { r: value, g: value, b: value };
	}

	const hue2rgb = (p: number, q: number, t: number): number => {
		let tNorm = t;
		if (tNorm < 0) {tNorm += 1;}
		if (tNorm > 1) {tNorm -= 1;}
		if (tNorm < 1 / 6) {return p + (q - p) * 6 * tNorm;}
		if (tNorm < 1 / 2) {return q;}
		if (tNorm < 2 / 3) {return p + (q - p) * (2 / 3 - tNorm) * 6;}
		return p;
	};

	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;

	return {
		r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
		g: Math.round(hue2rgb(p, q, h) * 255),
		b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
	};
}

/**
 * RGB (each 0-255) to a `#rrggbb` hex string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
	const channel = (value: number) =>
		Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0');
	return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/**
 * Quantizes sampled pixel data into a weighted color histogram and returns the
 * winning bucket's average color, plus the average perceived brightness across
 * every sampled pixel; fed into adjustForContrast() below, not returned to the
 * caller directly.
 *
 * `data` is exactly what `CanvasRenderingContext2D.getImageData().data`
 * returns (RGBA, one pixel per 4 entries) - accepting the raw typed array
 * rather than an `ImageData` object is what makes this testable against hand-
 * built pixel data without a real Canvas 2D implementation (see 
 * overlayContrast.test.ts and the Testing Specification's Trust Boundaries:
 * test the math against known pixel data, never getImageData()/Canvas
 * itself).
 */
export function computeDominantColorAndBrightness(
	data: Uint8ClampedArray | number[]
): { dominant: RGB; averageBrightness: number } {
	interface Bucket {
		weight: number;
		r: number;
		g: number;
		b: number;
		count: number;
	}

	const buckets = new Map<string, Bucket>();
	let brightnessTotal = 0;
	const pixelCount = data.length / 4;

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];

		brightnessTotal += perceivedBrightness(r, g, b);

		const { s } = rgbToHsl(r, g, b);
		const weight = s < SATURATION_FLOOR ? LOW_SATURATION_WEIGHT : s;

		const key = [r, g, b]
			.map((channel) => Math.round(channel / QUANTIZE_BUCKET))
			.join(',');

		const bucket = buckets.get(key) ?? { weight: 0, r: 0, g: 0, b: 0, count: 0 };
		bucket.weight += weight;
		bucket.r += r;
		bucket.g += g;
		bucket.b += b;
		bucket.count += 1;
		buckets.set(key, bucket);
	}

	// Fallback if `data` was empty - shouldn't happen for a real sampled
	// canvas (SAMPLE_SIZE x SAMPLE_SIZE is never zero pixels), but keeps
	// this pure function total rather than throwing on malformed input.
	let dominant: RGB = { r: 218, g: 218, b: 218 };
	let bestWeight = -1;

	for (const bucket of buckets.values()) {
		if (bucket.weight > bestWeight) {
			bestWeight = bucket.weight;
			dominant = {
				r: bucket.r / bucket.count,
				g: bucket.g / bucket.count,
				b: bucket.b / bucket.count,
			};
		}
	}

	return {
		dominant,
		averageBrightness: pixelCount > 0 ? brightnessTotal / pixelCount : 0,
	};
}

/**
 * Nudges `dominant`'s lightness (hue and saturation untouched) toward the
 * opposite end of the brightness spectrum from `averageBrightness`, stopping
 * as soon as the adjusted color's own perceived brightness clears
 * CONTRAST_MARGIN against it. Falls back to a flat legibility-floor literal
 * if the clamped L range (L_MIN-L_MAX) is exhausted without ever clearing the
 * margin - rare, but the whole point of clamping is that it's possible.
 */
export function adjustForContrast(dominant: RGB, averageBrightness: number): string {
	const { h, s, l } = rgbToHsl(dominant.r, dominant.g, dominant.b);
	const darken = averageBrightness >= CONTRAST_MID_BRIGHTNESS;
	const step = darken ? -L_STEP : L_STEP;

	let currentL = clamp(l, L_MIN, L_MAX);

	for (let i = 0; i <= MAX_ADJUST_STEPS; i++) {
		const { r, g, b } = hslToRgb(h, s, currentL);
		const brightness = perceivedBrightness(r, g, b);

		if (Math.abs(brightness - averageBrightness) >= CONTRAST_MARGIN) {
			return rgbToHex(r, g, b);
		}

		const nextL = clamp(currentL + step, L_MIN, L_MAX);
		if (nextL === currentL) {
			// Hit the clamp with no room left to move in this direction -
			// stop rather than spinning through the remaining steps with no
			// possible outcome.
			break;
		}
		currentL = nextL;
	}

	return darken ? LEGIBILITY_FLOOR_DARK : LEGIBILITY_FLOOR_LIGHT;
}

/**
 * Combines dominant-color extraction and contrast adjustment against raw pixel
 * data, without touching Canvas/Image at all. This is the function
 * overlayContrast.test.ts's "synthetic canvas" cases actually call -
 * `computeOverlayContrast()` below is a thin wrapper around this plus the real
 * (untestable-in-this-environment) Canvas/Image plumbing.
 */
export function computeOverlayContrastFromPixelData(
	data: Uint8ClampedArray | number[]
): OverlayContrastResult {
	const { dominant, averageBrightness } = computeDominantColorAndBrightness(data);
	return {
		dominantColor: rgbToHex(dominant.r, dominant.g, dominant.b),
		overlayTextColor: adjustForContrast(dominant, averageBrightness),
	};
}

function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () =>
			reject(new Error(`Tab Candy: failed to load image for overlay contrast: ${url}`));
		img.src = url;
	});
}

/**
 * Draws `imageUrl` downsampled to a small offscreen canvas, samples it, and
 * returns the dominant color plus a contrast-adjusted overlay text color.
 *
 * The Canvas 2D context is created (and checked) *before* loading the image,
 * not after - there's no point paying the decode cost for an image this
 * environment cannott process anyway, and because it means the "no Canvas 2D
 * available" fail-open branch doesn't depend on an image load ever completing.
 * jsdom (and this project's Vitest environment) has no real Canvas 2D
 * implementation and no `canvas` npm package installed, nor should one be
 * added, so `getContext('2d')` always returns null in tests - this branch is
 * also the only part of this function automated tests can exercise directly.
 */
export async function computeOverlayContrast(imageUrl: string): Promise<OverlayContrastResult> {
	const canvas = createFragment().createEl('canvas');
	canvas.width = SAMPLE_SIZE;
	canvas.height = SAMPLE_SIZE;
	const ctx = canvas.getContext('2d');

	if (!ctx) {
		return { dominantColor: DEFAULT_OVERLAY_COLOR, overlayTextColor: DEFAULT_OVERLAY_COLOR };
	}

	const img = await loadImage(imageUrl);
	ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
	const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

	return computeOverlayContrastFromPixelData(data);
}

/**
 * Looks up a still-fresh cache entry for `path`, keyed by the file's current
 * `mtime` - pure cache-shape logic with no vault access, kept here so
 * hooks.ts's useOverlayContrast() doesn't need to know the cache's internal
 * shape.
 */
export function getFreshCacheEntry(
	cache: OverlayContrastCache,
	path: string,
	mtime: number
): OverlayContrastCacheEntry | null {
	const entry = cache[path];
	return entry?.mtime === mtime ? entry : null;
}
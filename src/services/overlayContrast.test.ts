import {
	describe,
	expect,
	it,
} from 'vitest';
import {
	adjustForContrast,
	computeDominantColorAndBrightness,
	computeOverlayContrast,
	computeOverlayContrastFromPixelData,
	DEFAULT_OVERLAY_COLOR,
	getFreshCacheEntry,
	hslToRgb,
	rgbToHex,
	rgbToHsl,
} from './overlayContrast';

/**
 * Builds a flat RGBA pixel array (what `getImageData().data` returns) out of a
 * list of `{ r, g, b, count }` groups - the "synthetic canvas" data the
 * Testing Specification's Trust Boundaries call for: this tests the math
 * against known pixel data, never getImageData()/Canvas itself.
 */
function buildPixelData(groups: { r: number; g: number; b: number; count: number }[]): Uint8ClampedArray {
	const pixels: number[] = [];
	for (const { r, g, b, count } of groups) {
		for (let i = 0; i < count; i++) {
			pixels.push(r, g, b, 255);
		}
	}
	return new Uint8ClampedArray(pixels);
}

describe('rgbToHsl / hslToRgb', () => {
	it('converts pure red', () => {
		expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 1, l: 0.5 });
	});

	it('converts pure white to zero saturation, full lightness', () => {
		expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 1 });
	});

	it('converts pure black to zero saturation, zero lightness', () => {
		expect(rgbToHsl(0, 0, 0)).toEqual({ h: 0, s: 0, l: 0 });
	});

	it('round-trips a saturated color through rgbToHsl and back', () => {
		const { h, s, l } = rgbToHsl(200, 80, 40);
		expect(hslToRgb(h, s, l)).toEqual({ r: 200, g: 80, b: 40 });
	});

	it('round-trips a gray through rgbToHsl and back', () => {
		const { h, s, l } = rgbToHsl(120, 120, 120);
		expect(hslToRgb(h, s, l)).toEqual({ r: 120, g: 120, b: 120 });
	});
});

describe('rgbToHex', () => {
	it('formats each channel as two lowercase hex digits', () => {
		expect(rgbToHex(218, 218, 218)).toBe('#dadada');
	});

	it('pads single-digit channel values with a leading zero', () => {
		expect(rgbToHex(0, 5, 255)).toBe('#0005ff');
	});

	it('rounds fractional channel values', () => {
		expect(rgbToHex(10.4, 10.5, 10.6)).toBe('#0a0b0b');
	});
});

describe('computeDominantColorAndBrightness', () => {
	it('returns the flat color and its own brightness for a solid-color image', () => {
		const data = buildPixelData([{ r: 40, g: 120, b: 200, count: 16 }]);

		const { dominant, averageBrightness } = computeDominantColorAndBrightness(data);

		expect(dominant).toEqual({ r: 40, g: 120, b: 200 });
		expect(averageBrightness).toBeCloseTo(0.299 * 40 + 0.587 * 120 + 0.114 * 200);
	});

	it('lets one clearly dominant saturated color win the histogram against a larger desaturated field', () => {
		/**
         * 20 desaturated gray pixels (weight 0.1 each -> total weight 2.0)
		 * outnumber 3 fully-saturated red pixels (weight 1.0 each -> total
		 * weight 3.0). The saturation-weighted histogram should still pick
		 * red, even though it's the minority by pixel count.
		 */
		const data = buildPixelData([
			{ r: 150, g: 150, b: 150, count: 20 },
			{ r: 255, g: 0, b: 0, count: 3 },
		]);

		const { dominant } = computeDominantColorAndBrightness(data);

		expect(dominant).toEqual({ r: 255, g: 0, b: 0 });
	});

	it('still returns a defined dominant color for a uniformly low-saturation image', () => {
		/**
         * Every pixel is desaturated, so every pixel is weighted identically
		 * (the SATURATION_FLOOR floor) - the more populous bucket should still
		 * win on raw count, and the result should never be empty/undefined
		 * just because nothing in the image is saturated.
		 */
		const data = buildPixelData([
			{ r: 100, g: 100, b: 100, count: 10 },
			{ r: 140, g: 140, b: 140, count: 4 },
		]);

		const { dominant } = computeDominantColorAndBrightness(data);

		expect(dominant).toEqual({ r: 100, g: 100, b: 100 });
	});
});

describe('adjustForContrast', () => {
	it('lightens a dominant color that starts too close to a dark background average', () => {
		const result = adjustForContrast({ r: 60, g: 60, b: 60 }, 30);

		expect(result).toBe('#959595');
	});

	it('darkens a dominant color that starts too close to a bright background average', () => {
		const result = adjustForContrast({ r: 190, g: 190, b: 190 }, 220);

		expect(result).toBe('#656565');
	});

	it('falls back to the legibility-floor literal when the clamped L range cannot reach the margin', () => {
		/**
         * Even lightened all the way to L_MAX, this dominant color's own
		 * brightness never gets far enough from averageBrightness to clear
		 * the contrast margin.
		 */
		const result = adjustForContrast({ r: 100, g: 100, b: 100 }, 125);

		expect(result).toBe('#dadada');
	});
});

describe('computeOverlayContrastFromPixelData', () => {
	it('produces a legible contrast-adjusted color for a solid black image', () => {
		const data = buildPixelData([{ r: 0, g: 0, b: 0, count: 4 }]);

		const result = computeOverlayContrastFromPixelData(data);

		expect(result).toEqual({ dominantColor: '#000000', overlayTextColor: '#737373' });
	});

	it('produces a legible contrast-adjusted color for a solid white image', () => {
		const data = buildPixelData([{ r: 255, g: 255, b: 255, count: 4 }]);

		const result = computeOverlayContrastFromPixelData(data);

		expect(result).toEqual({ dominantColor: '#ffffff', overlayTextColor: '#8c8c8c' });
	});

	it('falls back to a legibility-floor literal for a solid mid-gray image, the genuinely ambiguous case', () => {
		const data = buildPixelData([{ r: 128, g: 128, b: 128, count: 4 }]);

		const result = computeOverlayContrastFromPixelData(data);

		/**
         * Sitting exactly on CONTRAST_MID_BRIGHTNESS is the one genuinely
		 * ambiguous case: floating-point rounding on 0.299+0.587+0.114,
		 * a hair under 1.0, lands averageBrightness just under 128, so this
		 * resolves to the light floor rather than the dark one - asserted here
		 * so a future constant change doesn't silently flip it without a test
		 * noticing.
         */ 
		expect(result).toEqual({ dominantColor: '#808080', overlayTextColor: '#dadada' });
	});
});

describe('computeOverlayContrast', () => {
	/**
	 * jsdom (and this project's Vitest environment generally) has no real
	 * Canvas 2D implementation and no `canvas` npm package installed -
	 * `getContext('2d')` always returns null here, so this fail-open
	 * branch is the only part of computeOverlayContrast() an automated
	 * test can exercise directly.
	 */
	it('fails open to the default overlay color when no Canvas 2D context is available', async () => {
		const result = await computeOverlayContrast('app://local/anything.png');

		expect(result).toEqual({
			dominantColor: DEFAULT_OVERLAY_COLOR,
			overlayTextColor: DEFAULT_OVERLAY_COLOR,
		});
	});
});

describe('getFreshCacheEntry', () => {
	it('returns the entry when its mtime matches', () => {
		const cache = {
			'Backgrounds/sunset.png': { mtime: 100, dominantColor: '#111111', overlayTextColor: '#eeeeee' },
		};

		const result = getFreshCacheEntry(cache, 'Backgrounds/sunset.png', 100);

		expect(result).toEqual(cache['Backgrounds/sunset.png']);
	});

	it('returns null when the mtime has moved past what is cached', () => {
		const cache = {
			'Backgrounds/sunset.png': { mtime: 100, dominantColor: '#111111', overlayTextColor: '#eeeeee' },
		};

		const result = getFreshCacheEntry(cache, 'Backgrounds/sunset.png', 200);

		expect(result).toBeNull();
	});

	it('returns null when there is no entry for the path at all', () => {
		const result = getFreshCacheEntry({}, 'Backgrounds/missing.png', 100);

		expect(result).toBeNull();
	});
});
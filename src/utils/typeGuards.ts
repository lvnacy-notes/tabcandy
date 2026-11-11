const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Type guard for validating a raw string (e.g. from a DropdownComponent's
 * onChange, which Obsidian types as (value: string) => any regardless of
 * what options were added, or from data.json, which is arbitrary user/disk
 * data) against a specific settings enum before it's trusted as that
 * enum's type. Boundary validation instead of an unchecked cast, per the
 * refactor's settings-hardening plan.
 *
 * Shared by src/settings/SettingsTab.ts (live dropdown callbacks) and
 * src/settings/normalizeSettings.ts (load-time validation) so both
 * boundaries enforce the same rule with one implementation.
 */
export function isEnumValue<T extends Record<string, string>>(
	enumObject: T,
	value: string
): value is T[keyof T] {
	return (Object.values(enumObject)).includes(value);
}

/**
 * Narrows to a non-null, non-array object.
 *
 * @param value - Value to test.
 * @returns True when `value` is a non-null object and not an array.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * True when `value` is a `#rgb`, `#rrggbb` or `#rrggbbaa` hex color string.
 * A Cluster's Flavor is written straight into an inline CSS custom
 * property, so anything that isn't a plain hex color is rejected rather
 * than trusted.
 */
export function isHexColor(value: unknown): value is string {
	return typeof value === 'string' && HEX_COLOR.test(value);
}
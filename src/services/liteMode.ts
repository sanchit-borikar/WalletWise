/**
 * Lite mode helpers. Pure (no native imports) so they are unit tested; the screen
 * passes in Device.totalMemory from expo-device.
 */

const GIB = 1024 ** 3;

/**
 * Phones with about 4 GB of RAM or less get Lite mode suggested. Android reports a
 * bit less than the box says (a "4 GB" phone shows about 3.6 GiB), so the line is
 * drawn at 4.5 GiB. These are the ₹8,000 to ₹10,000 phones the feature is for.
 */
export const LOW_MEMORY_BYTES = 4.5 * GIB;

/** True when the phone's total memory is known and low. Unknown (null, web) is not low. */
export function isLowMemory(totalBytes: number | null | undefined): boolean {
  return typeof totalBytes === 'number' && totalBytes > 0 && totalBytes < LOW_MEMORY_BYTES;
}

/** Memory rounded to the nearest whole GB the way phone boxes state it ("4"). */
export function memoryGbLabel(totalBytes: number): string {
  return String(Math.max(1, Math.round(totalBytes / GIB)));
}

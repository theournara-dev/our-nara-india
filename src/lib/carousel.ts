/**
 * Shared helpers for Swiper carousels.
 */

/**
 * Swiper's loop mode needs enough slides, otherwise it disables loop, warns,
 * and clips slides (the right-hand slides can disappear). It warns when
 * `slides.length < slidesPerView + loopedSlides`, where (with `centeredSlides`)
 * `loopedSlides = max(1, ceil(slidesPerView / 2))`.
 *
 * `toLoopable` duplicates the list until it reaches that safe count so loop
 * renders cleanly regardless of how few items there are. Each entry is
 * returned with a unique `key` (originals keep their key, copies get a `-n`
 * suffix) so callers can use it as a React `key`.
 */
export interface LoopableItem<T> {
  key: string;
  item: T;
}

/**
 * Minimum slides needed for Swiper loop mode given the largest slidesPerView.
 * Replicates Swiper's `loopFix` computation for `centeredSlides`
 * (`bothDirections`): it rounds `slidesPerView` up, bumps even counts by 1,
 * then requires `slides.length >= slidesPerView + loopedSlides` where
 * `loopedSlides = max(1, ceil(slidesPerView / 2))`.
 */
export function minSlidesForLoop(maxSlidesPerView: number): number {
  let slidesPerView = Math.ceil(maxSlidesPerView);
  if (slidesPerView % 2 === 0) slidesPerView += 1;
  const loopedSlides = Math.max(1, Math.ceil(slidesPerView / 2));
  return slidesPerView + loopedSlides;
}

export function toLoopable<T>(
  items: readonly T[],
  maxSlidesPerView: number,
  keyOf: (item: T) => string,
): LoopableItem<T>[] {
  if (items.length === 0) return [];
  const minSlides = minSlidesForLoop(maxSlidesPerView);

  if (items.length >= minSlides) {
    return items.map((item) => ({ key: keyOf(item), item }));
  }

  const result: LoopableItem<T>[] = [];
  let i = 0;
  while (result.length < minSlides) {
    const src = items[i % items.length];
    const copy = Math.floor(i / items.length);
    result.push({
      key: copy === 0 ? keyOf(src) : `${keyOf(src)}-${copy}`,
      item: src,
    });
    i++;
  }
  return result;
}

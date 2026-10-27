// Fit an anchored list inside the visible viewport, including the mobile keyboard.
export function deriveOverlayPlacement({ top, bottom, viewportTop = 0, viewportHeight, maxHeight = 384, gap = 8 }) {
  const below = Math.max(0, viewportTop + viewportHeight - bottom - gap);
  const above = Math.max(0, top - viewportTop - gap);
  const isAbove = below < Math.min(maxHeight, above) && above > below;
  return { isAbove, maxHeight: Math.min(maxHeight, isAbove ? above : below) };
}

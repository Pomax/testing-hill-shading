const { abs, min, max } = Math;

export function toHSL(r, g, b, R = r / 255, G = g / 255, B = b / 255) {
  const v1 = max(R, G, B);
  const v2 = min(R, G, B);
  const d = v1 - v2;
  const L = (v1 + v2) / 2;
  let S = 0;
  let H = 0;

  if (d !== 0) {
    S = d / (1 - abs(2 * L - 1));
    if (v1 === R) H = ((G - B) / d) % 6;
    if (v1 === G) H = (B - R) / d + 2;
    if (v1 === B) H = (R - G) / d + 4;
    H *= 60;
  }

  // Convert negative angles from Hue
  H = (H + 360) % 360;

  return { H, S, L };
}

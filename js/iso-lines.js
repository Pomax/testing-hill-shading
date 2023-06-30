// how prominent should the isolines be, and which colour should they use?
const OUTLINE_STROKE = 0.2;
const OUTLINE_COLOR = [0, 0, 0];

/**
 * This function takes a PNG pixel array, and a list of elevations, and
 * returns a pixel array that has been recoloured using the `getColor`
 * colour gradient function.
 */
export function generateMap({ height, width, pixels }, isoValues = []) {
  const newPixels = new Uint8ClampedArray(pixels.length * 4);
  isoValues.forEach((value) =>
    addISOLayer(pixels, newPixels, width, height, value)
  );
  return newPixels;
}

/**
 * This function colours a single ISO band in-place.
 */
function addISOLayer(pixels, newPixels, width, height, threshold) {
  const c = getColor(threshold);

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      let i = x + y * width;
      let nw = pixels[i];
      let ne = pixels[i + 1];
      let se = pixels[i + 1 + width];
      let sw = pixels[i + width];

      let matchType =
        (nw > threshold ? 8 : 0) +
        (ne > threshold ? 4 : 0) +
        (se > threshold ? 2 : 0) +
        (sw > threshold ? 1 : 0);

      if (matchType !== 0) {
        newPixels[4 * i] =
          matchType === 15
            ? c[0]
            : clerp2(OUTLINE_STROKE, c[0], OUTLINE_COLOR[0]);
        newPixels[4 * i + 1] =
          matchType === 15
            ? c[1]
            : clerp2(OUTLINE_STROKE, c[1], OUTLINE_COLOR[1]);
        newPixels[4 * i + 2] =
          matchType === 15
            ? c[2]
            : clerp2(OUTLINE_STROKE, c[2], OUTLINE_COLOR[2]);
        newPixels[4 * i + 3] = 255;
      }
    }
  }

  return newPixels;
}

/**
 * Generate a colour for a specific elevation, based on interpolating between
 * different fixed values. For instance, the colour for 50' is midway between
 * the two known colours at 1' and 100'.
 */
function getColor(elevation) {
  const entries = [
    [-5000, [0, 0, 0]],
    [-500, [0, 0, 0]],
    [-10, [0, 0, 135]],
    [-2, [0, 175, 115]],
    [-1, [255, 255, 120]],
    [1, [25, 215, 25]],
    [100, [0, 215, 0]],
    [300, [0, 125, 0]],
    [500, [110, 65, 0]],
    [1000, [175, 155, 120]],
    [1500, [200, 230, 230]],
    [1800, [200, 230, 255]],
    [2000, [230, 230, 255]],
    [2500, [255, 255, 255]],
    [20000, [255, 255, 255]],
  ];
  const pos = entries.findIndex(([e, c], i) => e > elevation);
  const e1 = entries[pos - 1];
  const e2 = entries[pos];
  const r = (elevation - e1[0]) / (e2[0] - e1[0]);
  return clerp(r, e1[1], e2[1]);
}

/**
 * Linear intERPolation function for RGB colours.
 */
function clerp(r, c1, c2) {
  return [
    clerp2(r, c1[0], c2[0]) | 0,
    clerp2(r, c1[1], c2[1]) | 0,
    clerp2(r, c1[2], c2[2]) | 0,
  ];
}

/**
 * "linear" interpolation between two (single channel)
 * colour values, based on real world light.
 * See https://www.youtube.com/watch?v=LKnqECcg6Gw for more on this.
 */
function clerp2(r, v1, v2) {
  return ((1 - r) * v1 ** 0.5 + r * v2 ** 0.5) ** 2;
}

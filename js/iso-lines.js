// seeded marching squares to find ISO lines
export function generateMap({ height, width, pixels }, isoValues = []) {
  const newPixels = new Uint8ClampedArray(pixels.length * 4);

  isoValues.forEach((value) =>
    addISOLayer(pixels, newPixels, width, height, value)
  );

  return newPixels;
}

function addISOLayer(pixels, newPixels, width, height, threshold) {
  const OUTLINE_STROKE = 0.1;
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
          matchType === 15 ? c[0] : clerp2(OUTLINE_STROKE, c[0], 0);
        newPixels[4 * i + 1] =
          matchType === 15 ? c[1] : clerp2(OUTLINE_STROKE, c[1], 0);
        newPixels[4 * i + 2] =
          matchType === 15 ? c[2] : clerp2(OUTLINE_STROKE, c[2], 0);
        newPixels[4 * i + 3] = 255;
      }
      //   newPixels[4 * i + 3] = matchType === 0 ? 0 : 255;
    }
  }

  return newPixels;
}

function getColor(elevation) {
  const entries = [
    [-5000, [0, 0, 0]],
    [-500, [0, 0, 0]],
    [-10, [0, 0, 100]],
    [-2, [0, 155, 100]],
    [-1, [255, 255, 150]],
    [1, [25, 200, 25]],
    [100, [0, 200, 0]],
    [300, [0, 100, 0]],
    [500, [80, 50, 0]],
    [1000, [160, 140, 110]],
    [1500, [200, 225, 255]],
    [2000, [225, 255, 255]],
    [2500, [255, 255, 255]],
    [20000, [255, 255, 255]],
  ];
  const pos = entries.findIndex(([e, c], i) => e > elevation);
  const e1 = entries[pos - 1];
  const e2 = entries[pos];
  const r = (elevation - e1[0]) / (e2[0] - e1[0]);
  return clerp(r, e1[1], e2[1]);
}

function clerp(r, c1, c2) {
  return [
    clerp2(r, c1[0], c2[0]) | 0,
    clerp2(r, c1[1], c2[1]) | 0,
    clerp2(r, c1[2], c2[2]) | 0,
  ];
}

function clerp2(r, v1, v2) {
  return ((1 - r) * v1 ** 0.5 + r * v2 ** 0.5) ** 2;
}

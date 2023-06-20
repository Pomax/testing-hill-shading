// plain math
const { abs, sin, cos, atan2, PI, log, sqrt } = Math;

// vector math
const sub = (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z });
const muls = (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s });
const dot = (v1, v2) => v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
const mag = (v) => sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
const unit = (v, m = mag(v)) => ({ x: v.x / m, y: v.y / m, z: v.z / m });

const reflect = (ray, normal) => {
  ray = unit(ray);
  normal = unit(normal);
  return sub(muls(normal, 2 * dot(ray, normal)), ray);
};

const map = (v, ds, de, ts, te) => {
  const d = de - ds;
  if (d === 0) return ts;
  return ts + ((v - ds) * (te - ts)) / d;
};

const constrain = (v, m, M) => {
  if (m > M) return constrain(v, M, m);
  return v > M ? M : v < m ? m : v;
};

const w = 500;
const h = w;
cvs.width = cvs.height = w;
const ctx = cvs.getContext(`2d`);
const im = new Image();
im.crossOrigin = `anonymous`;
im.src = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/ALPSMLC30_N048W120_DSM.png?v=1687285523873`;

// hill shader
function hillShade(evt) {
  ctx.drawImage(im, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const pixels = imageData.data;
  const shaded = ctx.createImageData(w, h);

  const getElevation = (x, y) => {
    x = x < 0 ? 0 : x >= w ? w - 1 : x;
    y = y < 0 ? 0 : y >= h ? h - 1 : y;
    return pixels[4 * (x + y * w)];
  };

  const { width, height } = cvs.getBoundingClientRect();
  const w2 = width / 2;
  const h2 = height / 2;
  let x = (100 * (evt.offsetX - w2)) / w2;
  let y = (100 * (evt.offsetY - h2)) / h2;
  const light = { x: -x, y: -y, z: 1 };

  let max = 0;

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const i = 4 * (x + y * w);

      const a = getElevation(x - 1, y);
      const b = getElevation(x + 1, y);
      const c = getElevation(x, y - 1);
      const d = getElevation(x, y + 1);
      const n = unit({ x: a - b, y: c - d, z: 2 });

      // compute illumination
      const reflection = unit(reflect(light, n));
      const z = reflection.z ** 0.25;
      const e = constrain(map(z, 0, 1, 0, 255), 0, 255);

      // noise reduction using the alpha channel
      shaded.data[i + 0] = e;
      shaded.data[i + 1] = e;
      shaded.data[i + 2] = e;
      shaded.data[i + 3] = 255;
    }
  }

  ctx.putImageData(shaded, 0, 0);
}

cvs.addEventListener(`mousemove`, hillShade);
hillShade({ offsetX: 0, offsetY: 0 });

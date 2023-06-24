//const SOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/ALPSMLC30_N048W120_DSM.png`;
//const BGSOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/map-bg.png`;

// const SOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/ALPSMLC30_N048W120_DSM.800.png`;
// const SOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/ALPSMLC30_N048W120_DSM.300m.png?v=1687532784316`;
const SOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/ALPSMLC30_N048W120_DSM.900m.png?v=1687554379843`;
const BGSOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/%7B8A7EABCD-1E72-41AE-B63F-380C926F1A07%7D.png`;

// plain math
const { abs, sin, cos, atan2, PI, log, sqrt, sign } = Math;

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

const lerp = (r, a, b) => (1 - r) * a + r * b;

const map = (v, ds, de, ts, te) => {
  const d = de - ds;
  if (d === 0) return ts;
  return ts + ((v - ds) * (te - ts)) / d;
};

const constrain = (v, m, M) => {
  if (m > M) return constrain(v, M, m);
  return v > M ? M : v < m ? m : v;
};

let compositionStrategy = `color-burn`;
blendMode.addEventListener(`change`, (evt) => {
  const s = evt.target;
  const v = s.options[s.selectedIndex].textContent;
  compositionStrategy = v;
});

const w = 800;
const h = w;
cvs.width = cvs.height = w;
const ctx = cvs.getContext(`2d`);
const im = new Image();
im.crossOrigin = `anonymous`;
im.src = SOURCE;

const LITTLE_ENDIAN = Symbol(`little endian`);
const BIG_ENDIAN = Symbol(`big endian`);
const endian = (function checkEndian() {
  const buf = new ArrayBuffer(2);
  const u8 = new Uint8Array(buf);
  const u16 = new Uint16Array(buf);
  u8.set([0xaa, 0xbb], 0);
  return u16[0] === 0xbbaa ? LITTLE_ENDIAN : BIG_ENDIAN;
})();

const reverseEndian = (pngPixels8) => {
  for (let i = 0, e = pngPixels8.length; i < e; i += 2) {
    let _ = pngPixels8[i];
    pngPixels8[i] = pngPixels8[i + 1];
    pngPixels8[i + 1] = _;
  }
};

const from4b = (b) => (b[0] << 24) + (b[1] << 16) + (b[2] << 8) + b[3];

const indexOf = (ab, sequence) {
  let first = sequence[0];
  if (typeof first === `string`) first = first.charCodeAt(0);
  let pos = -1;
  let found = false;
  while (!found) {
    pos = ab.indexOf()
    
  }
  return -1
}

function readPNG(pngPath, data) {
  console.log(data, data.subarray);
  data ??= readFileSync(pngPath);
  data = new Uint8Array(data);
  const asString = new TextDecoder().decode(data);
  // Get the raster dimensions
  const width = from4b(data.subarray(16, 20));
  const height = from4b(data.subarray(20, 24));
  const pos = asString.indexOf(`IDAT`);
  const length = from4b(data.subarray(pos - 4, pos));
  const deflated = data.subarray(pos + 4, pos + 4 + length);
  const imageData = pako.deflate(deflated);
  // Convert scan lines into pixels
  const bytes = new Int8Array(width * height * 2);
  for (let y = 0; y < height; y++) {
    // skip over the first byte, which is the scanline's filter type byte.
    const s = 1 + y * (width + 1);
    const slice = imageData.subarray(s, s + width);
    bytes.set(slice, y * width);
  }
  if (endian === LITTLE_ENDIAN) reverseEndian(bytes);
  const pixels = new Int16Array(bytes.buffer);
  const gpos = asString.indexOf(`tEXt`); 
  const bts = data.subarray(gpos - 4, gpos);
  console.log(bts);
  const glen = from4b(bts);

  console.log(asString.substring(gpos-4), glen);

  const json = asString.substring(asString.indexOf(`GeoTags`) + 8, gpos + 4 + glen);
  const geoTags = JSON.parse(json.toString());
  return { width, height, pixels, geoTags };
}



fetch(SOURCE)
  .then((r) => r.arrayBuffer())
  .then((data) => console.log(readPNG(SOURCE, data)));

const bg = new Image();
bg.crossOrigin = `anonymous`;
bg.src = BGSOURCE;

// hill shader
function hillShade(evt) {
  ctx.filter = `blur(2px)`;

  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(im, 0, 0, w, h);

  if (!evt) return;
  const imageData = ctx.getImageData(0, 0, w, h);
  const shaded = ctx.createImageData(w, h);

  ctx.filter = `blur(0px)`;
  ctx.drawImage(bg, 0, 0, w, h);

  const getElevation = (x, y) => {
    x = x < 0 ? 0 : x >= w ? w - 1 : x;
    y = y < 0 ? 0 : y >= h ? h - 1 : y;
    return imageData.data[4 * (x + y * w)];
  };

  const { width, height } = cvs.getBoundingClientRect();
  const w2 = width / 2;
  const h2 = height / 2;
  let x = -(100 * (evt.offsetX - w2)) / w2;
  let y = -(100 * (evt.offsetY - h2)) / h2;

  const F = (v) => constrain(map(v, 0, 1, 127, 255), 0, 255);

  const light = { x: -x, y: -y, z: 1 };
  const f = unit(reflect(light, { x: 0, y: 0, z: 1 }));
  const flatValue = F(f.z);
  console.log(flatValue);

  // build normals
  const normals = [];
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const a = getElevation(x - 1, y);
      const b = getElevation(x + 1, y);
      const c = getElevation(x, y - 1);
      const d = getElevation(x, y + 1);

      const n = unit({ x: a - b, y: c - d, z: 2 });
      normals.push(n);
    }
  }

  const B = 1;
  const blend = (a, b) => (1 - B) * a + B * b;

  // smooth normals
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let i = 4 * (x + y * w);
      const n = normals[x * w + y];

      // compute illumination
      const r1 = unit(reflect(light, n));
      const z1 = r1.z;
      const e = F(z1);

      // noise reduction using the alpha channel
      shaded.data[i + 0] = blend(F(n.x), e);
      shaded.data[i + 1] = blend(F(n.y), e);
      shaded.data[i + 2] = blend(F(n.z), e);

      const a = map(abs(e - flatValue), 0, 255 - flatValue, 0, 255);

      shaded.data[i + 3] = 255; // a;//e === flatValue ? 0 : 255;
    }
  }

  let cvs2 = document.createElement(`canvas`);
  cvs2.width = cvs2.height = w;
  let ctx2 = cvs2.getContext(`2d`);
  ctx2.putImageData(shaded, 0, 0);

  ctx.globalCompositeOperation = compositionStrategy;
  ctx.drawImage(cvs2, 0, 0, w, h);
}

cvs.addEventListener(`mousemove`, hillShade);
cvs.addEventListener(`mouseout`, () => hillShade());
hillShade();

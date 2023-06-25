const cvs = document.getElementById(`cvs`);
const pako = globalThis.pako;

//const SOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/ALPSMLC30_N048W120_DSM.png`;
//const BGSOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/map-bg.png`;

// const SOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/ALPSMLC30_N048W120_DSM.800.png`;
// const SOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/ALPSMLC30_N048W120_DSM.300m.png?v=1687532784316`;
const SOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/ALPSMLC30_N048W120_DSM.900m.png?v=1687554379843`;
const BGSOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/%7B8A7EABCD-1E72-41AE-B63F-380C926F1A07%7D.png`;

const bg = new Image();
bg.crossOrigin = `anonymous`;
bg.src = BGSOURCE;

// plain math
const { abs, sin, cos, atan2, PI, log, sqrt, sign } = Math;

// vector math
const sub = (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z });
const muls = (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s });
const dot = (v1, v2) => v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
const mag = (v) => sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
const unit = (v, m = mag(v)) => ({ x: v.x / m, y: v.y / m, z: v.z / m });

const reflect = (ray, normal) => {
  const f = (2 * dot(ray, normal)) / dot(normal, normal);
  const s = muls(normal, f);
  return sub(s, ray);
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

const constrainMap = (v, s, e, m, M) => {
  return constrain(map(v, s, e, m, M), m, M);
};

let hillShade = () => {};

let compositionStrategy = `luminosity`;
const blendMode = document.getElementById(`blendMode`);
blendMode.addEventListener(`change`, (evt) => {
  const s = evt.target;
  const v = s.options[s.selectedIndex].textContent;
  compositionStrategy = v;
  console.log(v);
  hillShade();
});

let w = 800;
let h = w;
cvs.width = cvs.height = w;
let ctx = cvs.getContext(`2d`);

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

const equal = (s1, s2) => {
  for (let i = 0, e = s2.length; i < e; i++) {
    if (s1[i] !== s2[i]) return false;
  }
  return true;
};

const indexOf = (ab, sequence) => {
  let first = sequence[0];
  let len = sequence.length;
  if (typeof first === `string`) {
    sequence = sequence.split(``).map((v) => v.charCodeAt(0));
    first = sequence[0];
  }
  let pos = -1;
  let found = false;
  while (!found) {
    // console.log(ab, first);
    pos = ab.indexOf(first, pos + 1);
    // console.log(`result for`, sequence, `:`, pos);
    if (pos === -1) return -1;
    const s1 = ab.slice(pos, pos + len);
    const s2 = sequence;
    // console.log(s1, s2);
    if (equal(s1, s2)) return pos;
  }
  return -1;
};

function readPNG(pngPath, data) {
  data = new Uint8Array(data);

  // Get the raster dimensions
  const width = from4b(data.subarray(16, 20));
  const height = from4b(data.subarray(20, 24));

  // Convert image scan lines into 16 bit pixels rows
  const pos = indexOf(data, `IDAT`);
  const length = from4b(data.subarray(pos - 4, pos));
  const deflated = data.subarray(pos + 4, pos + 4 + length);
  const imageData = pako.inflate(deflated);
  const bytes = new Uint8Array(width * height * 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width * 2; x++) {
      // why is this seemingly not getting the right data in the browser?
      bytes[x + y * width * 2] = imageData[1 + x + y * (width * 2 + 1)];
    }
  }
  if (endian === LITTLE_ENDIAN) reverseEndian(bytes);
  const pixels = new Int16Array(bytes.buffer);

  // Get the GeoTag data
  const gpos = indexOf(data, `tEXt`);
  const bts = data.subarray(gpos - 4, gpos);
  const glen = from4b(bts);
  const json = new TextDecoder().decode(
    data.subarray(indexOf(data, `GeoTags`) + 8, gpos + 4 + glen)
  );
  const geoTags = JSON.parse(json.toString());

  // we're done.
  return { width, height, pixels, geoTags };
}

fetch(SOURCE)
  .then((r) => r.arrayBuffer())
  .then((data) => {
    // Get height map
    data = readPNG(SOURCE, data);
    const { height, width, pixels, geoTags } = data;
    const getElevation = (x, y) => {
      x = constrain(x, 0, width - 1);
      y = constrain(y, 0, height - 1);
      return pixels[x + y * width];
    };

    // Build normals
    const normals = [];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const a = getElevation(x - 1, y);
        const b = getElevation(x + 1, y);
        const c = getElevation(x, y - 1);
        const d = getElevation(x, y + 1);
        const n = unit({ x: a - b, y: c - d, z: 2 });
        normals[x + y * width] = n;
      }
    }

    // Set up the hillshading function
    hillShade = () => runHillShade(width, height, pixels, normals, geoTags);

    // And then hill-shade our image
    hillShade();
  });

// hill shader
function runHillShade(width, height, pixels, normals, geoTags) {
  console.log(`running`);

  cvs.width = cvs.height = w;
  ctx = cvs.getContext(`2d`);
  ctx.drawImage(bg, 0, 0, w, h);
  const ctxImage = ctx.getImageData(0, 0, w, h);
  
  
  const F = (v) => constrainMap(v, 0, 1, 0, 255);
  const light = unit({ x: -100, y: 300, z: 10 });

  // illuminate
  const drawPixels = false;
  const drawHill = true;
  const shaded = ctx.createImageData(width, height);
  const histogram = {};
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let i = x + y * width;
      const p = pixels[i];
      const n = normals[i];

      // Compute illumination for this pixel with some
      // non-linear scaling to make the terrain "pop".
      const r = unit(reflect(light, n));
      const e = constrainMap(r.z ** 0.1, 0, 1, 0, 255);

      // Update the pixel index to a canvas RGBA offset
      i = 4 * i;

      // Set alpha to opaque
      shaded.data[i + 3] = 255;

      // Then draw some pixel data
      if (drawPixels) {
        shaded.data[i + 0] = constrainMap(p, -500, 9000, 0, 255) | 0;
        shaded.data[i + 1] = constrainMap(p, -500, 9000, 0, 255) | 0;
        shaded.data[i + 2] = constrainMap(p, -500, 9000, 0, 255) | 0;
      } else {
        shaded.data[i + 0] = F(n.x) | 0;
        shaded.data[i + 1] = F(n.y) | 0;
        shaded.data[i + 2] = F(n.z) | 0;
      }

      if (drawHill) {
        const r = 1;
        shaded.data[i + 0] = lerp(r, F(n.x), e) | 0;
        shaded.data[i + 1] = lerp(r, F(n.y), e) | 0;
        shaded.data[i + 2] = lerp(r, F(n.z), e) | 0;
        shaded.data[i + 3] = 100 < e && e < 150 ? 0 : 255;
      }
    }
  }

  let cvs2 = document.createElement(`canvas`);
  cvs2.width = width;
  cvs2.height = height;
  let ctx2 = cvs2.getContext(`2d`);
  ctx2.putImageData(shaded, 0, 0);
  ctx.drawImage(cvs2, 0, 0, w, h);
  const shadeImage = ctx.getImageData(0,0,w,h);
  
  ctxImage.data.forEach((v,i) => {
    if (i%4 !== 3) {
      shadeImage.data[i] = (shadeImage.data[i] + v)/2;
    }
  });
  ctx.putImageData(shadeImage, 0, 0);
  
}

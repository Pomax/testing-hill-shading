import {
  sub,
  muls,
  dot,
  mag,
  unit,
  reflect,
  lerp,
  map,
  constrain,
  constrainMap,
  indexOf,
} from "./js/utils.js";
import { rgbToHsl, hslToRgb } from "./js/color.js";
import { readPNG } from "./js/read-png.js";
import { generateMap } from "./js/iso-lines.js";

const { abs, sin, cos, atan2, PI, log, sqrt, sign } = Math;
const OVERLAY_ONLY = Symbol();

let png;
let isoMap;
let hillShade = () => {};

const SOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/ALPSMLC30_N048W124_DSM.120m.png?v=1688152031668`;
const BGSOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/ALPSMLC30_N048W124_DSM.120m.png?v=1688152031668`;
const bg = new Image();

// Let's set up the main canvas using nicely big dimensions
let w = 800;
let h = w;
const cvs = document.getElementById(`cvs`);
cvs.width = cvs.height = w;
let ctx = cvs.getContext(`2d`);

// As well as set up our cursor handling
let mouseX = -0.5;
let mouseY = -0.5;
cvs.addEventListener(`mousemove`, (evt) => {
  mouseX = (evt.offsetX - w / 2) / w;
  mouseY = (evt.offsetY - h / 2) / h;
  drawIsoMap();
});


fetch(SOURCE)
  .then((r) => r.arrayBuffer())
  .then((data) => {
    bg.crossOrigin = `anonymous`;
    bg.src = BGSOURCE;
    bg.onload = () => {
      png = readPNG(SOURCE, data);
      hillShade = createHillShader();
      drawIsoMap();
    };
  });

function createHillShader() {
  const { height, width, pixels, geoTags } = png;

  const getElevation = (x, y) => {
    x = constrain(x, 0, width - 1);
    y = constrain(y, 0, height - 1);
    return pixels[x + y * width];
  };

  // Build normals
  const normals = [];
  const elevation = { min: 0, max: 0 };
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
  return (mode) => runHillShade(width, height, pixels, normals, geoTags, mode);
}

/**
 * The hill shading code is fairly "text book", but of course text books can be hard to read
 */
function runHillShade(width, height, pixels, normals, geoTags, mode) {
  if (mode !== OVERLAY_ONLY) {
    cvs.width = cvs.height = w;
    ctx = cvs.getContext(`2d`);
    ctx.drawImage(bg, 0, 0, w, h);
  }

  // First off, we need a light source, which is really just "a vector" that we can 
  // reflect over our normals to determine how much light will end up going straight
  // up, because that's the only thing we really care about here:
  const F = (v) => constrainMap(v, 0, 1, 0, 255);
  const light = unit({
    x: mouseX * w * 2,
    y: mouseY * h * 2,
    z: 10,
  });

  // We also want to know what RGB value corresponds to a perfectly flat surface, so
  // that we can "ignore" those later on (by rendering them as 100% transparent).
  const flat = unit(reflect(light, {x:0, y:0, z:1}));
  const flatValue = constrainMap(flat.z ** 0.1, 0, 1, 0, 255);
  
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
        shaded.data[i + 3] = e === flatValue ? 0 : 255;
      }
    }
  }

  // Overlay the hill shading on a real map
  let cvs2 = document.createElement(`canvas`);
  cvs2.width = width;
  cvs2.height = height;
  let ctx2 = cvs2.getContext(`2d`);
  ctx2.putImageData(shaded, 0, 0);

  ctx.filter = `blur(3px)`;
  ctx.globalCompositeOperation = `color-burn`;
  ctx.globalAlpha = 0.2;
  ctx.drawImage(cvs2, 0, 0, w, h);
  ctx.globalAlpha = 1;

  ctx.filter = `blur(0px)`;
  ctx.globalCompositeOperation = `source-over`;
  ctx.globalAlpha = 0.3;
  ctx.drawImage(cvs2, 0, 0, w, h);
  ctx.globalAlpha = 1;
}


/**
 * ...
 */
function drawIsoMap() {
  ctx.globalAlpha = 1;
  ctx.fillStyle = `#0FE`;
  ctx.fillRect(0, 0, w, h);

  const SCALE = 10;
  const lines = [...new Array(25)].map((_, i) => i * 100);
  isoMap ??= generateMap(png, lines);

  const pxl = new ImageData(isoMap, png.width, png.height);
  const cvs = document.createElement(`canvas`);
  cvs.width = pxl.width;
  cvs.height = pxl.height;
  const pctx = cvs.getContext(`2d`);
  pctx.putImageData(pxl, 0, 0);
  const ox = 0; // mouseX * SCALE * i ** 0.5;
  const oy = 0; // mouseY * SCALE * i ** 0.5;
  ctx.drawImage(cvs, ox, oy, w, h);

  hillShade(OVERLAY_ONLY);
}

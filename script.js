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
} from "./utils.js";
import { rgbToHsl, hslToRgb } from "./color.js";
import { Conrec } from "./conrec.js";
import { readPNG } from "./read-png.js";

const { abs, sin, cos, atan2, PI, log, sqrt, sign } = Math;

let hillShade = () => {};
const bg = new Image();

const cvs = document.getElementById(`cvs`);

const SOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/ALPSMLC30_N048W124_DSM.900m.png?v=1687792965948`;
const BGSOURCE = `https://cdn.glitch.global/6f093c76-7f96-4f52-94dd-2b1647bfb115/bgmap.png?v=1687793283354`;

let w = 800;
let h = w;
cvs.width = cvs.height = w;
let ctx = cvs.getContext(`2d`);

fetch(SOURCE)
  .then((r) => r.arrayBuffer())
  .then((data) => {
    bg.crossOrigin = `anonymous`;
    bg.src = BGSOURCE;
    bg.onload = () => {
      hillShade = createHillShader(data);
      hillShade();
    };
  });

function createHillShader(data) {
  // Get height map
  data = readPNG(SOURCE, data);
  const { height, width, pixels, geoTags } = data;
  const getElevation = (x, y) => {
    x = constrain(x, 0, width - 1);
    y = constrain(y, 0, height - 1);
    return pixels[x + y * width];
  };

  const conrecData = [];

  // Build normals
  const xs = [];
  const ys = [];
  const normals = [];
  for (let x = 0; x < width; x++) {
    xs.push(x);
    for (let y = 0; y < height; y++) {
      ys.push(y);
      const a = getElevation(x - 1, y);
      const b = getElevation(x + 1, y);
      const c = getElevation(x, y - 1);
      const d = getElevation(x, y + 1);
      const n = unit({ x: a - b, y: c - d, z: 2 });
      normals[x + y * width] = n;
      conrecData.push([x, y, getElevation(x, y)]);
    }
  }

  generateContourLines();


  // Set up the hillshading function
  return () => runHillShade(width, height, pixels, normals, geoTags);
}

// experimental contours, if I can figure out CONREC
function generateContourLines() {
  const conrec = new Conrec();
  const levels = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
  conrec.contour(
    conrecData,
    0,
    width,
    0,
    height,
    xs,
    ys,
    levels.length,
    levels
  );
  const contours = conrec.contours;
  console.log(contours);  
}

// hill shader
function runHillShade(width, height, pixels, normals, geoTags) {
  console.log(`running`);

  cvs.width = cvs.height = w;
  ctx = cvs.getContext(`2d`);
  ctx.drawImage(bg, 0, 0, w, h);
  const ctxImage = ctx.getImageData(0, 0, w, h);

  const F = (v) => constrainMap(v, 0, 1, 0, 255);
  const light = unit({ x: -300, y: -300, z: 10 });

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
  
  // runCustomOverlay(ctx, ctxImage, w, h);
}

function runCustomOverlay(ctx, ctxImage, w, h) {
    const shadeImage = ctx.getImageData(0, 0, w, h);

    for (let i = 0, e = ctxImage.data.length; i < e; i += 4) {
      // rgb
      const pixel = [
        ctxImage.data[i],
        ctxImage.data[i + 1],
        ctxImage.data[i + 2],
      ];

      // hsl
      const hsl = rgbToHsl(...pixel);

      // apply shading
      const e = shadeImage.data[i];
      if (e > 127) {
        // hsl[2] += constrainMap(e, 127, 255, 0, 20);
        // hsl[2] = constrain(hsl[2], 0, 100);
      } else {
        // hsl[0] -= constrainMap(e, 127, 0, 0, 20);
        // hsl[0] = (hsl[0] + 360) % 360;
        // hsl[2] += (e - 127)/3;
        // hsl[2] = constrain(hsl[2], 0, 100);
      }

      // back to rgb
      const rgb = hslToRgb(...hsl);

      // if (e > 127) {
      //   // ...
      // } else {
      //   rgb[0] = constrain((rgb[0] + e)/2, 0, 255);
      //   rgb[1] = constrain((rgb[1] + e)/2, 0, 255);
      //   rgb[2] = constrain((rgb[2] + e)/2, 0, 255);
      // }

      // // and back into the data layer
      // shadeImage.data[i] = rgb[0];
      // shadeImage.data[i + 1] = rgb[1];
      // shadeImage.data[i + 2] = rgb[2];
    }
    ctx.putImageData(shadeImage, 0, 0);
}

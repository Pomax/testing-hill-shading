export const LITTLE_ENDIAN = Symbol(`little endian`);

export const BIG_ENDIAN = Symbol(`big endian`);

export const endian = (function checkEndian() {
  const buf = new ArrayBuffer(2);
  const u8 = new Uint8Array(buf);
  const u16 = new Uint16Array(buf);
  u8.set([0xaa, 0xbb], 0);
  return u16[0] === 0xbbaa ? LITTLE_ENDIAN : BIG_ENDIAN;
})();

export function reverseEndian (pngPixels8) {
  for (let i = 0, e = pngPixels8.length; i < e; i += 2) {
    let _ = pngPixels8[i];
    pngPixels8[i] = pngPixels8[i + 1];
    pngPixels8[i + 1] = _;
  }
};

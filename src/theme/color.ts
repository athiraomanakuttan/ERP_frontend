/** Hex <-> HSL conversion and a Tailwind-style 50..950 shade ramp generator,
 * so any admin-chosen brand color gets a full, usable palette at runtime. */

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): HSL {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255),
  ];
}

// Target lightness per shade, tuned so the admin's chosen color lands close to 500/600
// (where it's most visible - primary buttons, links) while staying usable at every step.
const SHADE_LIGHTNESS: Record<string, number> = {
  '50': 97,
  '100': 93,
  '200': 85,
  '300': 74,
  '400': 62,
  '500': 52,
  '600': 45,
  '700': 37,
  '800': 30,
  '900': 24,
  '950': 15,
};

/** Returns each shade as an "R G B" triplet string, ready for a CSS custom property. */
export function generateShadeRamp(hex: string): Record<string, string> {
  const { h, s } = hexToHsl(hex);
  const ramp: Record<string, string> = {};
  for (const [shade, lightness] of Object.entries(SHADE_LIGHTNESS)) {
    // Slightly desaturate the extremes so very light/dark shades don't look neon or muddy.
    const distanceFromMid = Math.abs(lightness - 50) / 50;
    const satAdjust = Math.max(0.55, 1 - distanceFromMid * 0.35);
    const [r, g, b] = hslToRgb(h, Math.min(100, s * satAdjust), lightness);
    ramp[shade] = `${r} ${g} ${b}`;
  }
  return ramp;
}

export function isValidHex(value: string): boolean {
  return /^#([0-9A-Fa-f]{6})$/.test(value);
}

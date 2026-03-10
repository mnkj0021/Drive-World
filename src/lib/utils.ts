import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function lerpColor(a: string, b: string, amount: number) {
  const ah = parseInt(a.replace(/#/g, ''), 16),
    ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
    bh = parseInt(b.replace(/#/g, ''), 16),
    br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
    rr = ar + amount * (br - ar),
    rg = ag + amount * (bg - ag),
    rb = ab + amount * (bb - ab);

  return '#' + ((1 << 24) + (Math.round(rr) << 16) + (Math.round(rg) << 8) + Math.round(rb)).toString(16).slice(1);
}

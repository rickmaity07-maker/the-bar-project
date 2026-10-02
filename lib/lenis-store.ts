import type Lenis from "lenis";

/* Module-level handle so the nav overlay can pause smooth scrolling. */
let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function getLenis() {
  return instance;
}

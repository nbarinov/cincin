// jsdom lacks parts of the pointer and animation platform. These stubs
// provide the minimum surface the dom controllers touch; individual tests
// refine them with vi.spyOn where they assert calls.

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}

if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

if (!Element.prototype.animate) {
  Element.prototype.animate = function animate() {
    return {
      finished: Promise.resolve(),
      cancel() {},
    } as unknown as Animation;
  };
}

if (!window.matchMedia) {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

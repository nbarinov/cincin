// jsdom lacks parts of the pointer, animation and media platform the dom
// controllers touch. Everything here goes in through vi: the global through
// vi.stubGlobal, the prototype methods through vi.fn, because stubGlobal
// only writes onto globalThis and vi.spyOn refuses a property jsdom never
// defined. Note the trade: a test that calls vi.unstubAllGlobals restores
// the global to the jsdom nothing, not to this stub, so such a suite
// re-installs what it needs itself. The observer stays out on purpose: the
// layout suites drive their own recording fake.

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
}));

// One mock serves every test in a file, so the config clears the call history
// before each of them: the suite that asserts no fling under reduced motion
// reads its own calls, not the leftovers of the test before it.
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();
Element.prototype.animate = vi.fn(
  () =>
    ({
      finished: Promise.resolve(),
      cancel() {},
    }) as unknown as Animation
);

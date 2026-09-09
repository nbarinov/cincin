// jsdom lacks the observer, media and pointer platform the adapter mounts
// touch. Everything here goes in through vi: the globals through
// vi.stubGlobal, the prototype methods through vi.fn, because stubGlobal
// only writes onto globalThis and vi.spyOn refuses a property jsdom never
// defined. Note the trade: a test that calls vi.unstubAllGlobals restores
// the globals to the jsdom nothing, not to these stubs, so such a suite
// re-installs what it needs itself.

/** Never reports: heights stay unwritten and skins keep their fallbacks. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
}));

// One mock serves every test in a file, so the config clears the call history
// before each of them: a suite that asserts on the gesture reads its own
// calls, not the leftovers of the test before it.
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();
Element.prototype.animate = vi.fn(
  () =>
    ({
      finished: Promise.resolve(),
      cancel() {},
    }) as unknown as Animation
);

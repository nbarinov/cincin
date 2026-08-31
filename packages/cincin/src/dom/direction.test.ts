import { observeTextDirection, textDirection } from './direction';

afterEach(() => {
  document.documentElement.removeAttribute('dir');
});

describe('textDirection', () => {
  it('should default to ltr', () => {
    expect(textDirection(document.documentElement)).toBe('ltr');
  });

  it('should read an explicit dir attribute from the element', () => {
    document.documentElement.dir = 'rtl';
    expect(textDirection(document.documentElement)).toBe('rtl');

    document.documentElement.dir = 'ltr';
    expect(textDirection(document.documentElement)).toBe('ltr');
  });

  it('should fall back to the computed style behind auto', () => {
    // jsdom computes 'ltr' for an auto root; the branch itself is what
    // this pins, a real browser resolves auto from the content.
    document.documentElement.dir = 'auto';
    expect(textDirection(document.documentElement)).toBe('ltr');
  });

  it('should answer for a dir island independently of the root', () => {
    const island = document.createElement('div');
    island.dir = 'rtl';
    document.body.append(island);

    expect(textDirection(island)).toBe('rtl');
    expect(textDirection(document.documentElement)).toBe('ltr');

    island.remove();
  });

  it('should resolve an attribute-free element through inheritance', () => {
    document.documentElement.dir = 'rtl';
    const child = document.createElement('div');
    document.body.append(child);

    // No own attribute: the computed-style path answers, and it
    // resolves the inherited direction.
    expect(child.getAttribute('dir')).toBeNull();
    expect(textDirection(child)).toBe('rtl');

    child.remove();
  });
});

describe('observeTextDirection', () => {
  it('should report a dir flip and stop after teardown', async () => {
    const onChange = vi.fn();
    const teardown = observeTextDirection(document.documentElement, onChange);

    document.documentElement.dir = 'rtl';
    // MutationObserver delivers on a microtask.
    await Promise.resolve();
    expect(onChange).toHaveBeenCalledTimes(1);

    teardown();
    document.documentElement.dir = 'ltr';
    await Promise.resolve();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('should watch only the given element', async () => {
    const island = document.createElement('div');
    document.body.append(island);
    const onChange = vi.fn();
    const teardown = observeTextDirection(island, onChange);

    island.dir = 'rtl';
    await Promise.resolve();
    expect(onChange).toHaveBeenCalledTimes(1);

    // The root is not the watched element here.
    document.documentElement.dir = 'rtl';
    await Promise.resolve();
    expect(onChange).toHaveBeenCalledTimes(1);

    teardown();
    island.remove();
  });

  it('should ignore unrelated attribute changes', async () => {
    const onChange = vi.fn();
    const teardown = observeTextDirection(document.documentElement, onChange);

    document.documentElement.setAttribute('lang', 'ar');
    await Promise.resolve();
    expect(onChange).not.toHaveBeenCalled();

    teardown();
    document.documentElement.removeAttribute('lang');
  });
});

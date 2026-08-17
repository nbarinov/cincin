import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { composeRefs, setRef, useComposedRefs } from './use-composed-refs';
import type { Ref } from 'react';

function Host({ refs }: { refs: Array<Ref<HTMLElement>> }) {
  const composed = useComposedRefs(...refs);
  return <div data-testid="target" ref={composed} />;
}

function getTarget(): HTMLElement {
  return document.querySelector('[data-testid="target"]') as HTMLElement;
}

afterEach(() => {
  cleanup();
});

describe('setRef', () => {
  it('should assign the value to an object ref', () => {
    const ref = createRef<string>();

    setRef(ref, 'value');

    expect(ref.current).toBe('value');
  });

  it('should call a callback ref and return its cleanup', () => {
    const detach = () => {};
    const seen: string[] = [];

    const returned = setRef((value: string) => {
      seen.push(value);
      return detach;
    }, 'value');

    expect(seen).toEqual(['value']);
    expect(returned).toBe(detach);
  });

  it('should tolerate null and undefined refs', () => {
    expect(() => setRef(null, 'value')).not.toThrow();
    expect(() => setRef(undefined, 'value')).not.toThrow();
  });
});

describe('composeRefs', () => {
  it('should forward the value and tear every part down via one cleanup', () => {
    const objectRef = createRef<string>();
    const detach = vi.fn();
    const seen: Array<string | null> = [];

    const composed = composeRefs<string>(objectRef, (value) => {
      seen.push(value);
      return detach;
    });
    const teardown = composed('value');

    expect(objectRef.current).toBe('value');
    expect(seen).toEqual(['value']);

    (teardown as () => void)();

    // The cleanup-aware ref runs its own cleanup, the object ref gets
    // the null reset instead.
    expect(detach).toHaveBeenCalledTimes(1);
    expect(objectRef.current).toBeNull();
    expect(seen).toEqual(['value']);
  });

  it('should reset cleanup-less callback refs with null', () => {
    const seen: Array<string | null> = [];

    const composed = composeRefs<string>((value) => void seen.push(value));
    const teardown = composed('value');
    (teardown as () => void)();

    expect(seen).toEqual(['value', null]);
  });
});

describe('useComposeRefs', () => {
  // The composition mechanics are pinned by the composeRefs units: this
  // suite only checks what the hook adds on top of them, plus one
  // integration fact: React honors the composite's returned cleanup.
  it('should attach and tear down through the React lifecycle', () => {
    const objectRef = createRef<HTMLElement>();
    const detach = vi.fn();
    const seen: Array<HTMLElement | null> = [];

    const view = render(
      <Host
        refs={[objectRef, () => detach, (element) => void seen.push(element)]}
      />
    );

    expect(objectRef.current).toBe(getTarget());
    expect(seen).toEqual([expect.any(HTMLElement)]);

    view.unmount();

    expect(detach).toHaveBeenCalledTimes(1);
    expect(objectRef.current).toBeNull();
    expect(seen).toEqual([expect.any(HTMLElement), null]);
  });

  it('should keep the composed ref stable while its parts are stable', () => {
    const attach = vi.fn();
    const stable = (element: HTMLElement | null) => {
      if (element !== null) {
        attach();
      }
    };

    const view = render(<Host refs={[stable]} />);
    view.rerender(<Host refs={[stable]} />);

    expect(attach).toHaveBeenCalledTimes(1);
  });

  it('should re-run all refs when one part changes identity', () => {
    const objectRef = createRef<HTMLElement>();
    const first = vi.fn();
    const second = vi.fn();

    const view = render(<Host refs={[objectRef, first]} />);
    view.rerender(<Host refs={[objectRef, second]} />);

    // The old callback got the null reset, the new one got the element,
    // and the untouched object ref was reattached along the way.
    expect(first).toHaveBeenLastCalledWith(null);
    expect(second).toHaveBeenCalledWith(getTarget());
    expect(objectRef.current).toBe(getTarget());
  });
});

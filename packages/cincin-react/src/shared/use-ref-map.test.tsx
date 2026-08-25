import { cleanup, render, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { useRefMap } from './use-ref-map';
import type { RefMap } from './use-ref-map';

afterEach(() => {
  cleanup();
});

describe('useRefMap', () => {
  it('should hand out a stable ref callback per key', () => {
    const { result } = renderHook(() => useRefMap<string, HTMLElement>());

    expect(result.current.getRef('a')).toBe(result.current.getRef('a'));
    expect(result.current.getRef('a')).not.toBe(result.current.getRef('b'));
  });

  it('should register a mounted value and forget it on unmount', () => {
    let map!: RefMap<string, HTMLElement>;

    function Host({ keys }: { keys: string[] }) {
      map = useRefMap<string, HTMLElement>();
      return (
        <>
          {keys.map((key) => (
            <div key={key} data-key={key} ref={map.getRef(key)} />
          ))}
        </>
      );
    }

    const view = render(<Host keys={['a', 'b']} />);
    expect(map.get('a')?.dataset.key).toBe('a');
    expect(map.get('b')?.dataset.key).toBe('b');

    view.rerender(<Host keys={['a']} />);
    expect(map.get('a')).toBeDefined();
    expect(map.get('b')).toBeUndefined();
  });

  it('should report attaches and detaches through onChange', () => {
    let map!: RefMap<string, HTMLElement>;
    const changes: Array<[string, boolean]> = [];

    function Host({ keys }: { keys: string[] }) {
      map = useRefMap<string, HTMLElement>({
        onChange: (key, value) => {
          changes.push([key, value !== null]);
        },
      });
      return (
        <>
          {keys.map((key) => (
            <div key={key} ref={map.getRef(key)} />
          ))}
        </>
      );
    }

    const view = render(<Host keys={['a', 'b']} />);
    expect(changes).toContainEqual(['a', true]);
    expect(changes).toContainEqual(['b', true]);

    changes.length = 0;
    view.rerender(<Host keys={['b']} />);
    expect(changes).toContainEqual(['a', false]);

    // after a cleanup the null was already reported: release is silent
    changes.length = 0;
    map.release('a');
    expect(changes).toHaveLength(0);

    // releasing a still-mounted value reports the null itself
    changes.length = 0;
    map.release('b');
    expect(changes).toEqual([['b', false]]);
  });

  it('should keep the ref callback stable across a StrictMode double mount', () => {
    let map!: RefMap<string, HTMLElement>;
    const seen = new Set<unknown>();

    function Host() {
      map = useRefMap<string, HTMLElement>();
      const ref = map.getRef('a');
      seen.add(ref);
      return <div ref={ref} />;
    }

    render(
      <StrictMode>
        <Host />
      </StrictMode>
    );

    // StrictMode ran the ref cleanup between its two mounts. A cleanup
    // that pruned the cache would hand the second render a fresh
    // callback, and every consumer composing this ref (the skin's swipe
    // controller) would be torn down and re-attached for nothing.
    expect(seen.size).toBe(1);
    expect(map.get('a')).toBeDefined();
  });

  it('should return the same callback after the ref cleanup ran', () => {
    let map!: RefMap<string, HTMLElement>;

    function Host({ mounted }: { mounted: boolean }) {
      map = useRefMap<string, HTMLElement>();
      return mounted ? <div ref={map.getRef('a')} /> : null;
    }

    const view = render(<Host mounted />);
    const before = map.getRef('a');

    // Unmount runs the cleanup: the value goes, the callback stays, so a
    // remount of the same key reattaches without a new identity.
    view.rerender(<Host mounted={false} />);
    expect(map.get('a')).toBeUndefined();
    expect(map.getRef('a')).toBe(before);
  });

  it('should drop both the value and the callback on release', () => {
    let map!: RefMap<string, HTMLElement>;

    function Host() {
      map = useRefMap<string, HTMLElement>();
      return <div ref={map.getRef('a')} />;
    }

    render(<Host />);
    const before = map.getRef('a');

    map.release('a');

    expect(map.get('a')).toBeUndefined();
    expect(map.getRef('a')).not.toBe(before);
  });
});

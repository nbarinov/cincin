import { cleanup, render, renderHook } from '@testing-library/preact';
import { BURIAL_DELAY, useRefMap } from './use-ref-map';
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
    expect(changes).toEqual([['a', false]]);
  });

  it('should carry the detach in the cleanup returned from the ref', () => {
    const { result } = renderHook(() => useRefMap<string, HTMLElement>());
    const ref = result.current.getRef('a');
    const element = document.createElement('div');

    // Preact 10.23 and up stores the returned function and runs it on
    // unmount instead of calling the ref with null: the cleanup is the
    // one detach path, the null branch only satisfies the type.
    const cleanupRef = ref(element);
    expect(cleanupRef).toBeTypeOf('function');
    expect(result.current.get('a')).toBe(element);

    cleanupRef!();
    expect(result.current.get('a')).toBeUndefined();
  });

  it('should keep the callback right after a cleanup, then bury it', async () => {
    let map!: RefMap<string, HTMLElement>;

    function Host({ mounted }: { mounted: boolean }) {
      map = useRefMap<string, HTMLElement>();
      return mounted ? <div ref={map.getRef('a')} /> : null;
    }

    const view = render(<Host mounted />);
    const before = map.getRef('a');

    // Unmount runs the cleanup: the value goes, but the callback
    // survives until the deferred check confirms the key stayed
    // detached past the commit.
    view.rerender(<Host mounted={false} />);
    expect(map.get('a')).toBeUndefined();
    expect(map.getRef('a')).toBe(before);

    await new Promise((resolve) => setTimeout(resolve, BURIAL_DELAY + 20));

    // The key never came back: the cache entry is buried, a future
    // remount mints a fresh callback.
    expect(map.getRef('a')).not.toBe(before);
  });

  it('should keep the callback identity across a same-commit remount', async () => {
    let map!: RefMap<string, HTMLElement>;

    function Host({ generation }: { generation: number }) {
      map = useRefMap<string, HTMLElement>();
      return <div key={generation} ref={map.getRef('a')} />;
    }

    const view = render(<Host generation={1} />);
    const before = map.getRef('a');

    // The keyed remount detaches and reattaches within one commit: the
    // flush finds the key alive and leaves the cache alone, even past
    // the burial grace.
    view.rerender(<Host generation={2} />);
    await new Promise((resolve) => setTimeout(resolve, BURIAL_DELAY + 20));

    expect(map.getRef('a')).toBe(before);
    expect(map.get('a')).toBeDefined();
  });
});

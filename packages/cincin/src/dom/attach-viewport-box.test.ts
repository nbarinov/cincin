import { attachViewportBox } from './attach-viewport-box';
import { createStackLayout } from './stack-layout';
import { makeElement } from './test-helpers';
import type { ToastKey } from '../presenter';

/** jsdom has no ResizeObserver; the stub delivers sizes by hand. */
class ObserverStub {
  static instance: ObserverStub | undefined;
  readonly observed = new Set<Element>();
  readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ObserverStub.instance = this;
  }

  observe(target: Element): void {
    this.observed.add(target);
  }

  unobserve(target: Element): void {
    this.observed.delete(target);
  }

  disconnect(): void {
    this.observed.clear();
  }

  deliver(sizes: Map<Element, number>): void {
    const records = [...sizes]
      .filter(([target]) => this.observed.has(target))
      .map(
        ([target, blockSize]) =>
          ({
            target,
            borderBoxSize: [{ blockSize, inlineSize: 0 }],
          }) as unknown as ResizeObserverEntry
      );
    this.callback(records, this as unknown as ResizeObserver);
  }
}

const key = (id: string) => id as ToastKey;

function mountCard(): { card: HTMLElement; body: HTMLElement } {
  const card = document.createElement('li');
  const body = document.createElement('div');
  card.append(body);
  document.body.append(card);
  return { card, body };
}

const read = (element: HTMLElement) => ({
  height: element.style.getPropertyValue('--cincin-stack-height'),
  front: element.style.getPropertyValue('--cincin-stack-front-height'),
  backs: element.style.getPropertyValue('--cincin-stack-backs'),
});

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ObserverStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
  ObserverStub.instance = undefined;
  document.body.innerHTML = '';
});

describe('attachViewportBox', () => {
  it('should claim the three variables on attach', () => {
    const viewport = makeElement();
    const layout = createStackLayout();

    attachViewportBox(viewport, layout);

    expect(read(viewport)).toEqual({ height: '0', front: '0', backs: '0' });
  });

  it('should follow the layout', () => {
    const viewport = makeElement();
    const layout = createStackLayout({ gap: 10 });
    attachViewportBox(viewport, layout);

    const a = mountCard();
    const b = mountCard();
    layout.setCard(key('a'), a.card);
    layout.setCard(key('b'), b.card);
    layout.setEntries([
      { key: key('a'), leaving: false },
      { key: key('b'), leaving: false },
    ]);
    ObserverStub.instance!.deliver(
      new Map([
        [a.body, 40],
        [b.body, 60],
      ])
    );

    expect(read(viewport)).toEqual({
      height: '110',
      front: '60',
      backs: '1',
    });
  });

  it('should restore the element on detach and stop following', () => {
    const viewport = makeElement();
    viewport.style.setProperty('--cincin-stack-height', '1');
    const layout = createStackLayout();
    const detach = attachViewportBox(viewport, layout);
    expect(read(viewport).height).toBe('0');

    detach();

    expect(read(viewport)).toEqual({ height: '1', front: '', backs: '' });

    const a = mountCard();
    layout.setCard(key('a'), a.card);
    layout.setEntries([{ key: key('a'), leaving: false }]);
    ObserverStub.instance!.deliver(new Map([[a.body, 40]]));
    expect(read(viewport).height).toBe('1');
  });
});

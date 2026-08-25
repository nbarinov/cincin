import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStackLayout } from './stack-layout';
import type { ToastKey } from '../presenter';

/** jsdom has no ResizeObserver; the stub records observations and lets
 * tests deliver sizes by hand. */
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

function makeCard(): { card: HTMLElement; body: HTMLElement } {
  const card = document.createElement('li');
  const body = document.createElement('div');
  card.append(body);
  document.body.append(card);
  return { card, body };
}

describe('createStackLayout', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    ObserverStub.instance = undefined;
    document.body.innerHTML = '';
  });

  it('writes slots front to back and marks the front card', () => {
    const layout = createStackLayout();
    const a = makeCard();
    const b = makeCard();
    layout.setCard(key('a'), a.card);
    layout.setCard(key('b'), b.card);

    layout.setEntries([
      { key: key('a'), leaving: false },
      { key: key('b'), leaving: false },
    ]);

    // stack order: the last entry is the front
    expect(b.card.style.getPropertyValue('--index')).toBe('0');
    expect(b.card.dataset.front).toBe('true');
    expect(a.card.style.getPropertyValue('--index')).toBe('1');
    expect(a.card.dataset.front).toBe('false');
    expect(Number(b.card.style.zIndex)).toBeGreaterThan(
      Number(a.card.style.zIndex)
    );
  });

  it('leaves height variables unwritten until a size is delivered', () => {
    const layout = createStackLayout();
    const a = makeCard();
    layout.setCard(key('a'), a.card);
    layout.setEntries([{ key: key('a'), leaving: false }]);

    expect(a.card.style.getPropertyValue('--toast-height')).toBe('');

    ObserverStub.instance!.deliver(new Map([[a.body, 46]]));

    expect(a.card.style.getPropertyValue('--toast-height')).toBe('46px');
    expect(a.card.style.getPropertyValue('--front-height')).toBe('46px');
  });

  it('sizes the peeking cards with the front card and offsets with naturals', () => {
    const layout = createStackLayout({ gap: 10 });
    const back = makeCard();
    const front = makeCard();
    layout.setCard(key('back'), back.card);
    layout.setCard(key('front'), front.card);
    layout.setEntries([
      { key: key('back'), leaving: false },
      { key: key('front'), leaving: false },
    ]);

    ObserverStub.instance!.deliver(
      new Map([
        [back.body, 46],
        [front.body, 88],
      ])
    );

    expect(back.card.style.getPropertyValue('--toast-height')).toBe('46px');
    expect(back.card.style.getPropertyValue('--front-height')).toBe('88px');
    // the back card's expanded offset clears the front card plus gap
    expect(back.card.style.getPropertyValue('--offset')).toBe('98px');
  });

  it('freezes a leaving card and reflows the survivors into its slot', () => {
    const layout = createStackLayout({ gap: 10 });
    const back = makeCard();
    const front = makeCard();
    layout.setCard(key('back'), back.card);
    layout.setCard(key('front'), front.card);
    layout.setEntries([
      { key: key('back'), leaving: false },
      { key: key('front'), leaving: false },
    ]);
    ObserverStub.instance!.deliver(
      new Map([
        [back.body, 46],
        [front.body, 88],
      ])
    );

    layout.setEntries([
      { key: key('back'), leaving: false },
      { key: key('front'), leaving: true },
    ]);

    // frozen: the exiting front keeps its slot and height
    expect(front.card.style.getPropertyValue('--index')).toBe('0');
    expect(front.card.style.getPropertyValue('--toast-height')).toBe('88px');
    // the survivor takes the front slot with its own height
    expect(back.card.dataset.front).toBe('true');
    expect(back.card.style.getPropertyValue('--offset')).toBe('0px');
    expect(back.card.style.getPropertyValue('--front-height')).toBe('46px');
  });

  it('re-observes a replaced body on the next pass', () => {
    const layout = createStackLayout();
    const a = makeCard();
    layout.setCard(key('a'), a.card);
    layout.setEntries([{ key: key('a'), leaving: false }]);
    ObserverStub.instance!.deliver(new Map([[a.body, 46]]));

    const replacement = document.createElement('div');
    a.body.replaceWith(replacement);
    layout.setEntries([{ key: key('a'), leaving: false }]);

    const observer = ObserverStub.instance!;
    expect(observer.observed.has(a.body)).toBe(false);
    expect(observer.observed.has(replacement)).toBe(true);
    // the written value survives until the new body reports: clearing
    // it would snap the card through `auto` for a frame
    expect(a.card.style.getPropertyValue('--toast-height')).toBe('46px');

    observer.deliver(new Map([[replacement, 60]]));
    expect(a.card.style.getPropertyValue('--toast-height')).toBe('60px');
  });

  it('supports a custom body locator', () => {
    const layout = createStackLayout({
      body: (card) => card.querySelector('[data-measure]'),
    });
    const card = document.createElement('li');
    const decoy = document.createElement('span');
    const body = document.createElement('div');
    body.setAttribute('data-measure', '');
    card.append(decoy, body);
    document.body.append(card);

    layout.setCard(key('a'), card);
    layout.setEntries([{ key: key('a'), leaving: false }]);

    expect(ObserverStub.instance!.observed.has(body)).toBe(true);
    expect(ObserverStub.instance!.observed.has(decoy)).toBe(false);
  });

  it('keeps the front marker exclusive: a leaving card sheds it', () => {
    const layout = createStackLayout();
    const back = makeCard();
    const front = makeCard();
    layout.setCard(key('back'), back.card);
    layout.setCard(key('front'), front.card);
    layout.setEntries([
      { key: key('back'), leaving: false },
      { key: key('front'), leaving: false },
    ]);
    expect(front.card.dataset.front).toBe('true');

    layout.setEntries([
      { key: key('back'), leaving: false },
      { key: key('front'), leaving: true },
    ]);

    // the ghost leaves the live hierarchy entirely; its successor is
    // the one and only front
    expect(front.card.dataset.front).toBeUndefined();
    expect(back.card.dataset.front).toBe('true');
  });

  it('releases keys that left without ever earning a slot', () => {
    const layout = createStackLayout();
    const a = makeCard();
    layout.setCard(key('a'), a.card);
    // leaving from the very first pass: observed, but never slotted
    layout.setEntries([{ key: key('a'), leaving: true }]);
    expect(ObserverStub.instance!.observed.has(a.body)).toBe(true);

    layout.setEntries([]);

    expect(ObserverStub.instance!.observed.size).toBe(0);
  });

  it('releases departed keys and their observations', () => {
    const layout = createStackLayout();
    const a = makeCard();
    layout.setCard(key('a'), a.card);
    layout.setEntries([{ key: key('a'), leaving: false }]);
    ObserverStub.instance!.deliver(new Map([[a.body, 46]]));

    layout.setEntries([]);

    expect(ObserverStub.instance!.observed.size).toBe(0);

    // a re-added key starts from a clean slate: no stale height
    const fresh = makeCard();
    layout.setCard(key('a'), fresh.card);
    layout.setEntries([{ key: key('a'), leaving: false }]);
    expect(fresh.card.style.getPropertyValue('--toast-height')).toBe('');
  });

  it('applies live config changes and ignores no-op ones', () => {
    const layout = createStackLayout({ gap: 10 });
    const back = makeCard();
    const front = makeCard();
    layout.setCard(key('back'), back.card);
    layout.setCard(key('front'), front.card);
    layout.setEntries([
      { key: key('back'), leaving: false },
      { key: key('front'), leaving: false },
    ]);
    ObserverStub.instance!.deliver(
      new Map([
        [back.body, 46],
        [front.body, 88],
      ])
    );
    expect(back.card.style.getPropertyValue('--offset')).toBe('98px');

    layout.setConfig({ gap: 20 });
    expect(back.card.style.getPropertyValue('--offset')).toBe('108px');

    layout.setConfig({ gap: 20 }); // no-op re-apply
    expect(back.card.style.getPropertyValue('--offset')).toBe('108px');
  });

  it('hides cards beyond the visible depth', () => {
    const layout = createStackLayout({ visible: 2 });
    const cards = [makeCard(), makeCard(), makeCard()];
    cards.forEach((c, i) => layout.setCard(key(`t${i}`), c.card));
    layout.setEntries(
      cards.map((_, i) => ({ key: key(`t${i}`), leaving: false }))
    );

    // front is the last entry; the oldest card falls beyond depth 2
    expect(cards[2]!.card.dataset.hidden).toBe('false');
    expect(cards[1]!.card.dataset.hidden).toBe('false');
    expect(cards[0]!.card.dataset.hidden).toBe('true');
  });

  it('keeps the body observed across a ref replay (StrictMode)', () => {
    const layout = createStackLayout();
    const a = makeCard();
    layout.setCard(key('a'), a.card);
    layout.setEntries([{ key: key('a'), leaving: false }]);

    // StrictMode re-runs ref cleanups while the card is alive: detach
    // and re-attach without any pass in between. The observation must
    // survive, or the last-mounted card never gets a height.
    layout.setCard(key('a'), null);
    layout.setCard(key('a'), a.card);

    const observer = ObserverStub.instance!;
    expect(observer.observed.has(a.body)).toBe(true);

    observer.deliver(new Map([[a.body, 46]]));
    expect(a.card.style.getPropertyValue('--toast-height')).toBe('46px');
  });

  it('ignores zero-size deliveries and keeps the last real reading', () => {
    const layout = createStackLayout();
    const a = makeCard();
    layout.setCard(key('a'), a.card);
    layout.setEntries([{ key: key('a'), leaving: false }]);
    ObserverStub.instance!.deliver(new Map([[a.body, 46]]));

    // a display:none skin reports "no box", not a flat card
    ObserverStub.instance!.deliver(new Map([[a.body, 0]]));

    expect(a.card.style.getPropertyValue('--toast-height')).toBe('46px');
  });

  it('disconnects the observer on destroy', () => {
    const layout = createStackLayout();
    const a = makeCard();
    layout.setCard(key('a'), a.card);
    layout.setEntries([{ key: key('a'), leaving: false }]);
    const disconnect = vi.spyOn(ObserverStub.instance!, 'disconnect');

    layout.destroy();

    expect(disconnect).toHaveBeenCalled();
  });
});

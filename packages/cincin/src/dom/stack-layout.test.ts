import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStackLayout } from './stack-layout';
import { createSlotObserver } from './slot-observer';
import type { StackLayout, StackSlot, StackSlotEvent } from './stack-layout';
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

/** A card wired the way consumers wire one: an observer registers the
 * element and a subscription writes the CSS protocol off the slot, so
 * the style assertions below cover the whole chain. */
function mount(
  layout: StackLayout,
  id: string
): { card: HTMLElement; body: HTMLElement } {
  const { card, body } = makeCard();
  const observer = createSlotObserver(layout, { key: key(id) });
  observer.observe(card);
  observer.subscribe((slot) => applySlot(card, slot));
  return { card, body };
}

/** The protocol writer, consumer-shaped (docs/protocol.md): geometry
 * as variables, the tri-state front shedding the attribute on a
 * leaving ghost. */
function applySlot(card: HTMLElement, slot: StackSlot | undefined): void {
  if (slot === undefined) {
    for (const variable of [
      '--cincin-toast-index',
      '--cincin-toast-offset',
      '--cincin-toast-height',
      '--cincin-front-height',
    ]) {
      card.style.removeProperty(variable);
    }
    card.style.zIndex = '';
    delete card.dataset.hidden;
    delete card.dataset.front;
    return;
  }

  card.style.setProperty('--cincin-toast-index', String(slot.index));
  card.style.setProperty('--cincin-toast-offset', `${slot.offset}px`);
  card.style.zIndex = String(slot.zIndex);
  if (slot.height !== undefined) {
    card.style.setProperty('--cincin-toast-height', `${slot.height}px`);
  }
  if (slot.frontHeight !== undefined) {
    card.style.setProperty('--cincin-front-height', `${slot.frontHeight}px`);
  }
  card.dataset.hidden = String(slot.hidden);
  if (slot.leaving) {
    delete card.dataset.front;
  } else {
    card.dataset.front = String(slot.front);
  }
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

  it('publishes slots front to back and marks the front card', () => {
    const layout = createStackLayout();
    const a = mount(layout, 'a');
    const b = mount(layout, 'b');

    layout.setEntries([
      { key: key('a'), leaving: false },
      { key: key('b'), leaving: false },
    ]);

    // stack order: the last entry is the front
    expect(b.card.style.getPropertyValue('--cincin-toast-index')).toBe('0');
    expect(b.card.dataset.front).toBe('true');
    expect(a.card.style.getPropertyValue('--cincin-toast-index')).toBe('1');
    expect(a.card.dataset.front).toBe('false');
    expect(Number(b.card.style.zIndex)).toBeGreaterThan(
      Number(a.card.style.zIndex)
    );
  });

  it('leaves height variables unwritten until a size is delivered', () => {
    const layout = createStackLayout();
    const a = mount(layout, 'a');
    layout.setEntries([{ key: key('a'), leaving: false }]);

    expect(a.card.style.getPropertyValue('--cincin-toast-height')).toBe('');

    ObserverStub.instance!.deliver(new Map([[a.body, 46]]));

    expect(a.card.style.getPropertyValue('--cincin-toast-height')).toBe('46px');
    expect(a.card.style.getPropertyValue('--cincin-front-height')).toBe('46px');
  });

  it('sizes the peeking cards with the front card and offsets with naturals', () => {
    const layout = createStackLayout({ gap: 10 });
    const back = mount(layout, 'back');
    const front = mount(layout, 'front');
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

    expect(back.card.style.getPropertyValue('--cincin-toast-height')).toBe(
      '46px'
    );
    expect(back.card.style.getPropertyValue('--cincin-front-height')).toBe(
      '88px'
    );
    // the back card's expanded offset clears the front card plus gap
    expect(back.card.style.getPropertyValue('--cincin-toast-offset')).toBe(
      '98px'
    );
  });

  it('freezes a leaving card and reflows the survivors into its slot', () => {
    const layout = createStackLayout({ gap: 10 });
    const back = mount(layout, 'back');
    const front = mount(layout, 'front');
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
    expect(front.card.style.getPropertyValue('--cincin-toast-index')).toBe('0');
    expect(front.card.style.getPropertyValue('--cincin-toast-height')).toBe(
      '88px'
    );
    // the survivor takes the front slot with its own height
    expect(back.card.dataset.front).toBe('true');
    expect(back.card.style.getPropertyValue('--cincin-toast-offset')).toBe(
      '0px'
    );
    expect(back.card.style.getPropertyValue('--cincin-front-height')).toBe(
      '46px'
    );
  });

  it('re-observes a replaced body on the next pass', () => {
    const layout = createStackLayout();
    const a = mount(layout, 'a');
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
    expect(a.card.style.getPropertyValue('--cincin-toast-height')).toBe('46px');

    observer.deliver(new Map([[replacement, 60]]));
    expect(a.card.style.getPropertyValue('--cincin-toast-height')).toBe('60px');
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
    const back = mount(layout, 'back');
    const front = mount(layout, 'front');
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
    const a = mount(layout, 'a');
    // leaving from the very first pass: observed, but never slotted
    layout.setEntries([{ key: key('a'), leaving: true }]);
    expect(ObserverStub.instance!.observed.has(a.body)).toBe(true);

    layout.setEntries([]);

    expect(ObserverStub.instance!.observed.size).toBe(0);
  });

  it('releases departed keys and their observations', () => {
    const layout = createStackLayout();
    const a = mount(layout, 'a');
    layout.setEntries([{ key: key('a'), leaving: false }]);
    ObserverStub.instance!.deliver(new Map([[a.body, 46]]));

    layout.setEntries([]);

    expect(ObserverStub.instance!.observed.size).toBe(0);
    // the departure is published: the applier returned every claim
    expect(a.card.style.getPropertyValue('--cincin-toast-index')).toBe('');
    expect(a.card.dataset.front).toBeUndefined();

    // a re-added key starts from a clean slate: no stale height
    const fresh = mount(layout, 'a');
    layout.setEntries([{ key: key('a'), leaving: false }]);
    expect(fresh.card.style.getPropertyValue('--cincin-toast-height')).toBe('');
  });

  it('applies live config changes and ignores no-op ones', () => {
    const layout = createStackLayout({ gap: 10 });
    const back = mount(layout, 'back');
    const front = mount(layout, 'front');
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
    expect(back.card.style.getPropertyValue('--cincin-toast-offset')).toBe(
      '98px'
    );

    layout.setConfig({ gap: 20 });
    expect(back.card.style.getPropertyValue('--cincin-toast-offset')).toBe(
      '108px'
    );

    layout.setConfig({ gap: 20 }); // no-op re-apply
    expect(back.card.style.getPropertyValue('--cincin-toast-offset')).toBe(
      '108px'
    );
  });

  it('hides cards beyond the visible depth', () => {
    const layout = createStackLayout({ visible: 2 });
    const cards = [
      mount(layout, 't0'),
      mount(layout, 't1'),
      mount(layout, 't2'),
    ];
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
    const a = mount(layout, 'a');
    layout.setEntries([{ key: key('a'), leaving: false }]);

    // StrictMode re-runs ref cleanups while the card is alive: detach
    // and re-attach without any pass in between. The observation must
    // survive, or the last-mounted card never gets a height.
    layout.setCard(key('a'), null);
    layout.setCard(key('a'), a.card);

    const observer = ObserverStub.instance!;
    expect(observer.observed.has(a.body)).toBe(true);

    observer.deliver(new Map([[a.body, 46]]));
    expect(a.card.style.getPropertyValue('--cincin-toast-height')).toBe('46px');
  });

  it('ignores zero-size deliveries and keeps the last real reading', () => {
    const layout = createStackLayout();
    const a = mount(layout, 'a');
    layout.setEntries([{ key: key('a'), leaving: false }]);
    ObserverStub.instance!.deliver(new Map([[a.body, 46]]));

    // a display:none skin reports "no box", not a flat card
    ObserverStub.instance!.deliver(new Map([[a.body, 0]]));

    expect(a.card.style.getPropertyValue('--cincin-toast-height')).toBe('46px');
  });

  it('disconnects the observer on destroy', () => {
    const layout = createStackLayout();
    mount(layout, 'a');
    layout.setEntries([{ key: key('a'), leaving: false }]);
    const disconnect = vi.spyOn(ObserverStub.instance!, 'disconnect');

    layout.destroy();

    expect(disconnect).toHaveBeenCalled();
  });

  it('keeps the published clamp while a new front is still unmeasured', () => {
    const layout = createStackLayout();
    const back = mount(layout, 'back');
    const front = mount(layout, 'front');
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
    expect(back.card.style.getPropertyValue('--cincin-front-height')).toBe(
      '88px'
    );

    // a third card enters unmeasured: the backs keep the last known
    // front height, or their height transition would snap through
    // `auto` for the pre-delivery pass
    const fresh = mount(layout, 'fresh');
    layout.setEntries([
      { key: key('back'), leaving: false },
      { key: key('front'), leaving: false },
      { key: key('fresh'), leaving: false },
    ]);
    expect(back.card.style.getPropertyValue('--cincin-front-height')).toBe(
      '88px'
    );
    expect(front.card.style.getPropertyValue('--cincin-front-height')).toBe(
      '88px'
    );

    ObserverStub.instance!.deliver(new Map([[fresh.body, 46]]));
    expect(back.card.style.getPropertyValue('--cincin-front-height')).toBe(
      '46px'
    );
  });

  it('keeps slot references stable across a pass that changes nothing', () => {
    const layout = createStackLayout();
    const a = mount(layout, 'a');
    layout.setEntries([{ key: key('a'), leaving: false }]);
    ObserverStub.instance!.deliver(new Map([[a.body, 46]]));
    const slot = layout.getSlot(key('a'));

    // the same reading again: same values, same reference, no event
    const events: StackSlotEvent[] = [];
    layout.subscribe((event) => events.push(event));
    ObserverStub.instance!.deliver(new Map([[a.body, 46]]));

    expect(layout.getSlot(key('a'))).toBe(slot);
    expect(events).toEqual([]);
  });

  it('publishes a departure as a slot: undefined event', () => {
    const layout = createStackLayout();
    mount(layout, 'a');
    layout.setEntries([{ key: key('a'), leaving: false }]);
    const before = layout.getSlot(key('a'));

    const events: StackSlotEvent[] = [];
    layout.subscribe((event) => events.push(event));
    layout.setEntries([]);

    expect(events).toEqual([{ key: key('a'), slot: undefined, prev: before }]);
    expect(layout.getSlot(key('a'))).toBeUndefined();
  });

  it('keeps a frozen ghost silent while the survivors reflow', () => {
    const layout = createStackLayout();
    const back = mount(layout, 'back');
    const front = mount(layout, 'front');
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

    // a later delivery reflows the survivor; the frozen ghost stays mute
    const events: StackSlotEvent[] = [];
    layout.subscribe((event) => events.push(event));
    ObserverStub.instance!.deliver(new Map([[back.body, 60]]));

    expect(events.some((event) => event.key === key('front'))).toBe(false);
    expect(events.some((event) => event.key === key('back'))).toBe(true);
  });
});

describe('createSlotObserver', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    ObserverStub.instance = undefined;
    document.body.innerHTML = '';
  });

  it('wakes only on published changes of its own key', () => {
    const layout = createStackLayout();
    const a = mount(layout, 'a');
    const b = mount(layout, 'b');
    layout.setEntries([
      { key: key('a'), leaving: false },
      { key: key('b'), leaving: false },
    ]);

    const observer = createSlotObserver(layout, { key: key('b') });
    const wakes = vi.fn();
    observer.subscribe(wakes);

    // only the back card's height arrives: it moves nothing about the
    // front (`b` keeps its slot reference), so its observer sleeps
    ObserverStub.instance!.deliver(new Map([[a.body, 46]]));
    expect(wakes).not.toHaveBeenCalled();

    // the front's own delivery moves its slot: the listener wakes
    ObserverStub.instance!.deliver(new Map([[b.body, 88]]));
    expect(wakes).toHaveBeenCalledTimes(1);
  });

  it('hands out the layout slot reference as its snapshot', () => {
    const layout = createStackLayout();
    mount(layout, 'a');
    layout.setEntries([{ key: key('a'), leaving: false }]);

    const observer = createSlotObserver(layout, { key: key('a') });
    const first = observer.getSnapshot();

    expect(observer.getSnapshot()).toBe(first);
    expect(first).toBe(layout.getSlot(key('a')));
  });

  it('turns undefined for a swept key and survives it', () => {
    const layout = createStackLayout();
    mount(layout, 'a');
    layout.setEntries([{ key: key('a'), leaving: false }]);

    const observer = createSlotObserver(layout, { key: key('a') });
    const wakes = vi.fn();
    observer.subscribe(wakes);
    expect(observer.getSnapshot()).toBeDefined();

    layout.setEntries([]);

    expect(wakes).toHaveBeenCalledTimes(1);
    expect(observer.getSnapshot()).toBeUndefined();
  });

  it('follows a key swapped through setOptions', () => {
    const layout = createStackLayout();
    const a = mount(layout, 'a');
    mount(layout, 'b');
    layout.setEntries([
      { key: key('a'), leaving: false },
      { key: key('b'), leaving: false },
    ]);

    const observer = createSlotObserver(layout, { key: key('a') });
    expect(observer.getSnapshot()).toBe(layout.getSlot(key('a')));

    // the swapped key is readable right away, no wake needed: the
    // caller is the one changing course
    observer.setOptions({ key: key('b') });
    expect(observer.getSnapshot()).toBe(layout.getSlot(key('b')));

    // and the upstream filter follows: an event that moves only `a`
    // (its own height; `b` sits in front, its slot keeps the
    // reference) no longer reaches this observer
    const wakes = vi.fn();
    observer.subscribe(wakes);
    ObserverStub.instance!.deliver(new Map([[a.body, 46]]));

    expect(wakes).not.toHaveBeenCalled();
  });

  it('listens to the layout only while it has listeners itself', () => {
    const layout = createStackLayout();
    const observer = createSlotObserver(layout, { key: key('a') });

    expect(layout.hasListeners()).toBe(false);

    const first = observer.subscribe(() => {});
    const second = observer.subscribe(() => {});
    expect(layout.hasListeners()).toBe(true);

    first();
    expect(layout.hasListeners()).toBe(true);
    second();
    expect(layout.hasListeners()).toBe(false);
  });
});

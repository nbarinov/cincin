import { createFocusLoopController } from './focus-loop-controller';
import type { FocusLoopController } from './focus-loop-controller';
import { createStackLayout } from './stack-layout';
import type { StackLayout, StackLayoutEntry } from './stack-layout';
import type { ToastKey } from '../presenter';

/** jsdom has no ResizeObserver; the loop never reads sizes. */
class ObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

const key = (id: string) => id as ToastKey;

const live = (id: string): StackLayoutEntry => ({
  key: key(id),
  leaving: false,
});
const leaving = (id: string): StackLayoutEntry => ({
  key: key(id),
  leaving: true,
});

/** A stack of registered cards, each with a control inside, plus a
 * control outside for the origin; the layout composes them oldest
 * first, so the last id is the front. */
function makeStack(...ids: string[]) {
  const stack = document.createElement('ol');
  const layout = createStackLayout();
  const cards = new Map<string, HTMLElement>();
  const controls = new Map<string, HTMLElement>();

  for (const id of ids) {
    const card = document.createElement('li');
    card.tabIndex = 0;
    const body = document.createElement('div');
    const control = document.createElement('button');
    body.append(control);
    card.append(body);
    stack.append(card);
    layout.setCard(key(id), card);
    cards.set(id, card);
    controls.set(id, control);
  }

  const outside = document.createElement('button');
  document.body.append(stack, outside);
  layout.setEntries(ids.map(live));

  const loop = createFocusLoopController(layout);

  return {
    layout,
    loop,
    outside,
    card: (id: string) => cards.get(id)!,
    control: (id: string) => controls.get(id)!,
  };
}

/** Keyboard-driven focus on `node`, as the translator would report it. */
function focusByKeyboard(
  loop: FocusLoopController,
  node: HTMLElement,
  origin: HTMLElement | null
): void {
  node.focus();
  loop.enter({ origin, target: node, keyboard: true });
}

const settle = () => new Promise<void>((resolve) => queueMicrotask(resolve));

let layouts: StackLayout[] = [];

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ObserverStub);
});

afterEach(() => {
  for (const layout of layouts) {
    layout.destroy();
  }
  layouts = [];
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

function setup(...ids: string[]) {
  const stack = makeStack(...ids);
  layouts.push(stack.layout);
  return stack;
}

describe('createFocusLoopController', () => {
  describe('jump', () => {
    it('should focus the front card', () => {
      const { loop, card } = setup('a', 'b');

      loop.jump();
      expect(document.activeElement).toBe(card('b'));
    });

    it('should do nothing while nothing is live', () => {
      const { loop, layout, outside } = setup('a');
      layout.setEntries([leaving('a')]);
      outside.focus();

      loop.jump();
      expect(document.activeElement).toBe(outside);
    });
  });

  describe('escape', () => {
    it('should hand focus back to the origin', () => {
      const { loop, card, outside } = setup('a');
      focusByKeyboard(loop, card('a'), outside);

      loop.escape();
      expect(document.activeElement).toBe(outside);
    });

    it('should keep the first origin across moves within the stack', () => {
      const { loop, card, control, outside } = setup('a', 'b');
      focusByKeyboard(loop, card('b'), outside);
      focusByKeyboard(loop, control('b'), null);
      focusByKeyboard(loop, card('a'), null);

      loop.escape();
      expect(document.activeElement).toBe(outside);
    });

    it('should drop the focus when there is no origin to return to', () => {
      const { loop, control } = setup('a');
      focusByKeyboard(loop, control('a'), null);

      loop.escape();
      expect(document.activeElement).toBe(document.body);
    });

    it('should drop the focus when the origin left the document', () => {
      const { loop, card, outside } = setup('a');
      focusByKeyboard(loop, card('a'), outside);
      outside.remove();

      loop.escape();
      expect(document.activeElement).toBe(document.body);
    });

    it('should forget the origin once focus left the stack', () => {
      const { loop, card, outside } = setup('a');
      focusByKeyboard(loop, card('a'), outside);
      loop.exit();
      // Back in from nowhere the browser can name: no origin this time.
      focusByKeyboard(loop, card('a'), null);

      loop.escape();
      expect(document.activeElement).toBe(document.body);
    });
  });

  describe('hand-off', () => {
    it('should move keyboard focus off a leaving card onto the new front', () => {
      const { loop, layout, card, outside } = setup('a', 'b');
      loop.mount();
      focusByKeyboard(loop, card('b'), outside);

      layout.setEntries([live('a'), leaving('b')]);
      expect(document.activeElement).toBe(card('a'));

      // The origin survives the hand-off: Escape still knows the way back.
      loop.enter({ origin: null, target: card('a'), keyboard: true });
      loop.escape();
      expect(document.activeElement).toBe(outside);
    });

    it('should follow focus held by a control inside the leaving card', () => {
      const { loop, layout, card, control, outside } = setup('a', 'b');
      loop.mount();
      focusByKeyboard(loop, control('b'), outside);

      layout.setEntries([live('a'), leaving('b')]);
      expect(document.activeElement).toBe(card('a'));
    });

    it('should hand focus back to the origin when no card is left', () => {
      const { loop, layout, card, outside } = setup('a');
      loop.mount();
      focusByKeyboard(loop, card('a'), outside);

      layout.setEntries([leaving('a')]);
      expect(document.activeElement).toBe(outside);
    });

    it('should treat a card dropped from the composition like a leaving one', () => {
      const { loop, layout, card, outside } = setup('a', 'b');
      loop.mount();
      focusByKeyboard(loop, card('b'), outside);

      layout.setEntries([live('a')]);
      expect(document.activeElement).toBe(card('a'));
    });

    it('should leave pointer-driven focus alone', () => {
      const { loop, layout, card, outside } = setup('a', 'b');
      loop.mount();
      card('b').focus();
      loop.enter({ origin: outside, target: card('b'), keyboard: false });

      layout.setEntries([live('a'), leaving('b')]);
      expect(document.activeElement).toBe(card('b'));
    });

    it('should leave focus alone once something else took it', () => {
      const { loop, layout, card, outside } = setup('a', 'b');
      loop.mount();
      focusByKeyboard(loop, card('b'), outside);
      // A dialog opened over the page and claimed the focus.
      const dialog = document.createElement('button');
      document.body.append(dialog);
      dialog.focus();

      layout.setEntries([live('a'), leaving('b')]);
      expect(document.activeElement).toBe(dialog);
    });

    it('should ignore a leaving card that is not the focused one', () => {
      const { loop, layout, card, outside } = setup('a', 'b');
      loop.mount();
      focusByKeyboard(loop, card('a'), outside);

      layout.setEntries([live('a'), leaving('b')]);
      expect(document.activeElement).toBe(card('a'));
    });

    it('should watch the layout only while mounted', () => {
      const { loop, layout, card, outside } = setup('a', 'b');
      focusByKeyboard(loop, card('b'), outside);

      layout.setEntries([live('a'), leaving('b')]);
      expect(document.activeElement).toBe(card('b'));
    });

    it('should settle a batch that empties the stack in one pass', () => {
      const { loop, layout, card, outside } = setup('a', 'b', 'c');
      loop.mount();
      focusByKeyboard(loop, card('c'), outside);

      // dismissAll: every card leaves at once, the front included.
      layout.setEntries([leaving('a'), leaving('b'), leaving('c')]);
      expect(document.activeElement).toBe(outside);
    });

    it('should do nothing for a card the layout does not know', () => {
      const { loop, layout, outside } = setup('a');
      loop.mount();
      const stranger = document.createElement('li');
      stranger.tabIndex = 0;
      document.body.append(stranger);
      focusByKeyboard(loop, stranger, outside);

      layout.setEntries([leaving('a')]);
      expect(document.activeElement).toBe(stranger);

      loop.escape();
      expect(document.activeElement).toBe(outside);
    });
  });

  describe('control hand-off', () => {
    it('should move keyboard focus onto the card when its control vanishes', async () => {
      const { loop, card, control, outside } = setup('a');
      loop.mount();
      focusByKeyboard(loop, control('a'), outside);

      control('a').remove();
      await settle();
      expect(document.activeElement).toBe(card('a'));

      // The card holds the origin as before: Escape still finds the way back.
      loop.enter({ origin: null, target: card('a'), keyboard: true });
      loop.escape();
      expect(document.activeElement).toBe(outside);
    });

    it('should leave pointer-driven focus alone', async () => {
      const { loop, card, control, outside } = setup('a');
      loop.mount();
      control('a').focus();
      loop.enter({ origin: outside, target: control('a'), keyboard: false });

      control('a').remove();
      await settle();
      expect(document.activeElement).not.toBe(card('a'));
    });

    it('should leave focus alone once something else took it', async () => {
      const { loop, card, control, outside } = setup('a');
      loop.mount();
      focusByKeyboard(loop, control('a'), outside);
      const dialog = document.createElement('button');
      document.body.append(dialog);
      dialog.focus();

      control('a').remove();
      await settle();
      expect(document.activeElement).toBe(dialog);
      expect(card('a').contains(document.activeElement)).toBe(false);
    });

    it('should stop watching once focus left the stack', async () => {
      const { loop, card, control, outside } = setup('a');
      loop.mount();
      focusByKeyboard(loop, control('a'), outside);
      outside.focus();
      loop.exit();

      control('a').remove();
      await settle();
      expect(document.activeElement).toBe(outside);
      expect(document.activeElement).not.toBe(card('a'));
    });

    it('should watch only while mounted', async () => {
      const { loop, card, control, outside } = setup('a');
      focusByKeyboard(loop, control('a'), outside);

      control('a').remove();
      await settle();
      expect(document.activeElement).not.toBe(card('a'));
    });
  });

  describe('unmount', () => {
    it('should hand focus back once the render has settled', async () => {
      const { loop, card, outside } = setup('a');
      loop.mount();
      focusByKeyboard(loop, card('a'), outside);

      loop.unmount();
      expect(document.activeElement).toBe(card('a'));

      await settle();
      expect(document.activeElement).toBe(outside);
    });

    it('should leave focus alone when it was never inside', async () => {
      const { loop, outside } = setup('a');
      loop.mount();
      outside.focus();

      loop.unmount();
      await settle();
      expect(document.activeElement).toBe(outside);
    });

    it('should count consumers like the presenter does', () => {
      const { loop, layout, card, outside } = setup('a', 'b');
      loop.mount();
      loop.mount();
      focusByKeyboard(loop, card('b'), outside);

      loop.unmount();
      layout.setEntries([live('a'), leaving('b')]);
      expect(document.activeElement).toBe(card('a'));
    });
  });
});

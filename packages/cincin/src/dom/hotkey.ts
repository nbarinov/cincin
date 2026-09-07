import { devWarn } from '../shared/utils';

type HotkeyModifier = 'Control' | 'Alt' | 'Shift' | 'Meta';

type LetterKey =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z';

type DigitKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

type FunctionKey =
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'F10'
  | 'F11'
  | 'F12';

type NavigationKey =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Home'
  | 'End'
  | 'PageUp'
  | 'PageDown';

type EditingKey = 'Enter' | 'Escape' | 'Space' | 'Tab' | 'Backspace' | 'Delete';

/**
 * The non-modifier key of a hotkey. Letters and digits match by the
 * physical key (`event.code`), so `Alt+T` fires on the T key under any
 * layout and survives macOS turning Option+T into a dagger;
 * the named keys match `event.key`.
 */
type HotkeyKey =
  | LetterKey
  | DigitKey
  | FunctionKey
  | NavigationKey
  | EditingKey;

/**
 * Every modifier subset in the canonical `Control+Alt+Shift+Meta`
 * order. The empty and the Shift-only prefixes are removed below:
 * a bare key or a capital letter is typed, not pressed.
 */
type HotkeyPrefix =
  `${'' | 'Control+'}${'' | 'Alt+'}${'' | 'Shift+'}${'' | 'Meta+'}`;

/**
 * A hotkey string: at least one of `Control`, `Alt` or `Meta`,
 * then `Shift` if wanted, then the key, joined with `+` in that order.
 * The grammar is the one `aria-keyshortcuts` reads, so the same string
 * can be announced as it is declared.
 */
type Hotkey = `${Exclude<HotkeyPrefix, '' | 'Shift+'>}${HotkeyKey}`;

type HotkeyOptions = {
  /**
   * Where the keydown listener goes: the document, the window or an element.
   * Typed by what can hear a typed `keydown`, so the listener
   * needs no cast; a shadow tree targets its host.
   *
   * @default document
   */
  target?: GlobalEventHandlers;
  signal?: AbortSignal;
};

// controller

/**
 * Listens for `hotkey` on `target` (the document by default) and calls
 * `onPress` on a match, after `preventDefault` so the keystroke neither
 * types a character nor opens a browser menu. Returns the detach.
 * An invalid string warns in development and attaches nothing.
 */
function attachHotkey(
  hotkey: Hotkey,
  onPress: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {}
): () => void {
  const parsed = parseHotkey(hotkey);

  if (parsed === undefined) {
    devWarn(
      `invalid hotkey "${hotkey}": expected Control, Alt or Meta (Shift optional, in that order) and a key, like "Alt+T"`
    );

    return () => {};
  }

  const { target = document, signal } = options;

  const onKeyDown = (event: KeyboardEvent) => {
    if (matchesHotkey(event, parsed)) {
      event.preventDefault();
      onPress(event);
    }
  };

  target.addEventListener('keydown', onKeyDown, { signal });

  return () => target.removeEventListener('keydown', onKeyDown);
}

export { attachHotkey, parseHotkey };
export type { Hotkey, HotkeyKey, HotkeyModifier, HotkeyOptions };

// utils

type HotkeyModifiers = {
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
};

type ParsedHotkey = HotkeyModifiers &
  (
    | {
        /** Letters and digits: the physical key to compare with. */
        code: string;
        key?: undefined;
      }
    | {
        /** Named keys: the `event.key` value to compare with. */
        key: string;
        code?: undefined;
      }
  );

/** Modifier names to the event flags they set, in canonical order. */
const MODIFIER_FLAGS: Record<HotkeyModifier, keyof HotkeyModifiers> = {
  Control: 'ctrlKey',
  Alt: 'altKey',
  Shift: 'shiftKey',
  Meta: 'metaKey',
};
const MODIFIERS = Object.keys(MODIFIER_FLAGS);
const NAMED_KEYS: readonly string[] = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Enter',
  'Escape',
  'Space',
  'Tab',
  'Backspace',
  'Delete',
] satisfies readonly HotkeyKey[];

/**
 * Parses a hotkey string, returning `undefined` for anything outside
 * the grammar: modifiers out of order or repeated, no `Control`, `Alt`
 * or `Meta`, or a key outside the set. The type keeps callers honest;
 * the parser keeps a string that slipped past it from arming a
 * listener that never fires.
 */
function parseHotkey(hotkey: string): ParsedHotkey | undefined {
  const parts = hotkey.split('+');
  const key = parts.pop() ?? '';
  const modifiers: HotkeyModifiers = {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
  };
  // The next modifier has to sit past this rank in the canonical
  // order: an unknown name (-1), a repeat or a swap all fall short.
  let rank = 0;

  for (const part of parts) {
    const index = MODIFIERS.indexOf(part);

    if (index < rank) {
      return undefined;
    }

    rank = index + 1;
    modifiers[MODIFIER_FLAGS[part as HotkeyModifier]] = true;
  }

  if (!modifiers.ctrlKey && !modifiers.altKey && !modifiers.metaKey) {
    return undefined;
  }

  if (/^[A-Z]$/.test(key)) {
    return { ...modifiers, code: `Key${key}` };
  }

  if (/^[0-9]$/.test(key)) {
    return { ...modifiers, code: `Digit${key}` };
  }

  if (/^F([1-9]|1[0-2])$/.test(key) || NAMED_KEYS.includes(key)) {
    return { ...modifiers, key: key === 'Space' ? ' ' : key };
  }

  return undefined;
}

function matchesHotkey(event: KeyboardEvent, parsed: ParsedHotkey): boolean {
  return (
    event.ctrlKey === parsed.ctrlKey &&
    event.altKey === parsed.altKey &&
    event.shiftKey === parsed.shiftKey &&
    event.metaKey === parsed.metaKey &&
    (parsed.code === undefined
      ? event.key === parsed.key
      : event.code === parsed.code)
  );
}

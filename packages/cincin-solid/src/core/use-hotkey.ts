import { attachHotkey } from 'cincin/dom';
import type { Hotkey } from 'cincin/dom';
import { createEffect, onCleanup } from 'solid-js';
import type { MaybeAccessor } from '../shared/maybe-accessor';

type HotkeyOptions = {
  hotkey: Hotkey | false;
  onPress?: (event: KeyboardEvent) => void;
};

function useHotkey(options: MaybeAccessor<HotkeyOptions>): void {
  const read = (): HotkeyOptions =>
    typeof options === 'function' ? options() : options;

  createEffect(function subscribeHotkey() {
    const { hotkey, onPress } = read();

    if (hotkey === false) {
      return;
    }

    onCleanup(attachHotkey(hotkey, (event) => onPress?.(event)));
  });
}

export { useHotkey };
export type { HotkeyOptions };

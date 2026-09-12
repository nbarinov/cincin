import { attachHotkey } from 'cincin/dom';
import type { Hotkey } from 'cincin/dom';
import { afterRenderEffect } from '@angular/core';
import { read } from './maybe-signal';
import type { MaybeSignal } from './maybe-signal';

type HotkeyOptions = {
  hotkey: Hotkey | false;
  onPress?: (event: KeyboardEvent) => void;
};

/**
 * A document-level shortcut, live against its options: a changed
 * hotkey re-attaches, `false` attaches nothing. The listener rides a
 * render effect, so a server render never touches the document.
 */
function injectHotkey(options: MaybeSignal<HotkeyOptions>): void {
  afterRenderEffect((onCleanup) => {
    const { hotkey, onPress } = read(options);

    if (hotkey === false) {
      return;
    }

    onCleanup(attachHotkey(hotkey, (event) => onPress?.(event)));
  });
}

export { injectHotkey };
export type { HotkeyOptions };

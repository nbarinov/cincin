import { attachHotkey } from 'cincin/dom';
import type { Hotkey } from 'cincin/dom';
import { onMounted, toValue, watchEffect } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

type HotkeyOptions = {
  hotkey: Hotkey | false;
  onPress?: (event: KeyboardEvent) => void;
};

function useHotkey(options: MaybeRefOrGetter<HotkeyOptions>): void {
  onMounted(function subscribeHotkey() {
    watchEffect((onCleanup) => {
      const { hotkey, onPress } = toValue(options);

      if (hotkey === false) {
        return;
      }

      onCleanup(attachHotkey(hotkey, (event) => onPress?.(event)));
    });
  });
}

export { useHotkey };
export type { HotkeyOptions };

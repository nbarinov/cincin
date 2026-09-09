import { attachHotkey } from 'cincin/dom';
import type { Hotkey } from 'cincin/dom';
import { useEffect } from 'preact/hooks';
import { useLatestRef } from '../shared/use-latest-ref';

type HotkeyOptions = {
  hotkey: Hotkey | false;
  onPress?: (event: KeyboardEvent) => void;
};

function useHotkey(options: HotkeyOptions): void {
  const { hotkey, onPress } = options;
  const latest = useLatestRef(onPress);

  useEffect(
    function subscribeHotkey() {
      if (hotkey === false) {
        return;
      }

      return attachHotkey(hotkey, (event) => latest.current?.(event));
    },
    [hotkey, latest]
  );
}

export { useHotkey };
export type { HotkeyOptions };

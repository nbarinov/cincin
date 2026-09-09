import { cleanup, fireEvent, render } from '@testing-library/vue';
import type { Hotkey } from 'cincin/dom';
import { defineComponent, nextTick, ref } from 'vue';
import { useHotkey } from './use-hotkey';

function press(): void {
  fireEvent.keyDown(document, { key: 't', code: 'KeyT', altKey: true });
}

function host(setup: () => void) {
  return defineComponent({
    setup() {
      setup();
      return () => null;
    },
  });
}

afterEach(() => {
  cleanup();
});

describe('useHotkey', () => {
  it('should listen while mounted and stop on unmount', () => {
    const onPress = vi.fn();
    const { unmount } = render(
      host(() => useHotkey({ hotkey: 'Alt+T', onPress }))
    );

    press();
    expect(onPress).toHaveBeenCalledTimes(1);

    unmount();
    press();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should attach nothing for false', () => {
    const onPress = vi.fn();
    render(host(() => useHotkey({ hotkey: false, onPress })));

    press();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should follow the hotkey ref', async () => {
    const onPress = vi.fn();
    const hotkey = ref<Hotkey>('Alt+T');
    render(host(() => useHotkey(() => ({ hotkey: hotkey.value, onPress }))));

    hotkey.value = 'Control+K';
    await nextTick();
    press();
    expect(onPress).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'k', code: 'KeyK', ctrlKey: true });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

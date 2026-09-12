import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fireEvent, render } from '@testing-library/angular';
import type { Hotkey } from 'cincin/dom';
import { injectHotkey } from './inject-hotkey';

const hotkey = signal<Hotkey | false>('Alt+T');
let onPress: (event: KeyboardEvent) => void;

@Component({ template: '' })
class Host {
  constructor() {
    injectHotkey(() => ({ hotkey: hotkey(), onPress }));
  }
}

function press(): void {
  fireEvent.keyDown(document, { key: 't', code: 'KeyT', altKey: true });
}

describe('injectHotkey', () => {
  it('should listen after the render and stop on destroy', async () => {
    hotkey.set('Alt+T');
    onPress = vi.fn();
    const view = await render(Host);

    press();
    expect(onPress).toHaveBeenCalledTimes(1);

    view.fixture.destroy();
    press();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should attach nothing for false', async () => {
    hotkey.set(false);
    onPress = vi.fn();
    await render(Host);

    press();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should follow the hotkey source', async () => {
    hotkey.set('Alt+T');
    onPress = vi.fn();
    await render(Host);

    hotkey.set('Control+K');
    TestBed.tick();

    press();
    expect(onPress).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'k', code: 'KeyK', ctrlKey: true });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

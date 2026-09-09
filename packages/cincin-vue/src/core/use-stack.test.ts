import { cleanup, render } from '@testing-library/vue';
import { defineComponent, h } from 'vue';
import { useStack } from './use-stack';

afterEach(() => {
  cleanup();
});

describe('useStack', () => {
  it('should size the viewport element through the ref and release it on unmount', () => {
    const Host = defineComponent({
      setup() {
        const stack = useStack([]);
        return () => h('ol', { 'data-testid': 'viewport', ref: stack.ref });
      },
    });
    const view = render(Host);
    const viewport = view.getByTestId('viewport');

    expect(viewport.style.getPropertyValue('--cincin-stack-height')).toBe('0');
    expect(viewport.style.getPropertyValue('--cincin-stack-backs')).toBe('0');

    view.unmount();

    expect(viewport.style.getPropertyValue('--cincin-stack-height')).toBe('');
  });
});

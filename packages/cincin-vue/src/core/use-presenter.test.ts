import { cleanup, render } from '@testing-library/vue';
import { createToaster } from 'cincin';
import type { Presenter, PresenterOptions } from 'cincin/presenter';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { usePresenter } from './use-presenter';
import { useToasts } from './use-toasts';

function setup(options?: MaybeRefOrGetter<PresenterOptions>) {
  const toaster = createToaster();
  let presenter!: Presenter<string>;

  const Host = defineComponent({
    setup() {
      presenter = usePresenter(toaster, options);
      return () => h('div');
    },
  });

  const view = render(Host);

  return { toaster, presenter, view };
}

afterEach(() => {
  cleanup();
});

describe('usePresenter', () => {
  it('should live with the component: mounted on mount, unmounted on unmount', () => {
    const { toaster, presenter, view } = setup();

    toaster.message('hello');
    expect(presenter.getSnapshot()).toHaveLength(1);

    view.unmount();
    expect(presenter.getSnapshot()).toHaveLength(0);
  });

  it('should keep options live through a getter', async () => {
    const max = shallowRef(1);
    const { toaster, presenter } = setup(() => ({ max: max.value }));

    toaster.message('one');
    toaster.message('two');

    const active = () =>
      presenter.getSnapshot().filter((toast) => toast.phase === 'active');
    expect(active()).toHaveLength(1);

    // The raise lands on the post flush and promotes the queued toast.
    max.value = 2;
    await nextTick();

    expect(active()).toHaveLength(2);
  });
});

describe('useToasts', () => {
  it('should follow the presenter snapshot', async () => {
    const toaster = createToaster();
    let toasts!: ReturnType<typeof useToasts<string>>;

    const Host = defineComponent({
      setup() {
        const presenter = usePresenter(toaster);
        toasts = useToasts(presenter);
        return () =>
          h(
            'div',
            toasts.value.map((toast) => toast.entry.content)
          );
      },
    });

    const view = render(Host);
    expect(toasts.value).toHaveLength(0);

    toaster.message('hello');
    await nextTick();

    expect(toasts.value).toHaveLength(1);
    expect(view.container.textContent).toBe('hello');
  });
});

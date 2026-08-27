import type { ToastType } from 'cincin';
import { h } from 'vue';
import type { FunctionalComponent, VNode } from 'vue';

const TYPE_ICONS: Partial<Record<ToastType, FunctionalComponent>> = {
  success: icon(() => [
    h('circle', { cx: '10', cy: '10', r: '8.2' }),
    h('path', { d: 'M6.6 10.4l2.3 2.3 4.5-4.9' }),
  ]),
  error: icon(() => [
    h('circle', { cx: '10', cy: '10', r: '8.2' }),
    h('path', { d: 'M7.4 7.4l5.2 5.2M12.6 7.4l-5.2 5.2' }),
  ]),
  warning: icon(() => [
    h('path', { d: 'M10 3.4 18 16.6H2L10 3.4Z' }),
    h('path', { d: 'M10 8.6v3.2' }),
    h('path', { d: 'M10 14.3v.01' }),
  ]),
  info: icon(() => [
    h('circle', { cx: '10', cy: '10', r: '8.2' }),
    h('path', { d: 'M10 6.4v.01' }),
    h('path', { d: 'M10 9.4v4.2' }),
  ]),
  loading: icon(() => [h('path', { d: 'M18.2 10a8.2 8.2 0 0 0-8.2-8.2' })]),
};

const CloseIcon: FunctionalComponent = icon(() => [
  h('path', { d: 'M6 6l8 8M14 6l-8 8' }),
]);

export { TYPE_ICONS, CloseIcon };

// utils

function icon(children: () => VNode[]): FunctionalComponent {
  return () =>
    h(
      'svg',
      {
        'data-cincin-icon': '',
        viewBox: '0 0 20 20',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '1.8',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      },
      children()
    );
}

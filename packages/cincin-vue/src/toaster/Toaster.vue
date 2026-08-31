<script setup lang="ts">
import type { Toaster as ToasterContract } from 'cincin';
import type { SwipeDirection } from 'cincin/dom';
import { computed, useTemplateRef } from 'vue';
import { usePresenter } from '../core/use-presenter';
import { useToasts } from '../core/use-toasts';
import { useVisibilityPause } from '../core/use-visibility-pause';
import { useStack } from '../core/use-stack';
import type { ToastContent, ToasterLabels } from './content';
import { toast as defaultToaster } from './toast';
import { useRegion } from './use-region';
import ToastCard from './ToastCard.vue';

const props = withDefaults(
  defineProps<{
    /**
     * Read once, like a query client: remount to switch.
     *
     * @default package singleton
     */
    toaster?: ToasterContract<ToastContent>;
    /**
     * The skin's a11y vocabulary, one place for all toasts.
     */
    labels?: ToasterLabels;
    /**
     * Directions a swipe may dismiss along.
     *
     * @default ['right', 'down']
     */
    swipeDirections?: readonly SwipeDirection[];
    /**
     * How many toasts peek out of the collapsed stack.
     *
     * @default 3
     */
    visible?: number;
    /**
     * Active presentations at once; the rest queue.
     *
     * @default Infinity
     */
    max?: number;
    /**
     * The exit animation's length, ms. One value drives both sides: the
     * presenter's exit clock and, published as `--cincin-exit-duration`,
     * the skin's motion durations.
     *
     * @default 400
     */
    exitDuration?: number;
  }>(),
  {
    toaster: () => defaultToaster,
    visible: 3,
    max: Infinity,
    exitDuration: 400,
  }
);

const presenter = usePresenter(props.toaster, () => ({
  max: props.max,
  exitDuration: props.exitDuration,
}));
const toasts = useToasts(presenter);
const live = computed(() =>
  toasts.value.filter((toast) => toast.phase !== 'queued')
);

const region = useTemplateRef<HTMLElement>('region');
const { expanded, handlers } = useRegion(region, presenter);
const { layout } = useStack(live, () => ({ visible: props.visible }));

useVisibilityPause(presenter);

const regionLabel = computed(() => props.labels?.region ?? 'Notifications');
const closeLabel = computed(() => props.labels?.close ?? 'Dismiss');
</script>

<template>
  <section tabindex="-1" :aria-label="regionLabel">
    <ol
      ref="region"
      data-cincin-toaster
      :data-expanded="expanded"
      :style="{ '--cincin-exit-duration': `${exitDuration}ms` }"
      v-bind="handlers"
    >
      <ToastCard
        v-for="toast of live"
        :key="toast.key"
        :toast="toast"
        :presenter="presenter"
        :layout="layout"
        :expanded="expanded"
        :swipe-directions="swipeDirections"
        :close-label="closeLabel"
      />
    </ol>
  </section>
</template>

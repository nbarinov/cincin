<script setup lang="ts">
import type { StackLayout, SwipeDirection } from 'cincin/dom';
import type { Toast, Presenter } from 'cincin/presenter';
import { computed, useTemplateRef } from 'vue';
import { useSlot } from '../core/use-slot';
import { useToastSwipe } from '../core/use-toast-swipe';
import type { ToastAction, ToastContent } from './content';
import { CloseIcon, TYPE_ICONS } from './icons';

const props = defineProps<{
  toast: Toast<ToastContent>;
  presenter: Presenter<ToastContent>;
  layout: StackLayout;
  expanded: boolean;
  swipeDirection: SwipeDirection;
}>();

const card = useTemplateRef<HTMLElement>('card');
const stackSlot = useSlot(card, {
  layout: props.layout,
  key: props.toast.key,
});

useToastSwipe(card, {
  key: props.toast.key,
  presenter: props.presenter,
  direction: () => props.swipeDirection,
  enabled: () => props.toast.entry.dismissible,
});

const content = computed(() => props.toast.entry.content);
const typeIcon = computed(() => TYPE_ICONS[props.toast.entry.type]);

// `true | undefined`, never `false`: where the inert property is not
// implemented (jsdom) Vue falls back to a literal attribute, a
// rendered inert="false" IS present, and presence alone makes the
// element inert.
const inert = computed(() => {
  const slot = stackSlot.value;

  if (slot === undefined || slot.leaving || (!props.expanded && !slot.front)) {
    return true;
  }

  return undefined;
});

const styles = computed(() => {
  const slot = stackSlot.value;

  if (slot === undefined) {
    return {};
  }

  return {
    zIndex: slot.zIndex,
    '--cincin-toast-index': String(slot.index),
    '--cincin-toast-offset': `${slot.offset}px`,
    '--cincin-toast-height':
      slot.height === undefined ? undefined : `${slot.height}px`,
    '--cincin-front-height':
      slot.frontHeight === undefined ? undefined : `${slot.frontHeight}px`,
  };
});

function onAction(action: ToastAction, event: MouseEvent): void {
  action.onClick(event);

  if (!event.defaultPrevented) {
    props.presenter.dismiss(props.toast.key);
  }
}
</script>

<template>
  <li
    ref="card"
    :role="
      toast.entry.type === 'error' || toast.entry.type === 'warning'
        ? 'alert'
        : 'status'
    "
    data-cincin-toast
    :data-type="toast.entry.type"
    :data-phase="toast.phase"
    :data-dismissible="toast.entry.dismissible"
    :data-hidden="stackSlot && String(stackSlot.hidden)"
    :data-front="
      stackSlot === undefined || stackSlot.leaving
        ? undefined
        : String(stackSlot.front)
    "
    :style="styles"
    :inert="inert"
  >
    <div data-cincin-body>
      <component :is="typeIcon" v-if="typeIcon" />

      <div data-cincin-content>
        <div v-if="content.description === undefined" data-cincin-description>
          {{ content.title }}
        </div>
        <template v-else>
          <div data-cincin-title>{{ content.title }}</div>
          <div data-cincin-description>{{ content.description }}</div>
        </template>
      </div>

      <button
        v-if="toast.entry.dismissible && (content.closeButton ?? true)"
        type="button"
        data-cincin-close
        aria-label="Dismiss"
        @click="presenter.dismiss(toast.key)"
      >
        <CloseIcon />
      </button>

      <div v-if="content.actions !== undefined" data-cincin-actions>
        <button
          v-for="(action, index) of content.actions"
          :key="index"
          type="button"
          data-cincin-action
          :data-variant="action.variant ?? 'primary'"
          @click="onAction(action, $event)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>
  </li>
</template>

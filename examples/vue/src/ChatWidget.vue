<script lang="ts">
type Clearance = {
  x: number;
  y: number;
};

export type { Clearance };
</script>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { ToasterPosition } from 'cincin-vue';

const props = defineProps<{
  position: ToasterPosition;
}>();

const emit = defineEmits<{
  clearance: [clearance: Clearance];
}>();

const GAP = 12;

const open = ref(false);
const element = ref<HTMLElement | null>(null);

watchEffect((onCleanup) => {
  const node = element.value;

  if (node === null) {
    return;
  }

  const observer = new ResizeObserver(() => {
    emit('clearance', {
      x: node.offsetWidth + GAP,
      y: node.offsetHeight + GAP,
    });
  });

  observer.observe(node);

  onCleanup(() => {
    observer.disconnect();
    emit('clearance', { x: 0, y: 0 });
  });
});
</script>

<template>
  <div
    ref="element"
    data-widget
    :data-y="props.position.split('-')[0]"
    :data-x="props.position.split('-')[1]"
    :data-open="open"
  >
    <button type="button" :aria-expanded="open" @click="open = !open">
      {{ open ? 'Chat ↓' : '💬' }}
    </button>

    <p v-if="open">Hi! Nobody is reading this, it is here to take up room.</p>
  </div>
</template>

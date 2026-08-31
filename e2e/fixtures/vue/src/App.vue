<script setup lang="ts">
import { Toaster, toast } from 'cincin-vue';
import { initFixture } from '../../shared/params';
import { createScenarios } from '../../shared/scenarios';

const { position, duration } = initFixture();
const scenarios = createScenarios(toast, { duration });
</script>

<template>
  <main>
    <h1>cincin e2e · vue</h1>

    <button
      v-for="scenario of scenarios"
      :key="scenario.id"
      type="button"
      :data-testid="scenario.id"
      @click="scenario.run"
    >
      {{ scenario.label }}
    </button>

    <Toaster :position="position" />
  </main>
</template>

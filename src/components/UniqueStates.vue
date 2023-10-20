<template>
  <div class="flex flex-col bg-slate-950 p-4 max-w-[32rem] gap-2">
    <p class="font-bold">Total: {{ analyzer.statesQuantity.value }}</p>
    <div class="grid grid-cols-3 gap-2">
        <p class="font-bold">State</p>
        <p class="font-bold">Absolute probability</p>
        <p class="font-bold">Relative probability</p>
      </div>
    <div
      v-for="[state, quantity] in analyzer.statesAbsoluteProbabilities.value.entries()"
      v-bind:key="state"
    >
      <div class="grid grid-cols-3 gap-2" :class="analyzer.lastState.value === state ? 'bg-slate-800' : ''">
        <p>{{ state }}</p>
        <p>{{ quantity }}</p>
        <p>{{ (quantity / analyzer.statesQuantity.value).toFixed(3).replace(/\.?0+$/gm, '') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SystemOfMassServiceAnalyzer } from '@/types/systemOfMassServiceAnalyzer'

defineProps<{
  analyzer: SystemOfMassServiceAnalyzer
}>()
</script>

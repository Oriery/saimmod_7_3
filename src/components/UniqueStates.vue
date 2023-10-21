<template>
  <div class="flex flex-col bg-slate-950 p-4 gap-2">
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
        <p>{{ shortenNumber(quantity / analyzer.statesQuantity.value) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SystemOfMassServiceAnalyzer } from '@/types/systemOfMassServiceAnalyzer'
import shortenNumber from '@/utils/shortenNumber'

defineProps<{
  analyzer: SystemOfMassServiceAnalyzer
}>()
</script>

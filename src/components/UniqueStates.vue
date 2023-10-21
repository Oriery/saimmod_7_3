<template>
  <div class="flex flex-col bg-slate-950 p-4 gap-2">
    <p class="font-bold">Total: {{ analyzer.statesQuantity.value }}</p>
    <div class="grid grid-cols-3 gap-2">
      <p class="font-bold">State</p>
      <p class="font-bold">Absolute probability</p>
      <p class="font-bold">Relative probability</p>
    </div>
    <div class="flex flex-col">
      <div
        v-for="[state, quantity] in analyzer.statesAbsoluteProbabilities.value.entries()"
        v-bind:key="state"
        class="bg-slate-900 odd:bg-slate-800"
      >
        <div
          class="grid grid-cols-3 gap-2 py-1"
          :class="analyzer.lastState.value === state ? 'bg-blue-900' : ''"
        >
          <p class="px-2">{{ state }}</p>
          <p class="px-2">{{ quantity }}</p>
          <p class="px-2">{{ shortenNumber(quantity / analyzer.statesQuantity.value) }}</p>
        </div>
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

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-row">
      <v-btn @click="analyzer.reset()">Reset Analytics</v-btn>
    </div>
    <div class="flex flex-wrap gap-2">
      <UniqueStates :analyzer="analyzer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import UniqueStates from './UniqueStates.vue'
import { SystemOfMassServiceAnalyzer } from '@/types/systemOfMassServiceAnalyzer'

defineProps<{
  analyzer: SystemOfMassServiceAnalyzer
}>()
</script>

<template>
  <main class="flex flex-col gap-4">
    <div class="flex flex-row gap-4">
      <p class="text-center pt-1">TPS: {{ ticksPerSecond }}</p>
      <v-slider
        step="1"
        show-ticks
        v-model="ticksPerSecondExponent"
        :min="0"
        :max="8"
      ></v-slider>
    </div>
    <div class="flex flex-row gap-4">
      <v-btn
        @click="isRunning = !isRunning"
        :color="isRunning ? 'green-darken-4' : 'red-darken-4'"
      >
        {{ (isRunning ? 'Pause' : 'Unpause') + ' (SPACE)' }}
      </v-btn>
    </div>
    <SystemAnalytics
      v-if="sysMasSer"
      :analyzer="sysMasSerAnalyzer"
    />
    <div
      v-if="sysMasSer"
      class="grid gap-2 grid-cols-2 lg:grid-cols-3"
    >
      <NodeBase
        v-for="node in sysMasSer.nodes"
        v-bind:key="node.id"
        :node="node"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch, computed } from 'vue'
import {
  Generator,
  Processor,
  WhatToDoOnBlockedOutput,
  SystemOfMassService,
  Queue,
} from '../types/systemsOfMassService'
import NodeBase from '../components/NodeBase.vue'
import { SystemOfMassServiceAnalyzer } from '@/types/systemOfMassServiceAnalyzer'
import SystemAnalytics from '@/components/SystemAnalytics.vue'

let interval: number | null = null
const ticksPerSecondExponent = ref(0)
const ticksPerSecond = computed(() => {
  return 2 ** ticksPerSecondExponent.value
})
const isRunning = ref(true)

let sysMasSer: SystemOfMassService | null = null

sysMasSer = new SystemOfMassService()

const generator = new Generator(sysMasSer, 0.2, WhatToDoOnBlockedOutput.WAIT)
const generator2 = new Generator(sysMasSer, 0.8, WhatToDoOnBlockedOutput.DROP)
const processor = new Processor(sysMasSer, 0.6, WhatToDoOnBlockedOutput.WAIT)
const processor4 = new Processor(sysMasSer, 0.6, WhatToDoOnBlockedOutput.DROP)
const queue = new Queue(sysMasSer, 2)
const processor2 = new Processor(sysMasSer, 0.8)
const processor3 = new Processor(sysMasSer, 0.8)

generator.addOutwardNode(processor)
generator.addOutwardNode(processor4)
generator2.addOutwardNode(processor)
generator2.addOutwardNode(processor4)
processor.addOutwardNode(queue)
processor4.addOutwardNode(queue)
queue.addOutwardNode(processor2)
queue.addOutwardNode(processor3)

const sysMasSerAnalyzer = new SystemOfMassServiceAnalyzer(sysMasSer)
sysMasSerAnalyzer.reset()
sysMasSerAnalyzer.recordState()

interval = setInterval(oneTickHandler, 1000 / ticksPerSecond.value)

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})

watch(isRunning, (newVal) => {
  if (newVal) {
    interval = setInterval(oneTickHandler, 1000 / ticksPerSecond.value)
  } else {
    if (interval) {
      clearInterval(interval)
    }
  }
})

watch(ticksPerSecond, (newVal) => {
  if (isRunning.value) {
    if (interval) {
      clearInterval(interval)
    }
    interval = setInterval(oneTickHandler, 1000 / newVal)
  }
})

// when SPACE is pressed - pause/unpause
window.addEventListener('keydown', (e) => {
  e.preventDefault()
  if (e.code === 'Space') {
    isRunning.value = !isRunning.value
  }
})

function oneTickHandler(): void {
  if (sysMasSer) {
    sysMasSer.doFullTick()
    sysMasSerAnalyzer.recordState()
  }
}
</script>

<template>
  <main>
    <div
      v-if="sysMasSer"
      class="grid gap-2 grid-cols-3"
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
import { onUnmounted } from 'vue'
import {
  Generator,
  Processor,
  WhatToDoOnBlockedOutput,
  SystemOfMassService,
  Queue,
} from '../types/systemsOfMassService'
import NodeBase from '../components/NodeBase.vue'

let interval: number | null = null

let sysMasSer: SystemOfMassService | null = null

console.log(
  '#############################################################################################',
)

sysMasSer = new SystemOfMassService()

const generator = new Generator(sysMasSer, 0.2, WhatToDoOnBlockedOutput.WAIT)
const processor = new Processor(sysMasSer, 0.6, WhatToDoOnBlockedOutput.DROP)
const processor4 = new Processor(sysMasSer, 0.6, WhatToDoOnBlockedOutput.DROP)
const queue = new Queue(sysMasSer, 3)
const processor2 = new Processor(sysMasSer, 0.8)
const processor3 = new Processor(sysMasSer, 0.8)

generator.addOutwardNode(processor)
generator.addOutwardNode(processor4)
processor.addOutwardNode(queue)
processor4.addOutwardNode(queue)
queue.addOutwardNode(processor2)
queue.addOutwardNode(processor3)

interval = setInterval(() => {
  if (sysMasSer) {
    sysMasSer.doFullTick()
  }
}, 1000)

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})
</script>

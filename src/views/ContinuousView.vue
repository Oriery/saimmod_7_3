<template>
  <main class="flex flex-col gap-4">
    <div class="text-start">
      <p>Time: {{ sysMasSer?.timeAlive }}</p>
      <p>Absolute: {{ shortenNumber(sysMasSer?.absoluteThroughput.value ?? 0) }} tickets/s</p>
      <p>Relative: {{ shortenNumber(sysMasSer?.relativeThroughput.value ?? 0) }}</p>
    </div>
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
import {
  Generator,
  AnalyzableSystemOfMassService,
  Queue,
  AnalyzableBreakingProcessor,
} from '../types/contSystemsOfMassService'
import NodeBase from '../components/ContNodeBase.vue'
import shortenNumber from '@/utils/shortenNumber';

let sysMasSer: AnalyzableSystemOfMassService | null = null

sysMasSer = new AnalyzableSystemOfMassService()

/* setup for laba 4 */
const gen = new Generator(sysMasSer, 1.5)
const queue = new Queue(sysMasSer, 1)
const proc1 = new AnalyzableBreakingProcessor(sysMasSer, 0.8, 0.01, 0.1)
const proc2 = new AnalyzableBreakingProcessor(sysMasSer, 0.8, 0.01, 0.1)

proc1.setNodeToPushTicketToWhenBroken(queue)
proc2.setNodeToPushTicketToWhenBroken(queue)

gen.addOutwardNode(queue)
queue.addOutwardNode(proc1)
queue.addOutwardNode(proc2)

sysMasSer.start()
</script>

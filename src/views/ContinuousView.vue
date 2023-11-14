<template>
  <main class="flex flex-col gap-4">
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
  SystemOfMassService,
  Queue,
  AnalyzableBreakingProcessor,
} from '../types/contSystemsOfMassService'
import NodeBase from '../components/ContNodeBase.vue'

let sysMasSer: SystemOfMassService | null = null

sysMasSer = new SystemOfMassService()

/* setup for laba 4 */
const gen = new Generator(sysMasSer, 1.5)
const queue = new Queue(sysMasSer, 1)
const proc1 = new AnalyzableBreakingProcessor(sysMasSer, 0.8, 0.1, 0.4)
const proc2 = new AnalyzableBreakingProcessor(sysMasSer, 0.8, 0.1, 0.4)

proc1.setNodeToPushTicketToWhenBroken(queue)
proc2.setNodeToPushTicketToWhenBroken(queue)

gen.addOutwardNode(queue)
queue.addOutwardNode(proc1)
queue.addOutwardNode(proc2)

sysMasSer.start()
</script>

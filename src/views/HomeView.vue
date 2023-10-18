<template>
  <main>
    <v-btn @click="test">test</v-btn>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { Queue, Generator, Processor, Ticket, WhatToDoOnBlockedOutput, SystemOfMassService } from '../types/systemsOfMassService'

function test() {
  
}

let interval : number | null = null

onMounted(() => {
  console.log('#############################################################################################')

  const sysMasSer = new SystemOfMassService()

  const generator = new Generator(0.5, WhatToDoOnBlockedOutput.WAIT)
  sysMasSer.addNode(generator)

  const processor = new Processor(0.6)
  sysMasSer.addNode(processor)

  generator.addOutwardNode(processor)

  interval = setInterval(() => { 
    sysMasSer.doFullTick()
  }, 1000)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})

</script>

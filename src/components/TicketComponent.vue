<template>
  <div
    class="rounded p-2"
    :style="`background-color: ${color};`"
  >
    <p>Time alive: {{ ticket.ticksAlive }}</p>
  </div>
</template>

<script setup lang="ts">
import { Ticket } from '@/types/systemsOfMassService'
import uniqolor from 'uniqolor'

const props = defineProps<{
  ticket: Ticket
}>()

let color = uniqolor(props.ticket.id, {
  saturation: [35, 70],
  lightness: [10, 20],
}).color
</script>

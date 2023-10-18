<template>
  <div class="rounded bg-slate-800 flex flex-col gap-2 p-2">
    <p>{{ node.id }}</p>
    <div v-if="node.outwardNodes.length" class="">
      Outward nodes:
      <div class="flex flex-col gap-2 align-end">
        <p
          v-for="n in node.outwardNodes"
          v-bind:key="n.id"
        >
          {{ n.id }}
        </p>
      </div>
    </div>
    <div class="flex flex-row gap-2 border-t-2 border-slate-700 pt-2">
      <TicketComponent
        v-for="ticket in node.ticketsInside.value"
        v-bind:key="ticket.id"
        :ticket="ticket"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { BaseNode } from '@/types/systemsOfMassService'
import TicketComponent from './TicketComponent.vue'

defineProps<{
  node: BaseNode
}>()
</script>

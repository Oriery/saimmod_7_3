<template>
  <div class="rounded bg-slate-800 flex flex-col gap-2 p-2">
    <p>{{ node.id }}</p>
    <div class="flex flex-row gap-2">
      <TicketComponent v-for="ticket in node.ticketsInside.value" v-bind:key="ticket.id" :ticket="ticket" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { BaseNode } from '@/types/systemsOfMassService'
import { ref, computed } from 'vue'
import TicketComponent from './TicketComponent.vue'

const props = defineProps<{
  node: BaseNode
}>()
</script>

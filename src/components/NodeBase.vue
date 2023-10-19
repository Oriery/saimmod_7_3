<template>
  <div
    class="rounded flex flex-col gap-2 p-2"
    :class="NODE_TYPE_TO_BG_COLOR[node.nodeType]"
  >
    <p>{{ NODE_TYPE_TO_NAME[node.nodeType] }} {{ node.id }}</p>
    <div
      v-if="node.outwardNodes.length"
      class=""
    >
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
    <div class="flex flex-col gap-2 border-t-2 border-slate-700 pt-2">
      <TicketComponent
        v-if="node.ticketsInside.value[0]"
        v-bind:key="node.ticketsInside.value[0].id"
        :ticket="node.ticketsInside.value[0]"
      />
      <div class="grid grid-cols-3 gap-2">
        <TicketComponent
          v-for="ticket in node.ticketsInside.value.filter((_, i) => i > 0)"
          v-bind:key="ticket.id"
          :ticket="ticket"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BaseNode, NODE_TYPE_TO_NAME, NodeType } from '@/types/systemsOfMassService'
import TicketComponent from './TicketComponent.vue'

defineProps<{
  node: BaseNode
}>()

const NODE_TYPE_TO_BG_COLOR = {
  [NodeType.GENERATOR]: 'bg-emerald-950',
  [NodeType.QUEUE]: 'bg-indigo-950',
  [NodeType.PROCESSOR]: 'bg-pink-950',
}
</script>

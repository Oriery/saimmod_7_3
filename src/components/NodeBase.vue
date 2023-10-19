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
    <div
      class="flex flex-col gap-2 border-t-2 border-slate-700 pt-2"
      ref="parentForTickets"
    ></div>
  </div>
</template>

<script setup lang="ts">
import {
  BaseNode,
  NODE_TYPE_TO_NAME,
  NodeType,
  Ticket,
  Generator,
} from '@/types/systemsOfMassService'
import TicketComponent from './TicketComponent.vue'
import { ref, h, render, onMounted, watch } from 'vue'
import changeParentSmoothly from '@/utils/changeParentSmoothly'

const parentForTickets = ref<HTMLElement | null>(null)

const props = defineProps<{
  node: BaseNode
}>()

const node = props.node

onMounted(() => {
  node.refToContainer = parentForTickets
})

if (node.nodeType === NodeType.GENERATOR) {
  ;(node as Generator).onTicketCreated.push(async (ticket: Ticket) => {
    if (!parentForTickets.value) {
      throw new Error('parentForTickets is null')
    }

    const container = document.createElement('div')
    parentForTickets.value.appendChild(container)

    const vnode = h(TicketComponent, { ticket })
    render(vnode, container)

    ticket.onContainerNodeChanged.push(async (newContainerNode: BaseNode | null): Promise<void> => {
      if (!newContainerNode) {
        throw new Error('newContainerNode is null')
      }

      await changeParentSmoothly(ref(container), ref(newContainerNode.refToContainer), 200)
    })

    ticket.onTicketDestroyed.push(() => {
      container.remove()
    })
  })
}

const NODE_TYPE_TO_BG_COLOR = {
  [NodeType.GENERATOR]: 'bg-emerald-950',
  [NodeType.QUEUE]: 'bg-indigo-950',
  [NodeType.PROCESSOR]: 'bg-pink-950',
}
</script>

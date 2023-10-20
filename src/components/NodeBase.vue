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
      <div class="grid grid-cols-3">
        <div></div>
        <div>
          Outward nodes:
        </div>
        <div v-if="node.hasBlockedOutput.value" class="text-red-500 text-end">
          Blocked
        </div>
      </div>
      <div class="flex flex-col align-end">
        <p
          v-for="n in node.outwardNodes"
          v-bind:key="n.id"
        >
          {{ n.id }}
        </p>
      </div>
    </div>
    <div
      class="border-t-2 border-slate-700 pt-2 min-h-[10rem]"
      ref="parentForTickets"
      :class="node.nodeType === NodeType.QUEUE ? ' flex gap-2 flex-col' : ' children-are-absolute relative'"
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
  TicketDestoyReason,
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

    container.className = 'rounded'
    container.style.transition = 'all 300ms ease-in-out'

    const vnode = h(TicketComponent, { ticket })
    render(vnode, container)

    ticket.onContainerNodeChanged.push(async (newContainerNode: BaseNode | null): Promise<void> => {
      if (!newContainerNode) {
        throw new Error('newContainerNode is null')
      }

      await changeParentSmoothly(ref(container), ref(newContainerNode.refToContainer), 300)
    })

    ticket.onTicketDestroyed(async (ticketDestoyReason: TicketDestoyReason) => {
      container.className += ' p-1 -m-1'
      container.style.transform = 'translateY(162%)'

      if (ticketDestoyReason === TicketDestoyReason.SUCCESSFULLY_PROCESSED) {
        container.className += ' bg-green-800'
      } else if (ticketDestoyReason === TicketDestoyReason.DROPPED) {
        container.className += ' bg-red-800'
      }

      await new Promise((resolve) => setTimeout(resolve, 600))

      container.className += ' opacity-0 overflow-hidden p-0 bg-none'
      container.style.transform = 'translateY(262%)'

      await new Promise((resolve) => setTimeout(resolve, 300))

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

<style>

.children-are-absolute > * {
  position: absolute;
  left: 0;
  right: 0;
}

</style>
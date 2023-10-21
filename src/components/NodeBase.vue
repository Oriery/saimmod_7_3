<template>
  <div
    class="rounded flex flex-col gap-1 p-2"
    :class="NODE_TYPE_TO_BG_COLOR[node.nodeType]"
  >
    <p>{{ NODE_TYPE_TO_NAME[node.nodeType] }} {{ node.id }}</p>
    <p v-if="node.nodeType === NodeType.PROCESSOR && node.outwardNodes.length > 0">
      On blocked: {{ WhatToDoOnBlockedOutput[node.whatToDoOnBlockedOutput] }}
    </p>
    <p v-if="node.nodeType === NodeType.GENERATOR && node.outwardNodes.length > 0">
      On blocked: {{ ["Do not generate", "Generate but drop"][node.whatToDoOnBlockedOutput] }}
    </p>
    <p v-if="node.nodeType === NodeType.GENERATOR">
      Probability of not generating: {{ (node as Generator).probabilityOfNotGeneratingTicket }}
    </p>
    <p v-if="node.nodeType === NodeType.PROCESSOR">
      Probability of not processing: {{ (node as Processor).probabilityOfNotProcessingTicket }}
    </p>
    <p v-if="node.outwardNodes.length">
      Blocked time: {{ shortenNumber(node.blockedTimeRatio.value) }}
    </p>
    <p v-if="node.nodeType !== NodeType.GENERATOR">
      Avg tickets inside: {{ shortenNumber(node.avgTicketsInside.value) }}
    </p>
    <p v-if="node.nodeType === NodeType.QUEUE">
      Full time: {{ shortenNumber(node.beingFullRatio.value) }}
    </p>
    <div v-if="node.outwardNodes.length">
      <div class="grid grid-cols-3">
        <div></div>
        <div>Outward nodes:</div>
        <Transition>
          <div
            v-if="node.hasBlockedOutput.value"
            class="flex flex-row-reverse"
          >
            <div class="text-grey-300 font-bold">Blocked</div>
          </div>
        </Transition>
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
    <p v-if="node.nodeType === NodeType.QUEUE">Capacity: {{ node.capacity }}</p>
    <div
      class="border-t-2 border-slate-700 pt-2 min-h-[10rem] flex-grow"
      ref="parentForTickets"
      :class="
        node.nodeType === NodeType.QUEUE
          ? ' flex gap-2 flex-col'
          : ' children-are-absolute relative'
      "
    >
      <Transition>
        <div
          v-if="
            node.nodeType === NodeType.PROCESSOR &&
            (node as Processor).couldNotPushTicketOutwardOnPrevTick.value
          "
          class="absolute bottom-0 left-0 right-0 flex justify-center"
        >
          <p class="font-bold text-grey-300 bg-red-900 rounded py-2 px-4">
            Ready but blocked output
          </p>
        </div>
      </Transition>
    </div>
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
  Processor,
  WhatToDoOnBlockedOutput,
} from '@/types/systemsOfMassService'
import TicketComponent from './TicketComponent.vue'
import { ref, h, render, onMounted } from 'vue'
import changeParentSmoothly from '@/utils/changeParentSmoothly'
import shortenNumber from '@/utils/shortenNumber'

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

    ticket.onContainerNodeChanged.push(async (newContainerNode: BaseNode): Promise<void> => {
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

<style scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>

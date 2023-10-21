<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-row">
      <v-btn @click="analyzer.reset()">Reset Analytics</v-btn>
    </div>
    <div class="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
      <UniqueStates
        :analyzer="analyzer"
        class="col-span-3"
      />
      <div class="flex flex-col bg-slate-950 p-4 col-span-2">
        <table class="bg-slate-950 p-4 col-span-2">
          <tbody>
            <tr
              v-for="data in tableOfData"
              :key="data.text"
              class="bg-slate-900 odd:bg-slate-800"
            >
              <td class="px-2 py-1">{{ data.text }}</td>
              <td class="px-2 py-1 align-middle">{{ shortenNumber(data.val) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import UniqueStates from './UniqueStates.vue'
import { SystemOfMassServiceAnalyzer } from '@/types/systemOfMassServiceAnalyzer'
import shortenNumber from '@/utils/shortenNumber'
import { computed } from 'vue'

const props = defineProps<{
  analyzer: SystemOfMassServiceAnalyzer
}>()

const tableOfData = computed(() => {
  return [
    {
      text: 'Avg tickets in system',
      val:
        props.analyzer.ticketAnalyzer.sumOfTicketsNowInSystem.value /
        props.analyzer.statesQuantity.value,
    },
    {
      text: 'Avg tickets in queues',
      val: props.analyzer.sumLengthOfQueues.value / props.analyzer.statesQuantity.value,
    },
    {
      text: 'Avg time spent in system',
      val:
        props.analyzer.ticketAnalyzer.sumOfTimeBeingInSystem.value /
        props.analyzer.ticketAnalyzer.totalTicketsLeftSystem.value,
    },
    {
      text: 'Avg time spent in queue',
      val:
        props.analyzer.ticketAnalyzer.sumOfTimeWaitingInQueue.value /
        props.analyzer.ticketAnalyzer.totalTicketsLeftSystem.value,
    },
    {
      text: 'Fraction of tickets successfully processed (not dropped)',
      val:
        props.analyzer.ticketAnalyzer.ticketsProcessed.value /
        props.analyzer.ticketAnalyzer.totalTicketsLeftSystem.value,
    },
    {
      text: 'Absolute throughput rate',
      val:
        props.analyzer.ticketAnalyzer.ticketsProcessed.value /
        props.analyzer.statesQuantity.value,
    }
  ]
})
</script>

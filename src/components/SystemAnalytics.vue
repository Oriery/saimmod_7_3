<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-row">
      <v-btn @click="analyzer.reset()">Reset Analytics</v-btn>
    </div>
    <div class="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
      <UniqueStates :analyzer="analyzer" class="col-span-3"/>
      <div class="flex flex-col bg-slate-950 p-4 gap-2 col-span-2">
        <div class="grid grid-cols-2">
          <div>Avg tickets in system</div>
          <div>
            {{
              shortenNumber(
                analyzer.ticketAnalyzer.sumOfTicketsNowInSystem.value /
                  analyzer.statesQuantity.value,
              )
            }}
          </div>
        </div>
        <div class="grid grid-cols-2">
          <div>Avg tickets in queues</div>
          <div>
            {{ shortenNumber(analyzer.sumLengthOfQueues.value / analyzer.statesQuantity.value) }}
          </div>
        </div>
        <div class="grid grid-cols-2">
          <div>Avg time spent in system</div>
          <div>
            {{
              shortenNumber(
                analyzer.ticketAnalyzer.sumOfTimeBeingInSystem.value /
                  analyzer.ticketAnalyzer.totalTicketsLeftSystem.value,
              )
            }}
          </div>
        </div>
        <div class="grid grid-cols-2">
          <div>Avg time spent in queue</div>
          <div>
            {{
              shortenNumber(
                analyzer.ticketAnalyzer.sumOfTimeWaitingInQueue.value /
                  analyzer.ticketAnalyzer.totalTicketsLeftSystem.value,
              )
            }}
          </div>
        </div>
        <div class="grid grid-cols-2">
          <div>Fraction of tickets successfully processed (not dropped)</div>
          <div>
            {{
              shortenNumber(
                analyzer.ticketAnalyzer.ticketsProcessed.value /
                  analyzer.ticketAnalyzer.totalTicketsLeftSystem.value,
              )
            }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import UniqueStates from './UniqueStates.vue'
import { SystemOfMassServiceAnalyzer } from '@/types/systemOfMassServiceAnalyzer'
import shortenNumber from '@/utils/shortenNumber'

defineProps<{
  analyzer: SystemOfMassServiceAnalyzer
}>()
</script>

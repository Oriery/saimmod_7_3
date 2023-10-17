<template>
  <div class="flex flex-col gap-2">
    <div class="grid grid-cols-2 w-full gap-2">
      <div
        id="parent0"
        ref="parent0"
        class="flex flex-col gap-2"
      >
        <div class="p-4 bg-blue-100 dark:bg-blue-900 rounded">Some other div</div>
        <div class="p-4 bg-blue-100 dark:bg-blue-900 rounded">Some other div</div>
        <div
          ref="child"
          class="p-4 bg-green-100 dark:bg-green-900 rounded"
        >
          Move me to another Parent by clicking the button below
        </div>
        <div class="p-4 bg-blue-100 dark:bg-blue-900 rounded">Some other div</div>
      </div>
      <div
        id="parent1"
        ref="parent1"
        class="flex flex-col gap-2"
      >
        <div class="p-4 bg-blue-100 dark:bg-blue-900 rounded">Some other div</div>
        <div class="p-4 bg-blue-100 dark:bg-blue-900 rounded">Some other div</div>
      </div>
    </div>
    <v-btn @click="toggle">Toggle column</v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'
import changeParentSmoothly from '../utils/changeParentSmoothly'

const parent0 = ref<HTMLElement | null>(null)
const parent1 = ref<HTMLElement | null>(null)
const child = ref<HTMLElement | null>(null)
const inParent0 = ref(true)

async function toggle() {
  if (!parent1.value || !parent0.value || !child.value) {
    console.error('One of the objects is null')
    return
  }

  if (inParent0.value) {
    await changeParentSmoothly(child as Ref<HTMLElement>, parent1 as Ref<HTMLElement>)
    inParent0.value = false
  } else {
    await changeParentSmoothly(child as Ref<HTMLElement>, parent0 as Ref<HTMLElement>)
    inParent0.value = true
  }
}
</script>

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

const transitionInProgress = ref(false)

const parent0 = ref<HTMLElement | null>(null)
const parent1 = ref<HTMLElement | null>(null)
const child = ref<HTMLElement | null>(null)
const inParent0 = ref(true)

const getRect = (element: HTMLElement) => element.getBoundingClientRect()

const move = async (child: Ref<HTMLElement>, toParent: Ref<HTMLElement>, transitionTime: number = 400) => {
  if (transitionInProgress.value) return
  transitionInProgress.value = true

  if (child.value) {
    const initialRect = getRect(child.value)

    const tempChild = ref(document.createElement('div'))
    toParent.value.appendChild(tempChild.value)

    const finalRect = getRect(tempChild.value)

    tempChild.value.remove()

    const dx = finalRect.left - initialRect.left
    const dy = finalRect.top - initialRect.top

    console.log(`dx: ${dx}, dy: ${dy}`)

    const tempStyleTransform = child.value.style.transform
    const tempStyleTransition = child.value.style.transition

    child.value.style.transition = `transform ${transitionTime}ms ease-in-out`
    child.value.style.transform += ' ' + `translate(${dx}px, ${dy}px)`

    // add handler to wait for transition to end
    child.value.addEventListener(
      'transitionend',
      async (e) => {
        inParent0.value = !inParent0.value
        toParent.value.appendChild(child.value)

        child.value.style.transform = tempStyleTransform
        child.value.style.transition = tempStyleTransition

        transitionInProgress.value = false
      },
      { once: true },
    )
  } else {
    console.error('One of the elements is null')

    transitionInProgress.value = false
  }
}

function toggle() {
  if (!parent1.value || !parent0.value || !child.value) {
    console.error('One of the objects is null')
    return
  }

  if (inParent0.value) {
    move(child as Ref<HTMLElement>, parent1 as Ref<HTMLElement>)
  } else {
    move(child as Ref<HTMLElement>, parent0 as Ref<HTMLElement>)
  }
}
</script>

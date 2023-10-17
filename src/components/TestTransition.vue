<template>
  <div
    id="parent0"
    ref="parent0"
    class="min-h-[10rem]"
  >
    <div
      ref="child"
    >
      Move me to another Parent
    </div>
  </div>
  <div
    id="parent1"
    ref="parent1"
    class="min-h-[10rem]"
  ></div>
  <v-btn @click="move(inParent0)">Move to another place</v-btn>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { Ref } from 'vue'

const TRANSITION_DURATION = 0.3

const transitionInProgress = ref(false)

const parent0 = ref<HTMLElement | null>(null)
const parent1 = ref<HTMLElement | null>(null)
const child = ref<HTMLElement | null>(null)
const inParent0 = ref(true)

const getRect = (element: HTMLElement) => element.getBoundingClientRect()

const move = async (toParent1: boolean) => {
  if (transitionInProgress.value) return
  transitionInProgress.value = true

  if (child.value && parent0.value && parent1.value) {
    const htmlElementFrom = (toParent1 ? parent0 : parent1) as Ref<HTMLElement>
    const htmlElementTo = (toParent1 ? parent1 : parent0) as Ref<HTMLElement>
    const initChild = child as Ref<HTMLElement>

    const initialRect = getRect(htmlElementFrom.value)

    const tempChild = ref(document.createElement('div'))
    htmlElementTo.value.appendChild(tempChild.value)
    const finalRect = getRect(tempChild.value)
    tempChild.value.remove()
    console.log(`initialRect: ${JSON.stringify(initialRect)}`)
    console.log(`finalRect: ${JSON.stringify(finalRect)}`)

    const dx = finalRect.left - initialRect.left
    const dy = finalRect.top - initialRect.top

    console.log(`dx: ${dx}, dy: ${dy}`)

    const tempStyleTransform = initChild.value.style.transform
    const tempStyleTransition = initChild.value.style.transition

    initChild.value.style.transition = `transform ${TRANSITION_DURATION}s ease-in-out`
    initChild.value.style.transform += ' ' + `translate(${dx}px, ${dy}px)`

    // add handler to wait for transition to end
    initChild.value.addEventListener(
      'transitionend',
      async (e) => {
        inParent0.value = !inParent0.value
        htmlElementTo.value.appendChild(initChild.value)

        initChild.value.style.transform = tempStyleTransform
        initChild.value.style.transition = tempStyleTransition

        transitionInProgress.value = false
      },
      { once: true },
    )
  } else {
    console.error('One of the elements is null')

    transitionInProgress.value = false
  }
}

</script>

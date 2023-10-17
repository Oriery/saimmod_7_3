<template>
  <div
    id="parent0"
    ref="parent0"
    class="min-h-[10rem]"
  >
    <div
      v-if="child0ShouldExist"
      v-show="child0ShouldBeVisible"
      ref="child0"
      @click="move(true)"
    >
      Move me to Parent 2
    </div>
  </div>
  <div
    id="parent1"
    ref="parent1"
    class="min-h-[10rem]"
  >
    <div
      v-if="child1ShouldExist"
      v-show="child1ShouldBeVisible"
      ref="child1"
      @click="move(false)"
    >
      Move me to Parent 1
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { Ref } from 'vue'

const TRANSITION_DURATION = 0.3

const transitionInProgress = ref(false)

const parent0 = ref<HTMLElement | null>(null)
const parent1 = ref<HTMLElement | null>(null)
const child0 = ref<HTMLElement | null>(null)
const child1 = ref<HTMLElement | null>(null)
const inParent0 = ref(true)
const child0ShouldExist = ref(true)
const child1ShouldExist = ref(false)
const child0ShouldBeVisible = ref(true)
const child1ShouldBeVisible = ref(false)

const getRect = (element: HTMLElement) => element.getBoundingClientRect()

const move = async (toParent1: boolean) => {
  if (transitionInProgress.value) return
  transitionInProgress.value = true

  if (toParent1) {
    child0ShouldExist.value = true
    child1ShouldExist.value = true
    child0ShouldBeVisible.value = true
    child1ShouldBeVisible.value = false
  } else {
    child0ShouldExist.value = true
    child1ShouldExist.value = true
    child0ShouldBeVisible.value = false
    child1ShouldBeVisible.value = true
  }

  await nextTick()

  if (child0.value && child1.value && parent0.value && parent1.value) {
    const htmlElementFrom = (toParent1 ? parent0 : parent1) as Ref<HTMLElement>
    const htmlElementTo = (toParent1 ? parent1 : parent0) as Ref<HTMLElement>
    const initChild = (toParent1 ? child0 : child1) as Ref<HTMLElement>
    const finalChild = (toParent1 ? child1 : child0) as Ref<HTMLElement>

    const initialRect = getRect(htmlElementFrom.value)
    const finalRect = getRect(htmlElementTo.value)

    const dx = finalRect.left - initialRect.left
    const dy = finalRect.top - initialRect.top

    console.log(`dx: ${dx}, dy: ${dy}`)

    initChild.value.style.transition = `transform ${TRANSITION_DURATION}s ease-in-out`
    initChild.value.style.transform += ' ' + `translate(${dx}px, ${dy}px)`

    // add handler to wait for transition to end
    initChild.value.addEventListener(
      'transitionend',
      async (e) => {
        inParent0.value = !inParent0.value

        transitionInProgress.value = false

        console.log('inParent0 3', inParent0.value)
      },
      { once: true },
    )
  } else {
    console.error('One of the elements is null')
    inParent0.value = !!inParent0.value

    transitionInProgress.value = false
  }
}

watch(inParent0, (newVal) => {
  if (newVal) {
    child0ShouldExist.value = true
    child1ShouldExist.value = false
    child0ShouldBeVisible.value = true
    child1ShouldBeVisible.value = false
  } else {
    child0ShouldExist.value = false
    child1ShouldExist.value = true
    child0ShouldBeVisible.value = false
    child1ShouldBeVisible.value = true
  }
})
</script>

import type { Ref } from 'vue'
import { ref } from 'vue'

const getRect = (element: HTMLElement) => element.getBoundingClientRect()

const currentlyProcessedHtmlElements: HTMLElement[] = []

export default async function changeParentSmoothly(
  child: Ref<HTMLElement>,
  toParent: Ref<HTMLElement>,
  transitionTime: number = 400,
) {
  if (currentlyProcessedHtmlElements.includes(child.value)) {
    throw new Error('This element is already being moved')
  }
  currentlyProcessedHtmlElements.push(child.value)

  try {
    if (child.value) {
      let initialRect = getRect(child.value)

      const tempChild = ref(document.createElement('div'))
      tempChild.value.style.minWidth = `${initialRect.width}px`
      tempChild.value.style.minHeight = `${initialRect.height}px`
      toParent.value.appendChild(tempChild.value)

      initialRect = getRect(child.value)
      const finalRect = getRect(tempChild.value)

      const dx = finalRect.left - initialRect.left
      const dy = finalRect.top - initialRect.top

      console.log(`dx: ${dx}, dy: ${dy}`)

      const tempStyleTransform = child.value.style.transform
      const tempStyleTransition = child.value.style.transition

      child.value.style.transition = `transform ${transitionTime}ms ease-in-out`
      child.value.style.transform += ' ' + `translate(${dx}px, ${dy}px)`

      await new Promise((resolve) => {
        // add handler to wait for transition to end
        child.value.addEventListener(
          'transitionend',
          async (e) => {
            toParent.value.appendChild(child.value)
            tempChild.value.remove()

            child.value.style.transform = tempStyleTransform
            child.value.style.transition = tempStyleTransition

            resolve(e)
          },
          { once: true },
        )
      })
    } else {
      console.error('One of the elements is null')
    }
  } finally {
    currentlyProcessedHtmlElements.splice(currentlyProcessedHtmlElements.indexOf(child.value), 1)
  }
}

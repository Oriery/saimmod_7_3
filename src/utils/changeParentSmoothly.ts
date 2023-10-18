import type { Ref } from 'vue'
import { ref } from 'vue'

const getRect = (element: HTMLElement) => element.getBoundingClientRect()

type AnimationForHtmlElement = {
  element: HTMLElement
  forceFinish: (() => Promise<void>) | null
}

const currentlyProcessedHtmlElements: Map<HTMLElement, AnimationForHtmlElement> = new Map()

export default async function changeParentSmoothly(
  child: Ref<HTMLElement>,
  toParent: Ref<HTMLElement>,
  transitionTime: number = 400,
) {
  const animForHtmlEl : AnimationForHtmlElement = {
    element: child.value,
    forceFinish: null,
  }
  const tempChild = ref(document.createElement('div'))

  try {
    if (currentlyProcessedHtmlElements.get(child.value)) {
      if (currentlyProcessedHtmlElements.get(child.value)?.forceFinish) {
        await currentlyProcessedHtmlElements.get(child.value)?.forceFinish?.()
      } else {
        //console.log('No forceFinish function')
      }
    }
    currentlyProcessedHtmlElements.set(child.value, animForHtmlEl)

    if (child.value) {
      const fromParent = ref(child.value.parentElement)
      if (fromParent.value === toParent.value) {
        //console.log('same parent')
        return
      }
      let initialRect = getRect(child.value)

      toParent.value.appendChild(tempChild.value)
      tempChild.value.style.transition = `min-height ${transitionTime}ms ease-in-out, min-width ${transitionTime}ms ease-in-out`
      tempChild.value.style.minWidth = '0'
      tempChild.value.style.minHeight = '0'
      //tempChild.value.style.backgroundColor = 'red'

      await new Promise((resolve) => setTimeout(resolve, 50))
      if (currentlyProcessedHtmlElements.get(child.value) !== animForHtmlEl) {
        //console.log('new transition has started')
        return
      }

      tempChild.value.style.minWidth = `${initialRect.width}px`
      tempChild.value.style.minHeight = `${initialRect.height}px`

      initialRect = getRect(child.value)
      const finalRect = getRect(tempChild.value)

      const dx = finalRect.left - initialRect.left
      const dy = finalRect.top - initialRect.top

      //console.log(`dx: ${dx}, dy: ${dy}`)

      const tempStyleTransform = child.value.style.transform
      const tempStyleTransition = child.value.style.transition

      child.value.style.transition = `transform ${transitionTime}ms ease-in-out`
      child.value.style.transform += ' ' + `translate(${dx}px, ${dy}px)`

      await new Promise((resolve) => {
        animForHtmlEl.forceFinish = async () => {
          //console.log('force finish')

          animForHtmlEl.element.style.transform = tempStyleTransform
          animForHtmlEl.element.style.transition = tempStyleTransition

          await new Promise((resolve) => setTimeout(resolve, 50))

          resolve(null)
        }

        // add handler to wait for transition to end
        child.value.addEventListener(
          'transitionend',
          async (e) => {
            if (currentlyProcessedHtmlElements.get(child.value) !== animForHtmlEl) {
              //console.log('new transition has started')
              resolve(null)
              return
            }

            if (fromParent.value) {
              fromParent.value.insertBefore(tempChild.value, child.value)
            }
            toParent.value.appendChild(child.value)

            child.value.style.transform = tempStyleTransform
            child.value.style.transition = tempStyleTransition

            await new Promise((resolve) => setTimeout(resolve, 50))
            tempChild.value.style.minWidth = '0'
            tempChild.value.style.minHeight = '0'

            await new Promise((resolve) => setTimeout(resolve, transitionTime))

            resolve(null)
          },
          { once: true },
        )
      })
    } else {
      console.error('One of the elements is null')
    }
  } finally {
    if (currentlyProcessedHtmlElements.get(child.value) === animForHtmlEl) {
      currentlyProcessedHtmlElements.delete(child.value)
      if (animForHtmlEl.element) {
        toParent.value?.appendChild(animForHtmlEl.element)
      }
    }
    tempChild.value?.remove()
  }
}

import {
  SystemOfMassService,
  Queue,
  Processor,
  Generator,
  BaseNode,
  NodeType,
} from './systemsOfMassService'
import { ref, type Ref } from 'vue'

export class SystemOfMassServiceAnalyzer {
  private _sysMasSer: SystemOfMassService
  get sysMasSer(): SystemOfMassService {
    return this._sysMasSer
  }
  statesAbsoluteProbabilities: Ref<Map<string, number>> = ref(new Map())
  statesQuantity: Ref<number> = ref(0)
  lastState: Ref<string> = ref('')

  constructor(sysMasSer: SystemOfMassService) {
    this._sysMasSer = sysMasSer
  }

  private _getSystemState(): string {
    return this._sysMasSer.nodes
      .map((node) => {
        return NodeAnalyzer.getNodeState(node)
      })
      .join('.')
  }

  reset() {
    this.statesAbsoluteProbabilities.value = new Map()
    this.statesQuantity.value = 0
    this.lastState.value = ''
  }

  recordState(): string {
    const state = this._getSystemState()
    this.statesAbsoluteProbabilities.value.set(
      state,
      (this.statesAbsoluteProbabilities.value.get(state) ?? 0) + 1,
    )
    this.statesQuantity.value++
    this.lastState.value = state
    return state
  }
}

class NodeAnalyzer {
  static getNodeState(node: BaseNode): string {
    switch (node.nodeType) {
      case NodeType.GENERATOR:
        return this.getGeneratorState(node as Generator)
      case NodeType.PROCESSOR:
        return this.getProcessorState(node as Processor)
      case NodeType.QUEUE:
        return this.getQueueState(node as Queue)
      default:
        throw new Error('Unknown node type')
    }
  }

  static getGeneratorState(gen: Generator): string {
    return ''
  }

  static getProcessorState(proc: Processor): string {
    return (
      proc.ticketsInside.value.length.toString() +
      (proc.couldNotPushTicketOutwardOnPrevTick.value ? 'r' : '')
    )
  }

  static getQueueState(queue: Queue): string {
    return queue.ticketsInside.value.length.toString()
  }
}

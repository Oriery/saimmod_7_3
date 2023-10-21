import {
  SystemOfMassService,
  Queue,
  Processor,
  Generator,
  BaseNode,
  NodeType,
  TicketDestoyReason,
  Ticket,
} from './systemsOfMassService'
import { ref, type Ref } from 'vue'

export type TicketsAnalyzer = {
  totalTicketsLeftSystem: Ref<number>
  ticketsProcessed: Ref<number>
  ticketsDropped: Ref<number>

  sumOfTimeWaitingInQueue: Ref<number>
  sumOfTimeBeingInSystem: Ref<number>
  sumOfTicketsNowInSystem: Ref<number>
}

export class SystemOfMassServiceAnalyzer {
  private _sysMasSer: SystemOfMassService
  get sysMasSer(): SystemOfMassService {
    return this._sysMasSer
  }
  statesAbsoluteProbabilities: Ref<Map<string, number>> = ref(new Map())
  statesQuantity: Ref<number> = ref(0)
  lastState: Ref<string> = ref('')
  ticketAnalyzer: TicketsAnalyzer
  sumLengthOfQueues: Ref<number> = ref(0)

  constructor(sysMasSer: SystemOfMassService) {
    this._sysMasSer = sysMasSer
    this.ticketAnalyzer = {
      totalTicketsLeftSystem: ref(0),
      ticketsProcessed: ref(0),
      ticketsDropped: ref(0),
      sumOfTimeWaitingInQueue: ref(0),
      sumOfTimeBeingInSystem: ref(0),
      sumOfTicketsNowInSystem: ref(0),
    }

    sysMasSer.onTicketLeftSystem((ticket : Ticket, reason) => {
      this.ticketAnalyzer.totalTicketsLeftSystem.value++
      this.ticketAnalyzer.sumOfTimeBeingInSystem.value +=
        ticket.ticksAlive as unknown as number
      if (reason === TicketDestoyReason.SUCCESSFULLY_PROCESSED) {
        this.ticketAnalyzer.ticketsProcessed.value++
      } else if (reason === TicketDestoyReason.DROPPED) {
        this.ticketAnalyzer.ticketsDropped.value++
      } else {
        throw new Error('Unknown reason')
      }

      this.ticketAnalyzer.sumOfTimeWaitingInQueue.value +=
          ticket.ticksWaitingInQueue as unknown as number
    })
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
    this.ticketAnalyzer = {
      totalTicketsLeftSystem: ref(0),
      ticketsProcessed: ref(0),
      ticketsDropped: ref(0),
      sumOfTimeWaitingInQueue: ref(0),
      sumOfTimeBeingInSystem: ref(0),
      sumOfTicketsNowInSystem: ref(0),
    }
    this.sumLengthOfQueues.value = 0

    this._sysMasSer.nodes.forEach(node => {
      node.resetStats()
    })
    this._sysMasSer.reset()
  }

  recordState(): string {
    const state = this._getSystemState()
    this.statesAbsoluteProbabilities.value.set(
      state,
      (this.statesAbsoluteProbabilities.value.get(state) ?? 0) + 1,
    )
    this.statesQuantity.value++
    this.lastState.value = state
    
    this.ticketAnalyzer.sumOfTicketsNowInSystem.value += this._sysMasSer.nodes.reduce((acc, node) => {
      return acc + node.ticketsInside.value.length
    }, 0)

    this.sumLengthOfQueues.value += this._sysMasSer.nodes.reduce((acc, node) => {
      if (node.nodeType === NodeType.QUEUE) {
        return acc + node.ticketsInside.value.length
      }
      return acc
    }, 0)

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

import type { Ref } from 'vue'
import { computed, ref } from 'vue'
import type { VisualContainer } from './visualized'

interface WithId {
  id: string
}

interface Tickable extends WithId {
  tick?(): void
  beforeTick?(): void
  afterTick?(): void
}

enum PushResult {
  PUSHED,
  BLOCKED,
  NO_TICKET_TO_PUSH,
  DROPPED,
}

export enum WhatToDoOnBlockedOutput {
  WAIT,
  DROP,
}

export enum NodeType {
  GENERATOR,
  QUEUE,
  PROCESSOR,
}

export const NODE_TYPE_TO_NAME = {
  [NodeType.GENERATOR]: 'Generator',
  [NodeType.QUEUE]: 'Queue',
  [NodeType.PROCESSOR]: 'Processor',
}

export class SystemOfMassService {
  private _nodes: BaseNode[]
  public get nodes(): BaseNode[] {
    return this._nodes
  }

  private _tickables: Tickable[]
  public get tickables(): Tickable[] {
    return this._tickables
  }

  private _tick: number
  public get tick(): number {
    return this._tick
  }

  private _onTicketLeftSystem: ((ticket: Ticket, reason: TicketDestoyReason) => void)[] = []
  onTicketLeftSystem(cb: (ticket: Ticket, reason: TicketDestoyReason) => void) {
    this._onTicketLeftSystem.push(cb)
  }

  constructor() {
    this._nodes = []
    this._tickables = []
    this._tick = 0
  }

  addTicket(ticket: Ticket) {
    this._tickables.push(ticket)
  }

  removeTicket(ticket: Ticket, reason: TicketDestoyReason) {
    const index = this._tickables.findIndex((tickable) => tickable.id === ticket.id)
    if (index > -1) {
      this._tickables.splice(index, 1)
    } else {
      throw new Error('Ticket not found')
    }

    ticket.destroy(reason)

    this._onTicketLeftSystem.forEach((cb) => cb(ticket, reason))
  }

  addNode(node: BaseNode) {
    this._nodes.push(node)
    this._tickables.push(node)
    console.log(`Added node ${node.id}`)
  }

  doFullTick() {
    // do beforeTick
    for (const tickable of this._tickables) {
      if (tickable.beforeTick) {
        tickable.beforeTick()
      }
    }

    // do tick
    for (const tickable of this._tickables) {
      tickable.tick?.()
    }

    this._tick++

    // do afterTick
    for (const tickable of this._tickables) {
      tickable.afterTick?.()
    }
  }

  reset() {
    this._tick = 0
  }
}

export enum TicketDestoyReason {
  SUCCESSFULLY_PROCESSED,
  DROPPED,
}

export class Ticket implements Tickable {
  private _id: string
  public get id(): string {
    return this._id
  }
  ticksAlive: Ref<number>
  ticksWaitingInQueue: Ref<number> = ref(0)
  private _containerNode: BaseNode
  public get containerNode(): BaseNode {
    return this._containerNode
  }
  public set containerNode(value: BaseNode) {
    this._containerNode = value
    this.onContainerNodeChanged.forEach((cb) => cb(value))
  }
  private _onTicketDestroyed: ((reason: TicketDestoyReason) => void)[] = []
  onContainerNodeChanged: ((newContainerNode: BaseNode) => void)[] = []

  constructor(containerNode: BaseNode) {
    this._id = Math.random().toString(36).slice(2)
    this.ticksAlive = ref(0)
    this._containerNode = containerNode
  }

  afterTick(): void {
    this.ticksAlive.value++
    if (this._containerNode && this._containerNode.nodeType === NodeType.QUEUE) {
      this.ticksWaitingInQueue.value++
    }
  }

  destroy(reason: TicketDestoyReason) {
    this._onTicketDestroyed.forEach((cb) => cb(reason))
  }

  onTicketDestroyed(cb: (reason: TicketDestoyReason) => void) {
    this._onTicketDestroyed.push(cb)
  }
}

export abstract class BaseNode implements Tickable, VisualContainer {
  private _id: string
  public get id(): string {
    return this._id
  }

  abstract nodeType: NodeType

  private _ticketsInside: Ref<Ticket[]>
  public get ticketsInside(): Ref<Ticket[]> {
    return this._ticketsInside
  }

  protected abstract _whatToDoOnBlockedOutput: WhatToDoOnBlockedOutput
  public get whatToDoOnBlockedOutput(): WhatToDoOnBlockedOutput {
    return this._whatToDoOnBlockedOutput
  }

  outwardNodes: BaseNode[]
  abstract capacity: number
  protected abstract canReceiveTicket(): boolean
  protected _sysMassService: SystemOfMassService
  refToContainer: Ref<HTMLElement | null> = ref(null)
  hasBlockedOutput: Ref<boolean> = ref(false)
  private _blockedTicksQuantity = ref(0)
  public blockedTimeRatio = ref(0)
  private _sumTicketsInside = ref(0)
  public avgTicketsInside = ref(0)
  private _quantityOfTimesBeingFull = ref(0)
  public beingFullRatio = ref(0)

  constructor(sysMassService: SystemOfMassService) {
    this._id = Math.random().toString(36).slice(2)
    this._ticketsInside = ref([])
    this.outwardNodes = []
    this._sysMassService = sysMassService
    this._sysMassService.addNode(this)
  }

  protected tryPushTicketOutward(): PushResult {
    const ticket = this.ticketsInside.value[0]
    if (ticket) {
      const nodeReadyToReceiveTicket = this.findOutwardNodeReadyToReceiveTicket()

      if (nodeReadyToReceiveTicket) {
        // move ticket to outward node
        const ticketFromInside = this.ticketsInside.value.shift()
        if (ticketFromInside !== ticket) {
          throw new Error('Ticket was not the same as the one that was found')
        }
        nodeReadyToReceiveTicket.receiveTicket(ticket)
        return PushResult.PUSHED
      } else {
        // no node ready to receive ticket
        // WAIT (do nothing) or DROP ticket depending on whatToDoOnBlockedOutput
        if (this._whatToDoOnBlockedOutput === WhatToDoOnBlockedOutput.WAIT) {
          return PushResult.BLOCKED
        } else if (this._whatToDoOnBlockedOutput === WhatToDoOnBlockedOutput.DROP) {
          const ticketFromInside = this.ticketsInside.value.shift()
          if (ticketFromInside !== ticket) {
            throw new Error('Ticket was not the same as the one that was found')
          }
          this._sysMassService.removeTicket(ticket, TicketDestoyReason.DROPPED)
          return PushResult.DROPPED
        } else {
          throw new Error('Unknown WhatToDoOnBlockedOutput: ' + this._whatToDoOnBlockedOutput)
        }
      }
    }
    return PushResult.NO_TICKET_TO_PUSH
  }

  protected findOutwardNodeReadyToReceiveTicket(): BaseNode | null {
    let nodeReadyToReceiveTicket: BaseNode | null = null
    for (const i in this.outwardNodes) {
      const node = this.outwardNodes[i]
      if (node.canReceiveTicket()) {
        nodeReadyToReceiveTicket = node
        break
      }
    }
    if (nodeReadyToReceiveTicket) {
      return nodeReadyToReceiveTicket
    } else {
      if (!this.outwardNodes.length) {
        throw new Error('No outward nodes')
      }
      return null
    }
  }

  protected receiveTicket(ticket: Ticket) {
    this.ticketsInside.value.push(ticket)
    if (this.ticketsInside.value.length > this.capacity) {
      throw new Error('Node is overfull')
    }

    ticket.containerNode = this

    this.afterReceiveTicket()
  }

  protected afterReceiveTicket(): void {}

  addOutwardNode(node: BaseNode) {
    this.outwardNodes.push(node)
  }

  tick(): void {
    this.hasBlockedOutput.value =
      this.outwardNodes.length > 0 && this.findOutwardNodeReadyToReceiveTicket() === null
  }

  afterTick(): void {
    if (this.hasBlockedOutput.value) {
      this._blockedTicksQuantity.value++
    }
    this.blockedTimeRatio.value = this._blockedTicksQuantity.value / this._sysMassService.tick
    this._sumTicketsInside.value += this.ticketsInside.value.length
    this.avgTicketsInside.value = this._sumTicketsInside.value / this._sysMassService.tick
    if (this.ticketsInside.value.length === this.capacity) {
      this._quantityOfTimesBeingFull.value++
    }
    this.beingFullRatio.value =
      this._quantityOfTimesBeingFull.value / this._sysMassService.tick
  }

  resetStats() {
    this._blockedTicksQuantity.value = 0
    this.blockedTimeRatio.value = 0
    this._sumTicketsInside.value = 0
    this.avgTicketsInside.value = 0
    this._quantityOfTimesBeingFull.value = 0
    this.beingFullRatio.value = 0
  }
}

export class Generator extends BaseNode {
  probabilityOfNotGeneratingTicket: number
  capacity: number
  protected _whatToDoOnBlockedOutput: WhatToDoOnBlockedOutput
  private _willGenerateTicketOnCurrentTick: boolean

  private _nodeType: NodeType = NodeType.GENERATOR
  public get nodeType(): NodeType {
    return this._nodeType
  }

  onTicketCreated: ((ticket: Ticket) => void)[] = []

  constructor(
    sysMassService: SystemOfMassService,
    probabilityOfNotGeneratingTicket: number,
    whatToDoOnBlockedOutput: WhatToDoOnBlockedOutput,
  ) {
    super(sysMassService)
    this.probabilityOfNotGeneratingTicket = probabilityOfNotGeneratingTicket
    this.capacity = 0
    this._whatToDoOnBlockedOutput = whatToDoOnBlockedOutput
    this._willGenerateTicketOnCurrentTick = false
  }

  canReceiveTicket() {
    throw new Error('Generator cannot receive ticket. Do not even ask.')
    return false
  }

  beforeTick() {
    this._willGenerateTicketOnCurrentTick = Math.random() > this.probabilityOfNotGeneratingTicket
  }

  tick() {
    super.tick()

    if (
      this.hasBlockedOutput.value &&
      this._whatToDoOnBlockedOutput === WhatToDoOnBlockedOutput.WAIT
    ) {
      return
    }

    if (this._willGenerateTicketOnCurrentTick) {
      const newTicket = new Ticket(this)
      this.ticketsInside.value.push(newTicket)
      this._sysMassService.addTicket(newTicket)
      this.onTicketCreated.forEach((cb) => cb(newTicket))

      const res = this.tryPushTicketOutward()
      if (res !== PushResult.PUSHED && res !== PushResult.DROPPED) {
        throw new Error('Unexpected result of tryPushTicketOutward: ' + res)
      }
    }
  }
}

export class Queue extends BaseNode {
  capacity: number
  protected _whatToDoOnBlockedOutput: WhatToDoOnBlockedOutput

  private _nodeType: NodeType = NodeType.QUEUE
  public get nodeType(): NodeType {
    return this._nodeType
  }

  constructor(sysMassService: SystemOfMassService, capacity: number) {
    super(sysMassService)
    this.capacity = capacity
    this._whatToDoOnBlockedOutput = WhatToDoOnBlockedOutput.WAIT
  }

  canReceiveTicket() {
    this.tryPushTicketOutward()
    return this.ticketsInside.value.length < this.capacity
  }

  tick() {
    super.tick()

    while (this.tryPushTicketOutward() === PushResult.PUSHED) {
      // do nothing
    }
  }

  protected afterReceiveTicket(): void {
    this.tryPushTicketOutward()
  }
}

export class Processor extends BaseNode {
  probabilityOfNotProcessingTicket: number
  capacity: number
  protected _whatToDoOnBlockedOutput: WhatToDoOnBlockedOutput
  private _willProcessTicketOnCurrentTick: boolean
  couldNotPushTicketOutwardOnPrevTick: Ref<boolean>
  private _didTryProcessTicketOnCurrentTickAlready: boolean

  private _nodeType: NodeType = NodeType.PROCESSOR
  public get nodeType(): NodeType {
    return this._nodeType
  }

  constructor(
    sysMassService: SystemOfMassService,
    probabilityOfNotProcessingTicket: number,
    whatToDoOnBlockedOutput: WhatToDoOnBlockedOutput = WhatToDoOnBlockedOutput.WAIT,
  ) {
    super(sysMassService)
    this.probabilityOfNotProcessingTicket = probabilityOfNotProcessingTicket
    this.capacity = 1
    this._whatToDoOnBlockedOutput = whatToDoOnBlockedOutput
    this._willProcessTicketOnCurrentTick = false
    this._didTryProcessTicketOnCurrentTickAlready = false
    this.couldNotPushTicketOutwardOnPrevTick = ref(false)
  }

  canReceiveTicket() {
    this.tryProcessTicket()
    return this.ticketsInside.value.length === 0
  }

  beforeTick() {
    this._willProcessTicketOnCurrentTick =
      this.couldNotPushTicketOutwardOnPrevTick.value ||
      Math.random() > this.probabilityOfNotProcessingTicket
    this._didTryProcessTicketOnCurrentTickAlready = false
  }

  tick() {
    super.tick()

    this.tryProcessTicket()
  }

  tryProcessTicket() {
    if (this._didTryProcessTicketOnCurrentTickAlready) {
      return
    }

    this._didTryProcessTicketOnCurrentTickAlready = true

    if (this.ticketsInside.value.length && this._willProcessTicketOnCurrentTick) {
      // If no outward nodes, ticket leaves the system
      if (this.outwardNodes.length === 0) {
        const ticket = this.ticketsInside.value.shift()
        if (ticket) {
          this._sysMassService.removeTicket(ticket, TicketDestoyReason.SUCCESSFULLY_PROCESSED)
        } else {
          throw new Error('No ticket to remove')
        }
      } else {
        // If there are outward nodes, try to push ticket outward
        const res = this.tryPushTicketOutward()
        if (res === PushResult.BLOCKED) {
          this.couldNotPushTicketOutwardOnPrevTick.value = true
        } else if (res === PushResult.PUSHED) {
          this.couldNotPushTicketOutwardOnPrevTick.value = false
        }
      }
    }
  }
}

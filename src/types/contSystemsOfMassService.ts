import type { Ref } from 'vue'
import { ref } from 'vue'
import type { VisualContainer } from './visualized'
import { ContinuousDistributionHelper, Distribution, ExponentialDistr } from '@/utils/distributions'

interface WithId {
  id: string
}

enum PushResult {
  PUSHED,
  NO_TICKET_TO_PUSH,
  DROPPED,
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

class Destroyable {
  isDestroyed: boolean = false

  destroy() {
    if (this.isDestroyed) {
      throw new Error('Already destroyed')
    }
    this.isDestroyed = true
  }
}

class Living extends Destroyable {
  timeAlive: Ref<number> = ref(0)
  private _interval : null | NodeJS.Timer = null

  constructor() {
    super()

    this._interval = setInterval(() => {
      this.timeAlive.value++
    }, 1000)
  }

  destroy() {
    super.destroy()

    if (this._interval) {
      clearInterval(this._interval)
    }
  }

  resetTimeAlive() {
    this.timeAlive.value = 0
  }
}

export class SystemOfMassService extends Living {
  private _nodes: BaseNode[]
  public get nodes(): BaseNode[] {
    return this._nodes
  }

  private _onTicketLeftSystem: ((ticket: Ticket, reason: TicketDestoyReason) => void)[] = []
  onTicketLeftSystem(cb: (ticket: Ticket, reason: TicketDestoyReason) => void) {
    this._onTicketLeftSystem.push(cb)
  }

  constructor() {
    super()

    this._nodes = []
  }

  removeTicket(ticket: Ticket, reason: TicketDestoyReason) {
    ticket.destroy(reason)

    this._onTicketLeftSystem.forEach((cb) => cb(ticket, reason))
  }

  addNode(node: BaseNode) {
    this._nodes.push(node)
    console.log(`Added node ${node.id}`)
  }

  start() {
    this.resetTimeAlive()
    this._nodes.forEach((node) => node.start())
  }
}

export enum TicketDestoyReason {
  SUCCESSFULLY_PROCESSED,
  DROPPED,
}

export class Ticket {
  private _id: string
  public get id(): string {
    return this._id
  }
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
    this._containerNode = containerNode
  }

  destroy(reason: TicketDestoyReason) {
    this._onTicketDestroyed.forEach((cb) => cb(reason))
  }

  onTicketDestroyed(cb: (reason: TicketDestoyReason) => void) {
    this._onTicketDestroyed.push(cb)
  }
}

export abstract class BaseNode implements VisualContainer {
  private _id: string
  public get id(): string {
    return this._id
  }

  abstract nodeType: NodeType

  private _ticketsInside: Ref<Ticket[]>
  public get ticketsInside(): Ref<Ticket[]> {
    return this._ticketsInside
  }

  outwardNodes: BaseNode[]
  abstract capacity: number
  protected abstract canReceiveTicket(): boolean
  protected _sysMassService: SystemOfMassService
  refToContainer: Ref<HTMLElement | null> = ref(null)

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
        const ticketFromInside = this.ticketsInside.value.shift()
        if (ticketFromInside !== ticket) {
          throw new Error('Ticket was not the same as the one that was found')
        }
        this._sysMassService.removeTicket(ticket, TicketDestoyReason.DROPPED)
        return PushResult.DROPPED
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

  abstract start(): void
}

class SometimesActingHelper {
  private _action: (() => void) | null = null
  private _contDistrHelper: ContinuousDistributionHelper
  private _interval : null | NodeJS.Timer = null

  constructor(distr: Distribution, action: () => void) {
    this._contDistrHelper = new ContinuousDistributionHelper(distr)
    this._action = action
  }

  start() {
    this._interval = setTimeout(() => {
      this._action?.()
    }, this._contDistrHelper.getNextRandomResult() * 1000)
  }

  stop() {
    if (this._interval) {
      clearTimeout(this._interval)
    }
  }
}

export class Generator extends BaseNode {
  generatingIntensity: number
  capacity: number
  private _sometimesActingHelper: SometimesActingHelper

  private _nodeType: NodeType = NodeType.GENERATOR
  public get nodeType(): NodeType {
    return this._nodeType
  }

  onTicketCreated: ((ticket: Ticket) => void)[] = []

  constructor(
    sysMassService: SystemOfMassService,
    generatingIntensity: number,
  ) {
    super(sysMassService)
    this.generatingIntensity = generatingIntensity
    this.capacity = 0
    this._sometimesActingHelper = new SometimesActingHelper(
      new ExponentialDistr(generatingIntensity),
      () => {
        this._sometimesActingHelper.start()
        this.generateTicket()
      },
    )
  }

  start() {
    this._sometimesActingHelper.start()
  }

  canReceiveTicket() {
    throw new Error('Generator cannot receive ticket. Do not even ask.')
    return false
  }

  private generateTicket() {
    console.log('Generating ticket')
    const newTicket = new Ticket(this)
    this.ticketsInside.value.push(newTicket)
    this.onTicketCreated.forEach((cb) => cb(newTicket))

    const res = this.tryPushTicketOutward()
    if (res !== PushResult.PUSHED && res !== PushResult.DROPPED) {
      throw new Error('Unexpected result of tryPushTicketOutward: ' + res)
    }
  }
}

export class Queue extends BaseNode {
  capacity: number

  private _nodeType: NodeType = NodeType.QUEUE
  public get nodeType(): NodeType {
    return this._nodeType
  }

  constructor(sysMassService: SystemOfMassService, capacity: number) {
    super(sysMassService)
    this.capacity = capacity
  }

  canReceiveTicket() {
    this.tryPushTicketOutward()
    return this.ticketsInside.value.length < this.capacity
  }

  // TODO call
  tryPushAsManyTicketsOutwardAsPossible() {
    while (this.tryPushTicketOutward() === PushResult.PUSHED) {
      // do nothing
    }
  }

  protected afterReceiveTicket(): void {
    this.tryPushTicketOutward()
  }

  start(): void {
    // do nothing
  }
}

export class Processor extends BaseNode {
  processingIntensity: number
  capacity: number
  private _sometimesActingHelper: SometimesActingHelper

  private _nodeType: NodeType = NodeType.PROCESSOR
  public get nodeType(): NodeType {
    return this._nodeType
  }

  constructor(
    sysMassService: SystemOfMassService,
    processingIntensity: number,
  ) {
    super(sysMassService)
    this.processingIntensity = processingIntensity
    this.capacity = 1
    this._sometimesActingHelper = new SometimesActingHelper(
      new ExponentialDistr(processingIntensity),
      () => this.processTicket(),
    )
  }

  start() {
    // do nothing
  }

  canReceiveTicket() {
    return this.ticketsInside.value.length === 0
  }

  private processTicket() {
    console.log('Processing ticket')

    if (this.ticketsInside.value.length === 0) return

    // If no outward nodes, ticket leaves the system
    if (this.outwardNodes.length === 0) {
      const ticket = this.ticketsInside.value.shift()
      if (ticket) {
        this._sysMassService.removeTicket(ticket, TicketDestoyReason.SUCCESSFULLY_PROCESSED)
      } else {
        throw new Error('No ticket to remove')
      }
    } else {
      throw new Error('Not implemented')
    }
  }

  protected receiveTicket(ticket: Ticket): void {
    super.receiveTicket(ticket)

    this._sometimesActingHelper.start()
  }
}

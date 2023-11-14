import type { Ref } from 'vue'
import { ref, watch } from 'vue'
import type { VisualContainer } from './visualized'
import { ContinuousDistributionHelper, Distribution, ExponentialDistr } from '@/utils/distributions'

export const TICKS_PER_SECOND = 16
const INCREMENTS_PER_TICK = 4

interface WithId {
  id: string
}

enum PushResult {
  PUSHED,
  NO_TICKET_TO_PUSH,
  DROPPED,
  BLOCKED,
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
      this.timeAlive.value = fixNumber(this.timeAlive.value + 1 / INCREMENTS_PER_TICK, 3)
    }, 1000 / TICKS_PER_SECOND / INCREMENTS_PER_TICK)
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

function fixNumber(n: number, digits: number) {
  return Number.parseFloat(n.toFixed(digits))
}

class SystemOfMassService extends Living {
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
    ticket.destroyTicketWithReason(reason)

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

export class AnalyzableSystemOfMassService extends SystemOfMassService {
  private _ticketsLeftSystem = 0
  private _ticketsSuccessfullyProcessed = 0

  absoluteThroughput = ref(0)
  relativeThroughput = ref(0)

  removeTicket(ticket: Ticket, reason: TicketDestoyReason): void {
    super.removeTicket(ticket, reason)

    this._ticketsLeftSystem++
    if (reason === TicketDestoyReason.SUCCESSFULLY_PROCESSED) {
      this._ticketsSuccessfullyProcessed++
    }

    this._updateThroughput()
  }

  private _updateThroughput() {
    this.absoluteThroughput.value = this._ticketsSuccessfullyProcessed / this.timeAlive.value
    this.relativeThroughput.value = this._ticketsSuccessfullyProcessed / this._ticketsLeftSystem
  }
}

export enum TicketDestoyReason {
  SUCCESSFULLY_PROCESSED,
  DROPPED,
}

export class Ticket extends Living implements WithId {
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
    super()
    this._id = Math.random().toString(36).slice(2)
    this._containerNode = containerNode
    this.resetTimeAlive()
  }

  destroyTicketWithReason(reason: TicketDestoyReason) {
    super.destroy()
    this._onTicketDestroyed.forEach((cb) => cb(reason))
  }

  onTicketDestroyed(cb: (reason: TicketDestoyReason) => void) {
    this._onTicketDestroyed.push(cb)
  }
}

export abstract class BaseNode extends Living implements VisualContainer {
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
  protected _inwardNodes: BaseNode[] = []
  abstract capacity: number
  protected abstract canReceiveTicket(): boolean
  protected _sysMassService: SystemOfMassService
  refToContainer: Ref<HTMLElement | null> = ref(null)

  constructor(sysMassService: SystemOfMassService) {
    super()

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
        if (this.nodeType === NodeType.QUEUE) {
          return PushResult.BLOCKED
        } else {
          const ticketFromInside = this.ticketsInside.value.shift()
          if (ticketFromInside !== ticket) {
            throw new Error('Ticket was not the same as the one that was found')
          }
          this._sysMassService.removeTicket(ticket, TicketDestoyReason.DROPPED)
          return PushResult.DROPPED
        }
      }
    }
    return PushResult.NO_TICKET_TO_PUSH
  }

  protected tryPushOneTicketIntoGivenNode(node: BaseNode): PushResult {
    const ticket = this.ticketsInside.value[0]
    if (ticket) {
      if (node.canReceiveTicket()) {
        // move ticket to outward node
        const ticketFromInside = this.ticketsInside.value.shift()
        if (ticketFromInside !== ticket) {
          throw new Error('Ticket was not the same as the one that was found')
        }
        node.receiveTicket(ticket)
        return PushResult.PUSHED
      } else {
        if (this.nodeType === NodeType.QUEUE) {
          return PushResult.BLOCKED
        } else {
          const ticketFromInside = this.ticketsInside.value.shift()
          if (ticketFromInside !== ticket) {
            throw new Error('Ticket was not the same as the one that was found')
          }
          this._sysMassService.removeTicket(ticket, TicketDestoyReason.DROPPED)
          return PushResult.DROPPED
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
    node._inwardNodes.push(this)
  }

  pullTicketFromQueue() : boolean {
    let didNotPullTicket = true
    let i = 0
    while (i < this._inwardNodes.length && didNotPullTicket) {
      const node = this._inwardNodes[i]
      if (node.nodeType === NodeType.QUEUE) {
        const queue = node as Queue
        const res = queue.tryPushTicketOutward()
        if (res === PushResult.PUSHED) {
          didNotPullTicket = false
        } else if (res === PushResult.DROPPED) {
          throw new Error('Unexpected result of tryPushTicketOutward: ' + res)
        }
      }

      i++
    }

    return !didNotPullTicket
  }

  start() {
    this.resetTimeAlive()
  }
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
    }, this._contDistrHelper.getNextRandomResult() * 1000 / TICKS_PER_SECOND)
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
  private _generatingHelper: SometimesActingHelper

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
    this._generatingHelper = new SometimesActingHelper(
      new ExponentialDistr(generatingIntensity),
      () => {
        this._generatingHelper.start()
        this.generateTicket()
      },
    )
  }

  start() {
    this._generatingHelper.start()
  }

  canReceiveTicket() {
    throw new Error('Generator cannot receive ticket. Do not even ask.')
    return false
  }

  private generateTicket() {
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
  protected _processingHelper: SometimesActingHelper

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
    this._processingHelper = new SometimesActingHelper(
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

  protected processTicket() {
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

    this.pullTicketFromQueue()
  }

  protected receiveTicket(ticket: Ticket): void {
    super.receiveTicket(ticket)

    this._processingHelper.start()
  }
}

class BreakingProcessor extends Processor {
  private _breakingHelper: SometimesActingHelper
  private _fixingHelper: SometimesActingHelper
  isBroken = ref(false)
  private _nodeToPushTicketToWhenBroken: BaseNode | null = null

  breakingIntensity: number
  fixingIntensity: number

  constructor(
    sysMassService: SystemOfMassService,
    processingIntensity: number,
    breakingIntensity: number,
    fixingIntensity: number,
  ) {
    super(sysMassService, processingIntensity)
    this.breakingIntensity = breakingIntensity
    this.fixingIntensity = fixingIntensity
    this._breakingHelper = new SometimesActingHelper(
      new ExponentialDistr(breakingIntensity),
      () => this.break(),
    )
    this._fixingHelper = new SometimesActingHelper(
      new ExponentialDistr(fixingIntensity),
      () => this.fix(),
    )
  }

  start() {
    super.start()

    if (this._nodeToPushTicketToWhenBroken === null) {
      throw new Error('Node to push ticket to when broken is not set')
    }

    this._breakingHelper.start()
  }

  setNodeToPushTicketToWhenBroken(node: BaseNode) {
    this._nodeToPushTicketToWhenBroken = node
  }

  protected break() {
    this.isBroken.value = true
    this._breakingHelper.stop()
    this._fixingHelper.start()

    this.stopProcessingTickets()
  }

  protected fix() {
    this.isBroken.value = false
    this._fixingHelper.stop()
    this._breakingHelper.start()

    this.startProcessingTickets()
  }

  private startProcessingTickets() {
    this.pullTicketFromQueue()
  }

  private stopProcessingTickets() {
    if (!this._nodeToPushTicketToWhenBroken) {
      throw new Error('Node to push ticket to when broken is not set')
    }

    this._processingHelper.stop()

    if (this.ticketsInside.value.length > 0) {
      this.tryPushOneTicketIntoGivenNode(this._nodeToPushTicketToWhenBroken)
    }
  }

  canReceiveTicket(): boolean {
    return !this.isBroken.value && super.canReceiveTicket()
  }

}

enum BreakingProcessorState {
  WORKING_FULL,
  WORKING_EMPTY,
  BROKEN,
}

export class AnalyzableBreakingProcessor extends BreakingProcessor {
  private _state = BreakingProcessorState.WORKING_EMPTY
  private _sumOfTimeSpentInEachState: Record<BreakingProcessorState, number> = {
    [BreakingProcessorState.WORKING_FULL]: 0,
    [BreakingProcessorState.WORKING_EMPTY]: 0,
    [BreakingProcessorState.BROKEN]: 0,
  }
  private _lastStateChangeTime = 0
  relativeTimeBeingBroken = ref(0)
  relativeTimeBeingWorkingAndFull = ref(0)
  relativeTimeBeingWorkingAndEmpty = ref(1)

  private _handlePossibleStateChange() {
    const newState = this.getCurrentState()
    if (newState !== this._state) {
      this._handleStateChange(newState)
    }
  }

  private _handleStateChange(newState: BreakingProcessorState) {
    this._sumOfTimeSpentInEachState[this._state] += this.timeAlive.value - this._lastStateChangeTime
    this._state = newState
    this._lastStateChangeTime = this.timeAlive.value

    this._updateRelativeTimes()
  }

  private _updateRelativeTimes() {
    const timeSpentInEachState = this._sumOfTimeSpentInEachState
    const totalTimeSpent = Object.values(timeSpentInEachState).reduce((a, b) => a + b, 0)
    this.relativeTimeBeingBroken.value = timeSpentInEachState[BreakingProcessorState.BROKEN] / totalTimeSpent
    this.relativeTimeBeingWorkingAndFull.value = timeSpentInEachState[BreakingProcessorState.WORKING_FULL] / totalTimeSpent
    this.relativeTimeBeingWorkingAndEmpty.value = timeSpentInEachState[BreakingProcessorState.WORKING_EMPTY] / totalTimeSpent
  }

  private getCurrentState(): BreakingProcessorState {
    if (this.isBroken.value) {
      return BreakingProcessorState.BROKEN
    } else if (this.ticketsInside.value.length > 0) {
      return BreakingProcessorState.WORKING_FULL
    } else {
      return BreakingProcessorState.WORKING_EMPTY
    }
  }
  
  protected receiveTicket(ticket: Ticket): void {
    super.receiveTicket(ticket)

    this._handlePossibleStateChange()
  }

  protected tryPushOneTicketIntoGivenNode(node: BaseNode): PushResult {
    const res = super.tryPushOneTicketIntoGivenNode(node)

    if (res === PushResult.PUSHED || res === PushResult.DROPPED) {
      this._handlePossibleStateChange()
    }

    return res
  }

  protected tryPushTicketOutward(): PushResult {
    const res = super.tryPushTicketOutward()

    if (res === PushResult.PUSHED || res === PushResult.DROPPED) {
      this._handlePossibleStateChange()
    }

    return res
  }

  protected break(): void {
    super.break()

    this._handlePossibleStateChange()
  }

  protected fix(): void {
    super.fix()

    this._handlePossibleStateChange()
  }

  protected processTicket(): void {
    super.processTicket()

    this._handlePossibleStateChange()
  }
}
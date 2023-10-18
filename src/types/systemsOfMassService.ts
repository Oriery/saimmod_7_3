import type { Ref } from 'vue'
import { ref } from 'vue'

interface WithId {
  id: string
}

interface Tickable extends WithId {
  tick(sysMassService: SystemOfMassService): Promise<void>
  beforeTick?(sysMassService: SystemOfMassService): Promise<void>
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

  constructor() {
    this._nodes = []
    this._tickables = []
    this._tick = 0
  }

  addTicket(ticket: Ticket) {
    this._tickables.push(ticket)
  }

  removeTicket(ticket: Ticket) {
    const index = this._tickables.findIndex((tickable) => tickable.id === ticket.id)
    if (index > -1) {
      this._tickables.splice(index, 1)
    } else {
      throw new Error('Ticket not found')
    }
  }

  addNode(node: BaseNode) {
    this._nodes.push(node)
    this._tickables.push(node)
    console.log(`Added node ${node.id}`)
  }

  async doFullTick() {
    console.log(`TICK ${this._tick}`)
    // do beforeTick
    let awaitingFor: Promise<void>[] = []
    for (const tickable of this._tickables) {
      if (tickable.beforeTick) {
        awaitingFor.push(tickable.beforeTick(this))
      }
    }
    await Promise.all(awaitingFor)

    // do tick
    awaitingFor = []
    for (const tickable of this._tickables) {
      awaitingFor.push(tickable.tick(this))
    }
    await Promise.all(awaitingFor)

    this._tick++
  }
}

export class Ticket implements Tickable {
  private _id: string
  public get id(): string {
    return this._id
  }
  ticksAlive: number

  constructor() {
    this._id = Math.random().toString(36).slice(2)
    this.ticksAlive = 0
  }

  async tick() {
    this.ticksAlive++
  }
}

export abstract class BaseNode implements Tickable {
  private _id: string
  public get id(): string {
    return this._id
  }

  private _ticketsInside: Ref<Ticket[]>
  public get ticketsInside(): Ref<Ticket[]> {
    return this._ticketsInside
  }

  outwardNodes: BaseNode[]
  abstract capacity: number
  protected abstract _whatToDoOnBlockedOutput: WhatToDoOnBlockedOutput
  protected abstract canReceiveTicket(): Promise<boolean>

  constructor() {
    this._id = Math.random().toString(36).slice(2)
    this._ticketsInside = ref([])
    this.outwardNodes = []
  }

  async tryPushTicketOutward(): Promise<PushResult> {
    const ticket = this.ticketsInside.value[0]
    if (ticket) {
      const nodeReadyToReceiveTicket = await this.findOutwardNodeReadyToReceiveTicket()

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
          return PushResult.DROPPED
        } else {
          throw new Error('Unknown WhatToDoOnBlockedOutput: ' + this._whatToDoOnBlockedOutput)
        }
      }
    }
    return PushResult.NO_TICKET_TO_PUSH
  }

  async findOutwardNodeReadyToReceiveTicket(): Promise<BaseNode | null> {
    let nodeReadyToReceiveTicket: BaseNode | null = null
    for (const i in this.outwardNodes) {
      const node = this.outwardNodes[i]
      if (await node.canReceiveTicket()) {
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

  receiveTicket(ticket: Ticket) {
    this.ticketsInside.value.push(ticket)
    if (this.ticketsInside.value.length > this.capacity) {
      throw new Error('Node is overfull')
    }
  }

  addOutwardNode(node: BaseNode) {
    this.outwardNodes.push(node)
  }

  abstract tick(sysMassService: SystemOfMassService): Promise<void>
}

export class Generator extends BaseNode {
  probabilityOfNotGeneratingTicket: number
  capacity: number
  protected _whatToDoOnBlockedOutput: WhatToDoOnBlockedOutput
  isNotGeneratingBecauseOfBlockedOutput: boolean
  private _willGenerateTicketOnCurrentTick: boolean

  constructor(
    probabilityOfNotGeneratingTicket: number,
    whatToDoOnBlockedOutput: WhatToDoOnBlockedOutput,
  ) {
    super()
    this.probabilityOfNotGeneratingTicket = probabilityOfNotGeneratingTicket
    this.capacity = 0
    this._whatToDoOnBlockedOutput = whatToDoOnBlockedOutput
    this.isNotGeneratingBecauseOfBlockedOutput = false
    this._willGenerateTicketOnCurrentTick = false
  }

  async canReceiveTicket() {
    return false
  }

  async beforeTick() {
    this._willGenerateTicketOnCurrentTick = Math.random() > this.probabilityOfNotGeneratingTicket
  }

  async tick(sysMassService: SystemOfMassService) {
    this.isNotGeneratingBecauseOfBlockedOutput =
      (await this.findOutwardNodeReadyToReceiveTicket()) === null

    if (this.isNotGeneratingBecauseOfBlockedOutput) {
      return
    }

    if (this._willGenerateTicketOnCurrentTick) {
      const newTicket = new Ticket()
      this.ticketsInside.value.push(newTicket)
      sysMassService.addTicket(newTicket)

      const res = await this.tryPushTicketOutward()
      if (res !== PushResult.PUSHED) {
        throw new Error('Ticket was not pushed')
      }
      console.log(`Gen ${this.id} Generated ticket`)
    }
  }
}

export class Queue extends BaseNode {
  capacity: number
  protected _whatToDoOnBlockedOutput: WhatToDoOnBlockedOutput

  constructor(capacity: number) {
    super()
    this.capacity = capacity
    this._whatToDoOnBlockedOutput = WhatToDoOnBlockedOutput.WAIT
  }

  async canReceiveTicket() {
    return true // TODO:
  }

  async tick() {
    while ((await this.tryPushTicketOutward()) === PushResult.PUSHED) {
      // do nothing
    }
  }

  // TODO: on receive ticket, streight away try to push it outward
}

export class Processor extends BaseNode {
  probabilityOfNotProcessingTicket: number
  capacity: number
  protected _whatToDoOnBlockedOutput: WhatToDoOnBlockedOutput
  private _willProcessTicketOnCurrentTick: boolean

  constructor(
    probabilityOfNotProcessingTicket: number,
    whatToDoOnBlockedOutput: WhatToDoOnBlockedOutput = WhatToDoOnBlockedOutput.WAIT,
  ) {
    super()
    this.probabilityOfNotProcessingTicket = probabilityOfNotProcessingTicket
    this.capacity = 1
    this._whatToDoOnBlockedOutput = whatToDoOnBlockedOutput
    this._willProcessTicketOnCurrentTick = false
  }

  async canReceiveTicket() {
    return this.ticketsInside.value.length === 0 || this._willProcessTicketOnCurrentTick
    // TODO: if there are outward nodes, it is more complicated
  }

  beforeTick?() {
    this._willProcessTicketOnCurrentTick = Math.random() > this.probabilityOfNotProcessingTicket
  }

  async tick(sysMassService: SystemOfMassService) {
    if (this._willProcessTicketOnCurrentTick) {
      const ticket = this.ticketsInside.value.shift()
      if (ticket) {
        sysMassService.removeTicket(ticket)
      }
      // TODO: if there are outward nodes, push ticket to one of them instead of removing it
    }
  }
}

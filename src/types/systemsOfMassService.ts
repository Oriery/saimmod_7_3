import type { Ref } from 'vue'
import { ref } from 'vue'

interface WithId {
  id: string
}

interface Tickable extends WithId {
  tick(sysMassService: SystemOfMassService): void
  beforeTick?(sysMassService: SystemOfMassService): void
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

  doFullTick() {
    console.log(`TICK ${this._tick}`)
    // do beforeTick
    for (const tickable of this._tickables) {
      if (tickable.beforeTick) {
        tickable.beforeTick(this)
      }
    }

    // do tick
    for (const tickable of this._tickables) {
      tickable.tick(this)
    }

    this._tick++
  }
}

export class Ticket implements Tickable {
  private _id: string
  public get id(): string {
    return this._id
  }
  ticksAlive: Ref<number>

  constructor() {
    this._id = Math.random().toString(36).slice(2)
    this.ticksAlive = ref(0)
  }

  tick() {
    this.ticksAlive.value++
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
  protected abstract canReceiveTicket(sysMassService: SystemOfMassService): boolean

  constructor() {
    this._id = Math.random().toString(36).slice(2)
    this._ticketsInside = ref([])
    this.outwardNodes = []
  }

  tryPushTicketOutward(sysMassService: SystemOfMassService): PushResult {
    const ticket = this.ticketsInside.value[0]
    if (ticket) {
      const nodeReadyToReceiveTicket = this.findOutwardNodeReadyToReceiveTicket(sysMassService)

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

  findOutwardNodeReadyToReceiveTicket(sysMassService: SystemOfMassService): BaseNode | null {
    let nodeReadyToReceiveTicket: BaseNode | null = null
    for (const i in this.outwardNodes) {
      const node = this.outwardNodes[i]
      if (node.canReceiveTicket(sysMassService)) {
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

  abstract tick(sysMassService: SystemOfMassService): void
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

  canReceiveTicket() {
    throw new Error('Generator cannot receive ticket. Do not even ask.')
    return false
  }

  beforeTick() {
    this._willGenerateTicketOnCurrentTick = Math.random() > this.probabilityOfNotGeneratingTicket
  }

  tick(sysMassService: SystemOfMassService) {
    this.isNotGeneratingBecauseOfBlockedOutput = this.findOutwardNodeReadyToReceiveTicket(sysMassService) === null

    // TODO: should generate but drop if _whatToDoOnBlockedOutput === WhatToDoOnBlockedOutput.DROP
    if (this.isNotGeneratingBecauseOfBlockedOutput) {
      console.log(`Gen ${this.id} Blocked output`)
      return
    }

    if (this._willGenerateTicketOnCurrentTick) {
      const newTicket = new Ticket()
      this.ticketsInside.value.push(newTicket)
      sysMassService.addTicket(newTicket)

      const res = this.tryPushTicketOutward(sysMassService)
      if (res !== PushResult.PUSHED) {
        throw new Error('Ticket was not pushed')
      }
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

  canReceiveTicket() {
    return true // TODO:
  }

  tick(sysMassService: SystemOfMassService) {
    while (this.tryPushTicketOutward(sysMassService) === PushResult.PUSHED) {
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
  private _didTryProcessTicketOnCurrentTickAlready: boolean

  constructor(
    probabilityOfNotProcessingTicket: number,
    whatToDoOnBlockedOutput: WhatToDoOnBlockedOutput = WhatToDoOnBlockedOutput.WAIT,
  ) {
    super()
    this.probabilityOfNotProcessingTicket = probabilityOfNotProcessingTicket
    this.capacity = 1
    this._whatToDoOnBlockedOutput = whatToDoOnBlockedOutput
    this._willProcessTicketOnCurrentTick = false
    this._didTryProcessTicketOnCurrentTickAlready = false
  }

  canReceiveTicket(sysMassService: SystemOfMassService) {
    this.tryProcessTicket(sysMassService)
    return this.ticketsInside.value.length === 0
  }

  beforeTick() {
    this._willProcessTicketOnCurrentTick = Math.random() > this.probabilityOfNotProcessingTicket
    this._didTryProcessTicketOnCurrentTickAlready = false
  }

  tick(sysMassService: SystemOfMassService) {
    this.tryProcessTicket(sysMassService)
  }

  tryProcessTicket(sysMassService: SystemOfMassService) {
    if (this._didTryProcessTicketOnCurrentTickAlready) {
      return
    }

    this._didTryProcessTicketOnCurrentTickAlready = true

    if (this.ticketsInside.value.length && this._willProcessTicketOnCurrentTick) {
      // If no outward nodes, ticket leaves the system
      if (this.outwardNodes.length === 0) {
        const ticket = this.ticketsInside.value.shift()
        if (ticket) {
          sysMassService.removeTicket(ticket)
        } else {
          throw new Error('No ticket to remove')
        }
      } else { // If there are outward nodes, try to push ticket outward
        const res = this.tryPushTicketOutward(sysMassService)
        if (res === PushResult.DROPPED) {
          console.log(`Proc ${this.id} dropped out ticket`)
        }
      }
    }
  }

}

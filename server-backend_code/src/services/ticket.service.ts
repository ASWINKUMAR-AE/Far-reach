import { PrismaClient, Ticket, TicketStatusHistory } from '@prisma/client';

const prisma = new PrismaClient();

// Allowed transitions based on requirements
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'CREATED': ['QUEUED', 'CANCELLED'],
  'QUEUED': ['CALLED', 'CANCELLED'],
  'CALLED': ['ARRIVED', 'NO_SHOW', 'CANCELLED'],
  'NO_SHOW': ['RESCHEDULED'],
  'RESCHEDULED': ['QUEUED'],
  'ARRIVED': ['VERIFYING'],
  'VERIFYING': ['PROCESSING', 'REJECTED'],
  'PROCESSING': ['COMPLETED', 'FAILED'],
  'FAILED': ['PROCESSING', 'CANCELLED'],
  'COMPLETED': ['PAYMENT_PENDING'],
  'PAYMENT_PENDING': ['PAYMENT_PROCESSING'],
  'PAYMENT_PROCESSING': ['PAID', 'PAYMENT_PENDING'],
  'PAID': ['CLOSED'],
};

export class TicketService {
  /**
   * Centralized state machine transition function.
   * Ensures that all ticket status changes follow valid transitions and log audit history.
   */
  static async transitionTicket(
    ticketId: string,
    newStatus: string,
    actorType: 'FARMER' | 'STAFF' | 'ADMIN' | 'SYSTEM',
    changedBy: string,
    reason?: string,
    metadata?: any
  ): Promise<Ticket> {
    // 1. Fetch current ticket state
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    const currentStatus = ticket.status;

    // 2. Validate transition
    const validNextStates = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!validNextStates.includes(newStatus)) {
      throw new Error(`Invalid transition: ${currentStatus} -> ${newStatus}`);
    }

    // 3. Business Rules Validation based on roles
    if (actorType === 'FARMER' && newStatus !== 'CANCELLED') {
      throw new Error('Farmers are only allowed to CANCEL their tickets.');
    }
    if (newStatus === 'CANCELLED' && actorType === 'FARMER') {
      if (!['CREATED', 'QUEUED'].includes(currentStatus)) {
        throw new Error('Farmers cannot cancel tickets after being called or processed.');
      }
    }

    // 4. Set specific timestamps based on status
    const updateData: any = { status: newStatus };
    if (newStatus === 'CALLED') updateData.called_at = new Date();
    if (newStatus === 'ARRIVED') updateData.arrived_at = new Date();
    if (newStatus === 'NO_SHOW') updateData.no_show_at = new Date();
    if (newStatus === 'CANCELLED') updateData.cancelled_at = new Date();
    if (newStatus === 'CLOSED') updateData.closed_at = new Date();

    // 5. Execute atomic transition
    return await prisma.$transaction(async (tx) => {
      // Create history
      await tx.ticketStatusHistory.create({
        data: {
          ticket_id: ticketId,
          old_status: currentStatus,
          new_status: newStatus,
          changed_by: changedBy,
          actor_type: actorType,
          reason,
          metadata: metadata ? JSON.stringify(metadata) : null,
        }
      });

      // Update ticket
      return await tx.ticket.update({
        where: { id: ticketId },
        data: updateData,
      });
    });
  }

  /**
   * Called when a staff member clicks 'Call Next'.
   * Atomically assigns the next QUEUED ticket to a counter.
   */
  static async callNextTicket(
    sessionId: string, 
    counterId: string, 
    staffId: string
  ): Promise<Ticket | null> {
    return await prisma.$transaction(async (tx) => {
      // Find the next eligible ticket
      // Note: We use findFirst to get the lowest queue number with status QUEUED.
      const nextTicket = await tx.ticket.findFirst({
        where: {
          session_id: sessionId,
          status: 'QUEUED',
        },
        orderBy: {
          queue_number: 'asc'
        }
      });

      if (!nextTicket) {
        return null;
      }

      // Transition to CALLED and assign counter
      await tx.ticketStatusHistory.create({
        data: {
          ticket_id: nextTicket.id,
          old_status: nextTicket.status,
          new_status: 'CALLED',
          changed_by: staffId,
          actor_type: 'STAFF',
          reason: `Called to counter ${counterId}`,
        }
      });

      return await tx.ticket.update({
        where: { id: nextTicket.id },
        data: {
          status: 'CALLED',
          called_at: new Date(),
          counter_id: counterId,
        },
      });
    });
  }

  /**
   * Safely calculates the farmer's dynamic queue position.
   */
  static async getQueuePosition(sessionId: string, ticketQueueNumber: number): Promise<number> {
    const ticketsAhead = await prisma.ticket.count({
      where: {
        session_id: sessionId,
        status: 'QUEUED',
        queue_number: {
          lt: ticketQueueNumber
        }
      }
    });
    return ticketsAhead + 1; // 1-indexed position
  }
}

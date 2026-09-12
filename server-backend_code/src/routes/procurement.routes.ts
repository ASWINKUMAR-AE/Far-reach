import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { TicketService } from '../services/ticket.service';

const router = Router();
const prisma = new PrismaClient();

// In a real application, you'd use a middleware to extract the user from the JWT.
// For this demonstration, we'll assume the user ID is passed in the body or headers.

/**
 * 1. Book a Procurement Slot (Create Ticket)
 */
router.post('/book-slot', async (req, res) => {
  try {
    const { farmerId, centreId, crop, quantityKg, sessionId } = req.body;

    if (!farmerId || !centreId || !crop || !quantityKg || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (quantityKg <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }

    const ticket = await prisma.$transaction(async (tx) => {
      // Check farmer
      const farmer = await tx.farmer.findUnique({ where: { id: farmerId } });
      if (!farmer) throw new Error('Invalid farmer');

      // Check duplicate active ticket
      const existingTicket = await tx.ticket.findFirst({
        where: {
          farmer_id: farmerId,
          session_id: sessionId,
          status: { notIn: ['CLOSED', 'CANCELLED', 'NO_SHOW', 'REJECTED'] }
        }
      });

      if (existingTicket) {
        throw new Error('Farmer already has an active ticket in this session');
      }

      // Check session capacity
      const session = await tx.procurementSession.findUnique({
        where: { id: sessionId },
        include: { _count: { select: { tickets: true } } }
      });

      if (!session) throw new Error('Invalid session');
      if (session.status !== 'ACTIVE') throw new Error('Session is not active');
      if (session._count.tickets >= session.capacity) throw new Error('Session capacity exhausted');

      // Get next queue sequence
      const maxQueueTicket = await tx.ticket.findFirst({
        where: { session_id: sessionId },
        orderBy: { queue_number: 'desc' }
      });
      const nextQueueNumber = (maxQueueTicket?.queue_number || 0) + 1;

      // Create ticket
      const newTicketId = `PRC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const newTicket = await tx.ticket.create({
        data: {
          id: newTicketId,
          queue_number: nextQueueNumber,
          status: 'CREATED',
          farmer_id: farmerId,
          session_id: sessionId,
          crop,
          requested_qty_kg: quantityKg,
        }
      });

      // Transition to QUEUED
      await tx.ticketStatusHistory.create({
        data: {
          ticket_id: newTicketId,
          old_status: 'CREATED',
          new_status: 'QUEUED',
          changed_by: farmerId,
          actor_type: 'FARMER',
          reason: 'Initial booking'
        }
      });

      return await tx.ticket.update({
        where: { id: newTicketId },
        data: { status: 'QUEUED' }
      });
    });

    req.app.get('io').emit('QUEUE_UPDATED', { sessionId });

    res.status(201).json({ success: true, ticket });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * 2. Get active booking for a farmer
 */
router.get('/active-booking/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;
    const ticket = await prisma.ticket.findFirst({
      where: {
        farmer_id: farmerId,
        status: { notIn: ['CLOSED', 'CANCELLED', 'REJECTED'] }
      },
      include: {
        session: {
          include: { centre: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    if (!ticket) return res.status(404).json({ message: 'No active booking' });

    // Get live queue position
    let currentQueuePos = ticket.queue_number;
    if (ticket.status === 'QUEUED') {
      currentQueuePos = await TicketService.getQueuePosition(ticket.session_id, ticket.queue_number);
    }

    res.json({
      success: true,
      data: {
        ...ticket,
        live_queue_position: currentQueuePos
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3. Cancel Ticket (Farmer or Admin)
 */
router.post('/tickets/:ticketId/cancel', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { actorId, actorType, reason } = req.body; // In reality, from auth middleware

    const updatedTicket = await TicketService.transitionTicket(
      ticketId, 
      'CANCELLED', 
      actorType || 'FARMER', 
      actorId || 'unknown', 
      reason
    );

    req.app.get('io').emit('QUEUE_UPDATED', { sessionId: updatedTicket.session_id });

    res.json({ success: true, data: updatedTicket });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * 4. Staff Action: Call Next Ticket
 */
router.post('/queue/next', async (req, res) => {
  try {
    const { sessionId, counterId, staffId } = req.body;
    
    if (!sessionId || !counterId || !staffId) {
      return res.status(400).json({ error: 'Missing sessionId, counterId, or staffId' });
    }

    const ticket = await TicketService.callNextTicket(sessionId, counterId, staffId);
    
    if (!ticket) {
      return res.status(404).json({ message: 'No more farmers in the queue' });
    }

    // Emit a WebSocket event to notify the specific farmer
    req.app.get('io').emit(`TICKET_CALLED_${ticket.farmer_id}`, ticket);
    req.app.get('io').emit('QUEUE_UPDATED', { sessionId });

    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * 5. Staff Action: Mark Arrived
 */
router.post('/tickets/:ticketId/arrive', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { staffId } = req.body;

    const ticket = await TicketService.transitionTicket(ticketId, 'ARRIVED', 'STAFF', staffId);
    
    req.app.get('io').emit('QUEUE_UPDATED', { sessionId: ticket.session_id });
    
    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * 6. Staff Action: Verify
 */
router.post('/tickets/:ticketId/verify', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { staffId, isApproved, rejectionReason } = req.body;

    if (isApproved === false && !rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason required' });
    }

    const currentTicket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (currentTicket && currentTicket.status === 'ARRIVED') {
      await TicketService.transitionTicket(ticketId, 'VERIFYING', 'STAFF', staffId, 'Started verification process');
    }

    const nextStatus = isApproved ? 'PROCESSING' : 'REJECTED';
    const ticket = await TicketService.transitionTicket(ticketId, nextStatus, 'STAFF', staffId, rejectionReason);
    
    req.app.get('io').emit('QUEUE_UPDATED', { sessionId: ticket.session_id });
    
    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * 7. Staff Action: Complete Procurement & Weighing
 */
router.post('/tickets/:ticketId/complete', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { 
      staffId, 
      grossQuantityKg, 
      tareQuantityKg, 
      acceptedQuantity, 
      rejectedQuantity, 
      qualityGrade, 
      ratePerKg, 
      moisturePct 
    } = req.body;

    const ticket = await prisma.$transaction(async (tx) => {
      // Complete the ticket
      const updatedTicket = await TicketService.transitionTicket(ticketId, 'COMPLETED', 'STAFF', staffId);
      
      // Calculate total amount
      const totalAmount = acceptedQuantity * ratePerKg;

      // Create transaction record
      await tx.procurementTransaction.create({
        data: {
          ticket_id: ticketId,
          gross_quantity_kg: grossQuantityKg,
          tare_quantity_kg: tareQuantityKg || 0,
          accepted_quantity: acceptedQuantity,
          rejected_quantity: rejectedQuantity || 0,
          quality_grade: qualityGrade,
          moisture_pct: moisturePct,
          rate_per_kg: ratePerKg,
          total_amount: totalAmount,
          processed_by: staffId,
          procurement_completed_at: new Date()
        }
      });

      // Immediately transition to PAYMENT_PENDING
      const finalTicket = await TicketService.transitionTicket(ticketId, 'PAYMENT_PENDING', 'SYSTEM', 'SYSTEM');
      return finalTicket;
    });

    req.app.get('io').emit('QUEUE_UPDATED', { sessionId: ticket.session_id });

    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

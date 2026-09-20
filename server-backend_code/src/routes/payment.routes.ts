import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { TicketService } from '../services/ticket.service';

const router = Router();
const prisma = new PrismaClient();

/**
 * 1. MOCK: Create a payment order (like Stripe/Razorpay checkout session)
 */
router.post('/create-order', async (req, res) => {
  try {
    const { ticketId } = req.body;
    
    if (!ticketId) {
      return res.status(400).json({ error: 'ticketId is required' });
    }

    const transaction = await prisma.procurementTransaction.findUnique({
      where: { ticket_id: ticketId }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found for this ticket' });
    }

    if (transaction.payment_status === 'PAID') {
      return res.status(400).json({ error: 'Transaction is already paid' });
    }

    // Generate mock order ID
    const orderId = `PAY_${Math.floor(10000000 + Math.random() * 90000000)}`;

    res.json({
      success: true,
      data: {
        order_id: orderId,
        amount: transaction.total_amount,
        currency: 'INR'
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2. MOCK: Verify payment securely and update DB
 */
router.post('/verify', async (req, res) => {
  try {
    const { ticketId, orderId, mockSignature } = req.body;
    
    if (!ticketId || !orderId) {
      return res.status(400).json({ error: 'ticketId and orderId are required' });
    }

    // In reality, you would verify the HMAC signature from the gateway here
    const isValid = mockSignature === 'mock_valid_signature' || true; // Mock true for now

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    await prisma.$transaction(async (tx) => {
      // Mark transaction as PAID
      await tx.procurementTransaction.update({
        where: { ticket_id: ticketId },
        data: {
          payment_status: 'PAID',
          payment_ref: orderId
        }
      });

      // Update Ticket status safely using TicketService logic directly in transaction
      // Transition PAYMENT_PENDING -> PAID -> CLOSED
      
      const currentTicket = await tx.ticket.findUnique({ where: { id: ticketId }});
      if (!currentTicket) throw new Error("Ticket not found");
      
      // Update history
      await tx.ticketStatusHistory.create({
        data: {
          ticket_id: ticketId,
          old_status: currentTicket.status,
          new_status: 'CLOSED',
          changed_by: 'SYSTEM',
          actor_type: 'SYSTEM',
          reason: 'Payment successful, closing ticket',
        }
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'CLOSED',
          closed_at: new Date()
        }
      });
    });
    
    // Alert the frontend about the queue update
    req.app.get('io').emit('QUEUE_UPDATED', { message: 'Payment completed' });

    res.json({
      success: true,
      message: 'Payment verified securely and transaction closed.'
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

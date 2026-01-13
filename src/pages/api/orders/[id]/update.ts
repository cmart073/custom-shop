// POST /api/orders/[id]/update - Update order (admin)
import type { APIRoute } from 'astro';
import { sendStatusUpdateEmail, sendPaymentConfirmationEmail } from '../../../../lib/email';

const VALID_STATUSES = ['pending', 'received', 'in_progress', 'ready', 'completed', 'shipped', 'cancelled'];
const VALID_PAYMENT_STATUSES = ['UNPAID', 'PAID'];

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const env = locals.runtime.env;
    const db = env.DB;
    const orderId = params.id;

    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get existing order with current values
    const existingOrder = await db.prepare(
      'SELECT id, short_id, full_name, email, status, payment_status FROM orders WHERE id = ?'
    ).bind(orderId).first() as {
      id: string;
      short_id: string;
      full_name: string;
      email: string;
      status: string;
      payment_status: string;
    } | null;

    if (!existingOrder) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const input = await request.json() as {
      status?: string;
      paymentStatus?: string;
      quotedPrice?: number | null;
      adminNotes?: string | null;
      notifyCustomer?: boolean;
    };

    // Validate status
    if (input.status && !VALID_STATUSES.includes(input.status)) {
      return new Response(JSON.stringify({ error: 'Invalid status value' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate payment status
    if (input.paymentStatus && !VALID_PAYMENT_STATUSES.includes(input.paymentStatus)) {
      return new Response(JSON.stringify({ error: 'Invalid payment status value' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build update query
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
    }

    if (input.paymentStatus !== undefined) {
      updates.push('payment_status = ?');
      values.push(input.paymentStatus);
    }

    if (input.quotedPrice !== undefined) {
      updates.push('quoted_price = ?');
      values.push(input.quotedPrice);
    }

    if (input.adminNotes !== undefined) {
      updates.push('admin_notes = ?');
      values.push(input.adminNotes);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: 'No updates provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    values.push(orderId);
    await db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

    // Send email notifications if checkbox was checked
    let emailSent = false;
    if (input.notifyCustomer && env.RESEND_API_KEY) {
      const emailData = {
        shortId: existingOrder.short_id,
        fullName: existingOrder.full_name,
        email: existingOrder.email,
        status: input.status || existingOrder.status,
      };

      // Check if payment status changed to PAID
      const paymentBecamePaid = input.paymentStatus === 'PAID' && existingOrder.payment_status !== 'PAID';
      
      // Check if fulfillment status changed
      const statusChanged = input.status && input.status !== existingOrder.status;

      try {
        if (paymentBecamePaid) {
          // Send payment confirmation email - AWAIT it
          emailSent = await sendPaymentConfirmationEmail(emailData, env);
        } else if (statusChanged) {
          // Send status update email - AWAIT it
          emailSent = await sendStatusUpdateEmail(emailData, env);
        }
      } catch (err) {
        console.error('Email send error:', err);
      }
    }

    return new Response(JSON.stringify({ success: true, emailSent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Order update error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update order' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// CMart073 Order Update API
// POST /api/orders/[id]/update - Update order (admin)

import type { D1Database } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

interface UpdateInput {
  status?: string;
  quotedPrice?: number | null;
  adminNotes?: string | null;
}

const VALID_STATUSES = ['pending', 'received', 'in_progress', 'completed', 'shipped', 'cancelled'];

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const orderId = context.params.id as string;

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify order exists
    const existingOrder = await context.env.DB.prepare(
      'SELECT id FROM orders WHERE id = ?'
    ).bind(orderId).first();

    if (!existingOrder) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const input = await context.request.json() as UpdateInput;

    // Validate status if provided
    if (input.status && !VALID_STATUSES.includes(input.status)) {
      return new Response(JSON.stringify({ error: 'Invalid status value' }), {
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
    await context.env.DB.prepare(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return new Response(JSON.stringify({ success: true }), {
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

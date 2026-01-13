// CMart073 Order Lookup API
// GET /api/orders/[shortId] - Get order by short ID

import type { D1Database } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const shortId = context.params.shortId as string;

    if (!shortId) {
      return new Response(JSON.stringify({ error: 'Order ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const order = await context.env.DB.prepare(
      'SELECT * FROM orders WHERE short_id = ?'
    ).bind(shortId).first();

    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get uploads
    const uploadsResult = await context.env.DB.prepare(
      'SELECT * FROM order_uploads WHERE order_id = ? ORDER BY created_at ASC'
    ).bind(order.id).all();

    return new Response(JSON.stringify({ 
      order,
      uploads: uploadsResult.results || [],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Order lookup error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch order' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

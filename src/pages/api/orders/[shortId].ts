// GET /api/orders/[shortId] - Get order by short ID
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const db = locals.runtime.env.DB;
    const shortId = params.shortId;

    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!shortId) {
      return new Response(JSON.stringify({ error: 'Order ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const order = await db.prepare('SELECT * FROM orders WHERE short_id = ?').bind(shortId).first();

    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const uploadsResult = await db.prepare(
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

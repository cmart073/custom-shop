// CMart073 Database Utilities

import type { D1Database } from '@cloudflare/workers-types';

export interface Order {
  id: string;
  short_id: string;
  created_at: string;
  status: string;
  full_name: string;
  email: string;
  phone: string | null;
  shipping_address: string;
  preferred_contact_method: string;
  service_type: string;
  club_count: number | null;
  current_paint_condition: string | null;
  paint_style: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  notes: string | null;
  grip_service: string;
  grip_count: number | null;
  grip_model: string | null;
  grip_size: string | null;
  extra_wraps: number | null;
  est_price_min: number;
  est_price_max: number;
  quoted_price: number | null;
  admin_notes: string | null;
}

export interface OrderUpload {
  id: string;
  order_id: string;
  r2_key: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface CreateOrderInput {
  id: string;
  shortId: string;
  fullName: string;
  email: string;
  phone: string | null;
  shippingAddress: string;
  preferredContactMethod: string;
  serviceType: string;
  clubCount: number | null;
  currentPaintCondition: string | null;
  paintStyle: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  notes: string | null;
  gripService: string;
  gripCount: number | null;
  gripModel: string | null;
  gripSize: string | null;
  extraWraps: number | null;
  estPriceMin: number;
  estPriceMax: number;
}

export async function createOrder(db: D1Database, input: CreateOrderInput): Promise<void> {
  await db.prepare(`
    INSERT INTO orders (
      id, short_id, full_name, email, phone, shipping_address,
      preferred_contact_method, service_type, club_count, current_paint_condition,
      paint_style, primary_color, secondary_color, notes, grip_service,
      grip_count, grip_model, grip_size, extra_wraps, est_price_min, est_price_max
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.id,
    input.shortId,
    input.fullName,
    input.email,
    input.phone,
    input.shippingAddress,
    input.preferredContactMethod,
    input.serviceType,
    input.clubCount,
    input.currentPaintCondition,
    input.paintStyle,
    input.primaryColor,
    input.secondaryColor,
    input.notes,
    input.gripService,
    input.gripCount,
    input.gripModel,
    input.gripSize,
    input.extraWraps,
    input.estPriceMin,
    input.estPriceMax,
  ).run();
}

export async function createOrderUpload(
  db: D1Database,
  input: {
    id: string;
    orderId: string;
    r2Key: string;
    originalFilename: string;
    contentType: string;
    sizeBytes: number;
  }
): Promise<void> {
  await db.prepare(`
    INSERT INTO order_uploads (id, order_id, r2_key, original_filename, content_type, size_bytes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    input.id,
    input.orderId,
    input.r2Key,
    input.originalFilename,
    input.contentType,
    input.sizeBytes,
  ).run();
}

export async function getOrderById(db: D1Database, id: string): Promise<Order | null> {
  const result = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<Order>();
  return result || null;
}

export async function getOrderByShortId(db: D1Database, shortId: string): Promise<Order | null> {
  const result = await db.prepare('SELECT * FROM orders WHERE short_id = ?').bind(shortId).first<Order>();
  return result || null;
}

export async function getOrderUploads(db: D1Database, orderId: string): Promise<OrderUpload[]> {
  const result = await db.prepare(
    'SELECT * FROM order_uploads WHERE order_id = ? ORDER BY created_at ASC'
  ).bind(orderId).all<OrderUpload>();
  return result.results || [];
}

export async function listOrders(
  db: D1Database,
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<{ orders: Order[]; total: number }> {
  const { status, limit = 50, offset = 0 } = options;

  let countQuery = 'SELECT COUNT(*) as count FROM orders';
  let selectQuery = 'SELECT * FROM orders';
  const params: (string | number)[] = [];

  if (status && status !== 'all') {
    countQuery += ' WHERE status = ?';
    selectQuery += ' WHERE status = ?';
    params.push(status);
  }

  selectQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

  const countResult = await db.prepare(countQuery).bind(...params).first<{ count: number }>();
  const total = countResult?.count || 0;

  const ordersResult = await db.prepare(selectQuery)
    .bind(...params, limit, offset)
    .all<Order>();

  return {
    orders: ordersResult.results || [],
    total,
  };
}

export async function updateOrderStatus(
  db: D1Database,
  id: string,
  status: string
): Promise<void> {
  await db.prepare('UPDATE orders SET status = ? WHERE id = ?')
    .bind(status, id)
    .run();
}

export async function updateOrderAdmin(
  db: D1Database,
  id: string,
  data: { status?: string; quotedPrice?: number | null; adminNotes?: string | null }
): Promise<void> {
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.quotedPrice !== undefined) {
    updates.push('quoted_price = ?');
    values.push(data.quotedPrice);
  }
  if (data.adminNotes !== undefined) {
    updates.push('admin_notes = ?');
    values.push(data.adminNotes);
  }

  if (updates.length === 0) return;

  values.push(id);
  await db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function shortIdExists(db: D1Database, shortId: string): Promise<boolean> {
  const result = await db.prepare('SELECT 1 FROM orders WHERE short_id = ?')
    .bind(shortId)
    .first();
  return result !== null;
}

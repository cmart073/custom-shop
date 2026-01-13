// POST /api/orders - Create a new order
import type { APIRoute } from 'astro';

interface OrderInput {
  fullName: string;
  email: string;
  phone: string | null;
  shippingAddress: string;
  preferredContactMethod: 'email' | 'text';
  serviceType: 'irons' | 'putter' | 'both' | 'grips_only';
  clubCount: number | null;
  currentPaintCondition: 'good' | 'chipped' | 'strip_redo' | null;
  paintStyle: 'single_color' | 'multi_color' | 'match_theme' | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  notes: string | null;
  gripService: 'none' | 'install_customer_supplied' | 'supply_and_install';
  gripCount: number | null;
  gripModel: string | null;
  gripSize: 'standard' | 'midsize' | 'jumbo' | null;
  extraWraps: number | null;
  uploads: Array<{
    r2Key: string;
    originalFilename: string;
    contentType: string;
    sizeBytes: number;
  }>;
  turnstileToken: string;
}

function generateShortId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'CM-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Pricing constants (in cents)
const PRICES = {
  irons_7_9: 8500,
  irons_4_6: 6500,
  single_club: 4000,
  putter: 5500,
  multi_color_irons: 2000,
  multi_color_putter: 1500,
  strip_redo: 2500,
  grip_customer_supplied: 500,
  grip_supply_install: 700,
  shipping_irons: 2000,
  shipping_putter: 1500,
};

function calculatePricing(input: OrderInput): { estPriceMin: number; estPriceMax: number } {
  let basePrice = 0;
  let multiColorAddon = 0;
  let stripRedoAddon = 0;
  let gripCost = 0;
  let shippingEstimate = 0;

  if (input.serviceType === 'grips_only') {
    basePrice = 0;
  } else if (input.serviceType === 'putter') {
    basePrice = PRICES.putter;
  } else if (input.serviceType === 'irons' || input.serviceType === 'both') {
    const clubCount = input.clubCount || 0;
    if (clubCount >= 7 && clubCount <= 9) {
      basePrice = PRICES.irons_7_9;
    } else if (clubCount >= 4 && clubCount <= 6) {
      basePrice = PRICES.irons_4_6;
    } else if (clubCount === 1) {
      basePrice = PRICES.single_club;
    } else if (clubCount === 2 || clubCount === 3) {
      basePrice = Math.min(PRICES.single_club * clubCount, PRICES.irons_4_6);
    } else if (clubCount > 9) {
      basePrice = PRICES.irons_7_9;
    }

    if (input.serviceType === 'both') {
      basePrice += PRICES.putter;
    }
  }

  if (input.paintStyle === 'multi_color' || input.paintStyle === 'match_theme') {
    if (input.serviceType === 'irons' || input.serviceType === 'both') {
      multiColorAddon += PRICES.multi_color_irons;
    }
    if (input.serviceType === 'putter' || input.serviceType === 'both') {
      multiColorAddon += PRICES.multi_color_putter;
    }
  }

  if (input.currentPaintCondition === 'strip_redo') {
    stripRedoAddon = PRICES.strip_redo;
  }

  const gripCount = input.gripCount || 0;
  if (input.gripService === 'install_customer_supplied' && gripCount > 0) {
    gripCost = PRICES.grip_customer_supplied * gripCount;
  } else if (input.gripService === 'supply_and_install' && gripCount > 0) {
    gripCost = PRICES.grip_supply_install * gripCount;
  }

  if (input.serviceType === 'putter') {
    shippingEstimate = PRICES.shipping_putter;
  } else if (input.serviceType !== 'grips_only') {
    shippingEstimate = PRICES.shipping_irons;
  } else {
    shippingEstimate = gripCount > 6 ? PRICES.shipping_irons : PRICES.shipping_putter;
  }

  const subtotal = basePrice + multiColorAddon + stripRedoAddon + gripCost;
  return {
    estPriceMin: subtotal + shippingEstimate,
    estPriceMax: subtotal + shippingEstimate + 500,
  };
}

async function verifyTurnstile(token: string, secretKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });
    const result = await response.json() as { success: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}

function formatServiceType(type: string): string {
  const types: Record<string, string> = {
    irons: 'Iron Paint Fill',
    putter: 'Putter Paint Fill',
    both: 'Iron & Putter Paint Fill',
    grips_only: 'Grip Installation Only',
  };
  return types[type] || type;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

async function sendCustomerEmail(
  shortId: string, fullName: string, email: string, serviceType: string,
  estPriceMin: number, estPriceMax: number, env: any
): Promise<boolean> {
  const priceRange = `${formatPrice(estPriceMin)} – ${formatPrice(estPriceMax)}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a2f 0%, #2d5a47 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">Cmart Customization Shop</h1>
  </div>
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
    <h2 style="margin: 0 0 20px 0; color: #1e3a2f;">Hey ${fullName}!</h2>
    <p>Got your order. Here's your reference number — hang onto it:</p>
    <div style="background: #f8faf9; border: 2px solid #1e3a2f; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 28px; font-weight: 700; color: #1e3a2f; letter-spacing: 2px;">${shortId}</span>
    </div>
    <h3 style="color: #1e3a2f; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px;">What's Next</h3>
    <div style="background: #f8faf9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="margin: 0 0 15px 0;"><strong>Ship your clubs to:</strong></p>
      <p style="margin: 0; padding: 15px; background: #fff; border-radius: 6px; border-left: 4px solid #1e3a2f;">
        ${(env.SHIP_TO_ADDRESS || 'Cmart Customization Shop').replace(/,/g, '<br>')}
      </p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr><td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;"><strong>Service:</strong></td><td style="text-align: right; padding: 12px 0; border-bottom: 1px solid #e5e5e5;">${formatServiceType(serviceType)}</td></tr>
      <tr><td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;"><strong>Estimated Price:</strong></td><td style="text-align: right; padding: 12px 0; border-bottom: 1px solid #e5e5e5;">${priceRange}</td></tr>
      <tr><td style="padding: 12px 0;"><strong>Turnaround:</strong></td><td style="text-align: right; padding: 12px 0;">2–5 business days once I have them</td></tr>
    </table>
    <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Heads up:</strong> This is cosmetic work only — I don't touch lofts, lies, or weights.</p>
    </div>
    <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">Questions? Just reply to this email.</p>
  </div>
  <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
    <p style="margin: 0; color: #666; font-size: 12px;">© ${new Date().getFullYear()} Cmart Customization Shop. Powered by <a href="https://ninebefore9.us" style="color: #666;">NineBefore9.us</a></p>
  </div>
</body>
</html>`.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Cmart Customization Shop <${env.FROM_EMAIL || 'noreply@cmart073.com'}>`,
        to: [email],
        subject: `Got your order — ${shortId}`,
        html: htmlContent,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Customer email error:', error);
    return false;
  }
}

async function sendAdminEmail(
  shortId: string, fullName: string, email: string, serviceType: string,
  estPriceMin: number, estPriceMax: number, orderId: string, env: any
): Promise<boolean> {
  const priceRange = `${formatPrice(estPriceMin)} – ${formatPrice(estPriceMax)}`;
  const adminLink = `${env.SITE_URL || 'https://customization.cmart073.com'}/admin/orders/${orderId}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <div style="background: #1e3a2f; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 20px;">New Order</h1>
  </div>
  <div style="background: #fff; padding: 25px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;"><strong>Order ID:</strong></td><td>${shortId}</td></tr>
      <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;"><strong>Name:</strong></td><td>${fullName}</td></tr>
      <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;"><strong>Email:</strong></td><td>${email}</td></tr>
      <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;"><strong>Service:</strong></td><td>${formatServiceType(serviceType)}</td></tr>
      <tr><td style="padding: 10px 0;"><strong>Estimate:</strong></td><td>${priceRange}</td></tr>
    </table>
    <div style="margin-top: 25px; text-align: center;">
      <a href="${adminLink}" style="display: inline-block; background: #1e3a2f; color: #fff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Order</a>
    </div>
  </div>
</body>
</html>`.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Cmart Customization Shop <${env.FROM_EMAIL || 'noreply@cmart073.com'}>`,
        to: [env.ADMIN_EMAIL],
        subject: `New order — ${shortId}`,
        html: htmlContent,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Admin email error:', error);
    return false;
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    const db = env.DB;

    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const input = await request.json() as OrderInput;

    // Verify Turnstile
    if (env.TURNSTILE_SECRET_KEY) {
      const turnstileValid = await verifyTurnstile(input.turnstileToken, env.TURNSTILE_SECRET_KEY);
      if (!turnstileValid) {
        return new Response(JSON.stringify({ error: 'Security verification failed' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Generate IDs
    const orderId = crypto.randomUUID();
    let shortId = generateShortId();
    
    // Ensure unique short ID
    for (let i = 0; i < 10; i++) {
      const existing = await db.prepare('SELECT 1 FROM orders WHERE short_id = ?').bind(shortId).first();
      if (!existing) break;
      shortId = generateShortId();
    }

    // Calculate pricing
    const { estPriceMin, estPriceMax } = calculatePricing(input);

    // Insert order
    await db.prepare(`
      INSERT INTO orders (
        id, short_id, full_name, email, phone, shipping_address,
        preferred_contact_method, service_type, club_count, current_paint_condition,
        paint_style, primary_color, secondary_color, notes, grip_service,
        grip_count, grip_model, grip_size, extra_wraps, est_price_min, est_price_max
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      orderId, shortId, input.fullName, input.email, input.phone || null,
      input.shippingAddress, input.preferredContactMethod, input.serviceType,
      input.clubCount || null, input.currentPaintCondition || null,
      input.paintStyle || null, input.primaryColor || null, input.secondaryColor || null,
      input.notes || null, input.gripService, input.gripCount || null,
      input.gripModel || null, input.gripSize || null, input.extraWraps || null,
      estPriceMin, estPriceMax
    ).run();

    // Insert upload records
    for (const upload of input.uploads) {
      await db.prepare(`
        INSERT INTO order_uploads (id, order_id, r2_key, original_filename, content_type, size_bytes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), orderId, upload.r2Key,
        upload.originalFilename, upload.contentType, upload.sizeBytes
      ).run();
    }

    // Send emails (non-blocking)
    if (env.RESEND_API_KEY) {
      sendCustomerEmail(shortId, input.fullName, input.email, input.serviceType, estPriceMin, estPriceMax, env).catch(err => {
        console.error('Failed to send customer email:', err);
      });
      if (env.ADMIN_EMAIL) {
        sendAdminEmail(shortId, input.fullName, input.email, input.serviceType, estPriceMin, estPriceMax, orderId, env).catch(err => {
          console.error('Failed to send admin email:', err);
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      shortId,
      estPriceMin,
      estPriceMax,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Order creation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create order. Please try again.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

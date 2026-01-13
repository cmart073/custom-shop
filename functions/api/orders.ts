// CMart073 Orders API
// POST /api/orders - Create a new order

import type { D1Database } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  TURNSTILE_SECRET_KEY: string;
  SENDGRID_API_KEY: string;
  ADMIN_EMAIL: string;
  FROM_EMAIL: string;
  SHIP_TO_ADDRESS: string;
  SITE_URL: string;
}

interface OrderInput {
  // Customer
  fullName: string;
  email: string;
  phone: string | null;
  shippingAddress: string;
  preferredContactMethod: 'email' | 'text';
  
  // Service
  serviceType: 'irons' | 'putter' | 'both' | 'grips_only';
  clubCount: number | null;
  currentPaintCondition: 'good' | 'chipped' | 'strip_redo' | null;
  paintStyle: 'single_color' | 'multi_color' | 'match_theme' | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  notes: string | null;
  
  // Grips
  gripService: 'none' | 'install_customer_supplied' | 'supply_and_install';
  gripCount: number | null;
  gripModel: string | null;
  gripSize: 'standard' | 'midsize' | 'jumbo' | null;
  extraWraps: number | null;
  
  // Files
  uploads: Array<{
    r2Key: string;
    originalFilename: string;
    contentType: string;
    sizeBytes: number;
  }>;
  
  // Security
  turnstileToken: string;
}

interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

function validateOrderInput(data: Partial<OrderInput>): ValidationResult {
  const errors: Record<string, string> = {};

  // Customer validation
  if (!data.fullName?.trim()) {
    errors.fullName = 'Full name is required';
  }

  if (!data.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.shippingAddress?.trim()) {
    errors.shippingAddress = 'Shipping address is required';
  }

  if (!data.preferredContactMethod) {
    errors.preferredContactMethod = 'Please select a contact method';
  }

  // Service validation
  if (!data.serviceType) {
    errors.serviceType = 'Please select a service type';
  }

  // Club count required for paint fill services
  if (data.serviceType && data.serviceType !== 'grips_only') {
    if (!data.clubCount || data.clubCount < 1) {
      errors.clubCount = 'Please enter the number of clubs';
    } else if (data.clubCount > 14) {
      errors.clubCount = 'Maximum 14 clubs per order';
    }

    if (!data.currentPaintCondition) {
      errors.currentPaintCondition = 'Please select current paint condition';
    }

    if (!data.paintStyle) {
      errors.paintStyle = 'Please select a paint style';
    }

    if (!data.primaryColor?.trim()) {
      errors.primaryColor = 'Primary color is required';
    }
  }

  // Grip validation
  if (data.gripService && data.gripService !== 'none') {
    if (!data.gripCount || data.gripCount < 1) {
      errors.gripCount = 'Please enter the number of grips';
    } else if (data.gripCount > 14) {
      errors.gripCount = 'Maximum 14 grips per order';
    }

    if (!data.gripSize) {
      errors.gripSize = 'Please select grip size';
    }

    if (data.gripService === 'supply_and_install' && !data.gripModel?.trim()) {
      errors.gripModel = 'Please specify the grip model you want';
    }
  }

  // Grips only validation
  if (data.serviceType === 'grips_only' && data.gripService === 'none') {
    errors.gripService = 'Please select a grip service for grips-only orders';
  }

  // File validation
  if (!data.uploads || data.uploads.length < 2) {
    errors.uploads = 'Please upload at least 2 photos';
  } else if (data.uploads.length > 10) {
    errors.uploads = 'Maximum 10 photos allowed';
  }

  // Turnstile validation
  if (!data.turnstileToken) {
    errors.turnstileToken = 'Please complete the security check';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

async function verifyTurnstile(token: string, secretKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const result = await response.json() as { success: boolean };
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

function generateShortId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'CM-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Pricing calculation
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

  // Base price
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

  // Multi-color addon
  if (input.paintStyle === 'multi_color' || input.paintStyle === 'match_theme') {
    if (input.serviceType === 'irons' || input.serviceType === 'both') {
      multiColorAddon += PRICES.multi_color_irons;
    }
    if (input.serviceType === 'putter' || input.serviceType === 'both') {
      multiColorAddon += PRICES.multi_color_putter;
    }
  }

  // Strip & redo
  if (input.currentPaintCondition === 'strip_redo') {
    stripRedoAddon = PRICES.strip_redo;
  }

  // Grips
  const gripCount = input.gripCount || 0;
  if (input.gripService === 'install_customer_supplied' && gripCount > 0) {
    gripCost = PRICES.grip_customer_supplied * gripCount;
  } else if (input.gripService === 'supply_and_install' && gripCount > 0) {
    gripCost = PRICES.grip_supply_install * gripCount;
  }

  // Shipping
  if (input.serviceType === 'putter') {
    shippingEstimate = PRICES.shipping_putter;
  } else if (input.serviceType !== 'grips_only') {
    shippingEstimate = PRICES.shipping_irons;
  } else {
    shippingEstimate = gripCount > 6 ? PRICES.shipping_irons : PRICES.shipping_putter;
  }

  const subtotal = basePrice + multiColorAddon + stripRedoAddon + gripCost;
  const estPriceMin = subtotal + shippingEstimate;
  const estPriceMax = subtotal + shippingEstimate + 500;

  return { estPriceMin, estPriceMax };
}

// Email functions
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
  shortId: string,
  fullName: string,
  email: string,
  serviceType: string,
  estPriceMin: number,
  estPriceMax: number,
  env: Env
): Promise<boolean> {
  const priceRange = `${formatPrice(estPriceMin)} – ${formatPrice(estPriceMax)}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a2f 0%, #2d5a47 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 600;">CMart073</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Custom Paint Fill & Grips</p>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
    <h2 style="margin: 0 0 20px 0; color: #1e3a2f; font-size: 20px;">Thank you, ${fullName}!</h2>
    
    <p style="margin: 0 0 20px 0;">We've received your customization request. Your order reference is:</p>
    
    <div style="background: #f8faf9; border: 2px solid #1e3a2f; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 25px 0;">
      <span style="font-size: 28px; font-weight: 700; color: #1e3a2f; letter-spacing: 2px;">${shortId}</span>
    </div>
    
    <h3 style="margin: 0 0 15px 0; color: #1e3a2f; font-size: 16px; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px;">Next Steps</h3>
    
    <div style="background: #f8faf9; border-radius: 8px; padding: 20px; margin: 0 0 25px 0;">
      <p style="margin: 0 0 15px 0;"><strong>Ship your clubs to:</strong></p>
      <p style="margin: 0; padding: 15px; background: #fff; border-radius: 6px; border-left: 4px solid #1e3a2f;">
        ${env.SHIP_TO_ADDRESS.replace(/,/g, '<br>')}
      </p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;"><strong>Service:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">${formatServiceType(serviceType)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;"><strong>Estimated Price:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">${priceRange}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0;"><strong>Turnaround:</strong></td>
        <td style="padding: 12px 0; text-align: right;">2–5 business days after receipt</td>
      </tr>
    </table>
    
    <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 0 0 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Please note:</strong> All services are cosmetic only. We do not modify club performance or specifications.
      </p>
    </div>
    
    <p style="margin: 0; color: #666; font-size: 14px;">
      Questions? Reply to this email and we'll get back to you promptly.
    </p>
  </div>
  
  <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
    <p style="margin: 0; color: #666; font-size: 12px;">
      © ${new Date().getFullYear()} CMart073. Built for golfers who care about the details.
    </p>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
Thank you, ${fullName}!

We've received your customization request.

Order Reference: ${shortId}

NEXT STEPS
Ship your clubs to:
${env.SHIP_TO_ADDRESS}

Service: ${formatServiceType(serviceType)}
Estimated Price: ${priceRange}
Turnaround: 2–5 business days after receipt

IMPORTANT: All services are cosmetic only. We do not modify club performance or specifications.

Questions? Reply to this email and we'll get back to you promptly.

© ${new Date().getFullYear()} CMart073
  `.trim();

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: env.FROM_EMAIL, name: 'CMart073' },
        subject: `We got your customization request — ${shortId}`,
        content: [
          { type: 'text/plain', value: textContent },
          { type: 'text/html', value: htmlContent },
        ],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Customer email error:', error);
    return false;
  }
}

async function sendAdminEmail(
  shortId: string,
  fullName: string,
  email: string,
  serviceType: string,
  estPriceMin: number,
  estPriceMax: number,
  orderId: string,
  env: Env
): Promise<boolean> {
  const priceRange = `${formatPrice(estPriceMin)} – ${formatPrice(estPriceMax)}`;
  const adminLink = `${env.SITE_URL || 'https://cmart073.com'}/admin/orders/${orderId}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1e3a2f; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 20px;">New Customization Request</h1>
  </div>
  
  <div style="background: #fff; padding: 25px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;"><strong>Order ID:</strong></td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${shortId}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;"><strong>Name:</strong></td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${fullName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;"><strong>Email:</strong></td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${email}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;"><strong>Service:</strong></td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${formatServiceType(serviceType)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0;"><strong>Estimate:</strong></td>
        <td style="padding: 10px 0;">${priceRange}</td>
      </tr>
    </table>
    
    <div style="margin-top: 25px; text-align: center;">
      <a href="${adminLink}" style="display: inline-block; background: #1e3a2f; color: #fff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Order Details</a>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
New Customization Request

Order ID: ${shortId}
Name: ${fullName}
Email: ${email}
Service: ${formatServiceType(serviceType)}
Estimate: ${priceRange}

View order: ${adminLink}
  `.trim();

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: env.ADMIN_EMAIL }] }],
        from: { email: env.FROM_EMAIL, name: 'CMart073' },
        subject: `New customization request — ${shortId}`,
        content: [
          { type: 'text/plain', value: textContent },
          { type: 'text/html', value: htmlContent },
        ],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Admin email error:', error);
    return false;
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const input = await context.request.json() as OrderInput;

    // Validate input
    const validation = validateOrderInput(input);
    if (!validation.valid) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        errors: validation.errors 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify Turnstile
    const turnstileValid = await verifyTurnstile(input.turnstileToken, context.env.TURNSTILE_SECRET_KEY);
    if (!turnstileValid) {
      return new Response(JSON.stringify({ 
        error: 'Security verification failed. Please try again.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate IDs
    const orderId = crypto.randomUUID();
    let shortId = generateShortId();
    
    // Ensure short ID is unique
    let attempts = 0;
    while (attempts < 10) {
      const existing = await context.env.DB.prepare(
        'SELECT 1 FROM orders WHERE short_id = ?'
      ).bind(shortId).first();
      
      if (!existing) break;
      shortId = generateShortId();
      attempts++;
    }

    // Calculate pricing
    const { estPriceMin, estPriceMax } = calculatePricing(input);

    // Insert order
    await context.env.DB.prepare(`
      INSERT INTO orders (
        id, short_id, full_name, email, phone, shipping_address,
        preferred_contact_method, service_type, club_count, current_paint_condition,
        paint_style, primary_color, secondary_color, notes, grip_service,
        grip_count, grip_model, grip_size, extra_wraps, est_price_min, est_price_max
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      orderId,
      shortId,
      input.fullName,
      input.email,
      input.phone || null,
      input.shippingAddress,
      input.preferredContactMethod,
      input.serviceType,
      input.clubCount || null,
      input.currentPaintCondition || null,
      input.paintStyle || null,
      input.primaryColor || null,
      input.secondaryColor || null,
      input.notes || null,
      input.gripService,
      input.gripCount || null,
      input.gripModel || null,
      input.gripSize || null,
      input.extraWraps || null,
      estPriceMin,
      estPriceMax,
    ).run();

    // Insert upload records
    for (const upload of input.uploads) {
      const uploadId = crypto.randomUUID();
      await context.env.DB.prepare(`
        INSERT INTO order_uploads (id, order_id, r2_key, original_filename, content_type, size_bytes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        uploadId,
        orderId,
        upload.r2Key,
        upload.originalFilename,
        upload.contentType,
        upload.sizeBytes,
      ).run();
    }

    // Send emails (non-blocking)
    await Promise.all([
      sendCustomerEmail(shortId, input.fullName, input.email, input.serviceType, estPriceMin, estPriceMax, context.env),
      sendAdminEmail(shortId, input.fullName, input.email, input.serviceType, estPriceMin, estPriceMax, orderId, context.env),
    ]);

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

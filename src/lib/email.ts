// Cmart Customization Shop Email Service using Resend

export interface OrderEmailData {
  shortId: string;
  fullName: string;
  email: string;
  serviceType: string;
  estPriceMin: number;
  estPriceMax: number;
}

export interface StatusUpdateEmailData {
  shortId: string;
  fullName: string;
  email: string;
  status: string;
}

interface EmailEnv {
  RESEND_API_KEY: string;
  ADMIN_EMAIL: string;
  FROM_EMAIL: string;
  SHIP_TO_ADDRESS: string;
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
  return '$' + (cents / 100).toFixed(0);
}

function getStatusMessage(status: string): { title: string; message: string; next: string } {
  const messages: Record<string, { title: string; message: string; next: string }> = {
    received: {
      title: "Got your clubs!",
      message: "Your clubs arrived safely. I'll start working on them soon.",
      next: "I'll update you when I start the work."
    },
    in_progress: {
      title: "Work in progress",
      message: "I'm working on your clubs now. Taking my time to get it right.",
      next: "You'll hear from me when they're done and ready to ship."
    },
    ready: {
      title: "Your clubs are ready!",
      message: "The work is done and your clubs look great.",
      next: "Once payment is received, I'll ship them back to you. I'll send Venmo/PayPal details separately."
    },
    shipped: {
      title: "Your clubs are on the way",
      message: "Packed them up and shipped them out. They're heading back to you.",
      next: "Keep an eye out for delivery. Enjoy!"
    },
    completed: {
      title: "Order complete",
      message: "Your order is complete. Thanks for the business!",
      next: "Hope you love how they turned out. Hit 'em straight!"
    },
    cancelled: {
      title: "Order cancelled",
      message: "Your order has been cancelled.",
      next: "If you have any questions, just reply to this email."
    }
  };
  return messages[status] || { title: "Order Update", message: "Your order status has been updated.", next: "" };
}

export async function sendCustomerEmail(data: OrderEmailData, env: EmailEnv): Promise<boolean> {
  const priceRange = formatPrice(data.estPriceMin) + ' - ' + formatPrice(data.estPriceMax);
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a2f 0%, #2d5a47 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 600;">Cmart Customization Shop</h1>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
    <h2 style="margin: 0 0 20px 0; color: #1e3a2f; font-size: 20px;">Hey ${data.fullName}!</h2>
    
    <p style="margin: 0 0 20px 0;">Got your order. Here's your reference number - hang onto it:</p>
    
    <div style="background: #f8faf9; border: 2px solid #1e3a2f; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 25px 0;">
      <span style="font-size: 28px; font-weight: 700; color: #1e3a2f; letter-spacing: 2px;">${data.shortId}</span>
    </div>
    
    <h3 style="margin: 0 0 15px 0; color: #1e3a2f; font-size: 16px; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px;">What's Next</h3>
    
    <div style="background: #f8faf9; border-radius: 8px; padding: 20px; margin: 0 0 25px 0;">
      <p style="margin: 0 0 15px 0;"><strong>Ship your clubs to:</strong></p>
      <p style="margin: 0; padding: 15px; background: #fff; border-radius: 6px; border-left: 4px solid #1e3a2f;">
        ${env.SHIP_TO_ADDRESS.replace(/,/g, '<br>')}
      </p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;"><strong>Service:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">${formatServiceType(data.serviceType)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;"><strong>Estimated Price:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">${priceRange}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0;"><strong>Turnaround:</strong></td>
        <td style="padding: 12px 0; text-align: right;">2-5 business days once I have them</td>
      </tr>
    </table>
    
    <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 0 0 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Heads up:</strong> This is cosmetic work only - I don't touch lofts, lies, or weights.
      </p>
    </div>
    
    <p style="margin: 0; color: #666; font-size: 14px;">
      Questions? Just reply to this email.
    </p>
  </div>
  
  <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
    <p style="margin: 0; color: #666; font-size: 12px;">
      &copy; ${new Date().getFullYear()} Cmart Customization Shop. Powered by <a href="https://ninebefore9.us" style="color: #666;">NineBefore9.us</a>
    </p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: data.email,
    subject: 'Got your order - ' + data.shortId,
    html: htmlContent,
  }, env);
}

export async function sendAdminEmail(data: OrderEmailData, adminLink: string, env: EmailEnv): Promise<boolean> {
  const priceRange = formatPrice(data.estPriceMin) + ' - ' + formatPrice(data.estPriceMax);
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1e3a2f; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 20px;">New Order</h1>
  </div>
  
  <div style="background: #fff; padding: 25px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;"><strong>Order ID:</strong></td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${data.shortId}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;"><strong>Name:</strong></td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${data.fullName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;"><strong>Email:</strong></td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${data.email}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;"><strong>Service:</strong></td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${formatServiceType(data.serviceType)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0;"><strong>Estimate:</strong></td>
        <td style="padding: 10px 0;">${priceRange}</td>
      </tr>
    </table>
    
    <div style="margin-top: 25px; text-align: center;">
      <a href="${adminLink}" style="display: inline-block; background: #1e3a2f; color: #fff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Order</a>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: env.ADMIN_EMAIL,
    subject: 'New order - ' + data.shortId,
    html: htmlContent,
  }, env);
}

export async function sendStatusUpdateEmail(data: StatusUpdateEmailData, env: EmailEnv): Promise<boolean> {
  const statusInfo = getStatusMessage(data.status);
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a2f 0%, #2d5a47 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 600;">Cmart Customization Shop</h1>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
    <h2 style="margin: 0 0 20px 0; color: #1e3a2f; font-size: 20px;">${statusInfo.title}</h2>
    
    <p style="margin: 0 0 10px 0;">Hey ${data.fullName},</p>
    <p style="margin: 0 0 20px 0;">${statusInfo.message}</p>
    
    <div style="background: #f8faf9; border-radius: 8px; padding: 15px; margin: 0 0 20px 0;">
      <p style="margin: 0; font-size: 14px;"><strong>Order:</strong> ${data.shortId}</p>
    </div>
    
    ${statusInfo.next ? '<p style="margin: 0 0 20px 0; color: #666;">' + statusInfo.next + '</p>' : ''}
    
    <p style="margin: 0; color: #666; font-size: 14px;">
      Questions? Just reply to this email.
    </p>
  </div>
  
  <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
    <p style="margin: 0; color: #666; font-size: 12px;">
      &copy; ${new Date().getFullYear()} Cmart Customization Shop. Powered by <a href="https://ninebefore9.us" style="color: #666;">NineBefore9.us</a>
    </p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: data.email,
    subject: 'Order update - ' + data.shortId,
    html: htmlContent,
  }, env);
}

export async function sendPaymentConfirmationEmail(data: StatusUpdateEmailData, env: EmailEnv): Promise<boolean> {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a2f 0%, #2d5a47 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 600;">Cmart Customization Shop</h1>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
    <h2 style="margin: 0 0 20px 0; color: #1e3a2f; font-size: 20px;">Payment received!</h2>
    
    <p style="margin: 0 0 10px 0;">Hey ${data.fullName},</p>
    <p style="margin: 0 0 20px 0;">Got your payment - thanks! I'll get your clubs shipped out soon.</p>
    
    <div style="background: #d1fae5; border-radius: 8px; padding: 15px; margin: 0 0 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #065f46;"><strong>Payment confirmed</strong></p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #065f46;">Order: ${data.shortId}</p>
    </div>
    
    <p style="margin: 0; color: #666; font-size: 14px;">
      You'll get tracking info once they ship. Questions? Just reply.
    </p>
  </div>
  
  <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
    <p style="margin: 0; color: #666; font-size: 12px;">
      &copy; ${new Date().getFullYear()} Cmart Customization Shop. Powered by <a href="https://ninebefore9.us" style="color: #666;">NineBefore9.us</a>
    </p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: data.email,
    subject: 'Payment received - ' + data.shortId,
    html: htmlContent,
  }, env);
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(params: SendEmailParams, env: EmailEnv): Promise<boolean> {
  // Log FIRST before any async operations
  console.log('EMAIL_START', params.to, params.subject);
  console.log('EMAIL_FROM', env.FROM_EMAIL);
  console.log('EMAIL_KEY_EXISTS', !!env.RESEND_API_KEY);
  console.log('EMAIL_KEY_LENGTH', env.RESEND_API_KEY ? env.RESEND_API_KEY.length : 0);
  
  let response: Response;
  let responseBody: string;
  
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Cmart Customization Shop <' + env.FROM_EMAIL + '>',
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });
    
    responseBody = await response.text();
    
    // Log response immediately
    console.log('EMAIL_STATUS', response.status);
    console.log('EMAIL_RESPONSE', responseBody);
    
    if (!response.ok) {
      console.log('EMAIL_ERROR', response.status, responseBody);
      return false;
    }
    
    console.log('EMAIL_SUCCESS');
    return true;
    
  } catch (error) {
    // Catch and log any fetch errors
    const errMsg = error instanceof Error ? error.message : String(error);
    console.log('EMAIL_FETCH_ERROR', errMsg);
    return false;
  }
}

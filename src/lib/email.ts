// CMart073 Email Service using SendGrid

export interface OrderEmailData {
  shortId: string;
  fullName: string;
  email: string;
  serviceType: string;
  estPriceMin: number;
  estPriceMax: number;
}

interface EmailEnv {
  SENDGRID_API_KEY: string;
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
  return `$${(cents / 100).toFixed(0)}`;
}

export async function sendCustomerEmail(data: OrderEmailData, env: EmailEnv): Promise<boolean> {
  const priceRange = `${formatPrice(data.estPriceMin)} – ${formatPrice(data.estPriceMax)}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a2f 0%, #2d5a47 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 600;">CMart073</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Custom Paint Fill & Grips</p>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
    <h2 style="margin: 0 0 20px 0; color: #1e3a2f; font-size: 20px;">Thank you, ${data.fullName}!</h2>
    
    <p style="margin: 0 0 20px 0;">We've received your customization request. Your order reference is:</p>
    
    <div style="background: #f8faf9; border: 2px solid #1e3a2f; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 25px 0;">
      <span style="font-size: 28px; font-weight: 700; color: #1e3a2f; letter-spacing: 2px;">${data.shortId}</span>
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
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
          <strong>Service:</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">
          ${formatServiceType(data.serviceType)}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
          <strong>Estimated Price:</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">
          ${priceRange}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0;">
          <strong>Turnaround:</strong>
        </td>
        <td style="padding: 12px 0; text-align: right;">
          2–5 business days after receipt
        </td>
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
Thank you, ${data.fullName}!

We've received your customization request.

Order Reference: ${data.shortId}

NEXT STEPS
Ship your clubs to:
${env.SHIP_TO_ADDRESS}

Service: ${formatServiceType(data.serviceType)}
Estimated Price: ${priceRange}
Turnaround: 2–5 business days after receipt

IMPORTANT: All services are cosmetic only. We do not modify club performance or specifications.

Questions? Reply to this email and we'll get back to you promptly.

© ${new Date().getFullYear()} CMart073
  `.trim();

  return sendEmail({
    to: data.email,
    subject: `We got your customization request — ${data.shortId}`,
    html: htmlContent,
    text: textContent,
  }, env);
}

export async function sendAdminEmail(data: OrderEmailData, adminLink: string, env: EmailEnv): Promise<boolean> {
  const priceRange = `${formatPrice(data.estPriceMin)} – ${formatPrice(data.estPriceMax)}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Order</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1e3a2f; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 20px;">New Customization Request</h1>
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
      <a href="${adminLink}" style="display: inline-block; background: #1e3a2f; color: #fff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Order Details</a>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
New Customization Request

Order ID: ${data.shortId}
Name: ${data.fullName}
Email: ${data.email}
Service: ${formatServiceType(data.serviceType)}
Estimate: ${priceRange}

View order: ${adminLink}
  `.trim();

  return sendEmail({
    to: env.ADMIN_EMAIL,
    subject: `New customization request — ${data.shortId}`,
    html: htmlContent,
    text: textContent,
  }, env);
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendEmail(params: SendEmailParams, env: EmailEnv): Promise<boolean> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: params.to }] }],
        from: { email: env.FROM_EMAIL, name: 'CMart073' },
        subject: params.subject,
        content: [
          { type: 'text/plain', value: params.text },
          { type: 'text/html', value: params.html },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid error:', response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

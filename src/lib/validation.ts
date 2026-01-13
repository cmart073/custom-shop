// Cmart Customization Shop Validation Utilities

export interface OrderFormData {
  // Customer
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  preferredContactMethod: 'email' | 'text';
  
  // Service
  serviceType: 'irons' | 'putter' | 'both' | 'grips_only';
  clubCount: number;
  currentPaintCondition: 'good' | 'chipped' | 'strip_redo';
  paintStyle: 'single_color' | 'multi_color' | 'match_theme';
  primaryColor: string;
  secondaryColor: string;
  notes: string;
  
  // Grips
  gripService: 'none' | 'install_customer_supplied' | 'supply_and_install';
  gripCount: number;
  gripModel: string;
  gripSize: 'standard' | 'midsize' | 'jumbo';
  extraWraps: number;
  
  // Turnstile
  turnstileToken: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateOrderForm(data: Partial<OrderFormData>): ValidationResult {
  const errors: Record<string, string> = {};

  // Customer validation
  if (!data.fullName?.trim()) {
    errors.fullName = 'Full name is required';
  }

  if (!data.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
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

    if (data.extraWraps !== undefined && (data.extraWraps < 0 || data.extraWraps > 4)) {
      errors.extraWraps = 'Extra wraps must be between 0 and 4';
    }
  }

  // Grips only validation - must have grip service
  if (data.serviceType === 'grips_only' && data.gripService === 'none') {
    errors.gripService = 'Please select a grip service for grips-only orders';
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

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateShortId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1
  let result = 'CM-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MIN_IMAGES = 2;
export const MAX_IMAGES = 10;

export function validateFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return 'Only JPEG, PNG, and WebP images are allowed';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File must be under 10MB';
  }
  return null;
}

export function validateFileCount(count: number): string | null {
  if (count < MIN_IMAGES) {
    return `Please upload at least ${MIN_IMAGES} photos`;
  }
  if (count > MAX_IMAGES) {
    return `Maximum ${MAX_IMAGES} photos allowed`;
  }
  return null;
}

export async function verifyTurnstile(token: string, secretKey: string): Promise<boolean> {
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

export const ORDER_STATUSES = [
  'pending',
  'received',
  'in_progress',
  'ready',
  'completed',
  'shipped',
  'cancelled',
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    received: 'Received',
    in_progress: 'In Progress',
    ready: 'Ready',
    completed: 'Completed',
    shipped: 'Shipped',
    cancelled: 'Cancelled',
  };
  return statusMap[status] || status;
}

export function formatServiceType(type: string): string {
  const types: Record<string, string> = {
    irons: 'Iron Paint Fill',
    putter: 'Putter Paint Fill',
    both: 'Iron & Putter Paint Fill',
    grips_only: 'Grip Installation Only',
  };
  return types[type] || type;
}

export function formatGripService(service: string): string {
  const services: Record<string, string> = {
    none: 'None',
    install_customer_supplied: 'Install Customer Grips',
    supply_and_install: 'Supply & Install',
  };
  return services[service] || service;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function formatPriceRange(min: number, max: number): string {
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

// CMart073 Pricing Logic
// All prices in cents

export interface PricingInput {
  serviceType: 'irons' | 'putter' | 'both' | 'grips_only';
  clubCount: number;
  paintStyle: 'single_color' | 'multi_color' | 'match_theme';
  currentPaintCondition: 'good' | 'chipped' | 'strip_redo';
  gripService: 'none' | 'install_customer_supplied' | 'supply_and_install';
  gripCount: number;
}

export interface PricingResult {
  estPriceMin: number;
  estPriceMax: number;
  breakdown: PriceBreakdown;
}

export interface PriceBreakdown {
  basePrice: number;
  multiColorAddon: number;
  stripRedoAddon: number;
  gripCost: number;
  shippingEstimate: number;
}

// Base prices (cents)
const PRICES = {
  irons_7_9: 8500,
  irons_4_6: 6500,
  single_club: 4000,
  putter: 5500,
  multi_color_irons: 2000,
  multi_color_putter: 1500,
  strip_redo: 2500,
  grip_customer_supplied: 500, // per grip
  grip_supply_install: 700, // per grip (does not include grip cost)
  shipping_irons: 2000,
  shipping_putter: 1500,
} as const;

export function calculatePricing(input: PricingInput): PricingResult {
  const breakdown: PriceBreakdown = {
    basePrice: 0,
    multiColorAddon: 0,
    stripRedoAddon: 0,
    gripCost: 0,
    shippingEstimate: 0,
  };

  // Calculate base price based on service type
  if (input.serviceType === 'grips_only') {
    // Grips only - no paint fill
    breakdown.basePrice = 0;
  } else if (input.serviceType === 'putter') {
    breakdown.basePrice = PRICES.putter;
  } else if (input.serviceType === 'irons' || input.serviceType === 'both') {
    // Calculate irons price based on club count
    if (input.clubCount >= 7 && input.clubCount <= 9) {
      breakdown.basePrice = PRICES.irons_7_9;
    } else if (input.clubCount >= 4 && input.clubCount <= 6) {
      breakdown.basePrice = PRICES.irons_4_6;
    } else if (input.clubCount === 1) {
      breakdown.basePrice = PRICES.single_club;
    } else if (input.clubCount === 2 || input.clubCount === 3) {
      // 2-3 clubs: use single club pricing × count, capped at 4-6 price
      breakdown.basePrice = Math.min(PRICES.single_club * input.clubCount, PRICES.irons_4_6);
    } else if (input.clubCount > 9) {
      // More than 9 clubs: use 7-9 price as base + additional
      breakdown.basePrice = PRICES.irons_7_9;
    }

    // Add putter if "both"
    if (input.serviceType === 'both') {
      breakdown.basePrice += PRICES.putter;
    }
  }

  // Multi-color addon
  if (input.paintStyle === 'multi_color' || input.paintStyle === 'match_theme') {
    if (input.serviceType === 'irons' || input.serviceType === 'both') {
      breakdown.multiColorAddon += PRICES.multi_color_irons;
    }
    if (input.serviceType === 'putter' || input.serviceType === 'both') {
      breakdown.multiColorAddon += PRICES.multi_color_putter;
    }
  }

  // Strip & redo addon
  if (input.currentPaintCondition === 'strip_redo') {
    breakdown.stripRedoAddon = PRICES.strip_redo;
  }

  // Grip service
  if (input.gripService === 'install_customer_supplied' && input.gripCount > 0) {
    breakdown.gripCost = PRICES.grip_customer_supplied * input.gripCount;
  } else if (input.gripService === 'supply_and_install' && input.gripCount > 0) {
    breakdown.gripCost = PRICES.grip_supply_install * input.gripCount;
    // Note: actual grip cost is NOT included per spec
  }

  // Shipping estimate
  if (input.serviceType === 'putter') {
    breakdown.shippingEstimate = PRICES.shipping_putter;
  } else if (input.serviceType !== 'grips_only') {
    breakdown.shippingEstimate = PRICES.shipping_irons;
  } else {
    // Grips only - estimate based on grip count
    breakdown.shippingEstimate = input.gripCount > 6 ? PRICES.shipping_irons : PRICES.shipping_putter;
  }

  // Calculate totals
  const subtotal = breakdown.basePrice + breakdown.multiColorAddon + breakdown.stripRedoAddon + breakdown.gripCost;
  
  // Min: subtotal + lower shipping estimate
  // Max: subtotal + higher shipping estimate (add $5 buffer)
  const estPriceMin = subtotal + breakdown.shippingEstimate;
  const estPriceMax = subtotal + breakdown.shippingEstimate + 500; // $5 shipping variance

  return {
    estPriceMin,
    estPriceMax,
    breakdown,
  };
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function formatPriceRange(min: number, max: number): string {
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

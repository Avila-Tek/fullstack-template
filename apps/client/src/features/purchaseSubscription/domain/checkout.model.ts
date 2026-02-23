import type {
  TCheckoutResultTypeEnum,
  TCheckoutSessionStatusEnum,
} from './checkout.constants';

/**
 * Checkout domain models
 */

export interface CheckoutSession {
  id: string;
  url: string;
  status: TCheckoutSessionStatusEnum;
}

export interface CheckoutResult {
  type: TCheckoutResultTypeEnum;
  subscriptionId?: string;
  checkoutUrl?: string;
  error?: string;
}

export interface CheckoutVerifyResult {
  success: boolean;
  subscriptionActive: boolean;
  error?: string;
}

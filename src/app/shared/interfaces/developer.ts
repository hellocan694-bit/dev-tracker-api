export interface DeveloperSubscription {
  plan?: 'free' | 'pro' | 'enterprise';
  isPremium?: boolean;
  status?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'free';
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  interval?: 'monthly' | 'yearly';
  currency?: 'EGP' | 'USD';
  // Dynamic expiry fields
  planType?: 'monthly' | 'yearly' | 'lifetime';
  subscriptionStatus?: 'active' | 'expired';
  subscriptionExpiresAt?: string; // ISO date string
}

export interface Developer {
  _id?: string;
  name: string;
  email: string;
  role?: 'admin' | 'developer';
  createdAt?: string;
  updatedAt?: string;
  subscription?: DeveloperSubscription;
  projectCount?: number;
  preferences?: { theme?: string; language?: string };
  notifications?: { emailOnTaskComplete?: boolean; emailOnProjectUpdate?: boolean };
}

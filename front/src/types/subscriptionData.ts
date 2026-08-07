export type SubscriptionStatus = "ACTIVE" | "CANCELLED" | "EXPIRED" | "PENDING";

export type BillingInterval = "monthly" | "yearly";

export type SubscriptionData = {
  status: SubscriptionStatus;
  planName: string;
  price: number;
  interval: BillingInterval;
  startAt: string;
  expiresAt: string;
  /** Vrai si l'abonnement est un abonnement Stripe payant gérable via le portail. */
  canManageBilling?: boolean;
};

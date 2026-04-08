export type Role = 'admin' | 'employee' | 'finance' | 'super_admin';
export type BillingType = 'monthly' | 'annual' | 'usage_based' | 'one_time';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'pending_approval' | 'rejected';

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    role: Role;
    team: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface Client {
    id: string;
    name: string;
    code: string | null;
    created_at: string;
}

export interface Vendor {
    id: string;
    name: string;
    website_url: string | null;
    category: string | null;
    created_at: string;
}

export interface Subscription {
    id: string;
    tool_id: string;
    owner_id: string;
    client_id: string | null;

    plan_name: string | null;
    billing_type: BillingType;
    amount: number | null;
    currency: string;

    start_date: string | null;
    renewal_date: string | null;

    status: SubscriptionStatus;
    remarks: string | null;

    // Receipt fields
    receipt_url?: string | null;
    receipt_uploaded_at?: string | null;
    receipt_status?: 'pending_review' | 'reviewed' | null;

    created_at: string;
    updated_at: string;

    // Joined fields (optional)
    profiles?: Profile;
    clients?: Client;
    vendors?: Vendor;
}

export interface SubscriptionRequest {
    id: string;
    requester_id: string;
    tool_name: string;
    intent: string | null;

    billing_type: BillingType | null;
    amount: number | null;
    currency: string | null;
    client_id: string | null;

    status: SubscriptionStatus;
    rejection_reason: string | null;
    attachment_url: string | null;

    created_at: string;

    // Joined fields
    profiles?: Profile;
    clients?: Client;
}

export interface Transaction {
    id: string;
    subscription_id: string | null;
    amount: number;
    currency: string;

    period_start: string | null;
    period_end: string | null;
    payment_date: string | null;

    invoice_url: string | null;
    notes: string | null;

    created_at: string;
}

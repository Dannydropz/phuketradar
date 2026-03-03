/**
 * Resend Client
 *
 * Handles two things:
 *  1. Adding contacts to a Resend Audience when subscribers sign up
 *  2. Creating and sending newsletter Broadcasts to the whole audience
 *
 * Why Broadcasts instead of transactional sends?
 *   - Broadcasts use the "marketing" email quota
 *   - Free plan: unlimited sends to up to 1,000 contacts/month
 *   - Transactional API: only 100 emails/day on free plan
 *
 * Required env vars:
 *   RESEND_API_KEY      — from resend.com/api-keys
 *   RESEND_FROM_EMAIL   — verified sender address
 *   RESEND_AUDIENCE_ID  — create one at resend.com/audiences
 */

import { Resend } from 'resend';

function getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    return new Resend(apiKey);
}

export function isResendConfigured(): boolean {
    return !!(
        process.env.RESEND_API_KEY &&
        process.env.RESEND_FROM_EMAIL &&
        process.env.RESEND_AUDIENCE_ID
    );
}

// ─── Contacts (called on subscriber signup) ───────────────────────────────────

/**
 * Add a subscriber to the Resend Audience.
 * Called alongside addBeehiivSubscriber when someone signs up.
 */
export async function addResendContact(email: string): Promise<{ success: boolean; error?: string }> {
    const client = getResendClient();
    if (!client) return { success: false, error: 'RESEND_API_KEY not configured' };

    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId) {
        console.warn('⚠️ RESEND_AUDIENCE_ID not set — skipping Resend contact add');
        return { success: false, error: 'RESEND_AUDIENCE_ID not configured' };
    }

    try {
        const { data, error } = await client.contacts.create({ audienceId, email, unsubscribed: false });
        if (error) {
            console.error(`❌ Resend: failed to add contact ${email}:`, error);
            return { success: false, error: error.message };
        }
        console.log(`✅ Resend: contact added ${email} (${data?.id})`);
        return { success: true };
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ Resend contact error:`, err);
        return { success: false, error: msg };
    }
}


/**
 * Mark a contact as unsubscribed in the Resend Audience.
 * Called when someone unsubscribes from the site.
 */
export async function removeResendContact(email: string): Promise<{ success: boolean; error?: string }> {
    const client = getResendClient();
    if (!client) return { success: false, error: 'RESEND_API_KEY not configured' };

    const audienceId = process.env.RESEND_AUDIENCE_ID!;
    try {
        // Find the contact first
        const { data: list } = await client.contacts.list({ audienceId });
        const contact = list?.data?.find((c: any) => c.email === email);
        if (!contact) return { success: true }; // not in Resend, nothing to do

        const { error } = await client.contacts.update({
            audienceId,
            id: contact.id,
            unsubscribed: true,
        });
        if (error) return { success: false, error: error.message };

        console.log(`✅ Resend: contact unsubscribed ${email}`);
        return { success: true };
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ Resend unsubscribe error:`, err);
        return { success: false, error: msg };
    }
}

// ─── Broadcasts (newsletter sending) ─────────────────────────────────────────

/**
 * Create and immediately send a newsletter broadcast to the full audience.
 * Uses the marketing email quota — unlimited sends to up to 1,000 contacts on free plan.
 */
export async function sendResendBroadcast(options: {
    subject: string;
    html: string;
    previewText?: string;
}): Promise<{ success: boolean; broadcastId?: string; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey) return { success: false, error: 'RESEND_API_KEY not configured' };
    if (!audienceId) return { success: false, error: 'RESEND_AUDIENCE_ID not configured' };
    if (!fromEmail) return { success: false, error: 'RESEND_FROM_EMAIL not configured' };

    try {
        console.log(`📧 Resend: Creating broadcast — "${options.subject}"`);

        // Replace our placeholder with Resend's built-in unsubscribe tag
        const htmlWithUnsub = options.html.replace(
            /\{\{UNSUBSCRIBE_URL\}\}/g,
            '{{{RESEND_UNSUBSCRIBE_URL}}}'
        );

        const response = await fetch('https://api.resend.com/broadcasts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                audience_id: audienceId,
                from: `Phuket Radar <${fromEmail}>`,
                subject: options.subject,
                html: htmlWithUnsub,
                send: true, // create and send immediately
            }),
        });

        const data = await response.json() as { id?: string; object?: string; name?: string; message?: string };

        if (!response.ok) {
            console.error(`❌ Resend broadcast failed (${response.status}):`, data);
            return { success: false, error: data.message || `HTTP ${response.status}` };
        }

        console.log(`✅ Resend broadcast sent! ID: ${data.id}`);
        return { success: true, broadcastId: data.id };
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ Resend broadcast error:`, err);
        return { success: false, error: msg };
    }
}


// Legacy transactional client (kept for any one-off emails like welcome emails)
export async function getUncachableResendClient() {
    const client = getResendClient();
    if (!client) throw new Error('RESEND_API_KEY not configured');
    return {
        client,
        fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    };
}

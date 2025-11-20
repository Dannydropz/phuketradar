import { Resend } from 'resend';

export async function getUncachableResendClient() {
    // 1. Try standard environment variables (Railway/Production)
    if (process.env.RESEND_API_KEY) {
        return {
            client: new Resend(process.env.RESEND_API_KEY),
            fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
        };
    }

    // 2. Fallback to Replit Connectors (Legacy)
    try {
        const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
        const xReplitToken = process.env.REPL_IDENTITY
            ? 'repl ' + process.env.REPL_IDENTITY
            : process.env.WEB_REPL_RENEWAL
                ? 'depl ' + process.env.WEB_REPL_RENEWAL
                : null;

        if (hostname && xReplitToken) {
            const connectionSettings = await fetch(
                'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
                {
                    headers: {
                        'Accept': 'application/json',
                        'X_REPLIT_TOKEN': xReplitToken
                    }
                }
            ).then(res => res.json()).then(data => data.items?.[0]);

            if (connectionSettings?.settings?.api_key) {
                return {
                    client: new Resend(connectionSettings.settings.api_key),
                    fromEmail: connectionSettings.settings.from_email || 'onboarding@resend.dev'
                };
            }
        }
    } catch (error) {
        console.warn('Failed to fetch Replit Resend credentials:', error);
    }

    // 3. Error if no credentials found
    console.error('❌ RESEND_API_KEY not found in environment variables');
    // Don't throw immediately to allow app to start, but warn heavily
    // throw new Error('RESEND_API_KEY not found. Please add it to your Railway variables.');
    return {
        client: new Resend('re_123456789'), // Dummy key to prevent crash on startup
        fromEmail: 'onboarding@resend.dev'
    };
}

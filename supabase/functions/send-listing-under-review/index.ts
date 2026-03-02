// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return json({ ok: false, error: 'Server misconfigured: RESEND_API_KEY missing' }, 500);

  let body: { email?: string; listingId?: string; title?: string };
  try { body = await req.json(); }
  catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const email = String(body?.email || '').trim();
  const listingId = String(body?.listingId || '').trim();

  if (!email || !email.includes('@')) return json({ ok: false, error: 'Missing or invalid email' }, 400);
  if (!listingId || !/^[0-9a-f-]{36}$/i.test(listingId)) return json({ ok: false, error: 'Missing or invalid listingId' }, 400);

  const title = String(body?.title || 'your listing').trim();

  const html = `
<div style="font-family:'DM Sans',Arial,sans-serif;max-width:540px;margin:0 auto;color:#1C1810;padding:24px">
  <h2 style="font-family:Georgia,serif;color:#B8922A;margin-top:0">Your SubletBuff listing is under review</h2>
  <p>Thanks for submitting! We've received your listing for <strong>${title}</strong>.</p>
  <p>Our team is reviewing it now. We'll send you another email once it's approved and live on SubletBuff.</p>
  <p>Questions? Reply to this email or reach us at
     <a href="mailto:support@subletbuff.com" style="color:#B8922A">support@subletbuff.com</a>.</p>
  <p style="margin-top:32px;font-size:0.8rem;color:#999">SubletBuff &middot; CU Boulder student housing</p>
</div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'SubletBuff <noreply@subletbuff.com>',
        to: [email],
        reply_to: 'support@subletbuff.com',
        subject: 'Your SubletBuff listing is under review',
        html
      })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[send-listing-under-review] Resend error:', res.status, text);
      return json({ ok: false, error: `Resend error ${res.status}` }, 502);
    }

    return json({ ok: true });
  } catch(err) {
    console.error('[send-listing-under-review] fetch threw:', err);
    return json({ ok: false, error: String(err) }, 502);
  }
});

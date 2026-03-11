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

  const adminEmailsRaw = Deno.env.get('ADMIN_NOTIFICATION_EMAILS');
  if (!adminEmailsRaw || !adminEmailsRaw.trim()) {
    console.warn('[notify-admin-new-listing] ADMIN_NOTIFICATION_EMAILS not set, skipping notification');
    return json({ ok: true, skipped: true });
  }

  const adminEmails = adminEmailsRaw
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.includes('@'));

  if (adminEmails.length === 0) {
    console.warn('[notify-admin-new-listing] No valid admin emails found in ADMIN_NOTIFICATION_EMAILS');
    return json({ ok: true, skipped: true });
  }

  let body: { title?: string; listerName?: string; listerEmail?: string; listingId?: string };
  try { body = await req.json(); }
  catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const title = String(body?.title || 'Untitled listing').trim();
  const listerName = String(body?.listerName || 'Unknown').trim();
  const listerEmail = String(body?.listerEmail || 'N/A').trim();
  const listingId = String(body?.listingId || '').trim();

  const html = `
<div style="font-family:'DM Sans',Arial,sans-serif;max-width:540px;margin:0 auto;color:#1C1810;padding:24px">
  <h2 style="font-family:Georgia,serif;color:#B8922A;margin-top:0">New Listing Submitted for Review</h2>
  <p>A new listing has been submitted and is awaiting admin review.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr>
      <td style="padding:8px 12px;font-weight:600;color:#666;width:120px">Title</td>
      <td style="padding:8px 12px">${title}</td>
    </tr>
    <tr style="background:#f9f9f6">
      <td style="padding:8px 12px;font-weight:600;color:#666">Lister</td>
      <td style="padding:8px 12px">${listerName}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;font-weight:600;color:#666">Email</td>
      <td style="padding:8px 12px"><a href="mailto:${listerEmail}" style="color:#B8922A">${listerEmail}</a></td>
    </tr>
    ${listingId ? `<tr style="background:#f9f9f6">
      <td style="padding:8px 12px;font-weight:600;color:#666">Listing ID</td>
      <td style="padding:8px 12px;font-size:0.85rem;font-family:monospace">${listingId}</td>
    </tr>` : ''}
  </table>
  <p>Review this listing in the <a href="https://subletbuff.com/admin" style="color:#B8922A;font-weight:600">admin panel</a>.</p>
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
        to: adminEmails,
        reply_to: 'support@subletbuff.com',
        subject: `New listing submitted for review: ${title}`,
        html
      })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[notify-admin-new-listing] Resend error:', res.status, text);
      return json({ ok: false, error: `Resend error ${res.status}` }, 502);
    }

    return json({ ok: true });
  } catch(err) {
    console.error('[notify-admin-new-listing] fetch threw:', err);
    return json({ ok: false, error: String(err) }, 502);
  }
});

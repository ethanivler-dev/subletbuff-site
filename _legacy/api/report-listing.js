// api/report-listing.js — Accept a listing report from any visitor
// Inserts into listing_reports using the service role key.

const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_REASONS = ['spam', 'scam', 'misleading', 'inappropriate', 'duplicate', 'other', 'inaccurate', 'already_filled'];

module.exports = async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { listing_id, reason, notes, reporter_email, reporter_user_id } = req.body || {};
    if (!listing_id || !UUID_RE.test(listing_id)) {
      return res.status(400).json({ error: 'Invalid listing_id' });
    }
    const normalizedReason = String(reason || '').trim().toLowerCase();
    if (!normalizedReason || !VALID_REASONS.includes(normalizedReason)) {
      return res.status(400).json({ error: 'Invalid reason' });
    }

    const sanitizedNotes = (notes || '').toString().trim().slice(0, 1000) || null;
    const sanitizedEmail = (reporter_email || '').toString().trim().slice(0, 254) || null;
    const sanitizedUserId = (reporter_user_id || '').toString().trim().slice(0, 64) || null;

    const supabaseUrl = process.env.SUPABASE_URL || 'https://doehqqwqwjebhfgdvyum.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return res.status(500).json({ error: 'Server misconfigured' });

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { error } = await supabase.from('listing_reports').insert({
      listing_id,
      reason: normalizedReason,
      notes: sanitizedNotes,
      reporter_email: sanitizedEmail,
      reporter_user_id: sanitizedUserId,
      status: 'open'
    });

    if (error) {
      console.error('[report-listing] insert error:', error.message);
      return res.status(500).json({ error: 'Failed to submit report' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[report-listing] error:', err.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

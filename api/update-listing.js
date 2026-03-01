// api/update-listing.js — Allow listing owners to update their own listings.
// Verifies the caller's JWT, checks ownership, then applies a whitelist of
// permitted field updates. Status, address, email, and user_id are never touched.

const { createClient } = require('@supabase/supabase-js');

const ALLOWED_FIELDS = new Set([
  'description', 'monthly_rent', 'security_deposit',
  'start_date', 'end_date', 'phone',
  'preferred_contact', 'best_time', 'paused', 'filled', 'filled_at',
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
};

module.exports = async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const supabaseUrl = process.env.SUPABASE_URL || 'https://doehqqwqwjebhfgdvyum.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return res.status(500).json({ error: 'Server misconfigured' });

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify the access token and get the calling user
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) return res.status(401).json({ error: 'Invalid or expired token' });

    const { listing_id, updates } = req.body || {};
    if (!listing_id) return res.status(400).json({ error: 'listing_id is required' });
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ error: 'updates must be an object' });
    }

    // Strip anything outside the whitelist
    const safeUpdates = {};
    for (const [key, val] of Object.entries(updates)) {
      if (ALLOWED_FIELDS.has(key)) safeUpdates[key] = val;
    }
    if (Object.keys(safeUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Confirm ownership before touching the row
    const { data: existing, error: fetchErr } = await supabase
      .from('listings')
      .select('id, user_id')
      .eq('id', listing_id)
      .single();
    if (fetchErr || !existing) return res.status(404).json({ error: 'Listing not found' });
    if (existing.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });

    const { data: updated, error: updateErr } = await supabase
      .from('listings')
      .update(safeUpdates)
      .eq('id', listing_id)
      .select()
      .single();

    if (updateErr) {
      console.error('[update-listing] update error:', updateErr.message);
      return res.status(500).json({ error: updateErr.message });
    }

    return res.status(200).json({ listing: updated });
  } catch (err) {
    console.error('[update-listing] error:', err.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

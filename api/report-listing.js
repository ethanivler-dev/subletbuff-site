// api/report-listing.js — Accept a listing report from any visitor
// Inserts into listing_reports using the service role key.

const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

module.exports = async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { listing_id, reason, notes, reporter_email, reporter_user_id } = req.body || {};

    if (!listing_id || !reason) {
      return res.status(400).json({ error: 'listing_id and reason are required' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || 'https://doehqqwqwjebhfgdvyum.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return res.status(500).json({ error: 'Server misconfigured' });

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { error } = await supabase.from('listing_reports').insert({
      listing_id,
      reason,
      notes: notes || null,
      reporter_email: reporter_email || null,
      reporter_user_id: reporter_user_id || null,
      status: 'open'
    });

    if (error) {
      console.error('[report-listing] insert error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[report-listing] error:', err.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

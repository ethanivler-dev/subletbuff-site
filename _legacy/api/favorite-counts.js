// api/favorite-counts.js — Returns favorite counts per listing (public, read-only)
// Uses service role key so RLS on user_favorites doesn't block aggregate counts.

const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

module.exports = async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://doehqqwqwjebhfgdvyum.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return res.status(500).json({ error: 'Server misconfigured' });

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data, error } = await supabase
      .from('user_favorites')
      .select('listing_id');

    if (error) {
      console.error('[favorite-counts] query error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    // Aggregate counts
    const counts = {};
    if (data) {
      data.forEach(r => {
        counts[r.listing_id] = (counts[r.listing_id] || 0) + 1;
      });
    }

    // Cache for 60s so we're not querying every page load
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(counts);
  } catch (err) {
    console.error('[favorite-counts] error:', err.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

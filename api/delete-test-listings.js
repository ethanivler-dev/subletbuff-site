// api/delete-test-listings.js — Delete test-generated listings (testuser*@colorado.edu)
// Requires admin JWT. Uses service role to bypass RLS.

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
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const supabaseUrl = process.env.SUPABASE_URL || 'https://doehqqwqwjebhfgdvyum.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return res.status(500).json({ error: 'Server misconfigured' });

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify caller is an admin
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!admin) return res.status(403).json({ error: 'Admin access required' });

    // Find test listings
    const { data: listings, error: fetchErr } = await supabase
      .from('listings')
      .select('id')
      .like('email', 'testuser%@colorado.edu');

    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (!listings || listings.length === 0) return res.json({ deleted: 0, message: 'No test listings found' });

    const ids = listings.map(r => r.id);

    const { error: delErr } = await supabase
      .from('listings')
      .delete()
      .in('id', ids);

    if (delErr) return res.status(500).json({ error: delErr.message });

    return res.json({ deleted: ids.length, message: `Deleted ${ids.length} test listings` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

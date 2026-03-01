// api/upload-url.js — Lightweight Vercel function
// Returns a Supabase signed upload URL so the client can upload files
// directly to Supabase Storage, completely bypassing Vercel's body size limits.

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function sanitizeFilename(name) {
  const cleaned = (name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_').trim();
  return cleaned.slice(0, 80) || 'upload';
}

function sanitizeListingId(value) {
  const cleaned = (value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned.slice(0, 64);
}

module.exports = async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { filename, listing_id, content_type } = req.body || {};

    const sanitizedName = sanitizeFilename(filename);
    const listingId = sanitizeListingId(listing_id) || `draft-${randomUUID()}`;

    const ts = Date.now();
    const uid = randomUUID().slice(0, 8);
    const storagePath = `listings/${listingId}/${ts}-${uid}-${sanitizedName}`;

    const supabaseUrl = process.env.SUPABASE_URL || 'https://doehqqwqwjebhfgdvyum.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return res.status(500).json({ error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set' });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data, error } = await supabase.storage
      .from('listing-photos')
      .createSignedUploadUrl(storagePath);

    if (error) {
      console.error('[upload-url] signed URL error:', error.message);
      return res.status(500).json({ error: 'Failed to create upload URL', details: error.message });
    }

    const { data: urlData } = supabase.storage
      .from('listing-photos')
      .getPublicUrl(storagePath);

    console.log('[upload-url] generated signed URL for', storagePath);

    return res.status(200).json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: storagePath,
      publicUrl: urlData.publicUrl,
      listingId
    });
  } catch (err) {
    console.error('[upload-url] unhandled error:', err.message || err);
    return res.status(500).json({ error: 'Internal server error', details: err.message || String(err) });
  }
};

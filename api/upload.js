// api/upload.js — Vercel serverless function
// Accepts a file via multipart POST, converts HEIC/HEIF → JPEG using Sharp,
// uploads to Supabase Storage bucket "listing-photos", returns { publicUrl, path, contentType, listingId }.

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const formidable = require('formidable');
const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function sanitizeFilename(name) {
  const withoutExt = (name || 'upload').replace(/\.[^.]+$/, '');
  const cleaned = withoutExt.replace(/[^a-zA-Z0-9_-]/g, '_').trim();
  return cleaned.slice(0, 80) || 'upload';
}

function sanitizeListingId(value) {
  const cleaned = (value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned.slice(0, 64);
}

function isHeic(filename, mimetype) {
  const lower = (filename || '').toLowerCase();
  const mime = (mimetype || '').toLowerCase();
  return lower.endsWith('.heic') || lower.endsWith('.heif') ||
         mime.includes('heic') || mime.includes('heif');
}

function parseForm(req) {
  const form = new formidable.IncomingForm({ maxFileSize: 10 * 1024 * 1024 });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let tempPath = null;
  try {
    const { fields, files } = await parseForm(req);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: "Missing 'file' in form data" });

    tempPath = file.filepath || file.path;
    const originalName = file.originalFilename || file.name || 'upload';
    const rawListingId = Array.isArray(fields.listing_id) ? fields.listing_id[0] : (fields.listing_id || '');
    const sanitized = sanitizeListingId(rawListingId);
    const listingId = sanitized || `draft-${randomUUID()}`;

    const inputBuffer = await fs.readFile(tempPath);

    let outputBuffer;
    let contentType;
    let finalExt;

    if (isHeic(originalName, file.mimetype || file.type)) {
      console.log(`[upload] Converting HEIC: ${originalName} (${inputBuffer.length} bytes)`);
      outputBuffer = await sharp(inputBuffer).jpeg({ quality: 90 }).toBuffer();
      contentType = 'image/jpeg';
      finalExt = 'jpg';
      console.log(`[upload] Conversion OK: ${outputBuffer.length} bytes JPEG`);
    } else {
      outputBuffer = inputBuffer;
      contentType = file.mimetype || file.type || 'application/octet-stream';
      const rawExt = path.extname(originalName).replace('.', '').toLowerCase();
      finalExt = rawExt || 'bin';
    }

    const supabaseUrl = process.env.SUPABASE_URL || 'https://doehqqwqwjebhfgdvyum.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return res.status(500).json({ error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set' });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const ts = Date.now();
    const baseName = sanitizeFilename(originalName);
    const storagePath = `listings/${listingId}/${ts}-${baseName}.${finalExt}`;

    console.log(`[upload] Uploading to listing-photos/${storagePath} (${outputBuffer.length} bytes, ${contentType})`);

    const { error: uploadError } = await supabase.storage
      .from('listing-photos')
      .upload(storagePath, outputBuffer, { contentType, upsert: false });

    if (uploadError) {
      console.error('[upload] Storage error:', uploadError.message);
      return res.status(500).json({ error: 'Storage upload failed', details: uploadError.message });
    }

    const { data: urlData } = supabase.storage.from('listing-photos').getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl || '';
    if (!publicUrl) return res.status(500).json({ error: 'Failed to generate public URL' });

    console.log(`[upload] Done: ${publicUrl}`);
    return res.status(200).json({ publicUrl, path: storagePath, contentType, listingId });

  } catch (err) {
    console.error('[upload] Unhandled error:', err.message, err.stack);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    if (tempPath) fs.unlink(tempPath).catch(() => {});
  }
}

// IMPORTANT: config must be set on the function before exporting,
// not as a separate module.exports.config (which gets overwritten).
handler.config = { api: { bodyParser: false } };

module.exports = handler;

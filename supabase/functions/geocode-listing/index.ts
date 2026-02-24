// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

type GeocodeBody = {
  listing_id?: string;
  address?: string;
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json'
    }
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed. Expected POST.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: 'Server misconfigured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.' }, 500);
  }

  let body: GeocodeBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body.' }, 400);
  }

  const listingId = String(body?.listing_id || '').trim();
  const address = String(body?.address || '').trim();

  if (!listingId) {
    return jsonResponse({ ok: false, error: 'Missing required field: listing_id.' }, 400);
  }
  if (!address) {
    return jsonResponse({ ok: false, error: 'Missing required field: address.' }, 400);
  }

  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;

  let lat: number;
  let lng: number;

  try {
    const geocodeRes = await fetch(nominatimUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SubletBuff dev (contact: dev-email@example.com)'
      }
    });

    if (!geocodeRes.ok) {
      const text = await geocodeRes.text();
      return jsonResponse({ ok: false, error: `Nominatim geocoding failed (${geocodeRes.status}): ${text || 'Unknown error'}` }, 502);
    }

    const geocodeData = await geocodeRes.json();
    const bestResult = Array.isArray(geocodeData) ? geocodeData[0] : null;

    if (!bestResult) {
      return jsonResponse({ ok: false, error: 'No geocoding result found for the provided address.' }, 404);
    }

    const parsedLat = Number(bestResult.lat);
    const parsedLng = Number(bestResult.lon);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      return jsonResponse({ ok: false, error: 'Geocoding returned invalid coordinates.' }, 502);
    }

    lat = parsedLat;
    lng = parsedLng;
  } catch (err) {
    return jsonResponse({ ok: false, error: `Nominatim request error: ${err instanceof Error ? err.message : String(err)}` }, 502);
  }

  try {
    const updateUrl = `${supabaseUrl}/rest/v1/listings?id=eq.${encodeURIComponent(listingId)}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        lat,
        lng,
        geocoded_at: new Date().toISOString()
      })
    });

    if (!updateRes.ok) {
      const text = await updateRes.text();
      return jsonResponse({ ok: false, error: `Failed to update listing coordinates (${updateRes.status}): ${text || 'Unknown error'}` }, 502);
    }

    const updated = await updateRes.json();
    if (!Array.isArray(updated) || updated.length === 0) {
      return jsonResponse({ ok: false, error: 'No listing row updated. Verify listing_id exists.' }, 404);
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: `Supabase update error: ${err instanceof Error ? err.message : String(err)}` }, 502);
  }

  return jsonResponse({ ok: true, lat, lng }, 200);
});

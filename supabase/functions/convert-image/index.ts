// supabase/functions/convert-image/index.ts
// Accepts a file via multipart POST, converts HEIC/HEIF → JPEG server-side,
// uploads to Supabase Storage bucket "listing-photos", returns { publicUrl, path, contentType, listingId }.
/*
Deployment quick reference:
1) supabase secrets set \
  SUPABASE_URL=https://doehqqwqwjebhfgdvyum.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
  --project-ref doehqqwqwjebhfgdvyum
2) supabase functions deploy convert-image --no-verify-jwt
3) ENDPOINT=$(node -e "console.log(['https://doehqqwqwjebhfgdvyum.supabase.co','functions','v1','convert-image'].join('/'))")
   curl -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -F "listing_id=test-listing" -F "file=@/path/to/photo.heic"
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Lazy-loaded so the WASM binary only initialises when a HEIC file is actually
// received. Module-level eager import caused OOM on every request (even JPEGs)
// because the ~20 MB WASM stayed resident across the worker's lifetime.
// deno-lint-ignore no-explicit-any
let _heicConvert: ((opts: any) => Promise<ArrayBuffer>) | null = null;
async function getHeicConvert() {
  if (!_heicConvert) {
    const mod = await import("npm:heic-convert@2");
    _heicConvert = mod.default;
  }
  return _heicConvert!;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function sanitizeFilename(name: string): string {
  const withoutExt = (name || "upload").replace(/\.[^.]+$/, "");
  const cleaned = withoutExt.replace(/[^a-zA-Z0-9_-]/g, "_").trim();
  return cleaned.slice(0, 80) || "upload";
}

function safeExtFromMime(mime: string): string {
  const lower = (mime || "").toLowerCase();
  const lookup: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
  };
  if (lookup[lower]) return lookup[lower];
  if (lower.startsWith("image/")) {
    const raw = lower.split("/")[1]?.split("+")[0] || "";
    const cleaned = raw.replace(/[^a-z0-9]/g, "");
    if (cleaned) return cleaned.slice(0, 8);
  }
  return "bin";
}

function sanitizeExtension(ext: string): string {
  return (ext || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
}

function isHeic(filename: string, mime = ""): boolean {
  const lowerName = (filename || "").toLowerCase();
  const lowerMime = (mime || "").toLowerCase();
  return /\.(heic|heif)$/i.test(lowerName) || lowerMime.includes("heic") || lowerMime.includes("heif");
}

function sanitizeListingId(value: string): string {
  const cleaned = (value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned.slice(0, 64);
}

function resolveListingId(entry: FormDataEntryValue | null): string {
  const raw = typeof entry === "string" ? entry : "";
  const sanitized = sanitizeListingId(raw);
  if (sanitized) return sanitized;
  return `draft-${crypto.randomUUID()}`;
}

/**
 * Convert HEIC/HEIF buffer to JPEG using heic-convert (WASM-based libheif).
 * Returns a Uint8Array of the JPEG data.
 */
async function convertHeicToJpeg(inputBuffer: Uint8Array): Promise<Uint8Array> {
  const heicConvert = await getHeicConvert();
  const output = await heicConvert({
    buffer: inputBuffer,
    format: "JPEG",
    quality: 0.9,
  });
  return new Uint8Array(output);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // --- Parse multipart form ---
    const formData = await req.formData();
    const file = formData.get("file");
    const listingId = resolveListingId(formData.get("listing_id"));

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "Missing 'file' in form data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const originalName = file.name || "upload";
    const heic = isHeic(originalName, file.type);
    const arrayBuffer = await file.arrayBuffer();
    const inputBytes = new Uint8Array(arrayBuffer);

    let uploadBytes: Uint8Array;
    let contentType: string;
    let finalExt: string;

    if (heic) {
      console.log(`[convert-image] Converting HEIC: ${originalName} (${inputBytes.length} bytes)`);
      try {
        uploadBytes = await convertHeicToJpeg(inputBytes);
        contentType = "image/jpeg";
        finalExt = "jpg";
        console.log(`[convert-image] Conversion OK: ${uploadBytes.length} bytes JPEG`);
      } catch (convErr: unknown) {
        const msg = convErr instanceof Error ? convErr.message : String(convErr);
        console.error("[convert-image] HEIC conversion failed:", msg);
        return new Response(
          JSON.stringify({ error: "HEIC conversion failed", details: msg }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      uploadBytes = inputBytes;
      contentType = file.type || "application/octet-stream";
      const extFromName = sanitizeExtension(originalName.split(".").pop() || "");
      finalExt = extFromName || safeExtFromMime(contentType);
    }

    // --- Upload to Supabase Storage ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured: missing env vars" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const ts = Date.now();
    const baseName = sanitizeFilename(originalName);
    const storagePath = `listings/${listingId}/${ts}-${baseName}.${finalExt}`;

    console.log(`[convert-image] Uploading to listing-photos/${storagePath} (${uploadBytes.length} bytes, ${contentType}) for listing ${listingId}`);

    const { error: uploadError } = await supabase.storage
      .from("listing-photos")
      .upload(storagePath, uploadBytes, { contentType, upsert: false });

    if (uploadError) {
      console.error("[convert-image] Storage upload error:", uploadError.message);
      return new Response(
        JSON.stringify({ error: "Storage upload failed", details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: urlData } = supabase.storage
      .from("listing-photos")
      .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl || "";
    if (!publicUrl) {
      console.error("[convert-image] Missing public URL after upload");
      return new Response(
        JSON.stringify({ error: "Failed to generate public URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log(`[convert-image] Done: ${publicUrl}`);

    return new Response(
      JSON.stringify({ publicUrl, path: storagePath, contentType, listingId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[convert-image] Unhandled error:", msg);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

#!/usr/bin/env node
/**
 * cleanup-storage.js
 * Deletes orphaned files from the listing-photos bucket.
 * Builds a set of referenced storage paths from DB (photo_urls + photos_meta),
 * then removes everything else.
 *
 * Usage:
 *   node cleanup-storage.js              # dry run
 *   node cleanup-storage.js --delete     # actually delete orphaned files
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://doehqqwqwjebhfgdvyum.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'listing-photos';

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Set SUPABASE_SERVICE_ROLE_KEY env var first.\n');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY="your-key-here"');
  process.exit(1);
}

const dryRun = !process.argv.includes('--delete');
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

/* ── helpers ──────────────────────────────────────────────── */

/** Extract storage path from a full public URL */
function urlToPath(url) {
  // URL pattern: .../storage/v1/object/public/listing-photos/<path>
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

/** Collect every referenced storage path from all listings */
async function getReferencedPaths() {
  const paths = new Set();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('listings')
      .select('id, photo_urls, photos_meta')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      // photo_urls is text[]
      if (Array.isArray(row.photo_urls)) {
        for (const u of row.photo_urls) {
          const p = urlToPath(u);
          if (p) paths.add(p);
        }
      }
      // photos_meta is jsonb[] with {path, url, ...}
      if (Array.isArray(row.photos_meta)) {
        for (const m of row.photos_meta) {
          if (m.path) paths.add(m.path);
          if (m.url) { const p = urlToPath(m.url); if (p) paths.add(p); }
        }
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  // Also check listing_photos table
  from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('listing_photos')
      .select('storage_path, public_url')
      .range(from, from + PAGE - 1);
    if (error) {
      // table may not exist
      console.log('   ⚠️  listing_photos table query failed:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (row.storage_path) paths.add(row.storage_path);
      if (row.public_url) { const p = urlToPath(row.public_url); if (p) paths.add(p); }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return paths;
}

/** Recursively list ALL files in a folder (or bucket root) */
async function listAllFiles(prefix) {
  const results = [];
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix || '', { limit: 10000 });
  if (error) throw error;
  for (const item of (data || [])) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.metadata && typeof item.metadata === 'object' && Object.keys(item.metadata).length > 0) {
      // It's a file (has metadata with size, mimetype, etc.)
      results.push(fullPath);
    } else {
      // It's a folder — recurse
      const sub = await listAllFiles(fullPath);
      results.push(...sub);
    }
  }
  return results;
}

/* ── main ─────────────────────────────────────────────────── */

async function main() {
  console.log(dryRun ? '🔍 DRY RUN (pass --delete to actually remove files)\n' : '🗑️  DELETE MODE\n');

  // 1. Get all referenced paths from DB
  const refPaths = await getReferencedPaths();
  console.log(`📋 Referenced storage paths in DB: ${refPaths.size}`);
  for (const p of refPaths) console.log(`   ✔ ${p}`);

  // 2. List every file in the bucket
  console.log(`\n📁 Scanning bucket "${BUCKET}"...`);
  const allFiles = await listAllFiles('');
  console.log(`   Total files in bucket: ${allFiles.length}`);

  // 3. Partition into keep / orphan
  const keep = [];
  const orphan = [];
  for (const f of allFiles) {
    if (refPaths.has(f)) {
      keep.push(f);
    } else {
      orphan.push(f);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Keep:   ${keep.length} files (referenced by DB)`);
  console.log(`   Orphan: ${orphan.length} files (not referenced)`);

  if (orphan.length === 0) {
    console.log('\n✨ Nothing to clean up!');
    return;
  }

  console.log(`\n🗑️  Orphaned files:`);
  for (const f of orphan) console.log(`   ${f}`);

  if (dryRun) {
    console.log('\n⚠️  Run with --delete to remove orphaned files:');
    console.log('   node cleanup-storage.js --delete');
    return;
  }

  // Delete in batches of 100 (Supabase limit)
  console.log('\n🗑️  Deleting orphaned files...');
  let deleted = 0;
  for (let i = 0; i < orphan.length; i += 100) {
    const batch = orphan.slice(i, i + 100);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      console.error(`   ❌ Batch ${i}-${i + batch.length} failed:`, error.message);
    } else {
      deleted += batch.length;
      console.log(`   ✅ Deleted batch ${i + 1}-${i + batch.length}`);
    }
  }

  console.log(`\n✨ Done! Deleted ${deleted} of ${orphan.length} orphaned files.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://doehqqwqwjebhfgdvyum.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
(async () => {
  const { data: buckets } = await sb.storage.listBuckets();
  console.log('Buckets:', buckets?.map(b => b.name + ' (' + (b.public?'public':'private') + ', file_size_limit: ' + b.file_size_limit + ')'));

  const { data: root, error } = await sb.storage.from('listing-photos').list('', { limit: 100 });
  console.log('\nRoot of listing-photos:', error?.message || '');
  (root || []).forEach(f => console.log('  ', f.name, f.metadata ? '(file)' : '(folder)'));

  const { data: inner } = await sb.storage.from('listing-photos').list('listings', { limit: 100 });
  console.log('\nInside listings/:');
  (inner || []).forEach(f => console.log('  ', f.name, f.metadata ? '(file)' : '(folder)'));

  // Check first subfolder if exists
  if (inner && inner.length > 0) {
    const first = inner[0].name;
    const { data: sub } = await sb.storage.from('listing-photos').list('listings/' + first, { limit: 20 });
    console.log('\nInside listings/' + first + '/:');
    (sub || []).forEach(f => console.log('  ', f.name, f.metadata ? JSON.stringify({size: f.metadata.size, type: f.metadata.mimetype}) : '(folder)'));
  }
})();

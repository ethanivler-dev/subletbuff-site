// Account dashboard logic
// Shows the signed-in user's listings + view stats
document.addEventListener('DOMContentLoaded', () => {
  console.log('[account] script loaded');

  // Mobile menu toggle
  const hb = document.getElementById('nav-hamburger');
  const mm = document.getElementById('nav-mobile-menu');
  if (hb && mm) {
    hb.addEventListener('click', (e) => { e.stopPropagation(); mm.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!e.target.closest('nav.ss-nav')) mm.classList.remove('open'); });
  }

  const promptEl = document.getElementById('account-signin-prompt');
  const dashEl = document.getElementById('account-dashboard');
  const statusEl = document.getElementById('account-status');
  const statsEl = document.getElementById('account-stats');
  const listingsEl = document.getElementById('account-listings');
  const emailEl = document.getElementById('account-email');
  const signInBtn = document.getElementById('account-signin-btn');
  const signOutBtn = document.getElementById('account-signout-btn');

  // Sign in button on the page (for users who aren't signed in yet)
  if (signInBtn) {
    signInBtn.addEventListener('click', () => {
      if (window.sbAuth) window.sbAuth.signInWithGoogle();
    });
  }

  // Sign out
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      if (window.sbAuth) {
        await window.sbAuth.signOut();
        showPrompt();
      }
    });
  }

  function showPrompt() {
    if (promptEl) promptEl.style.display = '';
    if (dashEl) dashEl.style.display = 'none';
  }

  function showDashboard() {
    if (promptEl) promptEl.style.display = 'none';
    if (dashEl) dashEl.style.display = '';
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg || '';
  }

  async function loadDashboard(session) {
    const user = session.user;
    const email = user.email || '';
    if (emailEl) emailEl.textContent = email;
    showDashboard();
    setStatus('Loading your listings...');

    const sb = window.sbAuth?.supabaseClient;
    if (!sb) { setStatus('Error: auth not available'); return; }

    try {
      // Fetch listings by this user's email
      const { data: listings, error } = await sb
        .from('listings')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!listings || listings.length === 0) {
        setStatus('');
        if (statsEl) statsEl.style.display = 'none';
        if (listingsEl) listingsEl.innerHTML = '<div class="no-listings">You haven\'t posted any listings yet. <a href="/form.html" style="color:var(--gold);font-weight:600;">Post one now →</a></div>';
        return;
      }

      // Fetch view counts for all this user's listings
      const listingIds = listings.map(l => l.id);
      let viewCounts = {};
      try {
        const { data: views, error: viewErr } = await sb
          .from('listing_views')
          .select('listing_id')
          .in('listing_id', listingIds);

        if (!viewErr && views) {
          views.forEach(v => {
            viewCounts[v.listing_id] = (viewCounts[v.listing_id] || 0) + 1;
          });
        }
      } catch (_) {
        console.warn('[account] could not fetch views');
      }

      // Compute stats
      const totalListings = listings.length;
      const approved = listings.filter(l => l.status === 'approved').length;
      const pending = listings.filter(l => l.status === 'pending').length;
      const totalViews = Object.values(viewCounts).reduce((a, b) => a + b, 0);

      document.getElementById('stat-total-listings').textContent = totalListings;
      document.getElementById('stat-approved').textContent = approved;
      document.getElementById('stat-pending').textContent = pending;
      document.getElementById('stat-total-views').textContent = totalViews.toLocaleString();
      if (statsEl) statsEl.style.display = '';

      // Render listing cards
      listingsEl.innerHTML = '';
      listings.forEach(listing => {
        const views = viewCounts[listing.id] || 0;
        const card = document.createElement('div');
        card.className = 'my-listing-card';

        const imgSrc = (listing.photo_urls && listing.photo_urls[0]) ? listing.photo_urls[0] : '';
        const imgHtml = imgSrc
          ? '<img class="my-listing-img" src="' + imgSrc + '" alt="Listing photo" />'
          : '<div class="my-listing-img" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--ink-soft);">No photo</div>';

        const address = listing.address || 'No address';
        const rent = listing.monthly_rent ? '$' + Number(listing.monthly_rent).toLocaleString() + '/mo' : '';
        const neighborhood = listing.neighborhood || '';
        const metaParts = [rent, neighborhood].filter(Boolean).join(' · ');

        const statusClass = (listing.status || 'pending').toLowerCase();
        const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);

        const createdDate = listing.created_at
          ? new Date(listing.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
          : '';

        card.innerHTML =
          imgHtml +
          '<div class="my-listing-info">' +
            '<div class="my-listing-address">' + address + '</div>' +
            '<div class="my-listing-meta">' + metaParts + (createdDate ? ' · ' + createdDate : '') + '</div>' +
          '</div>' +
          '<div class="my-listing-stats">' +
            '<div class="my-listing-stat">' +
              '<div class="my-listing-stat-value">' + views.toLocaleString() + '</div>' +
              '<div class="my-listing-stat-label">Views</div>' +
            '</div>' +
          '</div>' +
          '<span class="my-listing-status ' + statusClass + '">' + statusLabel + '</span>';

        // Click to view listing detail
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          window.location.href = '/listing.html?id=' + encodeURIComponent(listing.id);
        });

        listingsEl.appendChild(card);
      });

      setStatus('');
    } catch (err) {
      console.error('[account] load error', err);
      setStatus('Error loading listings: ' + (err.message || 'Unknown error'));
    }

    // ── Admin section ──
    await loadAdminSection(session);
  }

  // ── Admin Management ──
  const adminSection = document.getElementById('admin-section');
  const adminListContainer = document.getElementById('admin-list-container');
  const adminAddEmail = document.getElementById('admin-add-email');
  const adminAddBtn = document.getElementById('admin-add-btn');
  const adminMsg = document.getElementById('admin-msg');

  function setAdminMsg(msg, color) {
    if (adminMsg) { adminMsg.textContent = msg || ''; adminMsg.style.color = color || 'var(--ink-soft)'; }
  }

  async function loadAdminSection(session) {
    if (!adminSection) return;
    const sb = window.sbAuth?.supabaseClient;
    if (!sb || !session?.user) return;

    // Check if current user is admin
    try {
      const { data, error } = await sb
        .from('admins')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();
      if (error || !data) return; // Not admin, keep section hidden
    } catch (_) { return; }

    adminSection.style.display = '';
    await renderAdminList();
  }

  async function renderAdminList() {
    const sb = window.sbAuth?.supabaseClient;
    if (!sb || !adminListContainer) return;

    try {
      const { data: admins, error } = await sb
        .from('admins')
        .select('id, email')
        .order('email', { ascending: true });

      if (error) throw error;

      if (!admins || admins.length === 0) {
        adminListContainer.innerHTML = '<div style="color:var(--ink-soft);font-size:0.85rem;">No admins found.</div>';
        return;
      }

      adminListContainer.innerHTML = admins.map(a => {
        const email = a.email || a.id;
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#fff;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;">' +
          '<span style="font-size:0.85rem;font-weight:500;">' + email + '</span>' +
          '<button type="button" class="admin-remove-btn" data-id="' + a.id + '" style="font-size:0.75rem;color:#C0392B;background:none;border:1px solid #C0392B;border-radius:6px;padding:4px 12px;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-weight:600;">Remove</button>' +
          '</div>';
      }).join('');

      // Bind remove buttons
      adminListContainer.querySelectorAll('.admin-remove-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (!confirm('Remove this admin?')) return;
          setAdminMsg('Removing...');
          try {
            const { error } = await sb.from('admins').delete().eq('id', id);
            if (error) throw error;
            setAdminMsg('Admin removed.', '#155724');
            await renderAdminList();
          } catch (err) {
            setAdminMsg('Error: ' + (err.message || 'Failed'), '#C0392B');
          }
        });
      });
    } catch (err) {
      adminListContainer.innerHTML = '<div style="color:#C0392B;font-size:0.85rem;">Error loading admins: ' + (err.message || '') + '</div>';
    }
  }

  if (adminAddBtn) {
    adminAddBtn.addEventListener('click', async () => {
      const email = (adminAddEmail?.value || '').trim();
      if (!email) { setAdminMsg('Enter an email address.', '#C0392B'); return; }
      setAdminMsg('Looking up user...');

      const sb = window.sbAuth?.supabaseClient;
      if (!sb) { setAdminMsg('Auth not available.', '#C0392B'); return; }

      // We need to find the user's auth ID by email.
      // Since we can't query auth.users from the client, we'll insert with email
      // and let admins table accept it. We need to look up via a workaround:
      // query listings table for that email to find if they have an account,
      // or just insert directly with the email and let admins handle it.
      //
      // Best approach: store email in admins table alongside id.
      // For now, look up the user by checking if they've signed in
      // by querying our own data. If that fails, insert by email.
      try {
        // Try to find user in auth by checking if they have listings
        // Actually, we'll use a Supabase RPC or just insert with email
        const { error } = await sb
          .from('admins')
          .insert({ email: email });

        if (error) throw error;

        setAdminMsg('Admin added: ' + email, '#155724');
        adminAddEmail.value = '';
        await renderAdminList();
      } catch (err) {
        if (err.message && err.message.includes('duplicate')) {
          setAdminMsg('This user is already an admin.', '#856404');
        } else {
          setAdminMsg('Error: ' + (err.message || 'Failed to add admin'), '#C0392B');
        }
      }
    });
  }

  // ── Init: check session ──
  async function init() {
    if (!window.sbAuth) { showPrompt(); return; }

    const { data: { session } } = await window.sbAuth.getSession();
    if (session) {
      loadDashboard(session);
    } else {
      showPrompt();
    }

    // Listen for auth changes (e.g. user just signed in via redirect)
    if (window.sbAuth.supabaseClient) {
      window.sbAuth.supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (session) loadDashboard(session);
        else showPrompt();
      });
    }
  }

  init();
});

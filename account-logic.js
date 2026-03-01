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

  let _session = null;
  let _editingListingId = null;

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

  // ── Tab switching ──
  function switchTab(tab) {
    const myPanel = document.getElementById('panel-my-listings');
    const savedPanel = document.getElementById('panel-saved');
    if (myPanel) myPanel.style.display = tab === 'my-listings' ? '' : 'none';
    if (savedPanel) savedPanel.style.display = tab === 'saved' ? '' : 'none';
    document.querySelectorAll('.account-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  }
  document.getElementById('tab-my-listings')?.addEventListener('click', () => switchTab('my-listings'));
  document.getElementById('tab-saved')?.addEventListener('click', () => switchTab('saved'));

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
    _session = session;
    const user = session.user;
    const email = user.email || '';
    const userId = user.id || null;
    if (emailEl) emailEl.textContent = email;
    showDashboard();
    setStatus('Loading your listings...');

    const sb = window.sbAuth?.supabaseClient;
    if (!sb) { setStatus('Error: auth not available'); return; }

    try {
      // Fetch listings by user_id (new) or email (legacy fallback)
      let query = sb.from('listings').select('*');
      if (userId) {
        query = query.or(`user_id.eq.${userId},email.eq.${email}`);
      } else {
        query = query.eq('email', email);
      }
      const { data: listings, error } = await query
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
        // Filled / paused take display priority over approval status
        const displayClass = listing.filled ? 'filled' : (listing.paused ? 'paused' : statusClass);
        const displayLabel = listing.filled ? 'Filled' : (listing.paused ? 'Paused' : statusLabel);

        const createdDate = listing.created_at
          ? new Date(listing.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
          : '';

        // Action buttons — available for approved AND pending listings
        let actionsHtml = '';
        if (listing.status === 'approved') {
          const pauseLabel = listing.paused ? 'Unpause' : 'Pause';
          actionsHtml = '<div class="my-listing-actions">'
            + '<button type="button" class="my-listing-action-btn" data-action="edit">Edit</button>';
          if (!listing.filled) {
            actionsHtml +=
              '<button type="button" class="my-listing-action-btn" data-action="pause">' + pauseLabel + '</button>'
              + '<button type="button" class="my-listing-action-btn" data-action="fill">Mark Filled</button>'
              + '<button type="button" class="my-listing-action-btn" data-action="lower-price">Lower Price</button>'
              + '<button type="button" class="my-listing-action-btn" data-action="renew">Renew</button>';
          }
          actionsHtml += '</div>';
        } else if (listing.status === 'pending') {
          actionsHtml = '<div class="my-listing-actions">'
            + '<button type="button" class="my-listing-action-btn" data-action="edit-full">Edit Listing</button>'
            + '</div>';
        }

        card.innerHTML =
          '<div class="my-listing-main">'
          + imgHtml
          + '<div class="my-listing-info">'
          +   '<div class="my-listing-address">' + address + '</div>'
          +   '<div class="my-listing-meta">' + metaParts + (createdDate ? ' · ' + createdDate : '') + '</div>'
          + '</div>'
          + '<div class="my-listing-stats">'
          +   '<div class="my-listing-stat">'
          +     '<div class="my-listing-stat-value">' + views.toLocaleString() + '</div>'
          +     '<div class="my-listing-stat-label">Views</div>'
          +   '</div>'
          + '</div>'
          + '<span class="my-listing-status ' + displayClass + '">' + displayLabel + '</span>'
          + '</div>'
          + actionsHtml;

        // Clicking the main row navigates to the listing
        const mainEl = card.querySelector('.my-listing-main');
        if (mainEl) {
          mainEl.style.cursor = 'pointer';
          mainEl.addEventListener('click', () => {
            window.location.href = '/listing.html?id=' + encodeURIComponent(listing.id);
          });
        }

        // Wire up action buttons (stop propagation so they don't trigger the row click)
        card.querySelectorAll('[data-action]').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const action = btn.dataset.action;
            if (action === 'edit') openEditModal(listing);
            else if (action === 'edit-full') window.location.href = '/form.html?edit=' + encodeURIComponent(listing.id);
            else if (action === 'pause') pauseListing(listing);
            else if (action === 'fill') markFilled(listing);
            else if (action === 'lower-price') lowerPrice(listing);
            else if (action === 'renew') renewListing(listing);
          });
        });

        listingsEl.appendChild(card);
      });

      setStatus('');
    } catch (err) {
      console.error('[account] load error', err);
      setStatus('Error loading listings: ' + (err.message || 'Unknown error'));
    }

    // ── Saved listings ──
    loadSavedListings(session);
  }

  async function loadSavedListings(session) {
    const sb = window.sbAuth?.supabaseClient;
    const savedEl = document.getElementById('saved-listings-list');
    if (!sb || !savedEl) return;

    const { data: favs, error: favErr } = await sb.from('user_favorites')
      .select('listing_id, saved_at').eq('user_id', session.user.id)
      .order('saved_at', { ascending: false });

    if (favErr) { console.warn('[account] could not fetch favorites', favErr); return; }

    if (!favs || favs.length === 0) {
      savedEl.innerHTML = '<div class="no-listings">No saved listings yet. <a href="/listings.html" style="color:var(--gold);font-weight:600;">Browse listings →</a></div>';
      return;
    }

    const ids = favs.map(f => f.listing_id);
    const { data: listings, error: listErr } = await sb.from('listings').select('*').in('id', ids);
    if (listErr || !listings || !listings.length) {
      savedEl.innerHTML = '<div class="no-listings">No listings found.</div>';
      return;
    }

    const ordered = ids.map(id => listings.find(l => l.id === id)).filter(Boolean);
    savedEl.innerHTML = '';
    ordered.forEach(listing => {
      const card = document.createElement('div');
      card.className = 'my-listing-card';
      card.style.cursor = 'pointer';
      const imgSrc = listing.photo_urls?.[0] || '';
      const imgHtml = imgSrc
        ? '<img class="my-listing-img" src="' + imgSrc + '" alt="Listing photo" loading="lazy">'
        : '<div class="my-listing-img" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--ink-soft);">No photo</div>';
      const rent = listing.monthly_rent ? '$' + Number(listing.monthly_rent).toLocaleString() + '/mo' : '';
      const meta = [rent, listing.neighborhood].filter(Boolean).join(' · ');
      card.innerHTML = imgHtml +
        '<div class="my-listing-info">' +
          '<div class="my-listing-address">' + (listing.address || '') + '</div>' +
          '<div class="my-listing-meta">' + meta + '</div>' +
        '</div>';
      card.addEventListener('click', () => window.open('/listing.html?id=' + encodeURIComponent(listing.id), '_blank', 'noopener'));
      savedEl.appendChild(card);
    });
  }

  // ── Self-serve listing management ──

  async function callUpdateListing(listingId, updates) {
    const token = _session?.access_token;
    if (!token) throw new Error('Not signed in');
    const res = await fetch('/api/update-listing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ listing_id: listingId, updates }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Update failed');
    return json.listing;
  }

  function openEditModal(listing) {
    _editingListingId = listing.id;
    document.getElementById('edit-field-description').value = listing.description || '';
    document.getElementById('edit-field-rent').value = listing.monthly_rent != null ? listing.monthly_rent : '';
    document.getElementById('edit-field-deposit').value = listing.security_deposit != null ? listing.security_deposit : '';
    document.getElementById('edit-field-start').value = listing.start_date ? listing.start_date.slice(0, 10) : '';
    document.getElementById('edit-field-end').value = listing.end_date ? listing.end_date.slice(0, 10) : '';
    document.getElementById('edit-field-phone').value = listing.phone || '';
    document.getElementById('edit-field-contact').value = listing.preferred_contact || '';
    document.getElementById('edit-field-besttime').value = listing.best_time || '';
    const msgEl = document.getElementById('edit-modal-msg');
    msgEl.textContent = '';
    msgEl.className = 'account-modal-msg';
    const submitBtn = document.getElementById('edit-modal-submit');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Changes';
    document.getElementById('edit-listing-modal').classList.remove('account-modal-hidden');
    document.getElementById('edit-listing-modal').setAttribute('aria-hidden', 'false');
  }

  function closeEditModal() {
    document.getElementById('edit-listing-modal').classList.add('account-modal-hidden');
    document.getElementById('edit-listing-modal').setAttribute('aria-hidden', 'true');
    _editingListingId = null;
  }

  async function submitEdit() {
    if (!_editingListingId) return;
    const submitBtn = document.getElementById('edit-modal-submit');
    const msgEl = document.getElementById('edit-modal-msg');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';
    msgEl.textContent = '';
    msgEl.className = 'account-modal-msg';

    const rentVal = document.getElementById('edit-field-rent').value;
    const depositVal = document.getElementById('edit-field-deposit').value;
    const updates = {
      description: document.getElementById('edit-field-description').value.trim() || null,
      monthly_rent: rentVal !== '' ? parseFloat(rentVal) : null,
      security_deposit: depositVal !== '' ? parseFloat(depositVal) : null,
      start_date: document.getElementById('edit-field-start').value || null,
      end_date: document.getElementById('edit-field-end').value || null,
      phone: document.getElementById('edit-field-phone').value.trim() || null,
      preferred_contact: document.getElementById('edit-field-contact').value.trim() || null,
      best_time: document.getElementById('edit-field-besttime').value.trim() || null,
    };

    try {
      await callUpdateListing(_editingListingId, updates);
      closeEditModal();
      loadDashboard(_session);
    } catch (err) {
      msgEl.textContent = err.message || 'Failed to save changes.';
      msgEl.className = 'account-modal-msg error';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }
  }

  async function pauseListing(listing) {
    const willPause = !listing.paused;
    const msg = willPause
      ? 'Pause this listing? It will be hidden from public view until you unpause it.'
      : 'Unpause this listing? It will reappear in public search.';
    if (!confirm(msg)) return;
    try {
      await callUpdateListing(listing.id, { paused: willPause });
      loadDashboard(_session);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function markFilled(listing) {
    if (!confirm('Mark this listing as filled? It will be removed from public search.')) return;
    try {
      await callUpdateListing(listing.id, { filled: true, filled_at: new Date().toISOString() });
      loadDashboard(_session);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function lowerPrice(listing) {
    const current = listing.monthly_rent;
    const input = prompt('Current rent: $' + (current || 0) + '/mo\n\nEnter the new monthly rent (must be lower):');
    if (!input) return;
    const newRent = parseFloat(input);
    if (isNaN(newRent) || newRent <= 0) { alert('Please enter a valid dollar amount.'); return; }
    if (newRent >= current) { alert('New rent must be lower than the current rent ($' + current + '/mo).'); return; }
    try {
      await callUpdateListing(listing.id, { monthly_rent: newRent });
      loadDashboard(_session);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function renewListing(listing) {
    const input = prompt('Enter new end date (YYYY-MM-DD):');
    if (!input) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) { alert('Please use YYYY-MM-DD format (e.g. 2026-08-08).'); return; }
    if (isNaN(new Date(input).getTime())) { alert('Invalid date.'); return; }
    try {
      await callUpdateListing(listing.id, { end_date: input });
      loadDashboard(_session);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  function setupModalEvents() {
    document.getElementById('edit-modal-close')?.addEventListener('click', closeEditModal);
    document.getElementById('edit-modal-cancel')?.addEventListener('click', closeEditModal);
    document.getElementById('edit-modal-submit')?.addEventListener('click', submitEdit);
    // Close on backdrop click
    document.getElementById('edit-listing-modal')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeEditModal();
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

  setupModalEvents();
  init();
});

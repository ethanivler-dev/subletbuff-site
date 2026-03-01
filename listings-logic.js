/*
ROUTES + FILE PURPOSES
- File: listings-logic.js
- Belongs to: /listings.html
- Query params: none required
- Visibility rules: public browse page
- Allowed listing visibility: approved listings only
*/
const BUILD_VERSION = '2026-02-23b';

document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://doehqqwqwjebhfgdvyum.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_ZZ4mKcw6_e9diz7oFfbVag_YA9zkqFW';
  const CAMPUS_COORDS = { lat: 40.0076, lng: -105.2659 };
  const DISTANCE_MAX_MILES = 10;

  const supabaseClient = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  const gridEl = document.getElementById('listings-grid');
  const statusEl = document.getElementById('listings-status');

  // ── Sidebar filter elements ──
  const sidebarMinPriceEl = document.getElementById('sidebar-min-price');
  const sidebarMaxPriceEl = document.getElementById('sidebar-max-price');
  const sidebarNeighborhoodEl = document.getElementById('sidebar-neighborhood');
  const startDateEl = document.getElementById('filter-start-date');
  const endDateEl = document.getElementById('filter-end-date');
  const distanceEl = document.getElementById('filter-distance');
  const distanceValueEl = document.getElementById('filter-distance-value');
  const bedsEl = document.getElementById('filter-beds');           // hidden select
  const bathsEl = document.getElementById('filter-baths');         // hidden select
  const furnishedEl = document.getElementById('filter-furnished'); // hidden select
  const sortEl = document.getElementById('filter-sort');
  const parkingEl = document.getElementById('filter-parking');
  const petsEl = document.getElementById('filter-pets');           // hidden select
  const housingEl = document.getElementById('filter-housing-type'); // hidden select
  const genderEl = document.getElementById('filter-gender');
  const clearBtn = document.getElementById('clear-filters-btn');
  const sidebarApplyBtn = document.getElementById('sidebar-apply-btn');
  const sidebarEl = document.getElementById('filter-sidebar');
  const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
  const pillsContainer = document.getElementById('filter-pills');

  // ── Toggle groups ──
  const bedsToggle = document.getElementById('sidebar-beds-toggle');
  const bathsToggle = document.getElementById('sidebar-baths-toggle');
  const furnishedToggle = document.getElementById('sidebar-furnished-toggle');
  const petsToggle = document.getElementById('sidebar-pets-toggle');
  const housingToggle = document.getElementById('sidebar-housing-toggle');

  function initToggleGroup(groupEl, hiddenSelectEl) {
    if (!groupEl) return;
    groupEl.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        groupEl.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (hiddenSelectEl) hiddenSelectEl.value = btn.dataset.value || '';
      });
    });
  }
  initToggleGroup(bedsToggle, bedsEl);
  initToggleGroup(bathsToggle, bathsEl);
  initToggleGroup(furnishedToggle, furnishedEl);
  initToggleGroup(petsToggle, petsEl);
  initToggleGroup(housingToggle, housingEl);

  // ── Mobile sidebar overlay ──
  let overlayEl = null;
  function openSidebar() {
    if (!sidebarEl) return;
    sidebarEl.classList.add('open');
    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.className = 'sidebar-overlay';
      overlayEl.style.display = 'none';
      overlayEl.addEventListener('click', closeSidebar);
      document.body.appendChild(overlayEl);
    }
    if (window.innerWidth <= 900) overlayEl.style.display = 'block';
  }
  function closeSidebar() {
    if (sidebarEl) sidebarEl.classList.remove('open');
    if (overlayEl) overlayEl.style.display = 'none';
  }
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);

  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('nav-mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenu.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('nav.ss-nav')) mobileMenu.classList.remove('open');
    });
  }

  let allListings = [];

  // ── Favorites (hearts) ──
  let savedIds = new Set();
  let favoriteCounts = {}; // { listing_id: count }

  async function loadSavedIds() {
    if (!window.sbAuth) return;
    const { data: { session } } = await window.sbAuth.getSession();
    if (!session) return;
    const sb = window.sbAuth.supabaseClient;
    if (!sb) return;
    const { data } = await sb.from('user_favorites').select('listing_id');
    if (data) data.forEach(r => savedIds.add(r.listing_id));
  }

  async function loadFavoriteCounts() {
    try {
      const resp = await fetch('/api/favorite-counts');
      if (resp.ok) {
        favoriteCounts = await resp.json();
      }
    } catch (e) { console.warn('[listings] fav counts failed', e); }
  }

  async function toggleFavorite(listingId, btn) {
    if (!window.sbAuth) return;
    const { data: { session } } = await window.sbAuth.getSession();
    if (!session) { window.sbAuth.signInWithGoogle(); return; }
    const sb = window.sbAuth.supabaseClient;
    const card = btn.closest('.listings-card') || btn.parentElement?.parentElement;
    if (savedIds.has(listingId)) {
      await sb.from('user_favorites').delete()
        .eq('user_id', session.user.id).eq('listing_id', listingId);
      savedIds.delete(listingId);
      btn.classList.remove('saved');
      favoriteCounts[listingId] = Math.max(0, (favoriteCounts[listingId] || 0) - 1);
      updateFavBadge(card, favoriteCounts[listingId]);
    } else {
      await sb.from('user_favorites').insert([{ user_id: session.user.id, listing_id: listingId }]);
      savedIds.add(listingId);
      btn.classList.add('saved');
      favoriteCounts[listingId] = (favoriteCounts[listingId] || 0) + 1;
      updateFavBadge(card, favoriteCounts[listingId]);
    }
  }

  function updateFavBadge(card, count) {
    if (!card) return;
    let badge = card.querySelector('.card-fav-count');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'card-fav-count';
        const photoWrap = card.querySelector('.listings-photo-wrap');
        if (photoWrap) photoWrap.appendChild(badge);
      }
      if (badge) badge.textContent = '\u2665 ' + count;
    } else if (badge) {
      badge.remove();
    }
  }

  function setStatus(message, state) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'listings-status';
    if (state) statusEl.classList.add(`listings-status-${state}`);
  }

  function normalizeFurnished(value) {
    if (value == null) return '';
    if (typeof value === 'boolean') return value ? 'yes' : 'no';
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return '';
    if (normalized.includes('yes') || normalized.includes('true') || normalized.includes('furnished') || normalized === 'y' || normalized === '1') return 'yes';
    if (normalized.includes('no') || normalized.includes('false') || normalized.includes('unfurnished') || normalized === 'n' || normalized === '0') return 'no';
    return normalized;
  }

  function getFurnishedLabel(value) {
    const normalized = normalizeFurnished(value);
    if (normalized === 'yes') return 'Furnished';
    if (normalized === 'no') return 'Unfurnished';
    return 'Furnished: N/A';
  }

  function toRadians(value) {
    return (value * Math.PI) / 180;
  }

  function haversineMiles(from, to) {
    const earthRadiusMiles = 3958.8;
    const dLat = toRadians(to.lat - from.lat);
    const dLng = toRadians(to.lng - from.lng);
    const lat1 = toRadians(from.lat);
    const lat2 = toRadians(to.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMiles * c;
  }

  function parseCoordinate(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function getListingCoordinates(listing) {
    const lat = parseCoordinate(listing.lat);
    const lng = parseCoordinate(listing.lng);
    if (lat == null || lng == null) return null;
    return { lat, lng };
  }

  function updateDistanceLabel() {
    if (!distanceEl || !distanceValueEl) return;
    const distance = Number(distanceEl.value);
    if (!Number.isFinite(distance) || distance >= DISTANCE_MAX_MILES) {
      distanceValueEl.textContent = 'Any';
      return;
    }
    distanceValueEl.textContent = `≤ ${distance.toFixed(2).replace(/\.00$/, '')} mi`;
  }

  function parseDateSafe(value) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatDate(value) {
    const date = parseDateSafe(value);
    if (!date) return 'N/A';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatRent(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 'N/A';
    return `$${num.toLocaleString()}`;
  }

  /**
   * Compute the current effective price after auto-reductions.
   * Returns { effective, original, reduced } where reduced is true if price was lowered.
   */
  function getEffectivePrice(listing) {
    const original = Number(listing.monthly_rent);
    if (!Number.isFinite(original)) return { effective: 0, original: 0, reduced: false };
    if (!listing.price_reduction_enabled) return { effective: original, original, reduced: false };

    const days = Number(listing.price_reduction_days);
    const amount = Number(listing.price_reduction_amount);
    const maxCount = Number(listing.price_reduction_count) || 1;
    if (!days || days <= 0 || !amount || amount <= 0) return { effective: original, original, reduced: false };

    const created = new Date(listing.created_at);
    if (isNaN(created.getTime())) return { effective: original, original, reduced: false };

    const daysSinceCreated = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    const reductionsApplied = Math.min(Math.floor(daysSinceCreated / days), maxCount);
    if (reductionsApplied <= 0) return { effective: original, original, reduced: false };

    const effective = Math.max(0, original - (reductionsApplied * amount));
    return { effective, original, reduced: effective < original };
  }

  function makePlaceholderPhoto() {
    const placeholder = document.createElement('div');
    placeholder.className = 'listings-photo-placeholder';
    placeholder.textContent = 'No Photo';
    return placeholder;
  }

  function getDescriptionSnippet(description) {
    if (!description) return 'No description provided.';
    const compact = String(description).replace(/\s+/g, ' ').trim();
    if (compact.length <= 130) return compact;
    return `${compact.slice(0, 127)}...`;
  }

  function createCard(listing) {
    const card = document.createElement('article');
    card.className = 'listing-card listings-card';
    card.style.cursor = 'pointer';
    card.tabIndex = 0;

    const openDetail = () => {
      if (!listing || !listing.id) return;
      window.open(`/listing.html?id=${encodeURIComponent(listing.id)}`, '_blank', 'noopener,noreferrer');
    };

    card.addEventListener('click', openDetail);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDetail();
      }
    });

    const photoWrap = document.createElement('div');
    photoWrap.className = 'listings-photo-wrap';

    const firstPhoto = Array.isArray(listing.photo_urls) ? listing.photo_urls[0] : '';
    if (firstPhoto) {
      const img = document.createElement('img');
      img.className = 'card-img listings-card-img';
      img.src = firstPhoto;
      img.alt = listing.neighborhood ? `${listing.neighborhood} listing photo` : 'Listing photo';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        img.replaceWith(makePlaceholderPhoto());
      });
      photoWrap.appendChild(img);
    } else {
      photoWrap.appendChild(makePlaceholderPhoto());
    }

    const heartBtn = document.createElement('button');
    heartBtn.type = 'button';
    heartBtn.className = 'card-heart-btn' + (savedIds.has(listing.id) ? ' saved' : '');
    heartBtn.setAttribute('aria-label', 'Save listing');
    heartBtn.textContent = '♥';
    heartBtn.addEventListener('click', async e => {
      e.stopPropagation();
      await toggleFavorite(listing.id, heartBtn);
    });
    photoWrap.appendChild(heartBtn);

    // Price Drop badge overlay
    const pricing = getEffectivePrice(listing);
    if (pricing.reduced) {
      const dropBadge = document.createElement('span');
      dropBadge.className = 'card-price-drop-badge';
      dropBadge.textContent = 'Price Drop';
      photoWrap.appendChild(dropBadge);
    }

    // Favorite count badge
    const favCount = favoriteCounts[listing.id] || 0;
    if (favCount > 0) {
      const favBadge = document.createElement('span');
      favBadge.className = 'card-fav-count';
      favBadge.textContent = '♥ ' + favCount;
      photoWrap.appendChild(favBadge);
    }

    const rent = document.createElement('div');
    rent.className = 'listings-rent';
    if (pricing.reduced) {
      rent.innerHTML = `<span class="listings-rent-original">${formatRent(pricing.original)}</span> ${formatRent(pricing.effective)} / mo`;
    } else {
      rent.textContent = `${formatRent(pricing.effective)} / mo`;
    }

    const neighborhood = document.createElement('div');
    neighborhood.className = 'listings-neighborhood';
    neighborhood.textContent = listing.neighborhood || 'Neighborhood N/A';

    const details = document.createElement('div');
    details.className = 'listings-details';
    details.textContent = `${listing.beds || 'N/A'} beds • ${listing.baths || 'N/A'} baths • ${getFurnishedLabel(listing.furnished)}`;

    const dates = document.createElement('div');
    dates.className = 'listings-dates';
    dates.textContent = `${formatDate(listing.start_date)} – ${formatDate(listing.end_date)}`;

    const description = document.createElement('p');
    description.className = 'listings-description';
    description.textContent = getDescriptionSnippet(listing.description);

    card.appendChild(photoWrap);
    card.appendChild(rent);
    card.appendChild(neighborhood);
    card.appendChild(details);
    card.appendChild(dates);
    card.appendChild(description);

    if (Number.isFinite(listing._distanceMiles)) {
      const distance = document.createElement('div');
      distance.className = 'listings-distance';
      distance.textContent = `${listing._distanceMiles.toFixed(2).replace(/\.00$/, '')} mi from campus`;
      card.appendChild(distance);
    } else {
      const distance = document.createElement('div');
      distance.className = 'listings-distance';
      distance.textContent = 'Distance unknown';
      card.appendChild(distance);
    }

    return card;
  }

  function uniqueSorted(values) {
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true })
    );
  }

  function setSelectOptions(selectEl, values) {
    if (!selectEl) return;
    const currentValue = selectEl.value;
    selectEl.innerHTML = '<option value="">Any</option>';
    values.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      selectEl.appendChild(option);
    });
    if (currentValue && values.includes(currentValue)) {
      selectEl.value = currentValue;
    }
  }

  function populateFilterOptions(listings) {
    const neighborhoods = uniqueSorted(listings.map((item) => item.neighborhood));
    const baths = uniqueSorted(listings.map((item) => item.baths));

    setSelectOptions(sidebarNeighborhoodEl, neighborhoods);
    setSelectOptions(bathsEl, baths);
  }

  function applyFilters() {
    if (!Array.isArray(allListings)) return;

    const minPrice = sidebarMinPriceEl ? (sidebarMinPriceEl.value ? Number(sidebarMinPriceEl.value) : null) : null;
    const maxPrice = sidebarMaxPriceEl ? (sidebarMaxPriceEl.value ? Number(sidebarMaxPriceEl.value) : null) : null;
    const neighborhood = sidebarNeighborhoodEl ? sidebarNeighborhoodEl.value : '';
    const beds = bedsEl ? bedsEl.value : '';
    const baths = bathsEl ? bathsEl.value : '';
    const furnished = furnishedEl ? furnishedEl.value : '';
    const parking = parkingEl ? parkingEl.value : '';
    const pets = petsEl ? petsEl.value : '';
    const housing = housingEl ? housingEl.value : '';
    const gender = genderEl ? genderEl.value : '';
    const sort = sortEl ? sortEl.value : 'newest';
    const distanceLimit = distanceEl ? Number(distanceEl.value) : DISTANCE_MAX_MILES;
    const useDistanceLimit = Number.isFinite(distanceLimit) && distanceLimit < DISTANCE_MAX_MILES;

    const filterStart = parseDateSafe(startDateEl.value);
    const filterEnd = parseDateSafe(endDateEl.value);
    const useDateFilter = !!(filterStart || filterEnd);

    const filtered = allListings.filter((listing) => {
      const rent = getEffectivePrice(listing).effective;
      if (minPrice != null && Number.isFinite(minPrice)) {
        if (!Number.isFinite(rent) || rent < minPrice) return false;
      }
      if (maxPrice != null && Number.isFinite(maxPrice)) {
        if (!Number.isFinite(rent) || rent > maxPrice) return false;
      }

      if (neighborhood && listing.neighborhood !== neighborhood) return false;
      if (beds) {
        const listBeds = Number(listing.beds);
        const minBeds = Number(beds);
        if (!Number.isFinite(listBeds) || listBeds < minBeds) return false;
      }
      if (baths) {
        const listBaths = Number(listing.baths);
        const minBaths = Number(baths);
        if (!Number.isFinite(listBaths) || listBaths < minBaths) return false;
      }
      if (furnished && normalizeFurnished(listing.furnished) !== furnished) return false;
      if (parking && listing.parking !== parking) return false;
      if (pets === 'yes' && (!listing.pets || listing.pets === 'No')) return false;
      if (pets === 'no' && listing.pets !== 'No') return false;
      if (housing && listing.housing_type !== housing) return false;
      if (gender && listing.gender_preference !== gender) return false;

      if (useDistanceLimit) {
        if (!Number.isFinite(listing._distanceMiles) || listing._distanceMiles > distanceLimit) {
          return false;
        }
      }

      if (useDateFilter) {
        const listingStart = parseDateSafe(listing.start_date);
        const listingEnd = parseDateSafe(listing.end_date);

        if (!listingStart || !listingEnd) return false;

        const effectiveFilterStart = filterStart || new Date(-8640000000000000);
        const effectiveFilterEnd = filterEnd || new Date(8640000000000000);

        if (!(listingStart <= effectiveFilterEnd && listingEnd >= effectiveFilterStart)) {
          return false;
        }
      }

      return true;
    });

    filtered.sort((a, b) => {
      if (sort === 'closest' || sort === 'farthest') {
        const aFinite = Number.isFinite(a._distanceMiles);
        const bFinite = Number.isFinite(b._distanceMiles);

        if (!aFinite && !bFinite) return 0;
        if (!aFinite) return 1;
        if (!bFinite) return -1;

        return sort === 'closest'
          ? (a._distanceMiles - b._distanceMiles)
          : (b._distanceMiles - a._distanceMiles);
      }

      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });

    renderListings(filtered);
  }

  function clearFilters() {
    if (sidebarMinPriceEl) sidebarMinPriceEl.value = '';
    if (sidebarMaxPriceEl) sidebarMaxPriceEl.value = '';
    if (sidebarNeighborhoodEl) sidebarNeighborhoodEl.value = '';
    if (startDateEl) startDateEl.value = '';
    if (endDateEl) endDateEl.value = '';
    if (bedsEl) bedsEl.value = '';
    if (bathsEl) bathsEl.value = '';
    if (furnishedEl) furnishedEl.value = '';
    if (parkingEl) parkingEl.value = '';
    if (petsEl) petsEl.value = '';
    if (housingEl) housingEl.value = '';
    if (genderEl) genderEl.value = '';
    if (distanceEl) distanceEl.value = String(DISTANCE_MAX_MILES);
    if (sortEl) sortEl.value = 'newest';
    setToggleValue(bedsToggle, '');
    setToggleValue(bathsToggle, '');
    setToggleValue(furnishedToggle, '');
    setToggleValue(petsToggle, '');
    setToggleValue(housingToggle, '');
    updateDistanceLabel();
    renderListings(allListings);
  }

  function renderListings(listings) {
    if (!gridEl) return;

    gridEl.innerHTML = '';

    if (!Array.isArray(listings) || listings.length === 0) {
      setStatus('No listings found.', 'empty');
      updatePills();
      updateSidebarCount(0);
      return;
    }

    listings.forEach((listing) => {
      gridEl.appendChild(createCard(listing));
    });

    setStatus(`Showing ${listings.length} listing${listings.length === 1 ? '' : 's'}.`, 'loaded');
    updatePills();
    updateSidebarCount(listings.length);
  }

  /* ── Filter Pills ── */
  function updatePills() {
    if (!pillsContainer) return;
    pillsContainer.innerHTML = '';

    const pills = [];
    const minP = sidebarMinPriceEl ? sidebarMinPriceEl.value : '';
    const maxP = sidebarMaxPriceEl ? sidebarMaxPriceEl.value : '';
    if (minP || maxP) {
      const label = minP && maxP ? `$${minP}–$${maxP}` : minP ? `$${minP}+` : `Up to $${maxP}`;
      pills.push({ label, clear: () => { if (sidebarMinPriceEl) sidebarMinPriceEl.value = ''; if (sidebarMaxPriceEl) sidebarMaxPriceEl.value = ''; } });
    }
    if (sidebarNeighborhoodEl && sidebarNeighborhoodEl.value) {
      pills.push({ label: sidebarNeighborhoodEl.value, clear: () => { sidebarNeighborhoodEl.value = ''; } });
    }
    if (bedsEl && bedsEl.value) {
      pills.push({ label: `${bedsEl.value}+ Beds`, clear: () => { bedsEl.value = ''; setToggleValue(bedsToggle, ''); } });
    }
    if (bathsEl && bathsEl.value) {
      pills.push({ label: `${bathsEl.value}+ Baths`, clear: () => { bathsEl.value = ''; setToggleValue(bathsToggle, ''); } });
    }
    if (furnishedEl && furnishedEl.value) {
      pills.push({ label: furnishedEl.value === 'yes' ? 'Furnished' : 'Unfurnished', clear: () => { furnishedEl.value = ''; setToggleValue(furnishedToggle, ''); } });
    }
    const dist = distanceEl ? Number(distanceEl.value) : DISTANCE_MAX_MILES;
    if (Number.isFinite(dist) && dist < DISTANCE_MAX_MILES) {
      pills.push({ label: `Under ${dist} mi`, clear: () => { if (distanceEl) distanceEl.value = String(DISTANCE_MAX_MILES); updateDistanceLabel(); } });
    }
    if (startDateEl && (startDateEl.value || endDateEl.value)) {
      const s = startDateEl.value || '...';
      const e = endDateEl.value || '...';
      pills.push({ label: `${s} – ${e}`, clear: () => { startDateEl.value = ''; endDateEl.value = ''; } });
    }
    if (parkingEl && parkingEl.value) {
      pills.push({ label: `Parking: ${parkingEl.value}`, clear: () => { parkingEl.value = ''; } });
    }
    if (petsEl && petsEl.value) {
      pills.push({ label: petsEl.value === 'yes' ? 'Pets OK' : 'No Pets', clear: () => { petsEl.value = ''; setToggleValue(petsToggle, ''); } });
    }
    if (housingEl && housingEl.value) {
      const housingLabels = { apartment: 'Apartment', house: 'House', condo: 'Condo' };
      pills.push({ label: housingLabels[housingEl.value] || housingEl.value, clear: () => { housingEl.value = ''; setToggleValue(housingToggle, ''); } });
    }
    if (genderEl && genderEl.value) {
      pills.push({ label: genderEl.value, clear: () => { genderEl.value = ''; } });
    }

    pills.forEach(p => {
      const pill = document.createElement('span');
      pill.className = 'filter-pill';
      pill.textContent = p.label;
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'filter-pill-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => { p.clear(); applyFilters(); });
      pill.appendChild(closeBtn);
      pillsContainer.appendChild(pill);
    });

    // "More Filters" pill on mobile to open sidebar
    if (window.innerWidth <= 900) {
      const more = document.createElement('span');
      more.className = 'filter-pill filter-pill--more';
      more.textContent = 'More Filters ›';
      more.addEventListener('click', openSidebar);
      pillsContainer.appendChild(more);
    }
  }

  function setToggleValue(groupEl, val) {
    if (!groupEl) return;
    groupEl.querySelectorAll('.toggle-btn').forEach(b => {
      b.classList.toggle('active', (b.dataset.value || '') === val);
    });
  }

  function updateSidebarCount(count) {
    if (!sidebarApplyBtn) return;
    sidebarApplyBtn.textContent = `Show ${count} Listing${count === 1 ? '' : 's'} ›`;
  }

  async function loadApprovedListings() {
    if (!supabaseClient) {
      setStatus('Error loading listings: Supabase client not available.', 'error');
      return;
    }

    setStatus('Loading listings...', 'loading');

    try {
      const { data, error } = await supabaseClient
        .from('listings')
        .select('*')
        .eq('status', 'approved')
        .eq('paused', false)
        .eq('filled', false)
        .order('created_at', { ascending: false });

      if (error) {
        setStatus(`Error loading listings: ${error.message || 'Unknown error'}`, 'error');
        return;
      }

      allListings = (Array.isArray(data) ? data : []).map((item) => {
        const coords = getListingCoordinates(item);
        const distanceMiles = coords ? haversineMiles(CAMPUS_COORDS, coords) : null;
        return {
          ...item,
          _distanceMiles: Number.isFinite(distanceMiles) ? distanceMiles : null
        };
      });
      populateFilterOptions(allListings);
      renderListings(allListings);
    } catch (err) {
      setStatus(`Error loading listings: ${err.message || 'Unknown error'}`, 'error');
    }
  }

  if (sidebarApplyBtn) sidebarApplyBtn.addEventListener('click', () => { applyFilters(); closeSidebar(); });
  if (clearBtn) clearBtn.addEventListener('click', clearFilters);
  if (distanceEl) distanceEl.addEventListener('input', updateDistanceLabel);

  updateDistanceLabel();

  loadSavedIds();
  loadFavoriteCounts().then(() => loadApprovedListings());
});

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
        applyFilters();
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
  const mobileFilterBtnEl = document.getElementById('mobile-filter-btn');
  if (mobileFilterBtnEl) mobileFilterBtnEl.addEventListener('click', openSidebar);

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

  // ── Search ──
  let searchQuery = '';
  let quickRoomType = '';
  const searchInputEl = document.getElementById('listings-search');
  const initialParams = new URLSearchParams(window.location.search);

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

  function getListerLabel(listing) {
    const first = String(listing?.first_name || '').trim();
    if (first) return `${first} · CU student lister`;
    return 'CU student lister';
  }

  function getRoomTypeLabel(listing) {
    const unitType = String(listing?.unit_type || '').toLowerCase();
    if (unitType === 'room-shared' || unitType === 'shared-room') return 'Shared room';
    if (unitType === 'entire') return 'Entire unit';
    const housingType = String(listing?.housing_type || '').toLowerCase();
    if (housingType === 'apartment') return 'Apartment';
    if (housingType === 'house') return 'House';
    if (housingType === 'condo') return 'Condo';
    return 'Room type not specified';
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

    const lister = document.createElement('div');
    lister.className = 'listings-lister';
    lister.textContent = getListerLabel(listing);

    const details = document.createElement('div');
    details.className = 'listings-details';
    details.textContent = `${listing.beds || 'N/A'} beds • ${listing.baths || 'N/A'} baths • ${getRoomTypeLabel(listing)}`;

    const dates = document.createElement('div');
    dates.className = 'listings-dates';
    dates.textContent = `${formatDate(listing.start_date)} – ${formatDate(listing.end_date)}`;

    const description = document.createElement('p');
    description.className = 'listings-description';
    description.textContent = getDescriptionSnippet(listing.description);

    const trustRow = document.createElement('div');
    trustRow.className = 'listings-trust-row';
    const reviewedChip = document.createElement('span');
    reviewedChip.className = 'listings-trust-chip';
    reviewedChip.textContent = 'Reviewed before posting';
    const verifiedChip = document.createElement('span');
    verifiedChip.className = 'listings-trust-chip';
    verifiedChip.textContent = 'CU email verified';
    trustRow.appendChild(reviewedChip);
    trustRow.appendChild(verifiedChip);

    card.appendChild(photoWrap);
    card.appendChild(rent);
    card.appendChild(neighborhood);
    card.appendChild(lister);
    card.appendChild(details);
    card.appendChild(dates);
    card.appendChild(description);
    card.appendChild(trustRow);

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

    const q = searchQuery.toLowerCase().trim();

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
      if (q && !(
        (listing.neighborhood || '').toLowerCase().includes(q) ||
        (listing.address     || '').toLowerCase().includes(q) ||
        (listing.description || '').toLowerCase().includes(q)
      )) return false;

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
      if (quickRoomType === 'shared' && !['room-shared', 'shared-room'].includes(String(listing.unit_type || '').toLowerCase())) return false;
      if (quickRoomType === 'entire' && String(listing.unit_type || '').toLowerCase() !== 'entire') return false;

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
    searchQuery = '';
    if (searchInputEl) searchInputEl.value = '';
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
    quickRoomType = '';
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
      const empty = document.createElement('div');
      empty.className = 'listings-empty-state';
      empty.innerHTML = '<p>No listings match your filters.</p>';
      const clearBtn2 = document.createElement('button');
      clearBtn2.type = 'button';
      clearBtn2.className = 'btn btn--primary btn--sm';
      clearBtn2.textContent = 'Clear filters';
      clearBtn2.addEventListener('click', clearFilters);
      empty.appendChild(clearBtn2);
      gridEl.appendChild(empty);

      setStatus('0 listings found.', 'empty');
      updatePills();
      updateSidebarCount(0);
      return;
    }

    listings.forEach((listing) => {
      gridEl.appendChild(createCard(listing));
    });

    setStatus(`${listings.length} listing${listings.length === 1 ? '' : 's'} found.`, 'loaded');
    updatePills();
    updateSidebarCount(listings.length);
  }

  /* ── Filter Pills ── */
  function updatePills() {
    if (!pillsContainer) return;
    pillsContainer.innerHTML = '';

    const pills = [];
    if (searchQuery.trim()) {
      pills.push({ label: `"${searchQuery.trim()}"`, clear: () => { searchQuery = ''; if (searchInputEl) searchInputEl.value = ''; } });
    }
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

    // Update mobile filter button badge
    const mobileCountEl = document.getElementById('mobile-filter-count');
    const mobileFilterBtn = document.getElementById('mobile-filter-btn');
    if (mobileCountEl) mobileCountEl.textContent = pills.length > 0 ? String(pills.length) : '';
    if (mobileFilterBtn) mobileFilterBtn.classList.toggle('has-filters', pills.length > 0);

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
  }

  function setToggleValue(groupEl, val) {
    if (!groupEl) return;
    groupEl.querySelectorAll('.toggle-btn').forEach(b => {
      b.classList.toggle('active', (b.dataset.value || '') === val);
    });
  }

  function updateSidebarCount(count) {
    const countEl = document.getElementById('sidebar-result-count');
    if (countEl) countEl.textContent = count > 0 ? `${count} found` : '';
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
        .select('id, first_name, address, neighborhood, monthly_rent, beds, baths, start_date, end_date, photo_urls, lat, lng, lease_type, pets, gender_preference, created_at, furnished, parking, description, housing_type, unit_type, price_reduction_enabled, price_reduction_days, price_reduction_amount, price_reduction_count')
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

      // Pre-fill filters from URL params from home quick filter.
      const qParam = initialParams.get('q') || '';
      if (qParam && searchInputEl) {
        searchQuery = qParam;
        searchInputEl.value = qParam;
      }
      const neighborhoodParam = initialParams.get('neighborhood') || '';
      if (neighborhoodParam && sidebarNeighborhoodEl) sidebarNeighborhoodEl.value = neighborhoodParam;
      const maxRentParam = initialParams.get('maxRent') || '';
      if (maxRentParam && sidebarMaxPriceEl) sidebarMaxPriceEl.value = maxRentParam;
      const roomTypeParam = (initialParams.get('roomType') || '').toLowerCase();
      if (roomTypeParam) {
        if (['apartment', 'house', 'condo'].includes(roomTypeParam)) {
          if (housingEl) housingEl.value = roomTypeParam;
          setToggleValue(housingToggle, roomTypeParam);
        } else if (['shared', 'entire'].includes(roomTypeParam)) {
          quickRoomType = roomTypeParam;
        }
      }
      const moveInMonthParam = initialParams.get('moveInMonth') || '';
      if (/^\d{4}-\d{2}$/.test(moveInMonthParam)) {
        const [yearStr, monthStr] = moveInMonthParam.split('-');
        const year = Number(yearStr);
        const monthIndex = Number(monthStr) - 1;
        if (Number.isInteger(year) && Number.isInteger(monthIndex) && monthIndex >= 0 && monthIndex <= 11) {
          const monthStart = new Date(year, monthIndex, 1);
          const monthEnd = new Date(year, monthIndex + 1, 0);
          if (startDateEl) startDateEl.value = monthStart.toISOString().slice(0, 10);
          if (endDateEl) endDateEl.value = monthEnd.toISOString().slice(0, 10);
        }
      }

      applyFilters();
    } catch (err) {
      setStatus(`Error loading listings: ${err.message || 'Unknown error'}`, 'error');
    }
  }

  // ── Debounce helper ──
  function debounce(fn, ms) {
    let timer;
    return function (...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); };
  }
  const debouncedApply = debounce(applyFilters, 300);

  // ── Apply btn: mobile "Show Results" just closes the sidebar (filters are now live) ──
  if (sidebarApplyBtn) sidebarApplyBtn.addEventListener('click', closeSidebar);

  // ── Clear all ──
  if (clearBtn) clearBtn.addEventListener('click', clearFilters);

  // ── Distance slider: update label + live apply ──
  if (distanceEl) distanceEl.addEventListener('input', () => { updateDistanceLabel(); debouncedApply(); });

  // ── Price inputs ──
  if (sidebarMinPriceEl) sidebarMinPriceEl.addEventListener('input', debouncedApply);
  if (sidebarMaxPriceEl) sidebarMaxPriceEl.addEventListener('input', debouncedApply);

  // ── Select-based filters ──
  [sidebarNeighborhoodEl, sortEl, parkingEl, genderEl].forEach(el => {
    if (el) el.addEventListener('change', applyFilters);
  });

  // ── Date inputs ──
  if (startDateEl) startDateEl.addEventListener('input', debouncedApply);
  if (endDateEl)   endDateEl.addEventListener('input', debouncedApply);

  // ── Search input ──
  if (searchInputEl) {
    searchInputEl.addEventListener('input', e => {
      searchQuery = e.target.value;
      debouncedApply();
    });
  }

  updateDistanceLabel();

  loadSavedIds();
  (async () => {
    await Promise.all([loadFavoriteCounts(), loadApprovedListings()]);
  })();
});

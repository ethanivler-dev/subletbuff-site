document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://doehqqwqwjebhfgdvyum.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_ZZ4mKcw6_e9diz7oFfbVag_YA9zkqFW';

  const supabaseClient = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  const gridEl = document.getElementById('listings-grid');
  const statusEl = document.getElementById('listings-status');

  const minPriceEl = document.getElementById('filter-min-price');
  const maxPriceEl = document.getElementById('filter-max-price');
  const neighborhoodEl = document.getElementById('filter-neighborhood');
  const startDateEl = document.getElementById('filter-start-date');
  const endDateEl = document.getElementById('filter-end-date');
  const bedsEl = document.getElementById('filter-beds');
  const bathsEl = document.getElementById('filter-baths');
  const furnishedEl = document.getElementById('filter-furnished');
  const applyBtn = document.getElementById('apply-filters-btn');
  const clearBtn = document.getElementById('clear-filters-btn');

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

  function setStatus(message, state) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'listings-status';
    if (state) statusEl.classList.add(`listings-status-${state}`);
  }

  function normalizeFurnished(value) {
    if (value == null) return '';
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return '';
    if (['yes', 'y', 'true', '1', 'furnished'].includes(normalized)) return 'yes';
    if (['no', 'n', 'false', '0', 'unfurnished'].includes(normalized)) return 'no';
    return normalized;
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

    const rent = document.createElement('div');
    rent.className = 'listings-rent';
    rent.textContent = `${formatRent(listing.monthly_rent)} / mo`;

    const neighborhood = document.createElement('div');
    neighborhood.className = 'listings-neighborhood';
    neighborhood.textContent = listing.neighborhood || 'Neighborhood N/A';

    const details = document.createElement('div');
    details.className = 'listings-details';
    details.textContent = `${listing.beds || 'N/A'} beds • ${listing.baths || 'N/A'} baths • ${normalizeFurnished(listing.furnished) === 'yes' ? 'Furnished' : normalizeFurnished(listing.furnished) === 'no' ? 'Unfurnished' : (listing.furnished || 'Furnished: N/A')}`;

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
    const beds = uniqueSorted(listings.map((item) => item.beds));
    const baths = uniqueSorted(listings.map((item) => item.baths));

    setSelectOptions(neighborhoodEl, neighborhoods);
    setSelectOptions(bedsEl, beds);
    setSelectOptions(bathsEl, baths);
  }

  function applyFilters() {
    if (!Array.isArray(allListings)) return;

    const minPrice = minPriceEl.value ? Number(minPriceEl.value) : null;
    const maxPrice = maxPriceEl.value ? Number(maxPriceEl.value) : null;
    const neighborhood = neighborhoodEl.value;
    const beds = bedsEl.value;
    const baths = bathsEl.value;
    const furnished = furnishedEl.value;

    const filterStart = parseDateSafe(startDateEl.value);
    const filterEnd = parseDateSafe(endDateEl.value);
    const useDateFilter = !!(filterStart || filterEnd);

    const filtered = allListings.filter((listing) => {
      const rent = Number(listing.monthly_rent);
      if (minPrice != null && Number.isFinite(minPrice)) {
        if (!Number.isFinite(rent) || rent < minPrice) return false;
      }
      if (maxPrice != null && Number.isFinite(maxPrice)) {
        if (!Number.isFinite(rent) || rent > maxPrice) return false;
      }

      if (neighborhood && listing.neighborhood !== neighborhood) return false;
      if (beds && String(listing.beds || '') !== beds) return false;
      if (baths && String(listing.baths || '') !== baths) return false;
      if (furnished && normalizeFurnished(listing.furnished) !== furnished) return false;

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

    renderListings(filtered);
  }

  function clearFilters() {
    minPriceEl.value = '';
    maxPriceEl.value = '';
    neighborhoodEl.value = '';
    startDateEl.value = '';
    endDateEl.value = '';
    bedsEl.value = '';
    bathsEl.value = '';
    furnishedEl.value = '';
    renderListings(allListings);
  }

  function renderListings(listings) {
    if (!gridEl) return;

    gridEl.innerHTML = '';

    if (!Array.isArray(listings) || listings.length === 0) {
      setStatus('No listings found.', 'empty');
      return;
    }

    listings.forEach((listing) => {
      gridEl.appendChild(createCard(listing));
    });

    setStatus(`Showing ${listings.length} listing${listings.length === 1 ? '' : 's'}.`, 'loaded');
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
        .order('created_at', { ascending: false });

      if (error) {
        setStatus(`Error loading listings: ${error.message || 'Unknown error'}`, 'error');
        return;
      }

      allListings = Array.isArray(data) ? data : [];
      populateFilterOptions(allListings);
      renderListings(allListings);
    } catch (err) {
      setStatus(`Error loading listings: ${err.message || 'Unknown error'}`, 'error');
    }
  }

  if (applyBtn) applyBtn.addEventListener('click', applyFilters);
  if (clearBtn) clearBtn.addEventListener('click', clearFilters);

  loadApprovedListings();
});

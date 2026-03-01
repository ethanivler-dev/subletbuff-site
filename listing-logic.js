/*
ROUTES + FILE PURPOSES
- File: listing-logic.js
- Belongs to: /listing.html
- Query params: id=<listing_uuid>, optional preview=1
- Visibility rules: public for approved listings; preview requires authenticated admin in public.admins
- Allowed listing visibility: approved (public) and pending/approved in admin preview mode
*/
const BUILD_VERSION = '2026-02-23a';

document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://doehqqwqwjebhfgdvyum.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_ZZ4mKcw6_e9diz7oFfbVag_YA9zkqFW';

  const CAMPUS_COORDS = { lat: 40.0076, lng: -105.2659 };

  const supabaseClient = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
    : null;

  const params = new URLSearchParams(window.location.search);
  const listingId = params.get('id');
  const previewMode = params.get('preview') === '1';

  // ── View Tracking ──
  // Inserts a row into listing_views and only counts once per session per listing
  const VIEW_KEY_PREFIX = 'sb_viewed_';
  function trackView(id) {
    if (!supabaseClient || !id) return;
    const key = VIEW_KEY_PREFIX + id;
    try { if (sessionStorage.getItem(key)) return; } catch (_) {}
    supabaseClient.from('listing_views').insert({ listing_id: id }).then(({ error }) => {
      if (error) console.warn('[listing] view track error', error.message);
      else try { sessionStorage.setItem(key, '1'); } catch (_) {}
    });
  }

  const el = {
    status: document.getElementById('listing-status'),
    content: document.getElementById('listing-content'),

    rent: document.getElementById('listing-rent'),
    badges: document.getElementById('listing-badges'),
    leaseDates: document.getElementById('listing-lease-dates'),
    contactCta: document.getElementById('listing-contact-cta'),
    copyContact: document.getElementById('listing-copy-contact'),

    shareBtn: document.getElementById('listing-share-btn'),
    shareMenu: document.getElementById('listing-share-menu'),
    shareCopy: document.getElementById('share-copy-link'),
    shareTab: document.getElementById('share-open-tab'),
    shareQr: document.getElementById('share-show-qr'),

    qrModal: document.getElementById('listing-qr-modal'),
    qrImage: document.getElementById('qr-image'),
    qrClose: document.getElementById('qr-close'),

    toast: document.getElementById('listing-toast'),

    mainImgWrap: document.getElementById('listing-main-image-wrap'),
    mainImg: document.getElementById('listing-main-image'),
    noPhoto: document.getElementById('listing-no-photo'),
    thumbRow: document.getElementById('listing-thumbnails'),
    galleryPrev: document.getElementById('gallery-prev'),
    galleryNext: document.getElementById('gallery-next'),
    imgCounter: document.getElementById('listing-image-counter'),
    openLightbox: document.getElementById('listing-open-lightbox'),

    lightbox: document.getElementById('listing-lightbox'),
    lightboxImage: document.getElementById('lightbox-image'),
    lightboxPrev: document.getElementById('lightbox-prev'),
    lightboxNext: document.getElementById('lightbox-next'),
    lightboxClose: document.getElementById('lightbox-close'),
    lightboxCounter: document.getElementById('lightbox-counter'),
    lightboxCaption: document.getElementById('lightbox-caption'),

    photoCaption: document.getElementById('listing-photo-caption'),

    priceBig: document.getElementById('listing-price-big'),
    distanceSidebar: document.getElementById('listing-distance-sidebar'),
    descriptionText: document.getElementById('listing-description-text'),
    briefContent: document.getElementById('listing-brief-content'),
    flexContent: document.getElementById('listing-flex-content'),
    overviewRows: document.getElementById('listing-overview-rows'),
    contactDetails: document.getElementById('listing-contact-details'),
    contactCta2: document.getElementById('listing-contact-cta-2')
  };

  const state = {
    listing: null,
    photos: [],
    photoNotes: [],
    activePhotoIndex: 0,
    touchStartX: null,
    canViewPrivateAddress: false
  };

  function setStatus(message, isError) {
    if (!el.status) return;
    el.status.textContent = message || '';
    el.status.style.color = isError ? '#C0392B' : '';
  }

  function showContent(show) {
    if (!el.content) return;
    el.content.classList.toggle('listing-hidden', !show);
  }

  function formatMoney(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    const rounded = Math.round(num);
    return `$${rounded.toLocaleString()}`;
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

  function formatDate(value) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function isPresent(value) {
    if (value == null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim() !== '';
    return true;
  }

  function normalizeBooleanLike(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    const s = String(value).trim().toLowerCase();
    if (['true', 'yes', 'y', '1'].includes(s)) return 'Yes';
    if (['false', 'no', 'n', '0'].includes(s)) return 'No';
    return String(value);
  }

  function getFurnishedLabel(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'boolean') return value ? 'Furnished' : 'Unfurnished';
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return null;
    if (normalized.includes('yes') || normalized.includes('true') || normalized.includes('furnished')) {
      return 'Furnished';
    }
    if (normalized.includes('no') || normalized.includes('false') || normalized.includes('unfurnished')) {
      return 'Unfurnished';
    }
    return null;
  }

  function toRadians(deg) {
    return (deg * Math.PI) / 180;
  }

  function haversineMiles(from, to) {
    const R = 3958.8;
    const dLat = toRadians(to.lat - from.lat);
    const dLng = toRadians(to.lng - from.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function showToast(text) {
    if (!el.toast) return;
    el.toast.textContent = text;
    el.toast.classList.remove('listing-hidden');
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => {
      el.toast.classList.add('listing-hidden');
    }, 1800);
  }

  async function copyToClipboard(value, successLabel) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(value || '');
      showToast(successLabel || 'Copied');
    } catch (err) {
      console.error('[listing] clipboard error', err);
      showToast('Copy failed');
    }
  }

  function updateShareQr() {
    if (!el.qrImage) return;
    const currentUrl = window.location.href;
    el.qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(currentUrl)}`;
  }

  function setMainImage(index) {
    if (!Array.isArray(state.photos) || state.photos.length === 0) {
      state.activePhotoIndex = 0;
      if (el.mainImg) el.mainImg.classList.add('listing-hidden');
      if (el.noPhoto) el.noPhoto.classList.remove('listing-hidden');
      if (el.imgCounter) el.imgCounter.textContent = '0 / 0';
      if (el.openLightbox) el.openLightbox.classList.add('listing-hidden');
      if (el.thumbRow) el.thumbRow.innerHTML = '';
      if (el.photoCaption) el.photoCaption.classList.add('listing-hidden');
      return;
    }

    const safeIndex = ((index % state.photos.length) + state.photos.length) % state.photos.length;
    state.activePhotoIndex = safeIndex;
    const src = state.photos[safeIndex];
    const note = state.photoNotes[safeIndex] || '';

    if (el.noPhoto) el.noPhoto.classList.add('listing-hidden');
    if (el.mainImg) {
      el.mainImg.src = src;
      el.mainImg.classList.remove('listing-hidden');
    }
    if (el.openLightbox) el.openLightbox.classList.remove('listing-hidden');

    if (el.imgCounter) {
      el.imgCounter.textContent = `${safeIndex + 1} / ${state.photos.length}`;
    }

    // Photo caption
    if (el.photoCaption) {
      if (note) {
        el.photoCaption.textContent = note;
        el.photoCaption.classList.remove('listing-hidden');
      } else {
        el.photoCaption.textContent = '';
        el.photoCaption.classList.add('listing-hidden');
      }
    }

    if (el.lightboxImage) {
      el.lightboxImage.src = src;
    }
    if (el.lightboxCounter) {
      el.lightboxCounter.textContent = `${safeIndex + 1} / ${state.photos.length}`;
    }
    if (el.lightboxCaption) {
      el.lightboxCaption.textContent = note;
    }

    renderThumbnails();
  }

  function renderThumbnails() {
    if (!el.thumbRow) return;
    el.thumbRow.innerHTML = '';

    state.photos.forEach((src, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'listing-thumb-btn' + (index === state.activePhotoIndex ? ' active' : '');
      btn.setAttribute('aria-label', `View image ${index + 1}`);
      btn.addEventListener('click', () => setMainImage(index));

      const img = document.createElement('img');
      img.src = src;
      img.alt = `Listing thumbnail ${index + 1}`;

      btn.appendChild(img);
      el.thumbRow.appendChild(btn);
    });
  }

  function nextImage() {
    setMainImage(state.activePhotoIndex + 1);
  }

  function prevImage() {
    setMainImage(state.activePhotoIndex - 1);
  }

  function openLightbox() {
    if (!el.lightbox) return;
    el.lightbox.classList.remove('listing-hidden');
    el.lightbox.setAttribute('aria-hidden', 'false');
    setMainImage(state.activePhotoIndex);
  }

  function closeLightbox() {
    if (!el.lightbox) return;
    el.lightbox.classList.add('listing-hidden');
    el.lightbox.setAttribute('aria-hidden', 'true');
  }

  function openQrModal() {
    if (!el.qrModal) return;
    updateShareQr();
    el.qrModal.classList.remove('listing-hidden');
    el.qrModal.setAttribute('aria-hidden', 'false');
  }

  function closeQrModal() {
    if (!el.qrModal) return;
    el.qrModal.classList.add('listing-hidden');
    el.qrModal.setAttribute('aria-hidden', 'true');
  }

  async function fetchPhotos(listing) {
    const fallback = Array.isArray(listing.photo_urls) ? listing.photo_urls.filter(Boolean) : [];

    try {
      const { data, error } = await supabaseClient
        .from('listing_photos')
        .select('*')
        .eq('listing_id', listing.id)
        .order('position', { ascending: true });

      if (error || !Array.isArray(data)) {
        if (error) {
          console.warn('[listing] listing_photos fallback:', error.message);
        }
        return fallback;
      }

      const extracted = data
        .map((row) => row.url || row.photo_url || row.image_url || row.public_url)
        .filter(Boolean);

      if (extracted.length > 0) return extracted;
      return fallback;
    } catch (err) {
      console.warn('[listing] listing_photos query exception, fallback:', err);
      return fallback;
    }
  }

  /**
   * Build an array of notes aligned to the photos array.
   * Uses photos_meta JSONB from the listing record.
   */
  function extractPhotoNotes(listing, photoUrls) {
    const notes = new Array(photoUrls.length).fill('');
    try {
      const meta = listing.photos_meta;
      if (!Array.isArray(meta)) return notes;

      // Build a url→note map from photos_meta
      const noteMap = {};
      meta.forEach((entry) => {
        if (entry && entry.url && entry.note) {
          noteMap[entry.url] = entry.note;
        }
      });

      photoUrls.forEach((url, i) => {
        if (noteMap[url]) {
          notes[i] = noteMap[url];
        }
      });
    } catch (err) {
      console.warn('[listing] extractPhotoNotes error:', err);
    }
    return notes;
  }

  async function checkPreviewAuthorization() {
    if (!supabaseClient) return { ok: false, message: 'Supabase unavailable.' };

    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) {
      return { ok: false, message: sessionError.message || 'Could not verify session.' };
    }

    const user = sessionData && sessionData.session && sessionData.session.user;
    if (!user) {
      return { ok: false, message: 'Not authorized.' };
    }

    const { data: adminData, error: adminError } = await supabaseClient
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (adminError) {
      return { ok: false, message: adminError.message || 'Admin check failed.' };
    }

    if (!adminData || adminData.id !== user.id) {
      return { ok: false, message: 'Not authorized.' };
    }

    return { ok: true };
  }

  async function fetchListing() {
    if (!supabaseClient) {
      throw new Error('Supabase client not available.');
    }

    if (!listingId) {
      throw new Error('Missing listing id.');
    }

    if (previewMode) {
      const auth = await checkPreviewAuthorization();
      if (!auth.ok) {
        const err = new Error(auth.message || 'Not authorized.');
        err._kind = 'unauthorized';
        throw err;
      }

      const { data, error } = await supabaseClient
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        const err = new Error('Listing unavailable.');
        err._kind = 'unavailable';
        throw err;
      }

      return data;
    }

    const { data, error } = await supabaseClient
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('status', 'approved')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      const err = new Error('Listing unavailable.');
      err._kind = 'unavailable';
      throw err;
    }

    return data;
  }

  function getContactAction(listing) {
    const pref = String(listing.preferred_contact || '').toLowerCase();
    const email = String(listing.email || '').trim();
    const phone = String(listing.phone || '').trim();

    if ((pref.includes('email') || pref.includes('mail')) && email) {
      return { href: `mailto:${email}`, label: 'Email Lister' };
    }
    if ((pref.includes('text') || pref.includes('sms')) && phone) {
      return { href: `sms:${phone}`, label: 'Text Lister' };
    }
    if ((pref.includes('phone') || pref.includes('call')) && phone) {
      return { href: `tel:${phone}`, label: 'Call Lister' };
    }

    if (email) {
      return { href: `mailto:${email}`, label: 'Email Lister' };
    }
    if (phone) {
      return { href: `tel:${phone}`, label: 'Call Lister' };
    }

    return { href: '#', label: 'Contact unavailable' };
  }

  function renderSidebar(listing) {
    // ── Price card ──
    const rent = formatMoney(listing.monthly_rent);
    if (el.rent) {
      el.rent.textContent = rent ? `${rent} / month` : 'Rent unavailable';
    }

    const badgeValues = [
      listing.neighborhood,
      listing.beds ? `${listing.beds} beds` : null,
      listing.baths ? `${listing.baths} baths` : null,
      getFurnishedLabel(listing.furnished),
      listing.verified === true ? 'Verified' : null
    ].filter(Boolean);

    if (el.badges) {
      el.badges.innerHTML = '';
      badgeValues.forEach((value) => {
        const badge = document.createElement('span');
        badge.className = 'listing-badge';
        badge.textContent = value;
        el.badges.appendChild(badge);
      });
    }

    if (el.leaseDates) {
      const start = formatDate(listing.start_date) || 'N/A';
      const end = formatDate(listing.end_date) || 'N/A';
      el.leaseDates.textContent = `Lease: ${start} → ${end}`;
    }

    if (el.distanceSidebar) {
      const lat = Number(listing.lat);
      const lng = Number(listing.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const miles = haversineMiles(CAMPUS_COORDS, { lat, lng });
        el.distanceSidebar.textContent = miles.toFixed(2).replace(/\.00$/, '') + ' mi from campus';
      } else {
        el.distanceSidebar.textContent = '';
      }
    }

    const contactAction = getContactAction(listing);
    if (el.contactCta) {
      el.contactCta.disabled = contactAction.href === '#';
      el.contactCta.textContent = contactAction.label;
      el.contactCta.onclick = () => {
        if (contactAction.href !== '#') window.location.href = contactAction.href;
      };
    }

    if (el.copyContact) {
      el.copyContact.onclick = () => {
        const contact = [listing.email, listing.phone].filter(Boolean).join(' | ');
        copyToClipboard(contact || '', 'Contact info copied');
      };
    }

    // ── Overview card ──
    renderOverview(listing);

    // ── Contact details card ──
    renderContactCard(listing, contactAction);
  }

  const OVERVIEW_ICONS = {
    area: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    beds: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>',
    baths: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z"/><path d="M6 12V5a2 2 0 0 1 2-2h3v2.25"/></svg>',
    furnished: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0H6a2 2 0 0 0-4 0z"/><path d="M4 18v2"/><path d="M20 18v2"/></svg>',
    housing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    deposit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    pets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>'
  };

  function createOverviewRow(iconKey, label, value) {
    if (!isPresent(value)) return null;
    const row = document.createElement('div');
    row.className = 'listing-overview-row';

    const icon = document.createElement('span');
    icon.className = 'listing-overview-icon';
    icon.innerHTML = OVERVIEW_ICONS[iconKey] || '';

    const labelEl = document.createElement('span');
    labelEl.className = 'listing-overview-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'listing-overview-value';
    valueEl.textContent = Array.isArray(value) ? value.join(', ') : String(value);

    row.appendChild(icon);
    row.appendChild(labelEl);
    row.appendChild(valueEl);
    return row;
  }

  function renderOverview(listing) {
    if (!el.overviewRows) return;
    el.overviewRows.innerHTML = '';

    const areaHint = listing.cross_streets || listing.general_area || listing.location_hint || listing.landmark || null;
    const areaValue = state.canViewPrivateAddress
      ? (listing.neighborhood || listing.address)
      : (listing.neighborhood || areaHint);

    const rows = [
      createOverviewRow('area', 'Area', areaValue),
      createOverviewRow('beds', 'Beds', listing.beds),
      createOverviewRow('baths', 'Baths', listing.baths),
      createOverviewRow('furnished', 'Furnished', getFurnishedLabel(listing.furnished)),
      createOverviewRow('housing', 'Housing Type', listing.housing_type),
      createOverviewRow('calendar', 'Lease Dates', (() => {
        const s = formatDate(listing.start_date);
        const e = formatDate(listing.end_date);
        if (s && e) return `${s} → ${e}`;
        if (s) return `From ${s}`;
        if (e) return `Until ${e}`;
        return null;
      })()),
      createOverviewRow('deposit', 'Security Deposit', formatMoney(listing.security_deposit)),
      createOverviewRow('pets', 'Pets Allowed', Array.isArray(listing.pets) ? listing.pets.join(', ') : listing.pets)
    ].filter(Boolean);

    rows.forEach(row => el.overviewRows.appendChild(row));
  }

  function renderContactCard(listing, contactAction) {
    if (el.contactDetails) {
      el.contactDetails.innerHTML = '';

      if (listing.preferred_contact) {
        const prefRow = document.createElement('div');
        prefRow.className = 'listing-contact-row';
        prefRow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
        const span = document.createElement('span');
        span.textContent = 'Preferred: ' + listing.preferred_contact;
        prefRow.appendChild(span);
        el.contactDetails.appendChild(prefRow);
      }

      if (listing.email) {
        const emailRow = document.createElement('div');
        emailRow.className = 'listing-contact-row';
        emailRow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
        const link = document.createElement('a');
        link.href = 'mailto:' + listing.email;
        link.textContent = listing.email;
        emailRow.appendChild(link);
        el.contactDetails.appendChild(emailRow);
      }

      if (listing.phone) {
        const phoneRow = document.createElement('div');
        phoneRow.className = 'listing-contact-row';
        phoneRow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>';
        const link = document.createElement('a');
        link.href = 'tel:' + listing.phone;
        link.textContent = listing.phone;
        phoneRow.appendChild(link);
        el.contactDetails.appendChild(phoneRow);
      }

      if (listing.best_time) {
        const timeRow = document.createElement('div');
        timeRow.className = 'listing-contact-row';
        timeRow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
        const span = document.createElement('span');
        span.textContent = 'Best time: ' + listing.best_time;
        timeRow.appendChild(span);
        el.contactDetails.appendChild(timeRow);
      }
    }

    if (el.contactCta2) {
      el.contactCta2.disabled = contactAction.href === '#';
      el.contactCta2.textContent = contactAction.label;
      el.contactCta2.onclick = () => {
        if (contactAction.href !== '#') window.location.href = contactAction.href;
      };
    }
  }

  function renderLeftContent(listing) {
    // ── Price row (with auto-reduction) ──
    if (el.priceBig) {
      const pricing = getEffectivePrice(listing);
      el.priceBig.textContent = formatMoney(pricing.effective) || '$0';

      // Show original price struck-through + reduction badge if reduced
      const priceRow = el.priceBig.closest('.listing-price-main') || el.priceBig.parentElement;
      const existingOrig = priceRow.querySelector('.listing-price-original');
      if (existingOrig) existingOrig.remove();
      const existingBadge = priceRow.querySelector('.listing-price-reduced-badge');
      if (existingBadge) existingBadge.remove();

      if (pricing.reduced) {
        const origSpan = document.createElement('span');
        origSpan.className = 'listing-price-original';
        origSpan.textContent = formatMoney(pricing.original);
        priceRow.insertBefore(origSpan, el.priceBig);

        const badge = document.createElement('span');
        badge.className = 'listing-price-reduced-badge';
        badge.textContent = 'Price Reduced';
        priceRow.appendChild(badge);
      }
    }

    // ── Description card ──
    if (el.descriptionText) {
      el.descriptionText.textContent = listing.description || 'No description provided.';
    }

    // ── Brief info card ──
    if (el.briefContent) {
      el.briefContent.innerHTML = '';
      const briefItems = [
        { label: 'Lease Type', value: listing.lease_type },
        { label: 'Unit Type', value: listing.unit_type },
        { label: 'Gender Pref.', value: listing.gender_preference }
      ].filter(item => isPresent(item.value));

      if (briefItems.length > 0) {
        briefItems.forEach(item => {
          const row = document.createElement('div');
          row.className = 'listing-info-row';
          row.innerHTML = '<span class="listing-info-label">' + item.label + '</span><span class="listing-info-value">' + item.value + '</span>';
          el.briefContent.appendChild(row);
        });
      } else {
        el.briefContent.textContent = 'No additional info.';
      }
    }

    // ── Move-in card ──
    if (el.flexContent) {
      el.flexContent.innerHTML = '';
      const flexItems = [
        { label: 'Flexible', value: normalizeBooleanLike(listing.flexible_movein) },
        { label: 'Start', value: formatDate(listing.start_date) },
        { label: 'End', value: formatDate(listing.end_date) }
      ].filter(item => isPresent(item.value));

      if (flexItems.length > 0) {
        flexItems.forEach(item => {
          const row = document.createElement('div');
          row.className = 'listing-info-row';
          row.innerHTML = '<span class="listing-info-label">' + item.label + '</span><span class="listing-info-value">' + item.value + '</span>';
          el.flexContent.appendChild(row);
        });
      } else {
        el.flexContent.textContent = 'No move-in details available.';
      }

      // Flex move-in notes
      if (isPresent(listing.flexible_movein_notes)) {
        const note = document.createElement('p');
        note.style.cssText = 'margin: 10px 0 0; font-size: 0.88rem; color: var(--ink-soft); white-space: pre-line;';
        note.textContent = listing.flexible_movein_notes;
        el.flexContent.appendChild(note);
      }
    }
  }

  function setupGalleryInteractions() {
    if (el.galleryPrev) el.galleryPrev.addEventListener('click', prevImage);
    if (el.galleryNext) el.galleryNext.addEventListener('click', nextImage);
    if (el.openLightbox) el.openLightbox.addEventListener('click', openLightbox);

    if (el.mainImgWrap) {
      el.mainImgWrap.addEventListener('touchstart', (event) => {
        const touch = event.changedTouches && event.changedTouches[0];
        state.touchStartX = touch ? touch.clientX : null;
      }, { passive: true });

      el.mainImgWrap.addEventListener('touchend', (event) => {
        const touch = event.changedTouches && event.changedTouches[0];
        if (!touch || state.touchStartX == null) return;
        const delta = touch.clientX - state.touchStartX;
        if (Math.abs(delta) > 40) {
          if (delta < 0) nextImage(); else prevImage();
        }
        state.touchStartX = null;
      }, { passive: true });
    }

    if (el.lightboxClose) el.lightboxClose.addEventListener('click', closeLightbox);
    if (el.lightboxPrev) el.lightboxPrev.addEventListener('click', prevImage);
    if (el.lightboxNext) el.lightboxNext.addEventListener('click', nextImage);

    if (el.lightbox) {
      el.lightbox.addEventListener('click', (event) => {
        if (event.target === el.lightbox) closeLightbox();
      });
    }

    document.addEventListener('keydown', (event) => {
      const lightboxOpen = el.lightbox && !el.lightbox.classList.contains('listing-hidden');

      if (event.key === 'Escape') {
        if (lightboxOpen) closeLightbox();
        if (el.shareMenu && !el.shareMenu.classList.contains('listing-hidden')) {
          el.shareMenu.classList.add('listing-hidden');
          el.shareMenu.setAttribute('aria-hidden', 'true');
        }
        if (el.qrModal && !el.qrModal.classList.contains('listing-hidden')) {
          closeQrModal();
        }
      }

      if (event.key === 'ArrowRight') {
        if (lightboxOpen || document.activeElement === el.mainImg || document.activeElement === document.body) {
          nextImage();
        }
      }
      if (event.key === 'ArrowLeft') {
        if (lightboxOpen || document.activeElement === el.mainImg || document.activeElement === document.body) {
          prevImage();
        }
      }
    });
  }

  function setupShareInteractions() {
    if (el.shareBtn && el.shareMenu) {
      el.shareBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const opening = el.shareMenu.classList.contains('listing-hidden');
        el.shareMenu.classList.toggle('listing-hidden', !opening);
        el.shareMenu.setAttribute('aria-hidden', opening ? 'false' : 'true');
      });

      document.addEventListener('click', (event) => {
        if (!event.target.closest('.listing-share-wrap')) {
          el.shareMenu.classList.add('listing-hidden');
          el.shareMenu.setAttribute('aria-hidden', 'true');
        }
      });
    }

    if (el.shareCopy) {
      el.shareCopy.addEventListener('click', async () => {
        await copyToClipboard(window.location.href, 'Copied!');
      });
    }

    if (el.shareTab) {
      el.shareTab.addEventListener('click', () => {
        window.open(window.location.href, '_blank', 'noopener,noreferrer');
      });
    }

    if (el.shareQr) {
      el.shareQr.addEventListener('click', () => {
        openQrModal();
      });
    }

    if (el.qrClose) {
      el.qrClose.addEventListener('click', closeQrModal);
    }

    if (el.qrModal) {
      el.qrModal.addEventListener('click', (event) => {
        if (event.target === el.qrModal) closeQrModal();
      });
    }
  }

  async function initHeartBtn(listingId) {
    const btn = document.getElementById('listing-heart-btn');
    if (!btn || !window.sbAuth) return;
    const { data: { session } } = await window.sbAuth.getSession();
    if (session) {
      const sb = window.sbAuth.supabaseClient;
      const { data } = await sb.from('user_favorites').select('listing_id')
        .eq('user_id', session.user.id).eq('listing_id', listingId).maybeSingle();
      if (data) btn.classList.add('saved');
    }
    btn.addEventListener('click', async () => {
      const { data: { session: s } } = await window.sbAuth.getSession();
      if (!s) { window.sbAuth.signInWithGoogle(); return; }
      const sb = window.sbAuth.supabaseClient;
      if (btn.classList.contains('saved')) {
        await sb.from('user_favorites').delete()
          .eq('user_id', s.user.id).eq('listing_id', listingId);
        btn.classList.remove('saved');
      } else {
        await sb.from('user_favorites').insert([{ user_id: s.user.id, listing_id: listingId }]);
        btn.classList.add('saved');
      }
    });
  }

  function renderPreviewBanner() {
    if (!previewMode || !el.status) return;
    const previewInfo = document.createElement('div');
    previewInfo.style.cssText = 'display:inline-block; margin-left:8px; font-size:0.82rem; color:#B8922A;';
    previewInfo.textContent = 'Admin Preview';
    el.status.appendChild(previewInfo);
  }

  async function init() {
    if (!listingId) {
      setStatus('Listing unavailable.', true);
      showContent(false);
      return;
    }

    if (!supabaseClient) {
      setStatus('Error loading listing: Supabase not available.', true);
      showContent(false);
      return;
    }

    setStatus('Loading listing...');

    try {
      const listing = await fetchListing();
      state.listing = listing;
      state.canViewPrivateAddress = !!previewMode;
      state.photos = await fetchPhotos(listing);

      // Extract photo notes from photos_meta (ordered to match state.photos)
      state.photoNotes = extractPhotoNotes(listing, state.photos);

      renderSidebar(listing);
      renderLeftContent(listing);
      setMainImage(0);

      if (previewMode) {
        setStatus('Preview mode');
      } else {
        setStatus('');
        // Track view (fire-and-forget, non-blocking)
        trackView(listing.id);
      }
      renderPreviewBanner();
      showContent(true);
      initHeartBtn(listing.id);
    } catch (err) {
      console.error('[listing] init error', err);
      if (err && err._kind === 'unauthorized') {
        setStatus('Not authorized.', true);
      } else if (err && err._kind === 'unavailable') {
        setStatus('Listing unavailable.', true);
      } else {
        setStatus(`Error loading listing: ${err.message || 'Unknown error'}`, true);
      }
      showContent(false);
    }
  }

  setupGalleryInteractions();
  setupShareInteractions();
  init();
});

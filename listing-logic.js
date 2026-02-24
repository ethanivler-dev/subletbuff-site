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

  const supabaseClient = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
    : null;

  const params = new URLSearchParams(window.location.search);
  const listingId = params.get('id');
  const previewMode = params.get('preview') === '1';

  const el = {
    status: document.getElementById('listing-status'),
    content: document.getElementById('listing-content'),
    sections: document.getElementById('listing-sections'),

    rent: document.getElementById('listing-rent'),
    badges: document.getElementById('listing-badges'),
    leaseDates: document.getElementById('listing-lease-dates'),
    contactCta: document.getElementById('listing-contact-cta'),
    copyContact: document.getElementById('listing-copy-contact'),
    copyEmail: document.getElementById('listing-copy-email'),

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
    lightboxCounter: document.getElementById('lightbox-counter')
  };

  const state = {
    listing: null,
    photos: [],
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

  function prettifyKey(key) {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function createKvRow(label, value) {
    if (!isPresent(value)) return null;
    const row = document.createElement('div');
    row.className = 'listing-kv';

    const left = document.createElement('div');
    left.className = 'listing-kv-label';
    left.textContent = label;

    const right = document.createElement('div');
    right.textContent = Array.isArray(value) ? value.join(', ') : String(value);

    row.appendChild(left);
    row.appendChild(right);
    return row;
  }

  function createSection(title, rows) {
    const visibleRows = rows.filter(Boolean);
    if (visibleRows.length === 0) return null;

    const section = document.createElement('section');
    section.className = 'listing-section';

    const h3 = document.createElement('h3');
    h3.textContent = title;
    section.appendChild(h3);

    visibleRows.forEach((row) => section.appendChild(row));
    return section;
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
      return;
    }

    const safeIndex = ((index % state.photos.length) + state.photos.length) % state.photos.length;
    state.activePhotoIndex = safeIndex;
    const src = state.photos[safeIndex];

    if (el.noPhoto) el.noPhoto.classList.add('listing-hidden');
    if (el.mainImg) {
      el.mainImg.src = src;
      el.mainImg.classList.remove('listing-hidden');
    }
    if (el.openLightbox) el.openLightbox.classList.remove('listing-hidden');

    if (el.imgCounter) {
      el.imgCounter.textContent = `${safeIndex + 1} / ${state.photos.length}`;
    }

    if (el.lightboxImage) {
      el.lightboxImage.src = src;
    }
    if (el.lightboxCounter) {
      el.lightboxCounter.textContent = `${safeIndex + 1} / ${state.photos.length}`;
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
      el.leaseDates.textContent = `Lease Dates: ${start} → ${end}`;
    }

    const contactAction = getContactAction(listing);
    if (el.contactCta) {
      if (contactAction.href === '#') {
        el.contactCta.disabled = true;
        el.contactCta.textContent = contactAction.label;
      } else {
        el.contactCta.disabled = false;
        el.contactCta.textContent = contactAction.label;
      }

      el.contactCta.onclick = () => {
        if (contactAction.href !== '#') {
          window.location.href = contactAction.href;
        }
      };
    }

    if (el.copyContact) {
      el.copyContact.onclick = () => {
        const contact = [listing.email, listing.phone].filter(Boolean).join(' | ');
        copyToClipboard(contact || '', 'Contact copied');
      };
    }

    if (el.copyEmail) {
      el.copyEmail.onclick = () => {
        copyToClipboard(listing.email || '', 'Email copied');
      };
    }
  }

  function renderSections(listing) {
    if (!el.sections) return;
    el.sections.innerHTML = '';

    const known = new Set([
      'id', 'created_at', 'updated_at', 'status', 'photo_urls', 'photos_meta', 'photo_notes',
      'first_name', 'last_name', 'monthly_rent', 'address', 'unit_number', 'neighborhood', 'beds', 'baths',
      'furnished', 'start_date', 'end_date', 'flexible_movein', 'housing_type', 'unit_type', 'lease_type',
      'security_deposit', 'pets', 'gender_preference', 'description', 'preferred_contact', 'email', 'phone',
      'best_time', 'verified'
    ]);

    const areaHint = listing.cross_streets || listing.general_area || listing.location_hint || listing.landmark || null;
    const details = createSection('Details', [
      state.canViewPrivateAddress ? createKvRow('Address', listing.address) : null,
      state.canViewPrivateAddress ? createKvRow('Unit Number', listing.unit_number) : null,
      createKvRow(state.canViewPrivateAddress ? 'Neighborhood' : 'Area', listing.neighborhood),
      !state.canViewPrivateAddress ? createKvRow('Near', areaHint) : null,
      createKvRow('Beds', listing.beds),
      createKvRow('Baths', listing.baths),
      createKvRow('Furnished', getFurnishedLabel(listing.furnished)),
      createKvRow('Housing Type', listing.housing_type),
      createKvRow('Unit Type', listing.unit_type)
    ]);

    const lease = createSection('Lease', [
      createKvRow('Monthly Rent', formatMoney(listing.monthly_rent)),
      createKvRow('Security Deposit', formatMoney(listing.security_deposit)),
      createKvRow('Lease Type', listing.lease_type),
      createKvRow('Start Date', formatDate(listing.start_date)),
      createKvRow('End Date', formatDate(listing.end_date)),
      createKvRow('Flexible Move-in', normalizeBooleanLike(listing.flexible_movein))
    ]);

    const prefs = createSection('Preferences', [
      createKvRow('Pets', Array.isArray(listing.pets) ? listing.pets.join(', ') : listing.pets),
      createKvRow('Gender Preference', listing.gender_preference),
      createKvRow('Verified', listing.verified === true ? 'Verified' : null)
    ]);

    const description = createSection('Description', [
      createKvRow('Listing Description', listing.description)
    ]);

    const contact = createSection('Contact', [
      createKvRow('Preferred Contact', listing.preferred_contact),
      createKvRow('Email', listing.email),
      createKvRow('Phone', listing.phone),
      createKvRow('Best Time', listing.best_time)
    ]);

    [details, lease, prefs, description, contact].forEach((section) => {
      if (section) el.sections.appendChild(section);
    });

    const extraRows = Object.keys(listing)
      .filter((key) => !known.has(key) && isPresent(listing[key]))
      .map((key) => createKvRow(prettifyKey(key), listing[key]));

    const extras = createSection('More Info', extraRows);
    if (extras) {
      el.sections.appendChild(extras);
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

      renderSidebar(listing);
      renderSections(listing);
      setMainImage(0);

      if (previewMode) {
        setStatus('Preview mode');
      } else {
        setStatus('');
      }
      renderPreviewBanner();
      showContent(true);
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

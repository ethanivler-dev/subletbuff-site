/*
ROUTES + FILE PURPOSES
- File: admin-logic.js
- Belongs to: /admin.html
- Query params: none required for portal operations
- Visibility rules: admin-only portal (authenticated user + id exists in public.admins)
- Allowed listing visibility: pending + approved + preview workflows for admins only
*/
const BUILD_VERSION = '2026-02-28b';

console.log('[admin] admin-logic.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://doehqqwqwjebhfgdvyum.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_ZZ4mKcw6_e9diz7oFfbVag_YA9zkqFW';

  const AUTH_TIMEOUT_MS = 8000;
  const LIST_TIMEOUT_MS = 10000;
  const PAGE_SIZE = 25;

  // Reuse auth.js's single client to avoid Web Lock conflicts.
  // Fall back to creating our own only if auth.js is not present.
  const supabaseClient = (window.sbAuth && window.sbAuth.supabaseClient)
    ? window.sbAuth.supabaseClient
    : (window.supabase && window.supabase.createClient)
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true }
        })
      : null;

  const elements = {
    status: document.getElementById('admin-status'),
    flash: document.getElementById('admin-flash'),

    authRoot: document.getElementById('admin-auth-root'),
    authMsg: document.getElementById('admin-auth-msg'),
    googleBtn: document.getElementById('admin-google-btn'),

    appRoot: document.getElementById('admin-app-root'),
    subtitle: document.getElementById('admin-subtitle'),
    modePending: document.getElementById('mode-pending'),
    modeApproved: document.getElementById('mode-approved'),
    refreshBtn: document.getElementById('admin-refresh'),
    searchInput: document.getElementById('admin-search'),
    userLabel: document.getElementById('admin-user-label'),
    list: document.getElementById('admin-list'),

    pagination: document.getElementById('admin-pagination'),
    prevBtn: document.getElementById('admin-page-prev'),
    nextBtn: document.getElementById('admin-page-next'),
    pageInfo: document.getElementById('admin-page-info'),

    editOverlay: document.getElementById('admin-edit-overlay'),
    editForm: document.getElementById('admin-edit-form'),
    editMsg: document.getElementById('admin-modal-msg'),
    editCancel: document.getElementById('admin-edit-cancel'),
    editSave: document.getElementById('admin-edit-save'),
    editClose: document.getElementById('admin-edit-close'),
    editPreviewImg: document.getElementById('edit-preview-img'),
    editPreviewSubtitle: document.getElementById('edit-preview-subtitle'),
    editPhotosGrid: document.getElementById('edit-photos-grid'),
    editPhotoCount: document.getElementById('edit-photo-count'),
    editPhotoAddInput: document.getElementById('edit-photo-add-input'),
    editPhotoAddBtn: document.getElementById('edit-photo-add-btn'),
    editModalBody: document.getElementById('edit-modal-body')
  };

  const editFields = {
    monthly_rent: document.getElementById('edit-monthly-rent'),
    security_deposit: document.getElementById('edit-security-deposit'),
    address: document.getElementById('edit-address'),
    unit_number: document.getElementById('edit-unit-number'),
    neighborhood: document.getElementById('edit-neighborhood'),
    beds: document.getElementById('edit-beds'),
    baths: document.getElementById('edit-baths'),
    furnished: document.getElementById('edit-furnished'),
    start_date: document.getElementById('edit-start-date'),
    end_date: document.getElementById('edit-end-date'),
    description: document.getElementById('edit-description'),
    lease_type: document.getElementById('edit-lease-type'),
    housing_type: document.getElementById('edit-housing-type'),
    unit_type: document.getElementById('edit-unit-type'),
    verified: document.getElementById('edit-verified')
  };

  const state = {
    mode: 'pending',
    page: 1,
    total: 0,
    query: '',
    rows: [],
    editPhotos: [],
    session: null,
    isAdmin: false,
    requestId: 0,
    currentEditId: null,
    searchDebounceTimer: null,
    authListenerBound: false,
    isBusyAuth: false,
    isLoggingOut: false
  };

  function setStatus(message, color) {
    if (!elements.status) return;
    elements.status.textContent = message || '';
    elements.status.style.color = color || '#4A4035';
  }

  function setFlash(message, color) {
    if (!elements.flash) return;
    elements.flash.textContent = message || '';
    elements.flash.style.color = color || '#4A4035';
  }

  function setAuthMessage(message, color) {
    if (!elements.authMsg) return;
    elements.authMsg.textContent = message || '';
    elements.authMsg.style.color = color || '#4A4035';
  }

  function setEditMessage(message, color) {
    if (!elements.editMsg) return;
    elements.editMsg.textContent = message || '';
    elements.editMsg.style.color = color || '#4A4035';
  }

  function showLoginView(message, color) {
    if (elements.authRoot) elements.authRoot.classList.remove('admin-hidden');
    if (elements.appRoot) elements.appRoot.classList.add('admin-hidden');
    if (message != null) setAuthMessage(message, color);
    updateButtonsLoading(false);
  }

  function showAppView() {
    if (elements.authRoot) elements.authRoot.classList.add('admin-hidden');
    if (elements.appRoot) elements.appRoot.classList.remove('admin-hidden');
    setAuthMessage('');
  }

  function updateButtonsLoading(disabled) {
    const list = [elements.googleBtn, elements.refreshBtn, elements.prevBtn, elements.nextBtn];
    list.forEach((btn) => {
      if (!btn) return;
      btn.disabled = !!disabled;
    });
  }

  function withTimeout(promise, timeoutMs, context) {
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`${context} timed out after ${Math.round(timeoutMs / 1000)}s`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  function parseNumericOrNull(value) {
    if (value == null || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function toDateInputValue(value) {
    if (!value) return '';
    if (typeof value === 'string' && value.length >= 10) return value.slice(0, 10);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
  }

  function escapeForOrIlike(value) {
    return String(value || '')
      .replace(/,/g, '\\,')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  function updateModeButtons() {
    if (!elements.modePending || !elements.modeApproved) return;
    elements.modePending.classList.toggle('active', state.mode === 'pending');
    elements.modeApproved.classList.toggle('active', state.mode === 'approved');
  }

  function updateSubtitle() {
    if (!elements.subtitle) return;
    const label = state.mode === 'approved' ? 'Approved' : 'Pending';
    elements.subtitle.innerHTML = `Reviewing all <strong>${label}</strong> submissions.`;
  }

  function renderPagination() {
    if (!elements.pageInfo || !elements.prevBtn || !elements.nextBtn) return;

    const totalPages = Math.max(1, Math.ceil((state.total || 0) / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;

    elements.pageInfo.textContent = `Page ${state.page} of ${totalPages} • ${state.total} total`;
    elements.prevBtn.disabled = state.page <= 1;
    elements.nextBtn.disabled = state.page >= totalPages;
  }

  function renderListLoading() {
    if (!elements.list) return;
    elements.list.innerHTML = '';
    const loading = document.createElement('div');
    loading.style.cssText = 'padding: 26px; text-align:center; color:#8A7D6B; border:1px dashed #E0D5C0; border-radius:12px; background:#fff;';
    loading.textContent = 'Loading listings...';
    elements.list.appendChild(loading);
  }

  function renderListEmpty() {
    if (!elements.list) return;
    elements.list.innerHTML = '';
    const empty = document.createElement('div');
    empty.style.cssText = 'padding: 60px; border: 2px dashed #E0D5C0; text-align: center; border-radius: 16px; color: #8A7D6B;';
    empty.textContent = state.mode === 'approved' ? 'No approved listings found.' : '🎉 All caught up! No pending listings.';
    elements.list.appendChild(empty);
  }

  function renderListError(message) {
    if (!elements.list) return;
    elements.list.innerHTML = '';
    const err = document.createElement('div');
    err.style.cssText = 'padding: 20px; border:1px solid #C0392B; border-radius:12px; background:#fff; color:#C0392B;';
    err.textContent = message;
    elements.list.appendChild(err);
  }

  function createContactButton(item) {
    const contactBtn = document.createElement('a');
    const subject = encodeURIComponent('Action Required: Your SubSwap Listing');
    const body = encodeURIComponent(
      'Hi ' + (item.first_name || '') + ',\n\nThanks for posting your listing at ' + (item.address || '') + '! Before we can approve it, we need you to fix the following:\n\n- [Add fix here]\n\nOnce updated, let us know!\n\nBest,\nSubSwap Team'
    );
    contactBtn.href = 'mailto:' + encodeURIComponent(item.email || '') + '?subject=' + subject + '&body=' + body;
    contactBtn.textContent = 'Contact Lister ✉️';
    contactBtn.style.cssText = 'background: #FAF7F2; color: #B8922A; border: 1px solid #B8922A; padding: 12px; border-radius: 8px; cursor: pointer; text-align: center; font-size: 0.85rem; font-weight: 600; display: inline-block; text-decoration: none;';
    return contactBtn;
  }

  function createActionButton({ id, text, style, onClick }) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = id;
    btn.textContent = text;
    btn.style.cssText = style;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function createCard(item) {
    const photo = (Array.isArray(item.photo_urls) && item.photo_urls.length > 0)
      ? item.photo_urls[0]
      : 'https://via.placeholder.com/150x100?text=No+Photo';

    const card = document.createElement('div');
    card.id = `card-${item.id}`;
    card.style.cssText = 'display: grid; grid-template-columns: 180px 1fr auto; gap: 24px; background: white; padding: 24px; border-radius: 16px; border: 1px solid #E0D5C0; align-items: center; box-shadow: 0 2px 12px rgba(28,24,16,0.05);';

    const left = document.createElement('div');
    const img = document.createElement('img');
    img.src = photo;
    img.style.cssText = 'width: 180px; height: 120px; object-fit: cover; border-radius: 8px; display:block;';
    left.appendChild(img);

    const mid = document.createElement('div');
    const title = document.createElement('div');
    title.style.cssText = 'font-weight: 700; font-size: 1.2rem; color: #1C1810;';
    title.textContent = '$' + (item.monthly_rent || '') + ' — ' + (item.address || '');
    mid.appendChild(title);

    const info = document.createElement('div');
    info.style.cssText = 'font-size: 0.85rem; color: #4A4035; margin-top: 6px; line-height: 1.5;';
    info.innerHTML = `<strong>Lister:</strong> ${(item.first_name || '')} ${(item.last_name || '')}<br><strong>Email:</strong> ${item.email || ''}`;
    mid.appendChild(info);

    const previewWrap = document.createElement('div');
    previewWrap.style.marginTop = '12px';
    const previewLink = document.createElement('a');
    previewLink.href = '/listing.html?id=' + encodeURIComponent(item.id) + (state.mode === 'pending' ? '&preview=1' : '');
    previewLink.target = '_blank';
    previewLink.rel = 'noopener noreferrer';
    previewLink.style.cssText = 'font-size: 0.8rem; color: #B8922A; font-weight: 600; text-decoration: none; border: 1px solid #B8922A; padding: 5px 12px; border-radius: 6px;';
    previewLink.textContent = 'View Full Preview ↗';
    previewWrap.appendChild(previewLink);
    mid.appendChild(previewWrap);

    const right = document.createElement('div');
    right.style.cssText = 'display: flex; flex-direction: column; gap: 10px; min-width: 180px;';

    if (state.mode === 'pending') {
      right.appendChild(createActionButton({
        id: `app-${item.id}`,
        text: 'Approve ✅',
        style: 'background: #3D8A58; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onClick: () => handleApprove(item.id)
      }));

      right.appendChild(createActionButton({
        id: `edit-${item.id}`,
        text: 'Edit ✏️',
        style: 'background: #E0D5C0; color: #1C1810; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onClick: () => openEditModal(item.id)
      }));

      right.appendChild(createContactButton(item));

      right.appendChild(createActionButton({
        id: `rej-${item.id}`,
        text: 'Reject & Delete ✕',
        style: 'background: white; color: #C0392B; border: 1.5px solid #C0392B; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onClick: () => handleRejectDelete(item.id)
      }));
    } else {
      right.appendChild(createActionButton({
        id: `edit-${item.id}`,
        text: 'Edit ✏️',
        style: 'background: #E0D5C0; color: #1C1810; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onClick: () => openEditModal(item.id)
      }));

      right.appendChild(createContactButton(item));

      right.appendChild(createActionButton({
        id: `down-${item.id}`,
        text: 'Take Down ⬇️ (to Pending)',
        style: 'background: #FAF7F2; color: #B8922A; border: 1px solid #B8922A; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onClick: () => handleTakeDown(item.id)
      }));

      right.appendChild(createActionButton({
        id: `del-${item.id}`,
        text: 'Delete 🗑️',
        style: 'background: white; color: #C0392B; border: 1.5px solid #C0392B; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onClick: () => handleDeleteApproved(item.id)
      }));
    }

    card.appendChild(left);
    card.appendChild(mid);
    card.appendChild(right);
    return card;
  }

  function renderRows(rows) {
    if (!elements.list) return;
    elements.list.innerHTML = '';

    if (!rows || rows.length === 0) {
      renderListEmpty();
      return;
    }

    rows.forEach((item) => {
      elements.list.appendChild(createCard(item));
    });
  }

  function renderEditPhotos() {
    if (!elements.editPhotosGrid) return;
    elements.editPhotosGrid.innerHTML = '';
    const photos = state.editPhotos;

    photos.forEach((url, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'edit-photo-thumb';
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Photo ' + (idx + 1);
      img.onerror = () => { img.src = 'https://via.placeholder.com/110x110?text=Error'; };
      thumb.appendChild(img);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'edit-photo-remove';
      removeBtn.textContent = '✕';
      removeBtn.title = 'Remove photo';
      removeBtn.addEventListener('click', () => {
        state.editPhotos.splice(idx, 1);
        renderEditPhotos();
      });
      thumb.appendChild(removeBtn);
      elements.editPhotosGrid.appendChild(thumb);
    });

    if (elements.editPhotoCount) {
      elements.editPhotoCount.textContent = photos.length ? '(' + photos.length + ')' : '';
    }
  }

  function addEditPhoto() {
    if (!elements.editPhotoAddInput) return;
    const url = elements.editPhotoAddInput.value.trim();
    if (!url) return;
    state.editPhotos.push(url);
    elements.editPhotoAddInput.value = '';
    renderEditPhotos();
  }

  function openEditOverlay() {
    if (!elements.editOverlay) return;
    elements.editOverlay.classList.add('open');
    elements.editOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeEditOverlay() {
    state.currentEditId = null;
    if (!elements.editOverlay) return;
    elements.editOverlay.classList.remove('open');
    elements.editOverlay.setAttribute('aria-hidden', 'true');
    setEditMessage('');
  }

  async function loadCurrentModeList() {
    if (!supabaseClient) return;

    const requestId = ++state.requestId;
    const from = (state.page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    updateSubtitle();
    updateModeButtons();
    renderPagination();
    renderListLoading();
    setStatus(`Loading ${state.mode} listings...`);
    updateButtonsLoading(true);

    try {
      let query = supabaseClient
        .from('listings')
        .select('id,status,monthly_rent,address,neighborhood,email,first_name,last_name,photo_urls,created_at', { count: 'exact' })
        .eq('status', state.mode)
        .order('created_at', { ascending: false })
        .range(from, to);

      const trimmed = state.query.trim();
      if (trimmed) {
        const q = escapeForOrIlike(trimmed);
        query = query.or(`address.ilike.%${q}%,neighborhood.ilike.%${q}%,email.ilike.%${q}%`);
      }

      const { data, error, count } = await withTimeout(query, LIST_TIMEOUT_MS, 'Listing fetch');

      if (requestId !== state.requestId) {
        return;
      }

      if (error) {
        console.error('[admin] load listings error', error);
        renderListError('Error loading listings: ' + error.message);
        setStatus('Error loading listings.', '#C0392B');
        return;
      }

      state.rows = Array.isArray(data) ? data : [];
      state.total = Number.isFinite(count) ? count : 0;

      renderRows(state.rows);
      renderPagination();
      setStatus('');
    } catch (err) {
      if (requestId !== state.requestId) return;
      console.error('[admin] list fetch exception', err);
      renderListError('Error loading listings: ' + (err && err.message ? err.message : String(err)));
      setStatus('Error loading listings: ' + (err && err.message ? err.message : String(err)), '#C0392B');
    } finally {
      if (requestId === state.requestId) {
        updateButtonsLoading(false);
      }
    }
  }

  async function handleApprove(id) {
    const btn = document.getElementById(`app-${id}`);
    if (!btn) return;

    if (btn.dataset.confirmed !== '1') {
      btn.dataset.confirmed = '1';
      btn.textContent = 'Confirm Approval?';
      btn.style.backgroundColor = '#1e4d2b';
      return;
    }

    btn.textContent = 'Processing...';
    const { error } = await supabaseClient.from('listings').update({ status: 'approved' }).eq('id', id);
    if (error) {
      setFlash('Error approving listing: ' + error.message, '#C0392B');
      return;
    }

    setFlash('Listing approved.', '#3D8A58');
    await loadCurrentModeList();
  }

  async function handleRejectDelete(id) {
    const btn = document.getElementById(`rej-${id}`);
    if (!btn) return;

    if (btn.dataset.confirmed !== '1') {
      btn.dataset.confirmed = '1';
      btn.textContent = 'Confirm Delete?';
      btn.style.backgroundColor = '#C0392B';
      btn.style.color = 'white';
      return;
    }

    btn.textContent = 'Deleting...';
    const { error } = await supabaseClient.from('listings').delete().eq('id', id);
    if (error) {
      setFlash('Error deleting listing: ' + error.message, '#C0392B');
      return;
    }

    setFlash('Listing deleted.', '#3D8A58');
    await loadCurrentModeList();
  }

  async function handleTakeDown(id) {
    const btn = document.getElementById(`down-${id}`);
    if (!btn) return;

    if (btn.dataset.confirmed !== '1') {
      btn.dataset.confirmed = '1';
      btn.textContent = 'Confirm Move to Pending?';
      btn.style.backgroundColor = '#B8922A';
      btn.style.color = 'white';
      return;
    }

    btn.textContent = 'Updating...';
    const { error } = await supabaseClient.from('listings').update({ status: 'pending' }).eq('id', id);
    if (error) {
      setFlash('Error taking down listing: ' + error.message, '#C0392B');
      return;
    }

    setFlash('Listing moved back to Pending.', '#3D8A58');
    await loadCurrentModeList();
  }

  async function handleDeleteApproved(id) {
    const btn = document.getElementById(`del-${id}`);
    if (!btn) return;

    if (btn.dataset.confirmed !== '1') {
      btn.dataset.confirmed = '1';
      btn.textContent = 'Confirm Delete?';
      btn.style.backgroundColor = '#C0392B';
      btn.style.color = 'white';
      return;
    }

    btn.textContent = 'Deleting...';
    const { error } = await supabaseClient.from('listings').delete().eq('id', id);
    if (error) {
      setFlash('Error deleting listing: ' + error.message, '#C0392B');
      return;
    }

    setFlash('Listing deleted.', '#3D8A58');
    await loadCurrentModeList();
  }

  async function openEditModal(id) {
    if (!supabaseClient) return;

    state.currentEditId = id;
    openEditOverlay();
    setEditMessage('Loading listing...');

    try {
      const { data, error } = await withTimeout(
        supabaseClient
          .from('listings')
          .select('id,monthly_rent,address,unit_number,neighborhood,beds,baths,furnished,start_date,end_date,description,lease_type,housing_type,unit_type,security_deposit,verified,photo_urls')
          .eq('id', id)
          .single(),
        LIST_TIMEOUT_MS,
        'Load listing for edit'
      );

      if (error) {
        throw error;
      }

      editFields.monthly_rent.value = data.monthly_rent ?? '';
      editFields.security_deposit.value = data.security_deposit ?? '';
      editFields.address.value = data.address || '';
      editFields.unit_number.value = data.unit_number || '';
      editFields.neighborhood.value = data.neighborhood || '';
      editFields.beds.value = data.beds || '';
      editFields.baths.value = data.baths || '';
      editFields.furnished.value = (data.furnished || '').toLowerCase();
      editFields.start_date.value = toDateInputValue(data.start_date);
      editFields.end_date.value = toDateInputValue(data.end_date);
      editFields.description.value = data.description || '';
      editFields.lease_type.value = data.lease_type || '';
      editFields.housing_type.value = data.housing_type || '';
      editFields.unit_type.value = data.unit_type || '';
      editFields.verified.value = data.verified ? 'true' : 'false';

      // Populate header preview
      const photos = Array.isArray(data.photo_urls) ? data.photo_urls : [];
      if (elements.editPreviewImg) {
        elements.editPreviewImg.src = photos.length > 0 ? photos[0] : 'https://via.placeholder.com/56x56?text=No+Photo';
      }
      if (elements.editPreviewSubtitle) {
        elements.editPreviewSubtitle.textContent = '$' + (data.monthly_rent || '?') + ' — ' + (data.address || 'No address');
      }

      // Populate photo grid
      state.editPhotos = photos.slice();
      renderEditPhotos();

      setEditMessage('');
      // Scroll to top and refresh scroll hint after content is rendered
      if (elements.editModalBody) elements.editModalBody.scrollTop = 0;
    } catch (err) {
      console.error('[admin] openEditModal error', err);
      setEditMessage('Error loading listing: ' + (err && err.message ? err.message : String(err)), '#C0392B');
    }
  }

  async function saveEditModal() {
    if (!state.currentEditId || !supabaseClient) return;

    const payload = {
      monthly_rent: parseNumericOrNull(editFields.monthly_rent.value),
      security_deposit: parseNumericOrNull(editFields.security_deposit.value),
      address: editFields.address.value.trim() || null,
      unit_number: editFields.unit_number.value.trim() || null,
      neighborhood: editFields.neighborhood.value.trim() || null,
      beds: editFields.beds.value.trim() || null,
      baths: editFields.baths.value.trim() || null,
      furnished: editFields.furnished.value.trim() || null,
      start_date: editFields.start_date.value || null,
      end_date: editFields.end_date.value || null,
      description: editFields.description.value.trim() || null,
      lease_type: editFields.lease_type.value.trim() || null,
      housing_type: editFields.housing_type.value.trim() || null,
      unit_type: editFields.unit_type.value.trim() || null,
      verified: editFields.verified.value === 'true',
      photo_urls: state.editPhotos.filter(Boolean)
    };

    setEditMessage('Saving...');

    const { error } = await supabaseClient
      .from('listings')
      .update(payload)
      .eq('id', state.currentEditId);

    if (error) {
      console.error('[admin] saveEditModal error', error);
      setEditMessage('Error: ' + error.message, '#C0392B');
      return;
    }

    setFlash('Listing updated successfully.', '#3D8A58');
    closeEditOverlay();
    await loadCurrentModeList();
  }

  async function checkIsAdmin(userId) {
    if (!supabaseClient || !userId) return false;

    // Check by auth UUID
    const { data, error } = await withTimeout(
      supabaseClient
        .from('admins')
        .select('id')
        .eq('id', userId)
        .maybeSingle(),
      AUTH_TIMEOUT_MS,
      'Admin allowlist check'
    );

    if (error) throw error;
    if (data && data.id === userId) return true;

    // Fall back: check by email (case-insensitive)
    const { data: { session } } = await supabaseClient.auth.getSession();
    const email = session?.user?.email;
    if (email) {
      const { data: d2, error: e2 } = await supabaseClient
        .from('admins')
        .select('id, email')
        .ilike('email', email)
        .maybeSingle();
      if (e2) throw e2;
      if (d2) {
        // Backfill UUID
        if (!d2.id || d2.id !== userId) {
          await supabaseClient.from('admins').update({ id: userId }).eq('email', d2.email);
        }
        return true;
      }
    }
    return false;
  }

  async function doLogoutWithFallback() {
    if (!supabaseClient || state.isLoggingOut) return;
    state.isLoggingOut = true;
    setStatus('Logging out...');

    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        console.error('[admin] logout error', error);
        setFlash('Logout failed: ' + error.message, '#C0392B');
      }
    } catch (err) {
      console.error('[admin] logout exception', err);
      setFlash('Logout failed: ' + (err && err.message ? err.message : String(err)), '#C0392B');
    } finally {
      state.session = null;
      state.isAdmin = false;
      showLoginView('Signed out.');
      setStatus('Please sign in.');
      state.isLoggingOut = false;
      window.location.reload();
    }
  }

  async function handleSession(session, sourceLabel) {
    console.log('[admin] handleSession', sourceLabel, session ? 'session-present' : 'no-session');

    state.session = session || null;
    state.isAdmin = false;

    if (!session || !session.user) {
      showLoginView('');
      setStatus('Please sign in.');
      if (elements.userLabel) elements.userLabel.textContent = '';
      return;
    }

    if (elements.userLabel) {
      elements.userLabel.textContent = session.user.email || session.user.id;
    }

    showLoginView('Checking admin access...');
    setStatus('Checking admin...');

    try {
      const adminAllowed = await checkIsAdmin(session.user.id);
      if (!adminAllowed) {
        showLoginView('Not authorized: this user is not in admins allowlist.', '#C0392B');
        setStatus('Not authorized.', '#C0392B');
        return;
      }

      state.isAdmin = true;
      showAppView();
      setStatus('');
      await loadCurrentModeList();
      loadManageAdmins();
    } catch (err) {
      console.error('[admin] admin check/session handling error', err);
      showLoginView((err && err.message) ? err.message : 'Session check failed.', '#C0392B');
      setStatus('Auth error: ' + ((err && err.message) ? err.message : String(err)), '#C0392B');
    }
  }

  async function initializeAuth() {
    if (!supabaseClient) {
      showLoginView('Supabase client not available.', '#C0392B');
      setStatus('Supabase client not available.', '#C0392B');
      return;
    }

    showLoginView('');
    setStatus('Loading...');

    try {
      const { data, error } = await withTimeout(
        supabaseClient.auth.getSession(),
        AUTH_TIMEOUT_MS,
        'Get session'
      );

      if (error) {
        console.error('[admin] getSession error', error);
        showLoginView(error.message, '#C0392B');
        setStatus('Auth error: ' + error.message, '#C0392B');
        return;
      }

      await handleSession(data ? data.session : null, 'initial-load');
    } catch (err) {
      console.error('[admin] initializeAuth exception', err);
      showLoginView((err && err.message) ? err.message : 'Initialization failed.', '#C0392B');
      setStatus('Initialization error: ' + ((err && err.message) ? err.message : String(err)), '#C0392B');
    }
  }

  function bindEventsOnce() {
    const hamburger = document.getElementById('nav-hamburger');
    const mobileMenu = document.getElementById('nav-mobile-menu');
    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileMenu.classList.toggle('open');
      });
    }

    if (elements.googleBtn) {
      elements.googleBtn.addEventListener('click', async () => {
        if (!supabaseClient || state.isBusyAuth) return;
        state.isBusyAuth = true;
        setAuthMessage('Redirecting to Google...');
        setStatus('Redirecting...');
        try {
          const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/admin.html' }
          });
          if (error) {
            console.error('[admin] Google OAuth error', error);
            setAuthMessage(error.message, '#C0392B');
            setStatus('Sign in error.', '#C0392B');
            state.isBusyAuth = false;
          }
          // On success the browser navigates away — no further code runs here
        } catch (err) {
          console.error('[admin] Google OAuth exception', err);
          setAuthMessage((err && err.message) ? err.message : String(err), '#C0392B');
          setStatus('Sign in error.', '#C0392B');
          state.isBusyAuth = false;
        }
      });
    }

    if (elements.modePending) {
      elements.modePending.addEventListener('click', async () => {
        if (state.mode === 'pending') return;
        state.mode = 'pending';
        state.page = 1;
        await loadCurrentModeList();
      });
    }

    if (elements.modeApproved) {
      elements.modeApproved.addEventListener('click', async () => {
        if (state.mode === 'approved') return;
        state.mode = 'approved';
        state.page = 1;
        await loadCurrentModeList();
      });
    }

    if (elements.refreshBtn) {
      elements.refreshBtn.addEventListener('click', async () => {
        await loadCurrentModeList();
      });
    }

    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', () => {
        if (state.searchDebounceTimer) clearTimeout(state.searchDebounceTimer);
        state.searchDebounceTimer = setTimeout(async () => {
          state.query = elements.searchInput.value || '';
          state.page = 1;
          await loadCurrentModeList();
        }, 300);
      });
    }

    if (elements.prevBtn) {
      elements.prevBtn.addEventListener('click', async () => {
        if (state.page <= 1) return;
        state.page -= 1;
        await loadCurrentModeList();
      });
    }

    if (elements.nextBtn) {
      elements.nextBtn.addEventListener('click', async () => {
        const totalPages = Math.max(1, Math.ceil((state.total || 0) / PAGE_SIZE));
        if (state.page >= totalPages) return;
        state.page += 1;
        await loadCurrentModeList();
      });
    }

    if (elements.editOverlay) {
      elements.editOverlay.addEventListener('click', (event) => {
        if (event.target === elements.editOverlay) {
          closeEditOverlay();
        }
      });
    }

    if (elements.editCancel) {
      elements.editCancel.addEventListener('click', () => {
        closeEditOverlay();
      });
    }

    if (elements.editForm) {
      elements.editForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveEditModal();
      });
    }

    // Close button (X) in edit modal header
    if (elements.editClose) {
      elements.editClose.addEventListener('click', () => {
        closeEditOverlay();
      });
    }

    // Add photo button
    if (elements.editPhotoAddBtn) {
      elements.editPhotoAddBtn.addEventListener('click', () => { addEditPhoto(); });
    }
    if (elements.editPhotoAddInput) {
      elements.editPhotoAddInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addEditPhoto(); }
      });
    }

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.currentEditId) closeEditOverlay();
    });

    document.addEventListener('click', async (event) => {
      const logoutBtn = event.target && event.target.closest ? event.target.closest('#admin-logout') : null;
      if (!logoutBtn) return;
      event.preventDefault();
      await doLogoutWithFallback();
    });
  }

  function bindAuthListenerOnce() {
    if (!supabaseClient || state.authListenerBound) return;
    state.authListenerBound = true;

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('[admin] onAuthStateChange', event);
      try {
        await handleSession(session, `auth-change:${event}`);
      } catch (err) {
        console.error('[admin] onAuthStateChange handler error', err);
        showLoginView((err && err.message) ? err.message : 'Session update error.', '#C0392B');
        setStatus('Session update error: ' + ((err && err.message) ? err.message : String(err)), '#C0392B');
      }
    });
  }

  // ── Manage Admins ──
  function setAdminsMsg(msg, color) {
    const el = document.getElementById('manage-admins-msg');
    if (el) { el.textContent = msg || ''; el.style.color = color || 'var(--admin-ink-soft)'; }
  }

  async function renderManageAdminsList() {
    const listEl = document.getElementById('manage-admins-list');
    if (!supabaseClient || !listEl) return;
    try {
      const { data: admins, error } = await supabaseClient
        .from('admins').select('id, email').order('email', { ascending: true });
      if (error) throw error;
      if (!admins || admins.length === 0) {
        listEl.innerHTML = '<div style="color:var(--admin-ink-soft);font-size:0.85rem;">No admins found.</div>';
        return;
      }
      listEl.innerHTML = admins.map(a => {
        const label = a.email || a.id;
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#fff;border:1px solid var(--admin-border);border-radius:8px;margin-bottom:8px;">' +
          '<span style="font-size:0.85rem;font-weight:500;">' + label + '</span>' +
          '<button type="button" class="ma-remove-btn" data-id="' + a.id + '" style="font-size:0.75rem;color:#C0392B;background:none;border:1px solid #C0392B;border-radius:6px;padding:4px 12px;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-weight:600;">Remove</button>' +
          '</div>';
      }).join('');
      listEl.querySelectorAll('.ma-remove-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Remove this admin?')) return;
          setAdminsMsg('Removing...');
          try {
            const { error } = await supabaseClient.from('admins').delete().eq('id', btn.dataset.id);
            if (error) throw error;
            setAdminsMsg('Admin removed.', '#155724');
            await renderManageAdminsList();
          } catch (err) {
            setAdminsMsg('Error: ' + (err.message || 'Failed'), '#C0392B');
          }
        });
      });
    } catch (err) {
      listEl.innerHTML = '<div style="color:#C0392B;font-size:0.85rem;">Error: ' + (err.message || '') + '</div>';
    }
  }

  function loadManageAdmins() {
    renderManageAdminsList();
    const addBtn = document.getElementById('manage-admins-add-btn');
    const emailInput = document.getElementById('manage-admins-email');
    if (!addBtn || !emailInput) return;
    addBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) { setAdminsMsg('Enter an email address.', '#C0392B'); return; }
      setAdminsMsg('Adding...');
      try {
        const { error } = await supabaseClient.from('admins').insert({ email });
        if (error) throw error;
        setAdminsMsg('Admin added: ' + email, '#155724');
        emailInput.value = '';
        await renderManageAdminsList();
      } catch (err) {
        if (err.message && err.message.includes('duplicate')) {
          setAdminsMsg('This user is already an admin.', '#856404');
        } else {
          setAdminsMsg('Error: ' + (err.message || 'Failed to add admin'), '#C0392B');
        }
      }
    });
  }

  function safeBoot() {
    showLoginView('');
    setStatus('Loading...');
    setFlash('');
    updateModeButtons();
    updateSubtitle();
    renderPagination();
    bindEventsOnce();
    bindAuthListenerOnce();

    initializeAuth().catch((err) => {
      console.error('[admin] initializeAuth unhandled', err);
      showLoginView((err && err.message) ? err.message : 'Initialization error.', '#C0392B');
      setStatus('Initialization error: ' + ((err && err.message) ? err.message : String(err)), '#C0392B');
    });
  }

  safeBoot();
});

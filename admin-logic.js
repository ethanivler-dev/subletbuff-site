document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://doehqqwqwjebhfgdvyum.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_ZZ4mKcw6_e9diz7oFfbVag_YA9zkqFW';

  const supabaseClient = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      })
    : null;

  const appRoot = document.getElementById('admin-app-root');
  const authRoot = document.getElementById('admin-auth-root');
  const flashEl = document.getElementById('admin-flash');

  const editOverlay = document.getElementById('admin-edit-overlay');
  const editForm = document.getElementById('admin-edit-form');
  const modalMsg = document.getElementById('admin-modal-msg');

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
    verified: document.getElementById('edit-verified'),
    photo_urls: document.getElementById('edit-photo-urls')
  };

  let currentMode = 'pending';
  let allRows = [];
  let filteredRows = [];
  let activeSession = null;
  let activeAdminId = null;
  let editingRowId = null;

  const ui = {
    subtitle: null,
    modePendingBtn: null,
    modeApprovedBtn: null,
    refreshBtn: null,
    searchInput: null,
    listContainer: null,
    authStatus: null,
    logoutBtn: null,
    loadingLine: null
  };

  function setFlash(message, color) {
    if (!flashEl) return;
    flashEl.textContent = message || '';
    flashEl.style.color = color || '#4A4035';
  }

  function setModalMessage(message, color) {
    if (!modalMsg) return;
    modalMsg.textContent = message || '';
    modalMsg.style.color = color || '#4A4035';
  }

  function showAuthRoot(show) {
    if (!authRoot) return;
    authRoot.classList.toggle('admin-hidden', !show);
  }

  function showAppRoot(show) {
    if (!appRoot) return;
    appRoot.classList.toggle('admin-hidden', !show);
  }

  function normalizeModeLabel(mode) {
    return mode === 'approved' ? 'Approved' : 'Pending';
  }

  function formatMoney(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return String(num);
  }

  function parseNumericOrNull(value) {
    if (value === '' || value == null) return null;
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

  function clearList() {
    if (ui.listContainer) ui.listContainer.innerHTML = '';
  }

  function renderLoadingState() {
    clearList();
    if (!ui.listContainer) return;
    const loading = document.createElement('div');
    loading.style.cssText = 'padding: 26px; text-align:center; color:#8A7D6B; border:1px dashed #E0D5C0; border-radius:12px; background:#fff;';
    loading.textContent = 'Loading listings...';
    ui.listContainer.appendChild(loading);
  }

  function renderEmptyState() {
    clearList();
    if (!ui.listContainer) return;
    const empty = document.createElement('div');
    empty.style.cssText = 'padding: 60px; border: 2px dashed #E0D5C0; text-align: center; border-radius: 16px; color: #8A7D6B;';
    empty.textContent = currentMode === 'approved'
      ? 'No approved listings found.'
      : '🎉 All caught up! No pending listings.';
    ui.listContainer.appendChild(empty);
  }

  function setHeaderSubtitle() {
    if (!ui.subtitle) return;
    ui.subtitle.innerHTML = `Reviewing all <strong>${normalizeModeLabel(currentMode)}</strong> submissions.`;
  }

  function updateModeButtonStyles() {
    if (!ui.modePendingBtn || !ui.modeApprovedBtn) return;

    const activeStyle = 'background:#1C1810; color:white; border:1px solid #1C1810;';
    const inactiveStyle = 'background:white; color:#4A4035; border:1px solid #E0D5C0;';

    ui.modePendingBtn.style.cssText = (currentMode === 'pending' ? activeStyle : inactiveStyle) + ' padding:8px 14px; border-radius:8px; cursor:pointer; font-weight:600;';
    ui.modeApprovedBtn.style.cssText = (currentMode === 'approved' ? activeStyle : inactiveStyle) + ' padding:8px 14px; border-radius:8px; cursor:pointer; font-weight:600;';
  }

  function normalizeSearch(value) {
    return String(value || '').toLowerCase().trim();
  }

  function applySearchFilter() {
    const query = normalizeSearch(ui.searchInput ? ui.searchInput.value : '');
    if (!query) {
      filteredRows = allRows.slice();
      renderRows(filteredRows);
      return;
    }

    filteredRows = allRows.filter((row) => {
      const address = normalizeSearch(row.address);
      const neighborhood = normalizeSearch(row.neighborhood);
      const email = normalizeSearch(row.email);
      return address.includes(query) || neighborhood.includes(query) || email.includes(query);
    });

    renderRows(filteredRows);
  }

  function createActionButton({ id, text, style, onClick }) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.type = 'button';
    btn.textContent = text;
    btn.style.cssText = style;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function createCard(item) {
    const photo = (Array.isArray(item.photo_urls) && item.photo_urls.length > 0)
      ? item.photo_urls[0]
      : 'https://via.placeholder.com/150x100?text=No+Photo';
    const photoNote = (Array.isArray(item.photo_notes) && item.photo_notes.length > 0)
      ? item.photo_notes[0]
      : '';

    const card = document.createElement('div');
    card.id = `card-${item.id}`;
    card.style.cssText = 'display: grid; grid-template-columns: 180px 1fr auto; gap: 24px; background: white; padding: 24px; border-radius: 16px; border: 1px solid #E0D5C0; align-items: center; box-shadow: 0 2px 12px rgba(28,24,16,0.05);';

    const left = document.createElement('div');
    const img = document.createElement('img');
    img.src = photo;
    img.style.cssText = 'width: 180px; height: 120px; object-fit: cover; border-radius: 8px; display:block;';
    left.appendChild(img);
    if (photoNote) {
      const noteEl = document.createElement('div');
      noteEl.style.cssText = 'font-size:0.85rem;color:#4A4035;margin-top:8px;';
      noteEl.textContent = 'Photo note: ' + photoNote;
      left.appendChild(noteEl);
    }

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
    previewLink.href = '/?preview=' + encodeURIComponent(item.id);
    previewLink.target = '_blank';
    previewLink.style.cssText = 'font-size: 0.8rem; color: #B8922A; font-weight: 600; text-decoration: none; border: 1px solid #B8922A; padding: 5px 12px; border-radius: 6px;';
    previewLink.textContent = 'View Full Preview ↗';
    previewWrap.appendChild(previewLink);
    mid.appendChild(previewWrap);

    const right = document.createElement('div');
    right.style.cssText = 'display: flex; flex-direction: column; gap: 10px; min-width: 180px;';

    if (currentMode === 'pending') {
      const approveBtn = createActionButton({
        id: `app-${item.id}`,
        text: 'Approve ✅',
        style: 'background: #3D8A58; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onClick: () => handleApprove(item.id)
      });
      right.appendChild(approveBtn);

      right.appendChild(createContactButton(item));

      const rejectBtn = createActionButton({
        id: `rej-${item.id}`,
        text: 'Reject & Delete ✕',
        style: 'background: white; color: #C0392B; border: 1.5px solid #C0392B; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onClick: () => handleRejectDelete(item.id)
      });
      right.appendChild(rejectBtn);
    } else {
      const editBtn = createActionButton({
        id: `edit-${item.id}`,
        text: 'Edit ✏️',
        style: 'background: #E0D5C0; color: #1C1810; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onClick: () => openEditModal(item)
      });
      right.appendChild(editBtn);

      right.appendChild(createContactButton(item));

      const takeDownBtn = createActionButton({
        id: `down-${item.id}`,
        text: 'Take Down ⬇️ (to Pending)',
        style: 'background: #FAF7F2; color: #B8922A; border: 1px solid #B8922A; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onClick: () => handleTakeDown(item.id)
      });
      right.appendChild(takeDownBtn);

      const deleteBtn = createActionButton({
        id: `del-${item.id}`,
        text: 'Delete 🗑️',
        style: 'background: white; color: #C0392B; border: 1.5px solid #C0392B; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onClick: () => handleDeleteApproved(item.id)
      });
      right.appendChild(deleteBtn);
    }

    card.appendChild(left);
    card.appendChild(mid);
    card.appendChild(right);
    return card;
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

  function renderRows(rows) {
    clearList();
    if (!rows || rows.length === 0) {
      renderEmptyState();
      return;
    }

    rows.forEach((row) => {
      const card = createCard(row);
      if (ui.listContainer) ui.listContainer.appendChild(card);
    });
  }

  async function loadCurrentMode() {
    if (!supabaseClient || !ui.listContainer) return;

    setHeaderSubtitle();
    updateModeButtonStyles();
    renderLoadingState();
    setFlash('', '#4A4035');

    const statusFilter = currentMode === 'approved' ? 'approved' : 'pending';
    const sortAscending = currentMode === 'pending';

    const { data, error } = await supabaseClient
      .from('listings')
      .select('*')
      .eq('status', statusFilter)
      .order('created_at', { ascending: sortAscending });

    if (error) {
      clearList();
      const err = document.createElement('div');
      err.style.cssText = 'padding: 20px; border:1px solid #C0392B; border-radius:12px; background:#fff; color:#C0392B;';
      err.textContent = 'Error: ' + error.message;
      ui.listContainer.appendChild(err);
      return;
    }

    allRows = Array.isArray(data) ? data : [];
    applySearchFilter();
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
    await loadCurrentMode();
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
    await loadCurrentMode();
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
    await loadCurrentMode();
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
    await loadCurrentMode();
  }

  function openEditModal(item) {
    if (!editOverlay || !editForm) return;

    editingRowId = item.id;
    editFields.monthly_rent.value = formatMoney(item.monthly_rent);
    editFields.security_deposit.value = formatMoney(item.security_deposit);
    editFields.address.value = item.address || '';
    editFields.unit_number.value = item.unit_number || '';
    editFields.neighborhood.value = item.neighborhood || '';
    editFields.beds.value = item.beds || '';
    editFields.baths.value = item.baths || '';
    editFields.furnished.value = (item.furnished || '').toLowerCase();
    editFields.start_date.value = toDateInputValue(item.start_date);
    editFields.end_date.value = toDateInputValue(item.end_date);
    editFields.description.value = item.description || '';
    editFields.lease_type.value = item.lease_type || '';
    editFields.housing_type.value = item.housing_type || '';
    editFields.unit_type.value = item.unit_type || '';
    editFields.verified.value = item.verified ? 'true' : 'false';
    editFields.photo_urls.value = Array.isArray(item.photo_urls) ? item.photo_urls.join('\n') : '';

    setModalMessage('', '#4A4035');
    editOverlay.classList.add('open');
    editOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeEditModal() {
    editingRowId = null;
    setModalMessage('', '#4A4035');
    if (editOverlay) {
      editOverlay.classList.remove('open');
      editOverlay.setAttribute('aria-hidden', 'true');
    }
  }

  async function saveEditFromModal() {
    if (!editingRowId) return;

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
      photo_urls: editFields.photo_urls.value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    };

    setModalMessage('Saving...', '#4A4035');

    const { error } = await supabaseClient
      .from('listings')
      .update(payload)
      .eq('id', editingRowId);

    if (error) {
      setModalMessage('Error: ' + error.message, '#C0392B');
      return;
    }

    setModalMessage('Saved successfully.', '#3D8A58');
    setFlash('Listing updated successfully.', '#3D8A58');
    await loadCurrentMode();
    closeEditModal();
  }

  function buildAppUI() {
    if (!appRoot) return;

    appRoot.innerHTML = '';

    const header = document.createElement('div');
    header.style.cssText = "max-width: 1000px; margin: 0 auto 30px; font-family: 'Playfair Display', serif;";

    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.alignItems = 'flex-start';
    headerRow.style.gap = '16px';

    const left = document.createElement('div');

    const h1 = document.createElement('h1');
    h1.style.fontSize = '2.5rem';
    h1.style.marginBottom = '5px';
    h1.textContent = 'Admin Approval Portal';
    left.appendChild(h1);

    ui.subtitle = document.createElement('p');
    ui.subtitle.style.color = '#8A7D6B';
    ui.subtitle.style.margin = '0';
    left.appendChild(ui.subtitle);

    const modeWrap = document.createElement('div');
    modeWrap.style.cssText = 'display:flex; gap:8px; margin-top:12px;';

    ui.modePendingBtn = document.createElement('button');
    ui.modePendingBtn.type = 'button';
    ui.modePendingBtn.textContent = 'Pending';
    ui.modePendingBtn.addEventListener('click', async () => {
      if (currentMode === 'pending') return;
      currentMode = 'pending';
      await loadCurrentMode();
    });
    modeWrap.appendChild(ui.modePendingBtn);

    ui.modeApprovedBtn = document.createElement('button');
    ui.modeApprovedBtn.type = 'button';
    ui.modeApprovedBtn.textContent = 'Approved';
    ui.modeApprovedBtn.addEventListener('click', async () => {
      if (currentMode === 'approved') return;
      currentMode = 'approved';
      await loadCurrentMode();
    });
    modeWrap.appendChild(ui.modeApprovedBtn);

    left.appendChild(modeWrap);

    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex; flex-direction:column; gap:10px; align-items:flex-end; min-width: 280px;';

    ui.refreshBtn = document.createElement('button');
    ui.refreshBtn.type = 'button';
    ui.refreshBtn.textContent = '🔄 Refresh List';
    ui.refreshBtn.style.cssText = 'background:#E0D5C0; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:600;';
    ui.refreshBtn.addEventListener('click', () => loadCurrentMode());
    controls.appendChild(ui.refreshBtn);

    ui.searchInput = document.createElement('input');
    ui.searchInput.type = 'text';
    ui.searchInput.placeholder = 'Search address / neighborhood / email';
    ui.searchInput.style.cssText = 'width: 100%; padding: 9px 10px; border:1px solid #E0D5C0; border-radius:8px; font-family: DM Sans, sans-serif;';
    ui.searchInput.addEventListener('input', applySearchFilter);
    controls.appendChild(ui.searchInput);

    const authLine = document.createElement('div');
    authLine.style.cssText = 'display:flex; gap:8px; align-items:center;';

    ui.authStatus = document.createElement('span');
    ui.authStatus.style.cssText = 'font-size:0.82rem; color:#4A4035;';
    authLine.appendChild(ui.authStatus);

    ui.logoutBtn = document.createElement('button');
    ui.logoutBtn.type = 'button';
    ui.logoutBtn.id = 'admin-logout-btn';
    ui.logoutBtn.textContent = 'Log Out';
    ui.logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      setFlash('Logged out.', '#4A4035');
      await bootstrap();
    });
    authLine.appendChild(ui.logoutBtn);

    controls.appendChild(authLine);

    headerRow.appendChild(left);
    headerRow.appendChild(controls);
    header.appendChild(headerRow);
    appRoot.appendChild(header);

    ui.listContainer = document.createElement('div');
    ui.listContainer.id = 'admin-list';
    ui.listContainer.style.cssText = 'max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 20px;';
    appRoot.appendChild(ui.listContainer);

    setHeaderSubtitle();
    updateModeButtonStyles();
    if (ui.authStatus && activeSession && activeSession.user) {
      ui.authStatus.textContent = activeSession.user.email || activeSession.user.id;
    }
  }

  function renderAuthUI(initialMessage) {
    if (!authRoot) return;

    showAppRoot(false);
    showAuthRoot(true);

    authRoot.innerHTML = '';

    const title = document.createElement('h1');
    title.textContent = 'Admin Sign In';
    authRoot.appendChild(title);

    const sub = document.createElement('p');
    sub.textContent = 'Log in with your admin account. Access is allowed only for users in the admins allowlist.';
    authRoot.appendChild(sub);

    const emailField = document.createElement('div');
    emailField.className = 'admin-auth-field';
    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = 'Admin email';
    emailInput.id = 'admin-email';
    emailField.appendChild(emailInput);
    authRoot.appendChild(emailField);

    const pwField = document.createElement('div');
    pwField.className = 'admin-auth-field';
    const pwInput = document.createElement('input');
    pwInput.type = 'password';
    pwInput.placeholder = 'Password';
    pwInput.id = 'admin-password';
    pwField.appendChild(pwInput);
    authRoot.appendChild(pwField);

    const actions = document.createElement('div');
    actions.className = 'admin-auth-actions';

    const loginBtn = document.createElement('button');
    loginBtn.type = 'button';
    loginBtn.id = 'admin-login-btn';
    loginBtn.textContent = 'Log In';
    actions.appendChild(loginBtn);

    const magicBtn = document.createElement('button');
    magicBtn.type = 'button';
    magicBtn.id = 'admin-magic-btn';
    magicBtn.textContent = 'Send Magic Link';
    actions.appendChild(magicBtn);

    authRoot.appendChild(actions);

    const msg = document.createElement('div');
    msg.id = 'admin-auth-msg';
    msg.textContent = initialMessage || '';
    authRoot.appendChild(msg);

    loginBtn.addEventListener('click', async () => {
      msg.style.color = '#4A4035';
      msg.textContent = 'Signing in...';

      const email = emailInput.value.trim();
      const password = pwInput.value;
      if (!email || !password) {
        msg.style.color = '#C0392B';
        msg.textContent = 'Email and password are required.';
        return;
      }

      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        msg.style.color = '#C0392B';
        msg.textContent = error.message;
        return;
      }

      msg.style.color = '#3D8A58';
      msg.textContent = 'Logged in. Checking admin access...';
      await bootstrap();
    });

    magicBtn.addEventListener('click', async () => {
      msg.style.color = '#4A4035';
      msg.textContent = 'Sending magic link...';

      const email = emailInput.value.trim();
      if (!email) {
        msg.style.color = '#C0392B';
        msg.textContent = 'Email is required.';
        return;
      }

      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href }
      });

      if (error) {
        msg.style.color = '#C0392B';
        msg.textContent = error.message;
        return;
      }

      msg.style.color = '#3D8A58';
      msg.textContent = 'Magic link sent. Check your email.';
    });
  }

  async function isAllowedAdmin(userId) {
    if (!userId) return false;
    const { data, error } = await supabaseClient
      .from('admins')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setFlash('Admin check error: ' + error.message, '#C0392B');
      return false;
    }

    return !!(data && data.id === userId);
  }

  async function bootstrap() {
    if (!supabaseClient) {
      if (document.body) document.body.textContent = 'Supabase client not available.';
      return;
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      renderAuthUI('Auth error: ' + error.message);
      return;
    }

    activeSession = data ? data.session : null;
    activeAdminId = activeSession && activeSession.user ? activeSession.user.id : null;

    if (!activeSession || !activeAdminId) {
      renderAuthUI('');
      return;
    }

    const allowed = await isAllowedAdmin(activeAdminId);
    if (!allowed) {
      renderAuthUI('You are logged in but not authorized as an admin.');
      await supabaseClient.auth.signOut();
      return;
    }

    showAuthRoot(false);
    showAppRoot(true);
    buildAppUI();
    await loadCurrentMode();
  }

  if (editOverlay) {
    editOverlay.addEventListener('click', (event) => {
      if (event.target === editOverlay) closeEditModal();
    });
  }

  const cancelBtn = document.getElementById('admin-edit-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeEditModal);
  }

  if (editForm) {
    editForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await saveEditFromModal();
    });
  }

  if (supabaseClient && supabaseClient.auth && supabaseClient.auth.onAuthStateChange) {
    supabaseClient.auth.onAuthStateChange(async () => {
      await bootstrap();
    });
  }

  bootstrap();
});

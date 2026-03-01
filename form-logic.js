// Wrap form logic in DOMContentLoaded and guard element access
document.addEventListener('DOMContentLoaded', () => {
	console.log('[form] script loaded v20260223f');
	// Temporarily uncomment to verify script is running:
	// alert('Form script loaded!');

	// Global runtime logging so errors and promise rejections are visible
	window.addEventListener('error', (ev) => {
		console.error('[form] runtime error', ev.error || ev.message || ev);
	});
	window.addEventListener('unhandledrejection', (ev) => {
		console.error('[form] unhandledrejection', ev.reason || ev);
	});

	// ==========================================
	// 1. INITIALIZE SUPABASE
	// ==========================================
	const SUPABASE_URL = 'https://doehqqwqwjebhfgdvyum.supabase.co';
	const SUPABASE_ANON_KEY = 'sb_publishable_ZZ4mKcw6_e9diz7oFfbVag_YA9zkqFW';

	let supabaseClient = null;

	try {
		if (window.supabase && window.supabase.createClient) {
			console.log('[form] Supabase UMD detected');
			supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
		} else {
			console.error('Supabase UMD not loaded');
		}
	} catch (error) {
		console.error('Error setting up Supabase:', error);
	}

	const DRAFT_KEY = 'subswap_draft_v1';
	let currentListingId = null;

	const formEl = document.getElementById('listing-form');
	if (!formEl) {
		console.warn('[form] listing-form not found on this page — skipping form-specific setup');
		// Don't return early — continue to set up photo handling if elements exist
	} else {
		formEl.addEventListener('keydown', function(e) {
			if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
				e.preventDefault();
			}
		});
	}

	const hamburger  = document.getElementById('nav-hamburger');
	const mobileMenu = document.getElementById('nav-mobile-menu');
	if (hamburger && mobileMenu) {
		hamburger.addEventListener('click', e => {
			e.stopPropagation();
			mobileMenu.classList.toggle('open');
		});
		document.addEventListener('click', e => {
			if (!e.target.closest('nav.ss-nav')) mobileMenu.classList.remove('open');
		});
	}

	// ── Sign-in gate button ──
	const gateSigninBtn = document.getElementById('gate-signin-btn');
	if (gateSigninBtn) {
		gateSigninBtn.addEventListener('click', () => {
			if (window.sbAuth && window.sbAuth.signInWithGoogle) {
				window.sbAuth.signInWithGoogle();
			}
		});
	}

	function setNavPostLinkVisibility(visible) {
		const d = document.getElementById('nav-post-link');
		const m = document.getElementById('nav-post-link-mobile');
		if (d) d.style.display = visible ? '' : 'none';
		if (m) m.style.display = visible ? '' : 'none';
	}

	// ── Photo storage ────────────────────────────────────
	// Single array - in-memory and persisted. Schema: { path, url, order, note, file?, previewUrl?, listingId? }
	let photoDraft = [];
	const PHOTO_DEBUG = false;
	const photoDebug = (...args) => { if (PHOTO_DEBUG) console.log(...args); };
	const strip = document.getElementById('photo-strip');
	const uploadZone = document.getElementById('upload-zone');
	const photoInlineMsg = document.getElementById('photo-inline-msg');
	const PHOTOS_DRAFT_KEY = 'subletbuff_photos_draft_v1';
	console.log('[form] photo elements:', { strip: !!strip, uploadZone: !!uploadZone });

	function setPhotoInlineMessage(message) {
		if (!photoInlineMsg) return;
		photoInlineMsg.textContent = message || '';
	}

	function revokePreviewUrlIfNeeded(previewUrl) {
		if (typeof previewUrl === 'string' && previewUrl.startsWith('blob:')) {
			URL.revokeObjectURL(previewUrl);
		}
	}

	function cleanupPhotoEntry(entry) {
		if (!entry) return;
		revokePreviewUrlIfNeeded(entry.previewUrl);
	}

	const UPLOAD_LISTING_ID_KEY = 'subswap_upload_listing_id';

	function generateDraftListingId() {
		if (typeof crypto !== 'undefined' && crypto.randomUUID) {
			return `draft-${crypto.randomUUID()}`;
		}
		return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	}

	function getStoredUploadListingId() {
		try {
			return localStorage.getItem(UPLOAD_LISTING_ID_KEY);
		} catch (err) {
			console.warn('[form] unable to access stored upload listing id', err);
			return null;
		}
	}

	function persistUploadListingId(id) {
		if (!id) return;
		try {
			localStorage.setItem(UPLOAD_LISTING_ID_KEY, id);
		} catch (err) {
			console.warn('[form] unable to persist upload listing id', err);
		}
	}

	function clearStoredUploadListingId() {
		try {
			localStorage.removeItem(UPLOAD_LISTING_ID_KEY);
		} catch (err) {
			console.warn('[form] unable to clear upload listing id', err);
		}
	}

	function getActiveUploadListingId() {
		if (currentListingId) {
			persistUploadListingId(currentListingId);
			return currentListingId;
		}
		const stored = getStoredUploadListingId();
		if (stored) return stored;
		const generated = generateDraftListingId();
		persistUploadListingId(generated);
		return generated;
	}

	function isHeicFile(file) {
		if (!file) return false;
		const type = String(file.type || '').toLowerCase();
		const name = String(file.name || '').toLowerCase();
		return type.includes('heic') || type.includes('heif') || name.endsWith('.heic') || name.endsWith('.heif');
	}

	// ── CLIENT-SIDE HEIC→JPEG ──
	// HEIC client-side conversion: try native canvas (Safari) then heic2any.
	// Returns a File on success, or null if client-side can't handle it
	// (the edge function will then handle conversion server-side).

	let _heic2any = null;
	function loadHeic2Any() {
		if (_heic2any) return Promise.resolve(_heic2any);
		if (window.heic2any) { _heic2any = window.heic2any; return Promise.resolve(_heic2any); }
		return new Promise((resolve, reject) => {
			const s = document.createElement('script');
			s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
			s.onload = () => {
				_heic2any = window.heic2any;
				if (!_heic2any) { reject(new Error('heic2any loaded but window.heic2any is undefined')); return; }
				resolve(_heic2any);
			};
			s.onerror = () => reject(new Error('heic2any CDN load failed'));
			document.head.appendChild(s);
		});
	}

	// Returns converted File, or null if client-side conversion not possible
	async function convertHeicClientSide(file) {
		const jpegName = file.name.replace(/\.(heic|heif)$/i, '.jpg');

		// 1. Native canvas — works on Safari/iOS
		try {
			const blob = await new Promise((resolve, reject) => {
				const img = new Image();
				const blobUrl = URL.createObjectURL(file);
				img.onload = () => {
					URL.revokeObjectURL(blobUrl);
					const canvas = document.createElement('canvas');
					canvas.width = img.naturalWidth;
					canvas.height = img.naturalHeight;
					canvas.getContext('2d').drawImage(img, 0, 0);
					canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob null')), 'image/jpeg', 0.9);
				};
				img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('img.onerror')); };
				img.src = blobUrl;
			});
			return new File([blob], jpegName, { type: 'image/jpeg' });
		} catch(_) {}

		// 2. heic2any — works for most HEIC files in Chrome/Firefox
		try {
			const h2a = await loadHeic2Any();
			const out = await h2a({ blob: file, toType: 'image/jpeg', quality: 0.9 });
			const outBlob = Array.isArray(out) ? out[0] : out;
			return new File([outBlob], jpegName, { type: 'image/jpeg' });
		} catch(e) {
			console.warn('[form] heic2any failed:', e.message, '— will use server-side conversion');
		}

		// Client-side conversion not possible; return null so caller falls back to edge function
		return null;
	}

	// ── CLIENT-SIDE IMAGE COMPRESSION ──
	// Compresses non-HEIC images via canvas to stay under Vercel's 4.5MB body limit.
	const UPLOAD_MAX_BYTES = 4 * 1024 * 1024; // 4MB target after compression
	const COMPRESS_MAX_DIMENSION = 3000; // max width/height in pixels

	async function compressImageIfNeeded(file) {
		// Skip HEIC (handled separately) and already-small files
		if (isHeicFile(file)) return file;
		if (file.size <= UPLOAD_MAX_BYTES) return file;
		if (!file.type.startsWith('image/')) return file;

		console.log('[form] compressing', file.name, (file.size / 1024 / 1024).toFixed(1) + 'MB');

		try {
			const bitmap = await createImageBitmap(file);
			let { width, height } = bitmap;

			// Scale down if exceeds max dimension
			if (width > COMPRESS_MAX_DIMENSION || height > COMPRESS_MAX_DIMENSION) {
				const scale = COMPRESS_MAX_DIMENSION / Math.max(width, height);
				width = Math.round(width * scale);
				height = Math.round(height * scale);
			}

			const canvas = new OffscreenCanvas(width, height);
			const ctx = canvas.getContext('2d');
			ctx.drawImage(bitmap, 0, 0, width, height);
			bitmap.close();

			// Try progressively lower quality until under limit
			for (const quality of [0.85, 0.75, 0.6, 0.45]) {
				const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
				if (blob.size <= UPLOAD_MAX_BYTES) {
					const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
					console.log('[form] compressed to', (compressed.size / 1024 / 1024).toFixed(2) + 'MB', 'q=' + quality);
					return compressed;
				}
			}

			// Last resort: strongest compression
			const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.35 });
			const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
			console.log('[form] compressed (last resort) to', (compressed.size / 1024 / 1024).toFixed(2) + 'MB');
			return compressed;
		} catch (err) {
			console.warn('[form] client-side compression failed, uploading original:', err);
			return file;
		}
	}

	// ── UPLOAD VIA VERCEL FUNCTION (handles storage + HEIC conversion via Sharp) ──
	async function uploadViaEdgeFunction(file) {
		// Compress large images client-side before upload
		const fileToSend = await compressImageIfNeeded(file);

		const url = '/api/upload';
		const formData = new FormData();
		const listingId = getActiveUploadListingId();
		formData.append('file', fileToSend);
		formData.append('listing_id', listingId);

		console.log('[form] uploading:', { name: fileToSend.name, size: fileToSend.size, type: fileToSend.type, listingId });

		const resp = await fetch(url, {
			method: 'POST',
			headers: { 'Accept': 'application/json' },
			body: formData
		});

		if (!resp.ok) {
			let errBody = {};
			try { errBody = await resp.json(); } catch (_) {}
			console.error('[form] edge function error:', resp.status, errBody);
			if (resp.status === 413) {
				throw new Error('Photo is too large. Please use a smaller image (under 4MB).');
			}
			const msg = [errBody.error, errBody.details].filter(Boolean).join(' — ');
			throw new Error(msg || `Upload failed (${resp.status})`);
		}

		const json = await resp.json();
		console.log('convert-image response', json);
		if (!json?.publicUrl || !json?.path) {
			throw new Error('Upload succeeded but response was incomplete.');
		}
		const resolvedListingId = json.listingId || listingId;
		persistUploadListingId(resolvedListingId);
		return { path: json.path, url: json.publicUrl, listingId: resolvedListingId };
	}

	// ── DRAFT PHOTO PERSISTENCE ────────────────────────
	function saveDraftPhotos() {
		const toSave = (photoDraft || []).map(({ path, url, order, note, listingId }) => ({ path, url, order, note, listingId }));
		try { localStorage.setItem(PHOTOS_DRAFT_KEY, JSON.stringify(toSave)); } catch(e) { console.error('[form] saveDraftPhotos failed', e); }
		console.log('[form] draft photos saved:', toSave.length);
	}

	function loadDraftPhotos() {
		const raw = localStorage.getItem(PHOTOS_DRAFT_KEY);
		if (!raw) { photoDraft = []; return; }
		try {
			const saved = JSON.parse(raw);
			photoDraft = Array.isArray(saved) ? saved.map((p, i) => ({
				path: p.path || '',
				url: p.url || '',
				order: p.order != null ? p.order : i,
				note: p.note || '',
				listingId: p.listingId || null,
				file: null,        // File objects can't be persisted
				previewUrl: p.previewUrl || p.url || ''
			})) : [];
			console.log('[form] draft photos restored:', photoDraft.length, 'urls:', photoDraft.map(p => p.url || '(empty)'));
		} catch (e) {
			console.error('[form] failed to load draft photos:', e);
			photoDraft = [];
		}
	}

	function clearDraftPhotos() {
		if (Array.isArray(photoDraft)) {
			photoDraft.forEach(cleanupPhotoEntry);
		}
		photoDraft = [];
		try { localStorage.removeItem(PHOTOS_DRAFT_KEY); } catch(e) {}
		clearStoredUploadListingId();
		console.log('[form] draft photos cleared');
	}

	// Load draft photos on page init (before renderPhotos)
	loadDraftPhotos();

	// Inject spinner CSS for upload-pending state (once)
	if (!document.getElementById('ss-upload-pending-css')) {
		const _s = document.createElement('style');
		_s.id = 'ss-upload-pending-css';
		_s.textContent = `.photo-card-modal{position:relative}.photo-card-loading{position:absolute;inset:0;background:rgba(255,255,255,.82);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:inherit;z-index:2;pointer-events:none}.photo-card-loading-spinner{width:26px;height:26px;border:3px solid #ddd;border-top-color:#555;border-radius:50%;animation:_ss_spin .75s linear infinite}.photo-card-loading-text{font-size:.72rem;color:#666;font-weight:500}@keyframes _ss_spin{to{transform:rotate(360deg)}}.mini-uploading{display:inline-flex;align-items:center;justify-content:center;background:#e8e8e8;border-radius:6px;width:48px;height:48px;vertical-align:middle;flex-shrink:0}.mini-spin{width:18px;height:18px;border:2px solid #ccc;border-top-color:#555;border-radius:50%;animation:_ss_spin .75s linear infinite}`;
		document.head.appendChild(_s);
	}

	// ── MODAL MANAGEMENT ────────────────────
	const photoModalOverlay = document.getElementById('photo-modal-overlay');
	let draggedCard = null;
	let draggedFromIndex = null;

	function showToastMessage(message) {
		// Create and show temporary toast message
		const existingToast = document.getElementById('form-toast');
		if (existingToast) existingToast.remove();
		
		const toast = document.createElement('div');
		toast.id = 'form-toast';
		toast.textContent = message;
		toast.style.cssText = `
			position: fixed;
			bottom: 20px;
			right: 20px;
			background: var(--ink);
			color: white;
			padding: 12px 16px;
			border-radius: var(--radius-sm);
			font-size: 0.875rem;
			z-index: 9999;
			box-shadow: 0 4px 12px rgba(0,0,0,0.2);
			animation: slideUp 0.3s ease;
		`;
		document.body.appendChild(toast);
		
		setTimeout(() => toast.remove(), 2500);
	}

	function openPhotoModal() {
		if (photoModalOverlay) {
			photoModalOverlay.classList.add('open');
			document.body.style.overflow = 'hidden';
		}
	}

	function closePhotoModal() {
		if (photoModalOverlay) {
			photoModalOverlay.classList.remove('open');
			document.body.style.overflow = '';
		}
	}

	function updatePhotoModalCount() {
		const countEl = document.getElementById('photo-modal-count-num');
		if (countEl) countEl.textContent = (photoDraft || []).length;
	}

	// Render UI after loading draft photos from localStorage
	// NOTE: moved to AFTER modal listeners so a photo error can't prevent them attaching

	// Prevent closing on background click (overlay)
	if (photoModalOverlay) {
		photoModalOverlay.addEventListener('click', (e) => {
			if (e.target === photoModalOverlay) {
				// Only close if clicking directly on overlay, not on modal content
				return false;
			}
		});
	}

	// Close button handler — same behavior as Done: save then close
	const photoModalCloseBtn = document.getElementById('photo-modal-close');
	if (photoModalCloseBtn) {
		photoModalCloseBtn.addEventListener('click', () => {
			saveDraftPhotos();
			saveDraft();
			closePhotoModal();
		});
	}

	// Done button handler
	const photoModalDoneBtn = document.getElementById('photo-modal-done');
	if (photoModalDoneBtn) {
		photoModalDoneBtn.addEventListener('click', () => {
			closePhotoModal();
		});
	}

	// Safe initial render — photo errors must NOT prevent form button listeners below from attaching
	try { renderPhotos(); } catch(e) { console.error('[form] renderPhotos init error (non-fatal)', e); }

	function renderCollapsedPhotos() {
		const miniStrip = document.getElementById('photo-mini-strip');
		if (!miniStrip) return;
		miniStrip.innerHTML = '';
		if (!Array.isArray(photoDraft) || photoDraft.length === 0) return;

		const MAX_VISIBLE = 4;
		const shown = photoDraft.slice(0, MAX_VISIBLE);
		const extra = photoDraft.length - MAX_VISIBLE;

		shown.forEach((entry, i) => {
			const imgSrc = entry.previewUrl || entry.url || '';
			if (entry.pending && !imgSrc) {
				// HEIC in-flight — no preview yet, show spinner pill
				const pill = document.createElement('div');
				pill.className = 'mini-uploading' + (i === 0 ? ' is-cover' : '');
				pill.title = `Uploading ${entry.originalName || 'photo'}…`;
				pill.innerHTML = '<div class="mini-spin"></div>';
				miniStrip.appendChild(pill);
				return;
			}
			const img = document.createElement('img');
			img.className = 'collapsed-thumb' + (i === 0 ? ' is-cover' : '');
			img.src = imgSrc;
			img.alt = `photo-${i + 1}`;
			img.title = i === 0 ? 'Cover photo' : `Photo ${i + 1}`;
			miniStrip.appendChild(img);
		});

		if (extra > 0) {
			const badge = document.createElement('div');
			badge.className = 'collapsed-more-badge';
			badge.textContent = `+${extra}`;
			badge.title = `${extra} more photo${extra > 1 ? 's' : ''}`;
			miniStrip.appendChild(badge);
		}
	}

	function renderPhotos() {
		// Guard: ensure photoDraft is always an array
		if (!Array.isArray(photoDraft)) photoDraft = [];
		console.log('[form] renderPhotos called, photoDraft:', photoDraft.length);
		const miniStrip = document.getElementById('photo-mini-strip');
		const modalStrip = document.getElementById('photo-strip');
		const managePhotosBtn = document.getElementById('manage-photos-btn');
		
		if (!miniStrip && !modalStrip) {
			console.error('[form] renderPhotos: neither photo-mini-strip nor photo-strip found!');
			return;
		}
		
		// Show/hide manage photos button
		if (managePhotosBtn) {
			managePhotosBtn.style.display = photoDraft.length > 0 ? 'inline-block' : 'none';
		}

		// Update modal count
		updatePhotoModalCount();

		// DO NOT auto-open modal - only open via user click on Manage Photos button
		
		// Render collapsed mini strip for upload preview (compact thumbnails, no editing)
		if (miniStrip) {
			renderCollapsedPhotos();
		}
		
		// Render modal strip with photo cards (sortable grid)
		if (modalStrip) {
			modalStrip.innerHTML = '';
			photoDraft.forEach((entry, i) => {
				// Guard: safe image source — never call createObjectURL on null
				const imgSrc = entry.previewUrl || entry.url || '';

				const card = document.createElement('div');
				card.className = 'photo-card-modal' + (i === 0 ? ' is-cover' : '');
				card.dataset.index = i;
				card.dataset.id = `photo-${i}`; // For SortableJS
				card.draggable = false; // Let SortableJS handle dragging

				// Header with number and actions
				const header = document.createElement('div');
				header.className = 'photo-card-header';

				const numberSection = document.createElement('div');
				numberSection.className = 'photo-number';

				const badge = document.createElement('div');
				badge.className = 'photo-number-badge' + (i === 0 ? ' cover' : '');
				badge.textContent = (i + 1).toString();

				const label = document.createElement('span');
				if (i === 0) {
					label.className = 'photo-cover-label';
					label.textContent = 'COVER PHOTO';
				}

				numberSection.appendChild(badge);
				if (label.textContent) numberSection.appendChild(label);

				// Actions (delete)
				const actions = document.createElement('div');
				actions.className = 'photo-card-actions';

				const deleteBtn = document.createElement('button');
				deleteBtn.type = 'button';
				deleteBtn.className = 'photo-delete-btn';
				deleteBtn.innerHTML = '✕';
				deleteBtn.title = 'Delete photo';
				deleteBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					cleanupPhotoEntry(photoDraft[i]);
					photoDraft.splice(i, 1);
					photoDraft.forEach((p, idx) => { p.order = idx; });
					saveDraftPhotos();
					try { renderPhotos(); } catch(e2) { console.error('[form] renderPhotos error', e2); }
					saveDraft();
				});

				actions.appendChild(deleteBtn);

				header.appendChild(numberSection);
				header.appendChild(actions);
				card.appendChild(header);

				// Image preview
				const img = document.createElement('img');
				img.className = 'photo-card-img';
				img.src = imgSrc;
				img.alt = `photo-${i+1}`;
				img.draggable = false;
				img.onerror = () => { img.alt = 'Preview unavailable'; };
				card.appendChild(img);

				// Note textarea (modal-only editing)
				const noteLabel = document.createElement('label');
				noteLabel.style.fontSize = '0.75rem';
				noteLabel.style.fontWeight = '500';
				noteLabel.style.color = 'var(--ink-soft)';
				noteLabel.style.marginBottom = '6px';
				noteLabel.textContent = 'Photo description';
				card.appendChild(noteLabel);

				const noteInput = document.createElement('textarea');
				noteInput.className = 'photo-card-note';
				noteInput.placeholder = 'Add details about this photo (optional)';
				noteInput.value = entry.note || '';
				noteInput.addEventListener('input', (e) => {
					if (photoDraft[i]) photoDraft[i].note = e.target.value;
					saveDraft();
					saveDraftPhotos();
				});
				card.appendChild(noteInput);

				// Set as cover button
				if (i !== 0) {
					const setCoverBtn = document.createElement('button');
					setCoverBtn.type = 'button';
					setCoverBtn.className = 'photo-set-cover';
					setCoverBtn.textContent = 'Set as Cover Photo';
					setCoverBtn.addEventListener('click', (e) => {
						e.stopPropagation();
						const [coverItem] = photoDraft.splice(i, 1);
						photoDraft.unshift(coverItem);
						photoDraft.forEach((p, idx) => { p.order = idx; });
						saveDraftPhotos();
						try { renderPhotos(); } catch(e2) { console.error('[form] renderPhotos error', e2); }
						saveDraft();
					});
					card.appendChild(setCoverBtn);
				}

				// Loading overlay for in-flight uploads
				if (entry.pending) {
					const overlay = document.createElement('div');
					overlay.className = 'photo-card-loading';
					overlay.innerHTML = '<div class="photo-card-loading-spinner"></div><span class="photo-card-loading-text">Uploading…</span>';
					card.appendChild(overlay);
					deleteBtn.disabled = true;
					deleteBtn.style.opacity = '0.4';
					deleteBtn.style.pointerEvents = 'none';
				}
				modalStrip.appendChild(card);
			});

			// Initialize SortableJS for drag-and-drop (handles both desktop and mobile)
			if (window.Sortable && modalStrip.children.length > 0) {
				Sortable.create(modalStrip, {
					animation: 150,
					ghostClass: 'sortable-ghost',
					dragClass: 'sortable-drag',
					handle: '.photo-card-modal',
					forceFallback: false,
					onEnd: function(evt) {
						console.log('[form] SortableJS reorder: from', evt.oldIndex, 'to', evt.newIndex);
						if (evt.oldIndex !== evt.newIndex) {
							const [movedItem] = photoDraft.splice(evt.oldIndex, 1);
							photoDraft.splice(evt.newIndex, 0, movedItem);
							photoDraft.forEach((p, idx) => { p.order = idx; });
							saveDraftPhotos();
							try { renderPhotos(); } catch(e) { console.error('[form] renderPhotos error', e); }
							saveDraft();
						}
					}
				});
			}
		}
		
		const countMsg = document.getElementById('photo-count-msg');
		const addMoreBtn = document.getElementById('add-more-photos-btn');
		const nTotal = (photoDraft || []).length;
		const nPending = (photoDraft || []).filter(p => p.pending).length;
		if (countMsg) {
			if (nPending > 0 && nPending === nTotal) {
				countMsg.innerHTML = `<strong>Uploading ${nTotal} photo${nTotal > 1 ? 's' : ''}…</strong>`;
			} else if (nPending > 0) {
				const done = nTotal - nPending;
				countMsg.innerHTML = `${done} photo${done !== 1 ? 's' : ''} added &middot; <strong>uploading ${nPending} more…</strong>`;
			} else if (nTotal > 0) {
				countMsg.textContent = `${nTotal} photo${nTotal > 1 ? 's' : ''} added`;
			} else {
				countMsg.textContent = '';
			}
		}
		// Show "Add more" button when there are photos but room for more
		if (addMoreBtn) {
			addMoreBtn.style.display = (nTotal > 0 && nTotal < MAX_PHOTOS) ? '' : 'none';
		}
	}

	// ── DRAG AND DROP HANDLERS (Desktop HTML5 - DEPRECATED, use SortableJS instead) ────────────────────
	function handleDragStart(e) {
		// Deprecated - SortableJS handles all dragging
		console.log('[form] Note: Using SortableJS for drag, not HTML5 drag API');
	}

	function handleDragOver(e) {
		// Deprecated
	}

	function handleDrop(e) {
		// Deprecated
	}

	function handleDragEnd(e) {
		// Deprecated
	}

	// ── TOUCH DRAG FOR MOBILE (DEPRECATED - SortableJS handles all dragging) ────────────────────
	let touchStartY = 0;
	let touchStartIndex = null;

	function handleTouchStart(e) {
		// Deprecated - SortableJS handles touch events with forceFallback
		console.log('[form] Using SortableJS for touch drag');
	}

	function handleTouchMove(e) {
		// Deprecated - SortableJS handles this
	}

	function handleTouchEnd(e) {
		// Deprecated - SortableJS handles this
	}

	// Manage Photos button click handler
	const managePhotosBtn = document.getElementById('manage-photos-btn');
	if (managePhotosBtn) {
		managePhotosBtn.addEventListener('click', () => {
			if ((photoDraft || []).length === 0) {
				const photoInput = document.getElementById('photoInput');
				if (photoInput) {
					photoInput.click();
					showToastMessage('Upload photos first');
				}
			} else {
				openPhotoModal();
			}
		});
	}

	const MAX_PHOTOS = 10;
	const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB raw — will be compressed before upload

	function addFilesToStore(fileList) {
		console.log('[form] addFilesToStore called, incoming files:', fileList && fileList.length);
		setPhotoInlineMessage('');

		if (photoDraft.length >= MAX_PHOTOS) {
			setPhotoInlineMessage(`Maximum ${MAX_PHOTOS} photos allowed.`);
			return;
		}

		const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'image/avif', 'image/bmp', 'image/tiff', 'image/svg+xml'];
		const filesToUpload = [];
		const incomingFiles = Array.from(fileList || []);
		const incomingHeicNames = incomingFiles.filter(isHeicFile).map(f => f.name);
		const remainingSlots = Math.max(0, MAX_PHOTOS - photoDraft.length);
		let skippedForMax = 0;
		let skippedForDuplicate = 0;

		photoDebug('[form][photo-debug] files selected:', incomingFiles.length);
		photoDebug('[form][photo-debug] HEIC files:', incomingHeicNames.length ? incomingHeicNames : 'none');

		/*
		How it works:
		1) Intake all selected/dropped files in order.
		2) Keep originals for upload; generate previewUrl separately.
		3) Enforce max-photo limit by importing only available slots.
		4) Keep cover-photo logic intact (index 0 stays cover; reorder still works).
		*/

		// First validate all files
		incomingFiles.forEach((f) => {
			if (filesToUpload.length >= remainingSlots) {
				skippedForMax += 1;
				return;
			}

			photoDebug('[form][photo-debug] validating file:', f.name, f.type, f.size);

			if (!validImageTypes.includes(f.type) && !f.type.startsWith('image/')) {
				alert(`The file "${f.name}" is not a valid image. Please upload only photos (JPG, PNG, GIF, WebP, HEIC, etc.).`);
				return;
			}

			if (f.size > MAX_FILE_SIZE_BYTES) {
				alert(`The file "${f.name}" is too large. Please select photos under 5MB.`);
				return;
			}

			// Check for duplicates in photoDraft
			const isDuplicate = photoDraft.some(sf => sf.file && sf.file.name === f.name && sf.file.size === f.size);
			if (!isDuplicate) {
				filesToUpload.push(f);
			} else {
				skippedForDuplicate += 1;
				photoDebug('[form][photo-debug] skipping duplicate:', f.name);
			}
		});

		if (skippedForMax > 0) {
			setPhotoInlineMessage(`Only ${remainingSlots} photo${remainingSlots === 1 ? '' : 's'} could be added (max ${MAX_PHOTOS}). ${skippedForMax} skipped.`);
		}
		if (skippedForDuplicate > 0) {
			showToastMessage(`${skippedForDuplicate} duplicate photo${skippedForDuplicate === 1 ? '' : 's'} skipped.`);
		}
		if (filesToUpload.length === 0) return;

		console.log('[form] uploading file types:', filesToUpload.map(f => f.type || 'unknown (' + f.name + ')'));

		// Add placeholder entries immediately so spinner cards appear at once
		const pendingEntries = filesToUpload.map((file) => {
			const previewUrl = isHeicFile(file) ? '' : URL.createObjectURL(file);
			const entry = {
				path: '', url: '', listingId: null,
				order: photoDraft.length,
				note: '', file, originalName: file.name,
				previewUrl, pending: true
			};
			photoDraft.push(entry);
			return entry;
		});
		try { renderPhotos(); } catch(e) { console.error('[form] renderPhotos error (placeholders)', e); }

		// Upload each file and update its placeholder in-place when done
		const uploadPromises = pendingEntries.map(async (placeholder) => {
			const { file } = placeholder;
			let fileToUpload = file;
			let finalPreviewUrl = placeholder.previewUrl;
			try {
				// Convert HEIC client-side if possible; returns null if unsupported → edge function handles it
				if (isHeicFile(file)) {
					const converted = await convertHeicClientSide(file);
					if (converted) {
						fileToUpload = converted;
						finalPreviewUrl = URL.createObjectURL(fileToUpload);
						const pidx = photoDraft.indexOf(placeholder);
						if (pidx !== -1) {
							photoDraft[pidx] = { ...photoDraft[pidx], previewUrl: finalPreviewUrl };
						}
						try { renderPhotos(); } catch(e2) {}
						console.log('[form] HEIC converted client-side:', fileToUpload.name, fileToUpload.size);
					} else {
						console.log('[form] client-side HEIC conversion not possible — sending raw to edge function');
					}
				}
				const { path, url, listingId } = await uploadViaEdgeFunction(fileToUpload);
				const idx = photoDraft.indexOf(placeholder);
				if (idx !== -1) {
					photoDraft[idx] = {
						...photoDraft[idx],
						path, url, listingId,
						previewUrl: finalPreviewUrl || url,
						pending: false
					};
				}
				console.log('[form] photo added to photoDraft:', { path, listingId });
				try { renderPhotos(); } catch(e) { console.error('[form] renderPhotos error after upload', e); }
			} catch (err) {
				const idx = photoDraft.indexOf(placeholder);
				if (idx !== -1) photoDraft.splice(idx, 1);
				revokePreviewUrlIfNeeded(finalPreviewUrl);
				revokePreviewUrlIfNeeded(placeholder.previewUrl);
				console.error('[form] upload error for', file.name, err);
				try { renderPhotos(); } catch(e) {}
				alert(`Failed to upload ${file.name}: ${err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))}`);
			}
		});

		// Warn if user tries to leave while uploads are running
		const beforeUnloadGuard = e => { e.preventDefault(); e.returnValue = ''; };
		window.addEventListener('beforeunload', beforeUnloadGuard);

		// After all uploads complete, persist + final count check
		Promise.all(uploadPromises).then(() => {
			window.removeEventListener('beforeunload', beforeUnloadGuard);
			console.log('[form] all uploads complete, photoDraft:', photoDraft.length);
			saveDraftPhotos();
			try { renderPhotos(); } catch(e) { console.error('[form] renderPhotos error after all uploads', e); }
			saveDraft();
			if (photoDraft.length >= 3) clearFieldError('upload-zone');
		});
	}

	// Be resilient: input id historically was 'photo-input' in backups or may be nested.
	const photoInput = document.getElementById('photoInput') || document.getElementById('photo-input') || (uploadZone && uploadZone.querySelector('input[type=file]'));
	console.log('[form] photoInput found:', !!photoInput, photoInput?.id);
	if (photoInput) {
		if (!photoInput.multiple) photoInput.multiple = true;
		photoInput.addEventListener('change', function (e) {
			e.stopPropagation();
			const selectedFiles = Array.from(this.files || []);
			console.log('[form] photoInput change fired, files:', selectedFiles.length);
			photoDebug('[form][photo-debug] input selected files count:', selectedFiles.length);
			if (selectedFiles.length > 0) {
				const filesToAdd = [];
				selectedFiles.forEach((file) => filesToAdd.push(file));
				console.log('[form] Calling addFilesToStore with', filesToAdd.length, 'files');
				addFilesToStore(filesToAdd);
			} else {
				console.warn('[form] No files in change event');
			}
			this.value = '';
		});
		console.log('[form] photoInput change listener attached successfully');
		// Also handle drops directly on the hidden input — the input covers the zone when
		// pointer-events are enabled (dragover CSS), so drop may fire on the input, not the zone.
		photoInput.addEventListener('dragover', e => { e.preventDefault(); if (uploadZone) uploadZone.classList.add('dragover'); });
		photoInput.addEventListener('dragleave', e => { if (uploadZone) uploadZone.classList.remove('dragover'); });
		photoInput.addEventListener('drop', e => {
			e.preventDefault();
			if (uploadZone) uploadZone.classList.remove('dragover');
			const droppedFiles = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
			if (droppedFiles.length > 0) addFilesToStore(droppedFiles);
		});
	} else {
		console.error('[form] CRITICAL: photo input element not found!');
	}

	// "Add more photos" button — programmatically triggers the file input
	const addMoreBtn = document.getElementById('add-more-photos-btn');
	if (addMoreBtn && photoInput) {
		addMoreBtn.addEventListener('click', () => photoInput.click());
	}

	// Drag & drop support onto the upload zone
	if (uploadZone) {
		uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
		uploadZone.addEventListener('dragleave', e => { uploadZone.classList.remove('dragover'); });
		uploadZone.addEventListener('drop', e => {
			e.preventDefault(); uploadZone.classList.remove('dragover');
			const droppedFiles = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
			photoDebug('[form][photo-debug] dropped files count:', droppedFiles.length);
			if (droppedFiles.length > 0) addFilesToStore(droppedFiles);
		});
	}

	const semInfoBtn = document.getElementById('sem-info-btn');
	if (semInfoBtn) {
		semInfoBtn.addEventListener('click', () => {
			const popup = document.getElementById('sem-info-popup');
			if (popup) popup.classList.toggle('visible');
		});
	}


// ── Google Places Autocomplete ────────────────────────────
const addrInput   = document.getElementById('address');
const suggestions = document.getElementById('address-suggestions');
let autocompleteService = null;
let placesService = null;
let sessionToken  = null;

function initGooglePlaces() {
	if (window.google && window.google.maps && window.google.maps.places) {
		autocompleteService = new google.maps.places.AutocompleteService();
		placesService       = new google.maps.places.PlacesService(document.createElement('div'));
		sessionToken        = new google.maps.places.AutocompleteSessionToken();
	}
}
(function waitForGoogle() {
	if (window.google && window.google.maps) initGooglePlaces();
	else setTimeout(waitForGoogle, 300);
})();

async function fetchSuggestionsNominatim(q) {
	try {
		const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Boulder, CO')}&format=json&addressdetails=1&limit=5&countrycodes=us`, { headers: { 'Accept-Language': 'en' } });
		const data = await res.json();
		if (!data.length) { suggestions.classList.remove('open'); return; }
		suggestions.innerHTML = data.map(r => {
			const parts = r.display_name.split(',');
			const main  = parts[0];
			const sec   = parts.slice(1, 3).join(',').trim();
			const nbhd  = r.address.neighbourhood || r.address.suburb || r.address.city_district || r.address.quarter || 'Boulder';
			return `<div class="addr-suggestion" data-display="${main}" data-nbhd="${nbhd}">
				<svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M6 1C4.34 1 3 2.34 3 4c0 2.5 3 7 3 7s3-4.5 3-7c0-1.66-1.34-3-3-3z" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="6" cy="4" r="1" stroke="currentColor" stroke-width="1"/></svg>
				<div><span class="addr-main">${main}</span><span class="addr-secondary">${sec}</span></div>
			</div>`;
		}).join('') + '<div class="google-attribution">Powered by OpenStreetMap</div>';
		suggestions.classList.add('open');
	} catch(e) { suggestions.classList.remove('open'); }
}

function fetchSuggestionsGoogle(q) {
	if (!autocompleteService) { fetchSuggestionsNominatim(q); return; }
	autocompleteService.getPlacePredictions(
		{
			input: q,
			sessionToken,
			location: new google.maps.LatLng(40.0150, -105.2705),
			radius: 15000,
			types: ['address'],
			componentRestrictions: { country: 'us' }
		},
		(predictions, status) => {
			if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
				fetchSuggestionsNominatim(q); return;
			}
			suggestions.innerHTML = predictions.map(p => {
				const main = p.structured_formatting.main_text;
				const sec  = p.structured_formatting.secondary_text;
				return `<div class="addr-suggestion" data-place-id="${p.place_id}" data-display="${main}">
					<svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M6 1C4.34 1 3 2.34 3 4c0 2.5 3 7 3 7s3-4.5 3-7c0-1.66-1.34-3-3-3z" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="6" cy="4" r="1" stroke="currentColor" stroke-width="1"/></svg>
					<div><span class="addr-main">${main}</span><span class="addr-secondary">${sec}</span></div>
				</div>`;
			}).join('') + '<div class="google-attribution"><span>Powered by</span><img src="https://maps.gstatic.com/mapfiles/api-3/images/google_white5.png" height="11" alt="Google" style="margin-left:4px;filter:brightness(0.6)"/></div>';
			suggestions.classList.add('open');
		}
	);
}

let acTimer = null;
addrInput.addEventListener('input', () => {
	clearTimeout(acTimer);
	const q = addrInput.value.trim();
	if (q.length < 3) { suggestions.classList.remove('open'); return; }
	acTimer = setTimeout(() => {
		if (autocompleteService) fetchSuggestionsGoogle(q);
		else fetchSuggestionsNominatim(q);
	}, 300);
});

// The Hill bounding box — the residential/commercial area west of CU Boulder campus
const HILL_BOUNDS = { s: 40.000, n: 40.013, w: -105.285, e: -105.260 };
function isOnTheHill(lat, lng) {
	return lat >= HILL_BOUNDS.s && lat <= HILL_BOUNDS.n && lng >= HILL_BOUNDS.w && lng <= HILL_BOUNDS.e;
}

// ── BOULDER NEIGHBORHOOD GEO-MAP ──
// More specific than what Google Places API returns.
// Checked top-to-bottom; first match wins. Ordered from most specific to broadest.
const BOULDER_NEIGHBORHOODS = [
	// The Hill (already handled separately, listed here for completeness)
	{ name: 'The Hill',               s: 40.000, n: 40.013, w: -105.285, e: -105.260 },

	// North Boulder — starts around Iris Ave (~40.023) up to city limits
	{ name: 'North Boulder',          s: 40.023, n: 40.065, w: -105.300, e: -105.245 },
	// Northfield / Gunbarrel fringe
	{ name: 'Gunbarrel',              s: 40.055, n: 40.080, w: -105.195, e: -105.140 },

	// Near campus areas
	{ name: 'University Hill',        s: 39.995, n: 40.005, w: -105.285, e: -105.265 },
	{ name: 'Chautauqua',             s: 39.990, n: 40.000, w: -105.295, e: -105.275 },
	{ name: 'Goss-Grove',             s: 40.010, n: 40.018, w: -105.285, e: -105.270 },
	{ name: 'Whittier',               s: 40.013, n: 40.022, w: -105.275, e: -105.255 },

	// Central / Downtown
	{ name: 'Downtown Boulder',       s: 40.013, n: 40.022, w: -105.285, e: -105.270 },
	{ name: 'Pearl Street',           s: 40.017, n: 40.022, w: -105.285, e: -105.255 },
	{ name: 'Mapleton Hill',          s: 40.020, n: 40.028, w: -105.295, e: -105.283 },
	{ name: 'Newlands',               s: 40.028, n: 40.040, w: -105.295, e: -105.270 },

	// East Boulder
	{ name: 'East Boulder',           s: 40.000, n: 40.035, w: -105.235, e: -105.195 },
	{ name: 'Flatirons Park',         s: 40.000, n: 40.015, w: -105.250, e: -105.235 },

	// South Boulder
	{ name: 'South Boulder',          s: 39.970, n: 39.998, w: -105.280, e: -105.230 },
	{ name: 'Table Mesa',             s: 39.978, n: 39.995, w: -105.270, e: -105.245 },
	{ name: 'Martin Acres',           s: 39.985, n: 39.998, w: -105.260, e: -105.240 },

	// Broader areas (catch-all)
	{ name: 'North Central Boulder',  s: 40.022, n: 40.035, w: -105.290, e: -105.245 },
	{ name: 'Central Boulder',        s: 40.005, n: 40.022, w: -105.290, e: -105.245 },
	{ name: 'South Central Boulder',  s: 39.990, n: 40.005, w: -105.290, e: -105.245 },
];

/**
 * Given lat/lng, return the most specific Boulder neighborhood name, or '' if outside all bounds.
 */
function classifyNeighborhood(lat, lng) {
	for (const n of BOULDER_NEIGHBORHOODS) {
		if (lat >= n.s && lat <= n.n && lng >= n.w && lng <= n.e) {
			return n.name;
		}
	}
	return '';
}

/**
 * Check if a neighborhood name from Google is too generic and should be replaced.
 */
const GENERIC_NEIGHBORHOODS = ['boulder', 'central boulder', 'boulder county', 'downtown boulder'];
function isGenericNeighborhood(name) {
	return GENERIC_NEIGHBORHOODS.includes((name || '').toLowerCase().trim());
}

function setNeighborhood(nbhd, isHill = false) {
	document.getElementById('neighborhood').value = nbhd;
	document.getElementById('neighborhood-text').textContent = isHill ? '⛰ The Hill · Boulder, CO' : '📍 ' + nbhd;
	const badge = document.getElementById('neighborhood-badge');
	badge.classList.toggle('hill', isHill);
	badge.classList.add('visible');
}

suggestions.addEventListener('click', e => {
	const item = e.target.closest('.addr-suggestion');
	if (!item) return;

	addrInput.value = item.dataset.display;
	suggestions.classList.remove('open');
	clearFieldError('address');
	saveDraft();

	const placeId = item.dataset.placeId;
	if (placeId && placesService) {
		sessionToken = new google.maps.places.AutocompleteSessionToken();
		placesService.getDetails({ placeId, fields: ['address_components', 'geometry'] }, (place, status) => {
			if (status === google.maps.places.PlacesServiceStatus.OK && place) {
				let lat, lng;
				if (place.geometry?.location) {
					lat = place.geometry.location.lat();
					lng = place.geometry.location.lng();
					console.log('[address] lat:', lat, 'lng:', lng);
					// Store coordinates so buildPayload can include them for distance calculation
					const latEl = document.getElementById('lat-hidden');
					const lngEl = document.getElementById('lng-hidden');
					if (latEl) latEl.value = lat;
					if (lngEl) lngEl.value = lng;
					if (isOnTheHill(lat, lng)) {
						setNeighborhood('The Hill', true);
						saveDraft();
						return;
					}
				}
				let nbhd = '';
				const specificTypes = ['neighborhood', 'sublocality_level_2', 'sublocality_level_1'];
				for (const targetType of specificTypes) {
					const matchedComponent = place.address_components.find(c => c.types.includes(targetType));
					if (matchedComponent) {
						nbhd = matchedComponent.long_name;
						break;
					}
				}
				if (!nbhd) {
					const localityComp = place.address_components.find(c => c.types.includes('locality'));
					if (localityComp) nbhd = localityComp.long_name;
				}
				// If Google returned something too generic, use our geo-map instead
				if ((!nbhd || isGenericNeighborhood(nbhd)) && lat != null && lng != null) {
					const geoNbhd = classifyNeighborhood(lat, lng);
					if (geoNbhd) {
						console.log('[address] overriding generic "' + nbhd + '" → "' + geoNbhd + '"');
						nbhd = geoNbhd;
					}
				}
				if (nbhd) setNeighborhood(nbhd);
				else lookupNeighborhood();
			} else {
				lookupNeighborhood();
			}
		});
	} else if (item.dataset.nbhd) {
		setNeighborhood(item.dataset.nbhd);
	}
});

document.addEventListener('click', e => {
	if (!e.target.closest('.address-wrap')) suggestions.classList.remove('open');
});

async function lookupNeighborhood() {
	const addr = addrInput.value.trim();
	if (!addr) return;
	if (document.getElementById('neighborhood').value) return;
	const badge = document.getElementById('neighborhood-badge');
	const txt   = document.getElementById('neighborhood-text');
	txt.textContent = 'Finding your neighborhood...';
	badge.classList.add('visible');
	try {
		const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr + ', Boulder, CO')}&format=json&addressdetails=1&limit=1`, { headers: { 'Accept-Language': 'en' } });
		const data = await res.json();
		if (data && data[0]) {
			const a    = data[0].address;
			let nbhd = a.neighbourhood || a.suburb || a.city_district || a.quarter || '';

			// If Nominatim gave something generic, try our geo-map using coords
			const lat = parseFloat(data[0].lat);
			const lng = parseFloat(data[0].lon);
			if ((!nbhd || isGenericNeighborhood(nbhd)) && !isNaN(lat) && !isNaN(lng)) {
				const geoNbhd = classifyNeighborhood(lat, lng);
				if (geoNbhd) {
					console.log('[address] Nominatim override: "' + nbhd + '" → "' + geoNbhd + '"');
					nbhd = geoNbhd;
				}
			}

			if (nbhd) {
				setNeighborhood(nbhd);
				saveDraft();
			} else {
				// Last resort: try geo-map with stored lat/lng
				const latEl = document.getElementById('lat-hidden');
				const lngEl = document.getElementById('lng-hidden');
				const sLat = parseFloat(latEl?.value);
				const sLng = parseFloat(lngEl?.value);
				if (!isNaN(sLat) && !isNaN(sLng)) {
					const geoNbhd = classifyNeighborhood(sLat, sLng);
					if (geoNbhd) {
						setNeighborhood(geoNbhd);
						saveDraft();
						return;
					}
				}
				badge.classList.remove('visible');
			}
		} else {
			badge.classList.remove('visible');
		}
	} catch(e) {
		badge.classList.remove('visible');
	}
}

addrInput.addEventListener('input', () => { document.getElementById('neighborhood').value = ''; });
addrInput.addEventListener('blur', () => setTimeout(lookupNeighborhood, 250));

const emailInput = document.getElementById('email');
const emailError = document.getElementById('email-error');

function validateEmail() {
	const v = emailInput.value.trim();
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
  
	if (!v) { 
		emailError.textContent = 'Email is required.'; 
		emailError.style.display = 'block'; 
		emailInput.style.borderColor = 'var(--red)'; 
		return false; 
	}
	if (!emailRegex.test(v)) {
		emailError.textContent = 'Please enter a valid email format.'; 
		emailError.style.display = 'block'; 
		emailInput.style.borderColor = 'var(--red)'; 
		return false; 
	}
	if (!v.toLowerCase().endsWith('@colorado.edu')) { 
		emailError.textContent = 'Must be a @colorado.edu email address.'; 
		emailError.style.display = 'block'; 
		emailInput.style.borderColor = 'var(--red)'; 
		return false; 
	}
  
	emailError.style.display = 'none'; 
	emailInput.style.borderColor = ''; 
	return true;
}

emailInput.addEventListener('blur', validateEmail);
emailInput.addEventListener('input', () => {
	if (emailInput.value.toLowerCase().endsWith('@colorado.edu')) { 
		emailError.style.display = 'none'; 
		emailInput.style.borderColor = ''; 
	}
});

function validateDates(onSubmit) {
	const startEl = document.getElementById('start-date'), endEl = document.getElementById('end-date');
	const startErr = document.getElementById('start-error'), endErr = document.getElementById('end-error');
	const today = new Date(); today.setHours(0,0,0,0);
	let valid = true;
	if (onSubmit || startEl.value) {
		startErr.textContent = ''; startErr.classList.remove('visible');
		if (!startEl.value) { if (onSubmit) { startErr.textContent = 'Please select a start date.'; startErr.classList.add('visible'); valid = false; } }
		else if (new Date(startEl.value + 'T00:00:00') < today) { startErr.textContent = 'Start date cannot be in the past.'; startErr.classList.add('visible'); valid = false; }
	} else if (!startEl.value) valid = false;
	if (onSubmit || endEl.value) {
		endErr.textContent = ''; endErr.classList.remove('visible');
		if (!endEl.value) { if (onSubmit) { endErr.textContent = 'Please select an end date.'; endErr.classList.add('visible'); valid = false; } }
		else if (startEl.value && new Date(endEl.value + 'T00:00:00') <= new Date(startEl.value + 'T00:00:00')) { endErr.textContent = 'End date must be after start date.'; endErr.classList.add('visible'); valid = false; }
	} else if (!endEl.value) valid = false;
	return valid;
}
document.getElementById('start-date').addEventListener('change', () => validateDates(false));
document.getElementById('end-date').addEventListener('change', () => validateDates(false));

['housing-type','unit-type'].forEach(id => {
	document.getElementById(id).addEventListener('click', e => {
		const btn = e.target.closest('.toggle-btn'); if (!btn) return;
		document.getElementById(id).querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
saveDraft();
	});
});

const prefEmailBtn = document.getElementById('pref-email');
const prefTextBtn  = document.getElementById('pref-text');
[prefEmailBtn, prefTextBtn].forEach(btn => btn.addEventListener('click', () => {
	[prefEmailBtn, prefTextBtn].forEach(b => b.classList.remove('active'));
	btn.classList.add('active');
	const optionalTag = document.getElementById('phone-optional-tag');
	if (btn === prefTextBtn) {
		if (optionalTag) optionalTag.style.display = 'none';
	} else {
		if (optionalTag) optionalTag.style.display = '';
		clearFieldError('phone');
	}
	saveDraft();
}));

document.querySelectorAll('input[name="pets-prop"]').forEach(r => r.addEventListener('change', () => {
	document.getElementById('pets-expand').classList.toggle('open', r.value === 'yes' && r.checked);
	saveDraft();
}));
document.querySelectorAll('.pet-tag').forEach(t => t.addEventListener('click', () => {
		t.classList.toggle('active');
		saveDraft();
}));

document.querySelectorAll('input[name="furnished"]').forEach(r => r.addEventListener('change', () => {
	document.getElementById('furnished-expand').classList.toggle('open', r.value === 'yes' && r.checked);
	saveDraft();
}));

['confirm-allowed','confirm-leaseholder','confirm-tos'].forEach(id => {
	document.getElementById(id).addEventListener('change', function () {
		if (this.checked) this.closest('.confirm-item').classList.remove('error');
		const anyUnchecked = ['confirm-allowed','confirm-leaseholder','confirm-tos'].some(i => !document.getElementById(i).checked);
		if (!anyUnchecked) document.getElementById('confirm-error-banner').classList.add('hidden');
		saveDraft();
	});
});

document.querySelectorAll('input[name="lease-type"]').forEach(radio => {
	radio.addEventListener('change', () => {
		document.getElementById('lease-type-error').style.display = 'none';
		document.getElementById('lease-check-sublease').classList.remove('error');
		document.getElementById('lease-check-takeover').classList.remove('error');
		saveDraft();
	});
});

// ── Price Reduction Feature ────────────────────────
const priceReductionBtns = document.querySelectorAll('#price-reduction-enable');
const priceReductionSection = document.getElementById('price-reduction-section');
if (priceReductionBtns && priceReductionSection) {
	priceReductionBtns.forEach(btn => {
		btn.addEventListener('click', () => {
			priceReductionBtns.forEach(b => b.classList.remove('active'));
			btn.classList.add('active');
			const val = btn.dataset.val;
			priceReductionSection.style.display = val === 'yes' ? 'block' : 'none';
			saveDraft();
		});
	});
}

// ── Input Validation: Prevent negative values ────────────────────────
['rent', 'deposit', 'reduction-amount', 'reduction-days', 'reduction-count'].forEach(id => {
	const input = document.getElementById(id);
	if (input) {
		input.addEventListener('change', function() {
			if (this.value && (isNaN(this.value) || parseFloat(this.value) < 0)) {
				this.value = '0';
			}
		});
		input.addEventListener('input', function() {
			if (this.value.startsWith('-')) {
				this.value = this.value.substring(1);
			}
		});
	}
});

function showFieldError(id, msg) {
	const el = document.getElementById(id); if (!el) return;
	el.style.borderColor = 'var(--red)';
	const p = el.closest('.field') || el.parentElement;
	if (!p.querySelector('.error-msg')) { const e = document.createElement('span'); e.className = 'error-msg'; e.textContent = msg; p.appendChild(e); }
}
function clearFieldError(id) {
	const el = document.getElementById(id); if (!el) return;
	el.style.borderColor = '';
	const p = el.closest('.field') || el.parentElement;
	p.querySelectorAll('.error-msg').forEach(e => e.remove());
}
document.getElementById('rent').addEventListener('input', () => clearFieldError('rent'));
document.getElementById('address').addEventListener('input', () => clearFieldError('address'));
document.getElementById('description').addEventListener('input', () => clearFieldError('description'));

const phoneInput = document.getElementById('phone');
const phoneRegex = /^(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;

function validatePhone(required) {
	const v = phoneInput ? phoneInput.value.trim() : '';
	if (!v) {
		if (required) {
			showFieldError('phone', 'Phone number is required when preferred contact is Text.');
			return false;
		}
		clearFieldError('phone');
		return true;
	}
	if (!phoneRegex.test(v)) {
		showFieldError('phone', 'Please enter a valid US phone number (e.g. 303-555-0000).');
		return false;
	}
	clearFieldError('phone');
	return true;
}

if (phoneInput) {
	phoneInput.addEventListener('blur', () => validatePhone(prefTextBtn.classList.contains('active')));
	phoneInput.addEventListener('input', () => clearFieldError('phone'));
}

let autosaveTimer;
function showAutosaveBadge() {
	const badge = document.getElementById('autosave-badge');
	badge.classList.add('visible');
	clearTimeout(autosaveTimer);
	autosaveTimer = setTimeout(() => {
		badge.classList.remove('visible');
	}, 2000);
}

function saveDraft() {
	const data = {
		email: emailInput.value,
		firstName: document.getElementById('first-name').value,
		lastName: document.getElementById('last-name').value,
		rent: document.getElementById('rent').value,
		address: addrInput.value,
		neighborhood: document.getElementById('neighborhood').value,
		lat: document.getElementById('lat-hidden').value,
		lng: document.getElementById('lng-hidden').value,
		unit: document.getElementById('unit-number').value,
		beds: document.getElementById('beds').value,
		baths: document.getElementById('baths').value,
		furnished: document.querySelector('input[name="furnished"]:checked')?.value || '',
		furnishedNotes: document.getElementById('furnished-notes').value,
		startDate: document.getElementById('start-date').value,
		endDate: document.getElementById('end-date').value,
		flexible: document.querySelector('input[name="flexible"]:checked')?.value || '',
		flexNotes: document.getElementById('flex-notes').value,
		phone: document.getElementById('phone').value,
		bestTime: document.getElementById('best-time').value,
		housingType: document.querySelector('#housing-type .toggle-btn.active')?.dataset.val || '',
		unitType: document.querySelector('#unit-type .toggle-btn.active')?.dataset.val || '',
genderPref: document.getElementById('gender-pref').value,
		petsProp: document.querySelector('input[name="pets-prop"]:checked')?.value || '',
		pets: [...document.querySelectorAll('.pet-tag.active')].map(t => t.dataset.pet),
		petNotes: document.getElementById('pet-notes').value,
		description: document.getElementById('description').value,
		leaseType: document.querySelector('input[name="lease-type"]:checked')?.value || '',
		deposit: document.getElementById('deposit').value,
		prefContact: prefEmailBtn.classList.contains('active') ? 'email' : 'text',
		priceReductionEnabled: document.querySelector('#price-reduction-enable.active')?.dataset.val === 'yes',
		reductionDays: document.getElementById('reduction-days').value,
		reductionAmount: document.getElementById('reduction-amount').value,
		reductionCount: document.getElementById('reduction-count').value,
		photoNotes: photoDraft.map(p => p.note)
	};
	localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
	showAutosaveBadge();
}

function loadDraft() {
	const raw = localStorage.getItem(DRAFT_KEY);
	if (!raw) return;
	try {
		const draft = JSON.parse(raw);
		if(draft.email) emailInput.value = draft.email;
		if(draft.firstName) document.getElementById('first-name').value = draft.firstName;
		if(draft.lastName) document.getElementById('last-name').value = draft.lastName;
		if(draft.rent) document.getElementById('rent').value = draft.rent;
		if(draft.address) { addrInput.value = draft.address; }
		if(draft.lat) { const el = document.getElementById('lat-hidden'); if(el) el.value = draft.lat; }
		if(draft.lng) { const el = document.getElementById('lng-hidden'); if(el) el.value = draft.lng; }
		if(draft.neighborhood) setNeighborhood(draft.neighborhood, draft.neighborhood === 'The Hill');
		else if(draft.address) setTimeout(lookupNeighborhood, 100);
		if(draft.unit) document.getElementById('unit-number').value = draft.unit;
		if(draft.beds) document.getElementById('beds').value = draft.beds;
		if(draft.baths) document.getElementById('baths').value = draft.baths;
    
		if(draft.furnished) {
			document.querySelector(`input[name="furnished"][value="${draft.furnished}"]`).checked = true;
			if(draft.furnished === 'yes') document.getElementById('furnished-expand').classList.add('open');
		}
		if(draft.furnishedNotes) document.getElementById('furnished-notes').value = draft.furnishedNotes;
    
		if(draft.startDate) document.getElementById('start-date').value = draft.startDate;
		if(draft.endDate) document.getElementById('end-date').value = draft.endDate;
		if(draft.flexible) document.querySelector(`input[name="flexible"][value="${draft.flexible}"]`).checked = true;
		if(draft.flexNotes) document.getElementById('flex-notes').value = draft.flexNotes;
		if(draft.phone) document.getElementById('phone').value = draft.phone;
		if(draft.bestTime) document.getElementById('best-time').value = draft.bestTime;
    
		if(draft.housingType) {
				document.querySelectorAll('#housing-type .toggle-btn').forEach(b => b.classList.remove('active'));
				const btn = document.querySelector(`#housing-type .toggle-btn[data-val="${draft.housingType}"]`);
				if(btn) btn.classList.add('active');
		}
		if(draft.unitType) {
				document.querySelectorAll('#unit-type .toggle-btn').forEach(b => b.classList.remove('active'));
				const btn = document.querySelector(`#unit-type .toggle-btn[data-val="${draft.unitType}"]`);
				if(btn) {
						btn.classList.add('active');
					}
		}
		if(draft.genderPref) document.getElementById('gender-pref').value = draft.genderPref;
    
		if(draft.petsProp) {
				document.querySelector(`input[name="pets-prop"][value="${draft.petsProp}"]`).checked = true;
				if(draft.petsProp === 'yes') document.getElementById('pets-expand').classList.add('open');
		}
		if(draft.pets && Array.isArray(draft.pets)) {
				draft.pets.forEach(p => {
						const tag = document.querySelector(`.pet-tag[data-pet="${p}"]`);
						if(tag) tag.classList.add('active');
				});
		}
		if(draft.petNotes) document.getElementById('pet-notes').value = draft.petNotes;
		if(draft.description) document.getElementById('description').value = draft.description;
    
		if(draft.leaseType) {
			const radio = document.querySelector(`input[name="lease-type"][value="${draft.leaseType}"]`);
			if(radio) radio.checked = true;
		}
		if(draft.deposit) document.getElementById('deposit').value = draft.deposit;
    
		if(draft.prefContact === 'email') { prefEmailBtn.classList.add('active'); prefTextBtn.classList.remove('active'); } 
		else { prefTextBtn.classList.add('active'); prefEmailBtn.classList.remove('active'); }

		if(draft.priceReductionEnabled) {
			const yesBtn = Array.from(document.querySelectorAll('#price-reduction-enable')).find(b => b.dataset.val === 'yes');
			if(yesBtn) {
				yesBtn.classList.add('active');
				document.getElementById('price-reduction-section').style.display = 'block';
			}
		} else {
			const noBtn = Array.from(document.querySelectorAll('#price-reduction-enable')).find(b => b.dataset.val === 'no');
			if(noBtn) noBtn.classList.add('active');
		}
		if(draft.reductionDays) document.getElementById('reduction-days').value = draft.reductionDays;
		if(draft.reductionAmount) document.getElementById('reduction-amount').value = draft.reductionAmount;
		if(draft.reductionCount) document.getElementById('reduction-count').value = draft.reductionCount;
	} catch(e) { console.error("Draft load failed:", e); }
}

if (formEl) {
	formEl.addEventListener('input', saveDraft);
	formEl.addEventListener('change', saveDraft);
}

// we're already inside DOMContentLoaded; run loadDraft immediately
loadDraft();

// Show/hide flex move-in notes when "Yes" is selected
document.querySelectorAll('input[name="flexible"]').forEach(radio => {
	radio.addEventListener('change', () => {
		const field = document.getElementById('flex-notes-field');
		if (field) field.style.display = radio.value === 'yes' && radio.checked ? '' : 'none';
	});
});
// Restore visibility on load if draft had "yes"
(function() {
	const checked = document.querySelector('input[name="flexible"]:checked');
	if (checked && checked.value === 'yes') {
		const field = document.getElementById('flex-notes-field');
		if (field) field.style.display = '';
	}
})();

function buildPayload(photoUrls = []) {
	const pets = [...document.querySelectorAll('.pet-tag.active')].map(t => t.dataset.pet).join(', ');
	const petsNotes = document.getElementById('pet-notes').value.trim();
	const petsVal = document.querySelector('input[name="pets-prop"]:checked')?.value || '';
  
	const furnVal = document.querySelector('input[name="furnished"]:checked')?.value || '';
	const furnNotes = document.getElementById('furnished-notes').value.trim();
	const furnStr = (furnVal === 'yes' && furnNotes) ? `Yes (${furnNotes})` : (furnVal === 'yes' ? 'Yes' : null);

	const rentVal = document.getElementById('rent').value;
	const depositVal = document.getElementById('deposit').value;

	return {
		email: emailInput.value,
		first_name: document.getElementById('first-name').value,
		last_name: document.getElementById('last-name').value || null,
		monthly_rent: rentVal ? parseInt(rentVal) : null,
		address: addrInput.value,
		unit_number: document.getElementById('unit-number').value || null,
		neighborhood: document.getElementById('neighborhood').value || null,
		lat: parseFloat(document.getElementById('lat-hidden').value) || null,
		lng: parseFloat(document.getElementById('lng-hidden').value) || null,
		beds: document.getElementById('beds').value || null,
		baths: document.getElementById('baths').value || null,
		furnished: furnStr,
		start_date: document.getElementById('start-date').value || null,
		end_date: document.getElementById('end-date').value || null,
		flexible_movein: document.querySelector('input[name="flexible"]:checked')?.value || null,
		flexible_movein_notes: document.getElementById('flex-notes').value.trim() || null,
		phone: document.getElementById('phone').value || null,
		preferred_contact: prefEmailBtn.classList.contains('active') ? 'Email' : 'Text',
		best_time: document.getElementById('best-time').value || null,
		housing_type: document.querySelector('#housing-type .toggle-btn.active')?.dataset.val || null,
		unit_type: document.querySelector('#unit-type .toggle-btn.active')?.dataset.val || null,
		gender_preference: document.getElementById('gender-pref').value || null,
		pets: petsVal === 'yes' ? [pets, petsNotes].filter(Boolean).join('; ') : 'No',
		description: document.getElementById('description').value,
		lease_type: document.querySelector('input[name="lease-type"]:checked')?.value || null,
		security_deposit: depositVal ? parseInt(depositVal) : null,
		price_reduction_enabled: document.querySelector('#price-reduction-enable.active')?.dataset.val === 'yes',
		price_reduction_days: document.getElementById('reduction-days').value ? parseInt(document.getElementById('reduction-days').value) : null,
		price_reduction_amount: document.getElementById('reduction-amount').value ? parseInt(document.getElementById('reduction-amount').value) : null,
		price_reduction_count: document.getElementById('reduction-count').value ? parseInt(document.getElementById('reduction-count').value) : null,
		photo_urls: photoUrls,
		status: 'pending',
		verified: false
	};
}

function buildFullAddressForGeocode() {
	const street = String(addrInput?.value || '').trim();
	const unit = String(document.getElementById('unit-number')?.value || '').trim();
	const unitPart = unit ? `Unit ${unit}` : '';
	const base = [street, unitPart].filter(Boolean).join(', ');
	if (!base) return '';
	return `${base}, Boulder, CO`;
}

// ── SUBMIT TO SUPABASE ─────────────
document.getElementById('listing-form').addEventListener('submit', async e => {
	e.preventDefault();
	let valid = true;
  
	// 1. Email Regex
	if (!validateEmail()) valid = false;
  
	// 2. Positive Rent Validation
	const rentEl = document.getElementById('rent');
	const rentVal = parseInt(rentEl.value);
	if (isNaN(rentVal) || rentVal <= 0) { 
		showFieldError('rent', 'Please enter a positive rent amount.'); 
		valid = false; 
	} else clearFieldError('rent');
  
	// 3. Positive Deposit Validation
	const depEl = document.getElementById('deposit');
	if (depEl.value) {
		const depVal = parseInt(depEl.value);
		if (depVal < 0) { 
			showFieldError('deposit', 'Deposit cannot be negative.'); 
			valid = false; 
		} else clearFieldError('deposit');
	}

	if (!addrInput.value.trim()) { showFieldError('address', 'Please enter the street address.'); valid = false; } else clearFieldError('address');
	if (!document.getElementById('description').value.trim()) { showFieldError('description', 'Please add a listing description.'); valid = false; } else clearFieldError('description');

	// Phone validation (required if Text is preferred contact)
	if (!validatePhone(prefTextBtn.classList.contains('active'))) valid = false;
  
	// 4. Date and 30-Day Validation
	if (!validateDates(true)) {
		valid = false;
	} else {
		const startVal = document.getElementById('start-date').value;
		const endVal = document.getElementById('end-date').value;
		if (startVal && endVal) {
			const startDate = new Date(startVal + 'T00:00:00');
			const endDate = new Date(endVal + 'T00:00:00');
			const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
			if (diffDays < 30) {
				const endErr = document.getElementById('end-error');
				endErr.textContent = `Listings must be at least 30 days (currently ${diffDays} days).`;
				endErr.classList.add('visible');
				valid = false;
			}
		}
	}
  
	if (photoDraft.length < 3) {
		valid = false;
		const zone = document.getElementById('upload-zone');
		zone.style.borderColor = 'var(--red)';
		const p = zone.parentElement;
		if (!p.querySelector('.error-msg')) { const err = document.createElement('span'); err.className = 'error-msg'; err.textContent = 'Please upload at least 3 photos.'; zone.after(err); }
	} else { document.getElementById('upload-zone').style.borderColor = ''; document.getElementById('upload-zone').parentElement.querySelectorAll('.error-msg').forEach(e => e.remove()); }

	const leaseChecked = document.querySelector('input[name="lease-type"]:checked');
	if (!leaseChecked) {
		valid = false;
		document.getElementById('lease-type-error').style.display = 'block';
		document.getElementById('lease-check-sublease').classList.add('error');
		document.getElementById('lease-check-takeover').classList.add('error');
	} else {
		document.getElementById('lease-type-error').style.display = 'none';
		document.getElementById('lease-check-sublease').classList.remove('error');
		document.getElementById('lease-check-takeover').classList.remove('error');
	}

	let anyConfirmUnchecked = false;
	['confirm-allowed','confirm-leaseholder','confirm-tos'].forEach(id => {
		const cb = document.getElementById(id);
		if (!cb.checked) {
			valid = false;
			anyConfirmUnchecked = true;
			cb.closest('.confirm-item').classList.add('error');
		} else {
			cb.closest('.confirm-item').classList.remove('error');
		}
	});
  
	const banner = document.getElementById('confirm-error-banner');
	if (anyConfirmUnchecked) { banner.classList.remove('hidden'); } else { banner.classList.add('hidden'); }

	if (!valid) return;

	// ── Auth gate: require Google sign-in before submitting ──
	let session = null;
	if (window.sbAuth) {
		const { data } = await window.sbAuth.getSession();
		session = data?.session || null;
	}
	if (!session) {
		const gate = document.getElementById('signin-gate');
		if (gate) { gate.style.display = ''; gate.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
		return;
	}

	const submitBtn = document.querySelector('.btn-submit');
	const originalBtnText = submitBtn.textContent;

	if (!supabaseClient) {
		alert("Database connection failed. Please refresh the page and try again.");
		return;
	}
  
	submitBtn.textContent = 'Uploading Photos...';
	submitBtn.disabled = true;
  
	try { 
		const BUCKET_NAME = 'listing-photos'; 
		const uploadedUrls = [];

		// Use photoDraft (already uploaded during photo selection)
		// Do NOT re-upload; just build photos_meta from draft
		const photosMeta = [];
		if (photoDraft && photoDraft.length > 0) {
			console.log('[form] building photos_meta from photoDraft:', photoDraft.length);
			photoDraft.forEach((photo, idx) => {
				uploadedUrls.push(photo.url);
				photosMeta.push({
					path: photo.path,
					url: photo.url,
					order: idx,
					note: photo.note
				});
			});
		} else {
			console.warn('[form] no draft photos found, photoDraft:', photoDraft);
		}

		submitBtn.textContent = 'Saving Listing...';
		const payload = buildPayload(uploadedUrls);
		// attach photos_meta (array of {path, url, order, note}) built from the draft
		payload.photos_meta = photosMeta;

		try {
			if (currentListingId) {
				persistUploadListingId(currentListingId);
				console.error('[form] updating listing', currentListingId, { photosCount: photosMeta.length });
				const { error } = await supabaseClient
					.from('listings')
					.update(payload)
					.eq('id', currentListingId);
				if (error) { console.error('[form] Supabase update error', error); throw error; }
			} else {
				console.error('[form] inserting listing', { photosCount: photosMeta.length });
				const newId = crypto.randomUUID();
				payload.id = newId;
				if (session?.user?.id) payload.user_id = session.user.id;
				const { error } = await supabaseClient
					.from('listings')
					.insert([payload]);
				if (error) { console.error('[form] Supabase insert error', error); throw error; }
				currentListingId = newId;
				persistUploadListingId(currentListingId);
				const fullAddress = buildFullAddressForGeocode();
				if (fullAddress && currentListingId) {
					try {
						const { data: geocodeData, error: geocodeError } = await supabaseClient.functions.invoke('geocode-listing', {
							body: {
								listing_id: currentListingId,
								address: fullAddress
							}
						});
						if (geocodeError) {
							console.error('[form] geocode-listing invoke failed (non-blocking):', geocodeError.message || geocodeError);
						} else if (!geocodeData || geocodeData.ok !== true) {
							console.error('[form] geocode-listing returned non-ok response (non-blocking):', geocodeData);
						}
					} catch (geocodeInvokeErr) {
						console.error('[form] geocode-listing invoke threw (non-blocking):', geocodeInvokeErr);
					}
				}
			}
		} catch(dbErr) {
			console.error('[form] database write failed', dbErr);
			throw new Error('Database write error: ' + (dbErr?.message || dbErr));
		}


	} catch(err) {
		console.error("Submission Error:", err);
		alert("There was an issue: " + err.message);
		submitBtn.textContent = originalBtnText;
		submitBtn.disabled = false;
		return;
	}
  
	localStorage.removeItem(DRAFT_KEY);
	clearDraftPhotos(); // Clear photo draft after successful submit
	document.getElementById('listing-form').style.display = 'none';
	document.getElementById('success-screen').classList.add('visible');
	document.querySelector('.page-title').style.display = 'none';
	document.querySelector('.email-notice').style.display = 'none';
	document.getElementById('autosave-badge').style.display = 'none'; 
	setNavPostLinkVisibility(false);
	window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('btn-edit').addEventListener('click', () => {
	document.getElementById('success-screen').classList.remove('visible');
	document.getElementById('listing-form').style.display = '';
	document.querySelector('.page-title').style.display = '';
	document.querySelector('.email-notice').style.display = '';
	document.getElementById('autosave-badge').style.display = '';
  
	const submitBtn = document.querySelector('.btn-submit');
	submitBtn.textContent = 'Submit Listing';
	submitBtn.disabled = false;
  
	setNavPostLinkVisibility(true);
	window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── RESET FORM BUTTON ─────────────
let resetConfirmPending = false;
let resetConfirmTimer = null;
const resetFormBtn = document.getElementById('reset-form-btn');
if (resetFormBtn) {
	resetFormBtn.addEventListener('click', () => {
		if (!resetConfirmPending) {
			resetConfirmPending = true;
			resetFormBtn.textContent = 'Confirm Reset?';
			resetFormBtn.classList.add('confirm');
			resetConfirmTimer = setTimeout(() => {
				resetConfirmPending = false;
				resetFormBtn.textContent = 'Reset Form';
				resetFormBtn.classList.remove('confirm');
			}, 3000);
		} else {
			clearTimeout(resetConfirmTimer);
			resetConfirmPending = false;
			// Reset the form
			if (formEl) formEl.reset();
			clearDraftPhotos();
			localStorage.removeItem(DRAFT_KEY);
			try { renderPhotos(); } catch(e) {}
			// Reset toggle/contact buttons
			document.querySelectorAll('.toggle-btn.active').forEach(b => b.classList.remove('active'));
			[prefEmailBtn, prefTextBtn].forEach(b => b.classList.remove('active'));
			// Restore phone optional tag
			const optionalTag = document.getElementById('phone-optional-tag');
			if (optionalTag) optionalTag.style.display = '';
			// Close expanded sections
			document.getElementById('furnished-expand').classList.remove('open');
			document.getElementById('pets-expand').classList.remove('open');
			document.getElementById('price-reduction-section').style.display = 'none';
			// Reset neighborhood
			document.getElementById('neighborhood-badge').classList.remove('visible');
			document.getElementById('neighborhood').value = '';
			// Clear lease errors
			document.getElementById('lease-type-error').style.display = 'none';
			document.getElementById('lease-check-sublease').classList.remove('error');
			document.getElementById('lease-check-takeover').classList.remove('error');
			// Clear confirm errors
			['confirm-allowed', 'confirm-leaseholder', 'confirm-tos'].forEach(id => {
				const el = document.getElementById(id);
				if (el) el.closest('.confirm-item').classList.remove('error');
			});
			document.getElementById('confirm-error-banner').classList.add('hidden');
			// Clear email/field errors
			if (emailError) emailError.style.display = 'none';
			if (emailInput) emailInput.style.borderColor = '';
			clearFieldError('phone');
			// Reset button state
			resetFormBtn.textContent = 'Reset Form';
			resetFormBtn.classList.remove('confirm');
			showToastMessage('Form has been reset.');
		}
	});
}

document.getElementById('btn-verify').addEventListener('click', () => {
	const code = document.getElementById('verify-code').value.trim();
	const errEl = document.getElementById('verify-error');
	if (!code) { errEl.textContent = 'Please enter the verification code.'; errEl.style.display = 'block'; return; }
	errEl.style.display = 'none';
	document.querySelector('.verify-box').innerHTML = '<p style="color:var(--green);font-weight:600;font-size:.9375rem">✓ Email verified! Your listing is now in review.</p>';
});

});


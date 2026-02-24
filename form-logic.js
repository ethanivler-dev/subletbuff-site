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

	function setNavPostLinkVisibility(visible) {
		const d = document.getElementById('nav-post-link');
		const m = document.getElementById('nav-post-link-mobile');
		if (d) d.style.display = visible ? '' : 'none';
		if (m) m.style.display = visible ? '' : 'none';
	}

	// ── Photo storage ────────────────────────────────────
	// Single array - in-memory and persisted. Schema: { path, url, order, note, file?, previewUrl? }
	let photoDraft = [];
	const PHOTO_DEBUG = false;
	const photoDebug = (...args) => { if (PHOTO_DEBUG) console.log(...args); };
	const strip = document.getElementById('photo-strip');
	const uploadZone = document.getElementById('upload-zone');
	const photoInlineMsg = document.getElementById('photo-inline-msg');
	const PHOTOS_DRAFT_KEY = 'subletbuff_photos_draft_v1';
	console.log('[form] photo elements:', { strip: !!strip, uploadZone: !!uploadZone });
	console.log('[form] heic2any available before handlers:', !!window.heic2any);

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

	function isHeicFile(file) {
		if (!file) return false;
		const type = String(file.type || '').toLowerCase();
		const name = String(file.name || '').toLowerCase();
		return type.includes('heic') || type.includes('heif') || name.endsWith('.heic') || name.endsWith('.heif');
	}

	async function normalizeFileForPreview(file) {
		const heic = isHeicFile(file);
		if (heic) {
			if (!window.heic2any) {
				throw new Error('HEIC conversion library unavailable.');
			}
			const out = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
			const jpegBlob = Array.isArray(out) ? out[0] : out;
			const jpegFile = new File(
				[jpegBlob],
				file.name.replace(/\.(heic|heif)$/i, '.jpg'),
				{ type: 'image/jpeg' }
			);
			const previewUrl = URL.createObjectURL(jpegBlob);
			return { uploadFile: jpegFile, previewUrl };
		}

		const previewUrl = URL.createObjectURL(file);
		return { uploadFile: file, previewUrl };
	}

	// ── IMMEDIATE UPLOAD TO STORAGE ────────────────────────
	async function uploadPhotoToStorage(file) {
		if (!supabaseClient) {
			console.error('[form] Supabase client not available for upload');
			throw new Error('Database connection unavailable');
		}
		try {
			const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
			const fileExt = file.name.split('.').pop();
			const filePath = `temp-uploads/${fileName}.${fileExt}`;

			console.log('[form] uploading to storage:', { path: filePath, name: file.name, size: file.size });
			
			const { data: uploadData, error: uploadError } = await supabaseClient.storage
				.from('listing-photos')
				.upload(filePath, file);

			if (uploadError) {
				console.error('[form] Storage upload error', uploadError);
				throw uploadError;
			}

			const { data: publicUrlData } = supabaseClient.storage
				.from('listing-photos')
				.getPublicUrl(filePath);

			if (!publicUrlData || !publicUrlData.publicUrl) {
				throw new Error('Failed to get public URL');
			}

			console.log('[form] upload successful:', { path: filePath, url: publicUrlData.publicUrl });
			return { path: filePath, url: publicUrlData.publicUrl };
		} catch (err) {
			console.error('[form] uploadPhotoToStorage failed:', err);
			throw err;
		}
	}

	// ── DRAFT PHOTO PERSISTENCE ────────────────────────
	function saveDraftPhotos() {
		const toSave = (photoDraft || []).map(({ path, url, order, note }) => ({ path, url, order, note }));
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
				file: null,        // File objects can't be persisted
				previewUrl: p.url || ''
			})) : [];
			console.log('[form] draft photos restored:', photoDraft.length);
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
		console.log('[form] draft photos cleared');
	}

	// Load draft photos on page init (before renderPhotos)
	loadDraftPhotos();

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
		const n = (photoDraft || []).length;
		if (countMsg) countMsg.textContent = n > 0 ? `${n} photo${n > 1 ? 's' : ''} added` : '';
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
	const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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

		// Upload all valid files immediately
		const uploadPromises = filesToUpload.map(async (file) => {
			let previewUrl = '';
			try {
				const isHeic = isHeicFile(file);
				const normalized = await normalizeFileForPreview(file);
				const uploadFile = normalized.uploadFile;
				previewUrl = normalized.previewUrl;

				if (isHeic) {
					photoDebug('[form][photo-debug] HEIC preview result:', {
						file: file.name,
						success: true,
						method: 'heic2any-jpeg'
					});
				}

				const { path, url } = await uploadPhotoToStorage(uploadFile);

				// Add to photoDraft (single source of truth)
				photoDraft.push({
					path: path,
					url: url,
					order: photoDraft.length,
					note: '',
					file: uploadFile,
					originalName: file.name,
					previewUrl: previewUrl
				});

				console.log('[form] photo added to photoDraft:', { path, order: photoDraft.length - 1 });
			} catch (err) {
				revokePreviewUrlIfNeeded(previewUrl);
				console.error('[form] upload error for', file.name, err);
				alert(`Failed to upload ${file.name}: ${err.message}`);
			}
		});

		// After all uploads complete, update UI
		Promise.all(uploadPromises).then(() => {
			console.log('[form] all uploads complete, photoDraft:', photoDraft.length);
			saveDraftPhotos();
			try { renderPhotos(); } catch(e) { console.error('[form] renderPhotos error after upload', e); }
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
	} else {
		console.error('[form] CRITICAL: photo input element not found!');
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

function setNeighborhood(nbhd) {
	document.getElementById('neighborhood').value = nbhd;
	document.getElementById('neighborhood-text').textContent = '📍 ' + nbhd;
	document.getElementById('neighborhood-badge').classList.add('visible');
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
		placesService.getDetails({ placeId, fields: ['address_components'] }, (place, status) => {
			if (status === google.maps.places.PlacesServiceStatus.OK && place) {
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
			const nbhd = a.neighbourhood || a.suburb || a.city_district || a.quarter;
			if (nbhd) {
				setNeighborhood(nbhd);
				saveDraft();
			} else {
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
		unit: document.getElementById('unit-number').value,
		beds: document.getElementById('beds').value,
		baths: document.getElementById('baths').value,
		furnished: document.querySelector('input[name="furnished"]:checked')?.value || '',
		furnishedNotes: document.getElementById('furnished-notes').value,
		startDate: document.getElementById('start-date').value,
		endDate: document.getElementById('end-date').value,
		flexible: document.querySelector('input[name="flexible"]:checked')?.value || '',
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
		if(draft.address) { addrInput.value = draft.address; setTimeout(lookupNeighborhood, 100); }
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
		beds: document.getElementById('beds').value || null,
		baths: document.getElementById('baths').value || null,
		furnished: furnStr,
		start_date: document.getElementById('start-date').value || null,
		end_date: document.getElementById('end-date').value || null,
		flexible_movein: document.querySelector('input[name="flexible"]:checked')?.value || null,
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
				console.error('[form] updating listing', currentListingId, { photosCount: photosMeta.length });
				const { error } = await supabaseClient
					.from('listings')
					.update(payload)
					.eq('id', currentListingId);
				if (error) { console.error('[form] Supabase update error', error); throw error; }
			} else {
				console.error('[form] inserting listing', { photosCount: photosMeta.length });
				const { data, error } = await supabaseClient
					.from('listings')
					.insert([payload])
					.select();
				if (error) { console.error('[form] Supabase insert error', error); throw error; }
				if (data && data.length > 0) {
					currentListingId = data[0].id;
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


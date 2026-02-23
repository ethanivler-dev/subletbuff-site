// Wrap form logic in DOMContentLoaded and guard element access
document.addEventListener('DOMContentLoaded', () => {
	console.log('[form] script loaded v20260222c');

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
		console.warn('[form] listing-form not found — continuing for photo handling');
	}
	if (formEl) {
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

	// ── Photo storage & duplicate/size blocker ────────────────
	// storedFiles holds objects: { file: File, note: string }
	let storedFiles = [];
	const strip = document.getElementById('photo-strip');
	const uploadZone = document.getElementById('upload-zone');
	const photoModal = document.getElementById('photo-modal-overlay');
	const photoMiniStrip = document.getElementById('photo-mini-strip');
	const managePhotosBtn = document.getElementById('manage-photos-btn');
	const photoModalCloseBtn = document.getElementById('photo-modal-close');
	const photoModalDoneBtn = document.getElementById('photo-modal-done');
	const photoModalCountNum = document.getElementById('photo-modal-count-num');

	// Reordering Logic - use Sortable provided indices directly
	if (strip && window.Sortable) {
		Sortable.create(strip, {
			animation: 150,
			onEnd: (evt) => {
				const { oldIndex, newIndex } = evt;
				if (oldIndex === newIndex) return;
				const [movedItem] = storedFiles.splice(oldIndex, 1);
				storedFiles.splice(newIndex, 0, movedItem);
				renderPhotos();
				saveDraft();
			}
		});
	}

	function moveUp(i) {
		if (i <= 0) return;
		[storedFiles[i - 1], storedFiles[i]] = [storedFiles[i], storedFiles[i - 1]];
		renderPhotos();
	}
	function moveDown(i) {
		if (i >= storedFiles.length - 1) return;
		[storedFiles[i + 1], storedFiles[i]] = [storedFiles[i], storedFiles[i + 1]];
		renderPhotos();
	}

	function openPhotoModal() {
		if (photoModal) {
			photoModal.classList.add('open');
			document.body.style.overflow = 'hidden';
		}
	}
	
	function closePhotoModal() {
		if (photoModal) {
			photoModal.classList.remove('open');
			document.body.style.overflow = '';
		}
	}
	
	function setCoverPhoto(index) {
		if (index > 0 && index < storedFiles.length) {
			const [item] = storedFiles.splice(index, 1);
			storedFiles.unshift(item);
			renderPhotos();
		}
	}
	
	function renderMiniStrip() {
		if (!photoMiniStrip) return;
		photoMiniStrip.innerHTML = '';
		storedFiles.forEach((entry, i) => {
			const thumb = document.createElement('div');
			thumb.className = 'photo-mini-thumb';
			const img = document.createElement('img');
			img.src = entry.previewUrl || URL.createObjectURL(entry.file);
			img.alt = `Photo ${i + 1}`;
			const num = document.createElement('div');
			num.className = 'photo-mini-num';
			num.textContent = (i + 1).toString();
			thumb.appendChild(img);
			thumb.appendChild(num);
			photoMiniStrip.appendChild(thumb);
		});
		if (managePhotosBtn) {
			managePhotosBtn.style.display = storedFiles.length > 0 ? 'inline-block' : 'none';
		}
	}
	
	function renderPhotos() {
		const countMsg = document.getElementById('photo-count-msg');
		
		// Update mini strip
		renderMiniStrip();
		
		// Update modal count
		if (photoModalCountNum) {
			photoModalCountNum.textContent = storedFiles.length;
		}
		
		// Render in modal grid
		if (!strip) return;
		strip.innerHTML = '';
		
		storedFiles.forEach((entry, i) => {
			const file = entry.file;
			const card = document.createElement('div');
			card.className = 'photo-card-modal' + (i === 0 ? ' is-cover' : '');
			card.dataset.index = i;
			
			// Header with number and actions
			const header = document.createElement('div');
			header.className = 'photo-card-header';
			
			const numberWrap = document.createElement('div');
			numberWrap.className = 'photo-number';
			
			const badge = document.createElement('div');
			badge.className = 'photo-number-badge';
			badge.textContent = (i + 1).toString();
			numberWrap.appendChild(badge);
			
			if (i === 0) {
				const coverLabel = document.createElement('span');
				coverLabel.className = 'photo-cover-label';
				coverLabel.textContent = 'Cover Photo';
				numberWrap.appendChild(coverLabel);
			}
			
			const actions = document.createElement('div');
			actions.className = 'photo-card-actions';
			
			const upBtn = document.createElement('button');
			upBtn.type = 'button';
			upBtn.innerHTML = '↑';
			upBtn.title = 'Move up';
			upBtn.addEventListener('click', () => moveUp(i));
			
			const downBtn = document.createElement('button');
			downBtn.type = 'button';
			downBtn.innerHTML = '↓';
			downBtn.title = 'Move down';
			downBtn.addEventListener('click', () => moveDown(i));
			
			const delBtn = document.createElement('button');
			delBtn.type = 'button';
			delBtn.className = 'photo-delete-btn';
			delBtn.innerHTML = '✕';
			delBtn.title = 'Remove photo';
			delBtn.addEventListener('click', () => {
				storedFiles.splice(i, 1);
				renderPhotos();
				if (storedFiles.length >= 3) clearFieldError('upload-zone');
			});
			
			actions.appendChild(upBtn);
			actions.appendChild(downBtn);
			actions.appendChild(delBtn);
			
			header.appendChild(numberWrap);
			header.appendChild(actions);
			
			// Image
			const img = document.createElement('img');
			img.className = 'photo-card-img';
			img.src = entry.previewUrl || URL.createObjectURL(file);
			img.alt = file.name || `Photo ${i + 1}`;
			
			// Note textarea
			const noteInput = document.createElement('textarea');
			noteInput.className = 'photo-card-note';
			noteInput.placeholder = 'Describe this photo (e.g., "Spacious living room with natural light")';
			noteInput.value = entry.note || '';
			noteInput.addEventListener('input', (e) => {
				storedFiles[i].note = e.target.value;
				saveDraft();
			});
			
			// Set as cover button (only for non-cover photos)
			const setCoverBtn = document.createElement('button');
			setCoverBtn.type = 'button';
			setCoverBtn.className = 'photo-set-cover';
			setCoverBtn.textContent = '★ Set as Cover Photo';
			setCoverBtn.addEventListener('click', () => setCoverPhoto(i));
			
			card.appendChild(header);
			card.appendChild(img);
			card.appendChild(noteInput);
			if (i !== 0) {
				card.appendChild(setCoverBtn);
			}
			
			strip.appendChild(card);
		});
		
		const n = storedFiles.length;
		if (countMsg) countMsg.textContent = n > 0 ? `${n} photo${n > 1 ? 's' : ''} added` : '';
	}
	
	// Modal event listeners
	if (managePhotosBtn) {
		managePhotosBtn.addEventListener('click', openPhotoModal);
	}
	if (photoModalCloseBtn) {
		photoModalCloseBtn.addEventListener('click', closePhotoModal);
	}
	if (photoModalDoneBtn) {
		photoModalDoneBtn.addEventListener('click', closePhotoModal);
	}
	if (photoModal) {
		photoModal.addEventListener('click', (e) => {
			if (e.target === photoModal) closePhotoModal();
		});
	}

	function addFilesToStore(fileList) {
		const filesAdded = [];
		Array.from(fileList).forEach(f => {
			if (f.size > 20 * 1024 * 1024) {
				alert(`The file "${f.name}" is too large. Please select photos under 20MB.`);
				return;
			}
			const isDuplicate = storedFiles.some(sf => sf.file.name === f.name && sf.file.size === f.size);
			if (!isDuplicate) {
				const entry = { file: f, previewUrl: URL.createObjectURL(f), note: '' };
				storedFiles.push(entry);
				filesAdded.push(entry);
			}
		});
		renderPhotos();
		if (strip && storedFiles.length >= 3) clearFieldError('upload-zone');
		// Auto-open modal when photos are added
		if (filesAdded.length > 0 && photoModal) {
			openPhotoModal();
		}
	}

	const photoInput = document.getElementById('photoInput') || document.getElementById('photo-input') || (uploadZone && uploadZone.querySelector('input[type=file]'));
	if (photoInput) {
		photoInput.addEventListener('change', function () {
			addFilesToStore(this.files);
			this.value = '';
		});
	}

	// Drag & drop support onto the upload zone
	if (uploadZone) {
		uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
		uploadZone.addEventListener('dragleave', e => { uploadZone.classList.remove('dragover'); });
		uploadZone.addEventListener('drop', e => {
			e.preventDefault(); uploadZone.classList.remove('dragover');
			if (e.dataTransfer && e.dataTransfer.files) addFilesToStore(e.dataTransfer.files);
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
				suggestions.classList.remove('open'); return;
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
				setNeighborhood(nbhd || 'Boulder');
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
	txt.textContent = 'Detecting neighborhood…';
	badge.classList.add('visible');
	try {
		const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr + ', Boulder, CO')}&format=json&addressdetails=1&limit=1`, { headers: { 'Accept-Language': 'en' } });
		const data = await res.json();
		if (data && data[0]) {
			const a    = data[0].address;
			const nbhd = a.neighbourhood || a.suburb || a.city_district || a.quarter || 'Boulder';
			setNeighborhood(nbhd);
			saveDraft();
		} else {
			txt.textContent = 'Could not detect — check address';
		}
	} catch(e) {
		txt.textContent = 'Lookup unavailable';
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
		if (id === 'unit-type') document.getElementById('room-until-field').style.display = btn.dataset.val === 'room-shared' ? 'block' : 'none';
		saveDraft();
	});
});

const prefEmailBtn = document.getElementById('pref-email');
const prefTextBtn  = document.getElementById('pref-text');
[prefEmailBtn, prefTextBtn].forEach(btn => btn.addEventListener('click', () => {
	[prefEmailBtn, prefTextBtn].forEach(b => b.classList.remove('active'));
	btn.classList.add('active');
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

['lease-sublease','lease-takeover'].forEach(id => {
	document.getElementById(id).addEventListener('change', () => {
		const either = document.getElementById('lease-sublease').checked || document.getElementById('lease-takeover').checked;
		if (either) {
			document.getElementById('lease-type-error').style.display = 'none';
			document.getElementById('lease-check-sublease').classList.remove('error');
			document.getElementById('lease-check-takeover').classList.remove('error');
		}
		saveDraft();
	});
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
		roomUntil: document.getElementById('room-until').value,
		genderPref: document.getElementById('gender-pref').value,
		petsProp: document.querySelector('input[name="pets-prop"]:checked')?.value || '',
		pets: [...document.querySelectorAll('.pet-tag.active')].map(t => t.dataset.pet),
		petNotes: document.getElementById('pet-notes').value,
		description: document.getElementById('description').value,
		leaseSublease: document.getElementById('lease-sublease').checked,
		leaseTakeover: document.getElementById('lease-takeover').checked,
		deposit: document.getElementById('deposit').value,
		prefContact: prefEmailBtn.classList.contains('active') ? 'email' : 'text'
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
						if (draft.unitType === 'room-shared') document.getElementById('room-until-field').style.display = 'block';
				}
		}
		if(draft.roomUntil) document.getElementById('room-until').value = draft.roomUntil;
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
    
		if(draft.leaseSublease) document.getElementById('lease-sublease').checked = true;
		if(draft.leaseTakeover) document.getElementById('lease-takeover').checked = true;
		if(draft.deposit) document.getElementById('deposit').value = draft.deposit;
    
		if(draft.prefContact === 'email') { prefEmailBtn.classList.add('active'); prefTextBtn.classList.remove('active'); } 
		else { prefTextBtn.classList.add('active'); prefEmailBtn.classList.remove('active'); }
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
		lease_type: [document.getElementById('lease-sublease').checked ? 'Sublease' : '', document.getElementById('lease-takeover').checked ? 'Lease Takeover' : ''].filter(Boolean).join(', ') || null,
		security_deposit: depositVal ? parseInt(depositVal) : null,
		photo_urls: photoUrls,
		status: 'pending',
		verified: false
	};
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
  
	if (storedFiles.length < 3) {
		valid = false;
		const zone = document.getElementById('upload-zone');
		zone.style.borderColor = 'var(--red)';
		const p = zone.parentElement;
		if (!p.querySelector('.error-msg')) { const err = document.createElement('span'); err.className = 'error-msg'; err.textContent = 'Please upload at least 3 photos.'; zone.after(err); }
	} else { document.getElementById('upload-zone').style.borderColor = ''; document.getElementById('upload-zone').parentElement.querySelectorAll('.error-msg').forEach(e => e.remove()); }

	const leaseChecked = document.getElementById('lease-sublease').checked || document.getElementById('lease-takeover').checked;
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

		const folderName = currentListingId ? currentListingId : `submission-${Date.now()}`;

		// Reordered Photo Loop
const photosMeta = [];
		for (let i = 0; i < storedFiles.length; i++) {
			const file = storedFiles[i].file;
			const fileExt = file.name.split('.').pop();
			const filePath = `${folderName}/${i}_${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
			const { data: uploadData, error: uploadError } = await supabaseClient.storage
				.from(BUCKET_NAME)
				.upload(filePath, file);

			if (uploadError) {
				console.error('[form] Supabase storage upload error', uploadError);
				throw new Error('Image upload failed: ' + uploadError.message);
			}

			const { data: publicUrlData } = supabaseClient.storage
				.from(BUCKET_NAME)
				.getPublicUrl(filePath);

			uploadedUrls.push(publicUrlData.publicUrl);
photosMeta.push({
  path: filePath,
  url: publicUrlData.publicUrl,
  order: i,
  note: (storedFiles[i] && storedFiles[i].note) ? storedFiles[i].note : ''
});
		}

		submitBtn.textContent = 'Saving Listing...';
		const payload = buildPayload(uploadedUrls); 
    
payload.photos_meta = photosMeta;
		if (currentListingId) {
			const { error } = await supabaseClient
				.from('listings')
				.update(payload)
				.eq('id', currentListingId); 
			if (error) { console.error('[form] Supabase update error', error); throw new Error('Database update error: ' + error.message); }
		} else {
			const { data, error } = await supabaseClient
				.from('listings')
				.insert([payload])
				.select(); 
			if (error) { console.error('[form] Supabase insert error', error); throw new Error('Database insert error: ' + error.message); }
			if (data && data.length > 0) {
				currentListingId = data[0].id;
			}
		}


	} catch(err) {
		console.error("Submission Error:", err);
		alert("There was an issue: " + err.message);
		submitBtn.textContent = originalBtnText;
		submitBtn.disabled = false;
		return;
	}
  
	localStorage.removeItem(DRAFT_KEY);
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

document.getElementById('btn-verify').addEventListener('click', () => {
	const code = document.getElementById('verify-code').value.trim();
	const errEl = document.getElementById('verify-error');
	if (!code) { errEl.textContent = 'Please enter the verification code.'; errEl.style.display = 'block'; return; }
	errEl.style.display = 'none';
	document.querySelector('.verify-box').innerHTML = '<p style="color:var(--green);font-weight:600;font-size:.9375rem">✓ Email verified! Your listing is now in review.</p>';
});

});


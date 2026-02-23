document.addEventListener('DOMContentLoaded', () => {
	console.log('[home] script loaded');

	// Global runtime logging so errors show up in console for debugging
	window.addEventListener('error', (ev) => {
		console.error('[home] runtime error', ev.error || ev.message || ev);
	});
	window.addEventListener('unhandledrejection', (ev) => {
		console.error('[home] unhandledrejection', ev.reason || ev);
	});

	// Required DOM element check
	const _featuredGridCheck = document.getElementById('featured-grid');
	if (!_featuredGridCheck) {
		console.error('Missing required element: featured-grid');
		return;
	}
	// Mobile menu toggle (guarded)
	const hb = document.getElementById('nav-hamburger');
	const mm = document.getElementById('nav-mobile-menu');
	if (hb && mm) {
		hb.addEventListener('click', (e) => {
			e.stopPropagation();
			mm.classList.toggle('open');
		});
		document.addEventListener('click', () => {
			if (mm.classList) mm.classList.remove('open');
		});
	}

	// Supabase client (guarded)
	const SUPABASE_URL = 'https://doehqqwqwjebhfgdvyum.supabase.co';
	const SUPABASE_ANON_KEY = 'sb_publishable_ZZ4mKcw6_e9diz7oFfbVag_YA9zkqFW';
	const supabaseClient = (window.supabase && window.supabase.createClient)
		? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
		: null;
	if (window.supabase && window.supabase.createClient) console.log('[home] Supabase UMD detected');
	else console.error('Supabase UMD not loaded');

	// Helper to safely create listing card nodes
	function createListingCard(item) {
		const link = document.createElement('a');
		link.className = 'listing-card';
		const hrefId = item && item.id != null ? String(item.id) : '';
		link.href = '/listing-details?id=' + encodeURIComponent(hrefId);

		const img = document.createElement('img');
		img.className = 'card-img';
		img.loading = 'lazy';
		img.decoding = 'async';
		img.src = (item && item.photo_urls && item.photo_urls[0]) ? item.photo_urls[0] : 'https://via.placeholder.com/400';
		img.alt = (item && item.neighborhood) ? (item.neighborhood + ' photo') : 'Listing photo';
		link.appendChild(img);

		const rent = document.createElement('div');
		rent.style.fontWeight = '700';
		rent.style.color = 'var(--gold)';
		rent.textContent = '$' + ((item && item.monthly_rent) ? item.monthly_rent : '0') + ' / mo';
		link.appendChild(rent);

		const hood = document.createElement('div');
		hood.style.fontFamily = "Playfair Display, serif";
		hood.style.fontSize = '1.2rem';
		hood.style.margin = '5px 0';
		hood.textContent = (item && item.neighborhood) ? item.neighborhood : 'Boulder';
		link.appendChild(hood);

		const addr = document.createElement('div');
		addr.style.fontSize = '0.8rem';
		addr.style.color = 'var(--ink-soft)';
		addr.textContent = (item && item.address) ? '📍 ' + item.address : '';
		link.appendChild(addr);

		if (item && item.photo_notes && item.photo_notes[0]) {
			const note = document.createElement('div');
			note.style.fontSize = '0.85rem';
			note.style.color = 'var(--ink-soft)';
			note.style.marginTop = '6px';
			note.textContent = 'Note: ' + item.photo_notes[0];
			link.appendChild(note);
		}

		return link;
	}

	async function loadListings() {
		const grid = document.getElementById('featured-grid');
		if (!grid) return;
		if (!supabaseClient) return;
		try {
			const { data, error } = await supabaseClient.from('listings').select('id,monthly_rent,photo_urls,neighborhood,address,photo_notes').eq('status', 'approved').order('created_at', { ascending: false }).limit(50);
			if (error) { console.error('[home] Supabase query error', error); return; }
			grid.innerHTML = '';
			if (Array.isArray(data)) {
				data.forEach(item => {
					const card = createListingCard(item);
					grid.appendChild(card);
				});
			}
		} catch (err) {
			console.error(err);
		}
	}

	loadListings();
});

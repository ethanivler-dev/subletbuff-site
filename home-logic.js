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

	const CAMPUS_COORDS = { lat: 40.0076, lng: -105.2659 };

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

	// Helper to safely create listing card nodes
	function createListingCard(item) {
		const link = document.createElement('a');
		link.className = 'listing-card';
		const hrefId = item && item.id != null ? String(item.id) : '';
		link.href = '/listing.html?id=' + encodeURIComponent(hrefId);

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

		// Distance from campus
		if (item) {
			const lat = Number(item.lat);
			const lng = Number(item.lng);
			if (Number.isFinite(lat) && Number.isFinite(lng)) {
				const miles = haversineMiles(CAMPUS_COORDS, { lat, lng });
				const dist = document.createElement('div');
				dist.style.fontSize = '0.82rem';
				dist.style.color = 'var(--gold)';
				dist.style.fontWeight = '600';
				dist.style.marginTop = '4px';
				dist.textContent = miles.toFixed(2).replace(/\.00$/, '') + ' mi from campus';
				link.appendChild(dist);
			}
		}

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
			const { data, error } = await supabaseClient
				.from('listings')
				.select('*')
				.eq('status', 'approved')
				.order('created_at', { ascending: false })
				.limit(6);

			if (error) {
				console.error('[home] Supabase query error', error);
				grid.innerHTML = '<div style="text-align:center;color:var(--ink-soft);padding:40px 0;">Error: ' + (error.message || JSON.stringify(error)) + '</div>';
				return;
			}

			console.log('[home] approved listings returned:', Array.isArray(data) ? data.length : data, data);

			grid.innerHTML = '';

			if (!Array.isArray(data) || data.length === 0) {
				grid.innerHTML = '<div style="text-align:center;color:var(--ink-soft);padding:40px 0;">No approved listings yet.</div>';
				return;
			}

			data.forEach(item => {
				const card = createListingCard(item);
				grid.appendChild(card);
			});
		} catch (err) {
			console.error('[home] loadListings error', err);
		}
	}

	loadListings();
});

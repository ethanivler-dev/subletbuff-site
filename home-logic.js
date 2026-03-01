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

	/** Compute the current effective price after auto-reductions. */
	function getEffectivePrice(listing) {
		const original = Number(listing && listing.monthly_rent);
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

	// Helper to safely create listing card nodes
	function createListingCard(item, favCounts) {
		const link = document.createElement('a');
		link.className = 'listing-card';
		link.style.position = 'relative';
		const hrefId = item && item.id != null ? String(item.id) : '';
		link.href = '/listing.html?id=' + encodeURIComponent(hrefId);

		const imgWrap = document.createElement('div');
		imgWrap.style.position = 'relative';

		const img = document.createElement('img');
		img.className = 'card-img';
		img.loading = 'lazy';
		img.decoding = 'async';
		img.src = (item && item.photo_urls && item.photo_urls[0]) ? item.photo_urls[0] : 'https://via.placeholder.com/400';
		img.alt = (item && item.neighborhood) ? (item.neighborhood + ' photo') : 'Listing photo';
		imgWrap.appendChild(img);

		const pricing = getEffectivePrice(item);

		// Price Drop badge
		if (pricing.reduced) {
			const badge = document.createElement('span');
			badge.className = 'card-price-drop-badge';
			badge.textContent = 'Price Drop';
			imgWrap.appendChild(badge);
		}

		// Favorite count badge
		const favCount = (favCounts && item && favCounts[item.id]) || 0;
		if (favCount > 0) {
			const favBadge = document.createElement('span');
			favBadge.className = 'card-fav-count';
			favBadge.textContent = '\u2665 ' + favCount;
			imgWrap.appendChild(favBadge);
		}

		link.appendChild(imgWrap);

		const rent = document.createElement('div');
		rent.style.fontWeight = '700';
		rent.style.color = 'var(--gold)';
		if (pricing.reduced) {
			rent.innerHTML = '<span style="text-decoration:line-through;opacity:0.5;font-size:0.85em;margin-right:6px">$' + pricing.original + '</span>$' + pricing.effective + ' / mo';
		} else {
			rent.textContent = '$' + pricing.effective + ' / mo';
		}
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

		const firstNote = (function() {
			if (item && Array.isArray(item.photos_meta)) {
				const sorted = item.photos_meta.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
				const entry = sorted.find(e => e && e.note);
				return entry ? entry.note : '';
			}
			return '';
		})();
		if (firstNote) {
			const note = document.createElement('div');
			note.style.fontSize = '0.85rem';
			note.style.color = 'var(--ink-soft)';
			note.style.marginTop = '6px';
			note.style.fontStyle = 'italic';
			note.textContent = firstNote;
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

			// Fetch favorite counts
			let favCounts = {};
			try {
				const resp = await fetch('/api/favorite-counts');
				if (resp.ok) favCounts = await resp.json();
			} catch (_) {}

			data.forEach(item => {
				const card = createListingCard(item, favCounts);
				grid.appendChild(card);
			});
		} catch (err) {
			console.error('[home] loadListings error', err);
		}
	}

	loadListings();
});

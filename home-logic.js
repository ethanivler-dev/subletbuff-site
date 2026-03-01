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
		img.src = (item && item.photo_urls && item.photo_urls[0]) ? item.photo_urls[0] : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=75';
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

		// ── Card body ──
		const body = document.createElement('div');
		body.className = 'card-body';

		// Price
		const rent = document.createElement('div');
		rent.className = 'card-price';
		if (pricing.reduced) {
			rent.innerHTML = '<span class="card-price-old">$' + pricing.original + '</span>$' + pricing.effective + '<span class="card-price-unit"> / mo</span>';
		} else {
			rent.innerHTML = '$' + pricing.effective + '<span class="card-price-unit"> / mo</span>';
		}
		body.appendChild(rent);

		// Beds / Baths line
		const beds = item && item.beds ? item.beds : null;
		const baths = item && item.baths ? item.baths : null;
		if (beds || baths) {
			const meta = document.createElement('div');
			meta.className = 'card-meta';
			const parts = [];
			if (beds) parts.push(beds + ' bed' + (beds > 1 ? 's' : ''));
			if (baths) parts.push(baths + ' bath' + (baths > 1 ? 's' : ''));
			meta.textContent = parts.join(' \u00B7 ');
			body.appendChild(meta);
		}

		// Move-in / Move-out dates
		if (item && (item.start_date || item.end_date)) {
			const dates = document.createElement('div');
			dates.className = 'card-dates';
			const fmtDate = (d) => {
				const dt = new Date(d + 'T00:00:00');
				return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			};
			const startStr = item.start_date ? fmtDate(item.start_date) : '?';
			const endStr = item.end_date ? fmtDate(item.end_date) : '?';
			dates.textContent = startStr + ' \u2013 ' + endStr;
			body.appendChild(dates);
		}

		// Distance from campus
		if (item) {
			const lat = Number(item.lat);
			const lng = Number(item.lng);
			if (Number.isFinite(lat) && Number.isFinite(lng)) {
				const miles = haversineMiles(CAMPUS_COORDS, { lat, lng });
				const dist = document.createElement('div');
				dist.className = 'card-distance';
				dist.textContent = miles.toFixed(1) + ' mi from campus';
				body.appendChild(dist);
			}
		}

		// Neighborhood
		if (item && item.neighborhood) {
			const hood = document.createElement('div');
			hood.className = 'card-neighborhood';
			hood.textContent = item.neighborhood;
			body.appendChild(hood);
		}

		// Feature tags
		const tags = buildFeatureTags(item);
		if (tags.length > 0) {
			const tagsWrap = document.createElement('div');
			tagsWrap.className = 'card-tags';
			tags.forEach(function(t) {
				const tag = document.createElement('span');
				tag.className = 'card-tag';
				tag.innerHTML = t.icon + ' ' + t.label;
				tagsWrap.appendChild(tag);
			});
			body.appendChild(tagsWrap);
		}

		link.appendChild(body);
		return link;
	}

	/** Build feature tags from listing data */
	function buildFeatureTags(item) {
		const tags = [];
		if (!item) return tags;

		// Furnished
		const furn = String(item.furnished || '').toLowerCase();
		if (furn.startsWith('yes')) {
			tags.push({ label: 'Furnished', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="var(--gold)" stroke="none"><path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2a3 3 0 0 0-3 3v5h2v2h2v-2h14v2h2v-2h2v-5a3 3 0 0 0-3-3z"/></svg>' });
		}

		// Pets OK
		const pets = String(item.pets || '').toLowerCase();
		if (pets && pets !== 'no') {
			tags.push({ label: 'Pets OK', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="var(--gold)" stroke="none"><path d="M4.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm5-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm5 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm5 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-2.59 4.68A3.7 3.7 0 0 0 14.5 9.5c-1.03 0-2 .42-2.5 1.5-.5-1.08-1.47-1.5-2.5-1.5a3.7 3.7 0 0 0-2.41.82C5.43 11.74 4.5 13.61 4.5 15c0 1.75 1.57 4 4 5.02v.48a1.5 1.5 0 0 0 3 0v-.15c.16.01.33.02.5.02s.34-.01.5-.02v.15a1.5 1.5 0 0 0 3 0v-.48C17.93 19 19.5 16.75 19.5 15c0-1.39-.93-3.26-2.59-4.82z"/></svg>' });
		}

		// Parking
		const parkingVal = String(item.parking || '').toLowerCase();
		if (parkingVal && parkingVal !== 'none') {
			tags.push({ label: 'Parking', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="var(--gold)" stroke="none"><path d="M13 3H6v18h4v-6h3a5 5 0 0 0 0-10h-2zm0 8h-3V7h3a2 2 0 1 1 0 4z"/></svg>' });
		}

		// Summer (dates fall roughly May-Aug)
		if (item.start_date || item.end_date) {
			const start = item.start_date ? new Date(item.start_date) : null;
			const end = item.end_date ? new Date(item.end_date) : null;
			const sm = start ? start.getMonth() : -1;
			const em = end ? end.getMonth() : -1;
			if ((sm >= 4 && sm <= 7) || (em >= 5 && em <= 7)) {
				tags.push({ label: 'Summer', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="var(--gold)" stroke="none"><circle cx="12" cy="12" r="5"/><g stroke="var(--gold)" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></g></svg>' });
			}
		}

		return tags;
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
				.eq('paused', false)
				.eq('filled', false)
				.order('created_at', { ascending: false })
				.limit(3);

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

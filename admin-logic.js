// Admin portal — rewritten to be CSP-safe and DOM-guarded
document.addEventListener('DOMContentLoaded', () => {
	const ADMIN_PASSWORD = 'BuffsAdmin2026!';

	function checkAccess() {
		const entry = prompt('Enter Admin Access Key:');
		if (entry !== ADMIN_PASSWORD) {
			alert('Access Denied.');
			window.location.href = '/';
			return false;
		}
		return true;
	}

	const SUPABASE_URL = 'https://doehqqwqwjebhfgdvyum.supabase.co';
	const SUPABASE_ANON_KEY = 'sb_publishable_ZZ4mKcw6_e9diz7oFfbVag_YA9zkqFW';
	const supabaseClient = (window.supabase && window.supabase.createClient)
		? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
		: null;

	function buildAdminUI() {
		const main = document.body;
		if (!main) return;
		main.style.cssText = "padding: 40px 20px; background-color: #FAF7F2; min-height: 100vh; margin: 0; font-family: 'DM Sans', sans-serif;";

		const header = document.createElement('div');
		header.style.cssText = "max-width: 1000px; margin: 0 auto 30px; font-family: 'Playfair Display', serif;";

		const headerRow = document.createElement('div');
		headerRow.style.display = 'flex';
		headerRow.style.justifyContent = 'space-between';
		headerRow.style.alignItems = 'center';

		const left = document.createElement('div');
		const h1 = document.createElement('h1');
		h1.style.fontSize = '2.5rem';
		h1.style.marginBottom = '5px';
		h1.textContent = 'Admin Approval Portal';
		left.appendChild(h1);
		const p = document.createElement('p');
		p.style.color = '#8A7D6B';
		p.innerHTML = "Reviewing all <strong>Pending</strong> submissions.";
		left.appendChild(p);

		const controls = document.createElement('div');
		controls.id = 'admin-controls-placeholder';

		headerRow.appendChild(left);
		headerRow.appendChild(controls);
		header.appendChild(headerRow);
		main.appendChild(header);

		// Refresh button
		const refreshBtn = document.createElement('button');
		refreshBtn.type = 'button';
		refreshBtn.textContent = '🔄 Refresh List';
		refreshBtn.style.cssText = 'background:#E0D5C0; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:600;';
		refreshBtn.addEventListener('click', () => loadPending());
		controls.appendChild(refreshBtn);

		const listContainer = document.createElement('div');
		listContainer.id = 'pending-list';
		listContainer.style.cssText = 'max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 20px;';
		main.appendChild(listContainer);
	}

	async function loadPending() {
		const listContainer = document.getElementById('pending-list');
		if (!listContainer) return;
		listContainer.innerHTML = '';
		if (!supabaseClient) {
			const err = document.createElement('div'); err.style.color = 'red'; err.textContent = 'Error: Supabase client not available'; listContainer.appendChild(err); return;
		}

		const { data: listings, error } = await supabaseClient.from('listings').select('*').eq('status', 'pending').order('created_at', { ascending: true });
		if (error) {
			const err = document.createElement('div'); err.style.color = 'red'; err.textContent = 'Error: ' + error.message; listContainer.appendChild(err); return;
		}

		if (!listings || listings.length === 0) {
			const empty = document.createElement('div');
			empty.style.cssText = 'padding: 60px; border: 2px dashed #E0D5C0; text-align: center; border-radius: 16px; color: #8A7D6B;';
			empty.textContent = '🎉 All caught up! No pending listings.';
			listContainer.appendChild(empty);
			return;
		}

		listings.forEach(item => {
			const photo = (item.photo_urls && item.photo_urls.length > 0) ? item.photo_urls[0] : 'https://via.placeholder.com/150x100?text=No+Photo';
			const photoNote = (item.photo_notes && item.photo_notes.length > 0) ? item.photo_notes[0] : '';

			const card = document.createElement('div');
			card.id = `card-${item.id}`;
			card.style.cssText = 'display: grid; grid-template-columns: 180px 1fr auto; gap: 24px; background: white; padding: 24px; border-radius: 16px; border: 1px solid #E0D5C0; align-items: center; box-shadow: 0 2px 12px rgba(28,24,16,0.05);';

			// left (photo)
			const left = document.createElement('div');
			const img = document.createElement('img'); img.src = photo; img.style.cssText = 'width: 180px; height: 120px; object-fit: cover; border-radius: 8px; display:block;'; left.appendChild(img);
			if (photoNote) { const noteEl = document.createElement('div'); noteEl.style.cssText = 'font-size:0.85rem;color:#4A4035;margin-top:8px;'; noteEl.textContent = 'Photo note: ' + photoNote; left.appendChild(noteEl); }

			// mid (details)
			const mid = document.createElement('div');
			const title = document.createElement('div'); title.style.cssText = 'font-weight: 700; font-size: 1.2rem; color: #1C1810;'; title.textContent = '$' + (item.monthly_rent || '') + ' — ' + (item.address || ''); mid.appendChild(title);

			const info = document.createElement('div'); info.style.cssText = 'font-size: 0.85rem; color: #4A4035; margin-top: 6px; line-height: 1.5;';
			const listerStrong = document.createElement('strong'); listerStrong.textContent = 'Lister: '; info.appendChild(listerStrong);
			const nameSpan = document.createElement('span'); nameSpan.textContent = (item.first_name || '') + ' ' + (item.last_name || ''); info.appendChild(nameSpan);
			info.appendChild(document.createElement('br'));
			const emailStrong = document.createElement('strong'); emailStrong.textContent = 'Email: '; info.appendChild(emailStrong);
			const emailSpan = document.createElement('span'); emailSpan.textContent = (item.email || ''); info.appendChild(emailSpan);
			mid.appendChild(info);

			const previewWrap = document.createElement('div'); previewWrap.style.marginTop = '12px';
			const previewLink = document.createElement('a'); previewLink.href = '/?preview=' + encodeURIComponent(item.id); previewLink.target = '_blank'; previewLink.style.cssText = 'font-size: 0.8rem; color: #B8922A; font-weight: 600; text-decoration: none; border: 1px solid #B8922A; padding: 5px 12px; border-radius: 6px;'; previewLink.textContent = 'View Full Preview ↗'; previewWrap.appendChild(previewLink); mid.appendChild(previewWrap);

			// right (actions)
			const right = document.createElement('div'); right.style.cssText = 'display: flex; flex-direction: column; gap: 10px; min-width: 180px;';

			const approveBtn = document.createElement('button'); approveBtn.id = `app-${item.id}`; approveBtn.type = 'button'; approveBtn.textContent = 'Approve ✅'; approveBtn.style.cssText = 'background: #3D8A58; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600;'; approveBtn.addEventListener('click', () => handleApprove(item.id)); right.appendChild(approveBtn);

			const contactBtn = document.createElement('a');
			const subject = encodeURIComponent('Action Required: Your SubSwap Listing');
			const body = encodeURIComponent('Hi ' + (item.first_name || '') + ',\n\nThanks for posting your listing at ' + (item.address || '') + '! Before we can approve it, we need you to fix the following:\n\n- [Add fix here]\n\nOnce updated, let us know!\n\nBest,\nSubSwap Team');
			contactBtn.href = 'mailto:' + encodeURIComponent(item.email || '') + '?subject=' + subject + '&body=' + body;
			contactBtn.textContent = 'Contact Lister ✉️'; contactBtn.style.cssText = 'background: #FAF7F2; color: #B8922A; border: 1px solid #B8922A; padding: 12px; border-radius: 8px; cursor: pointer; text-align: center; font-size: 0.85rem; font-weight: 600; display: inline-block; text-decoration: none;'; right.appendChild(contactBtn);

			const rejectBtn = document.createElement('button'); rejectBtn.id = `rej-${item.id}`; rejectBtn.type = 'button'; rejectBtn.textContent = 'Reject & Delete ✕'; rejectBtn.style.cssText = 'background: white; color: #C0392B; border: 1.5px solid #C0392B; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600;'; rejectBtn.addEventListener('click', () => handleReject(item.id)); right.appendChild(rejectBtn);

			card.appendChild(left); card.appendChild(mid); card.appendChild(right);
			const listContainer = document.getElementById('pending-list'); if (listContainer) listContainer.appendChild(card);
		});
	}

	async function handleApprove(id) {
		const btn = document.getElementById(`app-${id}`);
		if (!btn) return;
		if (btn.textContent === 'Approve ✅') {
			btn.textContent = 'Confirm Approval?'; btn.style.backgroundColor = '#1e4d2b';
			return;
		}
		btn.textContent = 'Processing...';
		if (!supabaseClient) { alert('Database not available'); return; }
		const { error } = await supabaseClient.from('listings').update({ status: 'approved' }).eq('id', id);
		if (error) alert('Error: ' + error.message); else loadPending();
	}

	async function handleReject(id) {
		const btn = document.getElementById(`rej-${id}`);
		if (!btn) return;
		if (btn.textContent === 'Reject & Delete ✕') { btn.textContent = 'Confirm Delete?'; btn.style.backgroundColor = '#C0392B'; btn.style.color = 'white'; return; }
		btn.textContent = 'Deleting...';
		if (!supabaseClient) { alert('Database not available'); return; }
		const { error } = await supabaseClient.from('listings').delete().eq('id', id);
		if (error) alert('Error: ' + error.message); else loadPending();
	}

	if (checkAccess()) {
		buildAdminUI();
		loadPending();
	}
});

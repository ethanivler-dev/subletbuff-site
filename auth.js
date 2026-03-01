// ── Shared Google Auth (loaded on every page via <script src="/auth.js">) ──
// Manages sign-in state in the nav bar across all pages.
// Exposes window.sbAuth = { getSession, getUser, onAuthChange, supabaseClient }
(function () {
  'use strict';

  const SUPABASE_URL = 'https://doehqqwqwjebhfgdvyum.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_ZZ4mKcw6_e9diz7oFfbVag_YA9zkqFW';

  let supabaseClient = null;
  try {
    if (window.supabase && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
    }
  } catch (e) {
    console.error('[auth] supabase init error', e);
  }


  // ── Update nav UI ──
  function updateNavAuth(session) {
    // Desktop
    const signInBtn = document.getElementById('nav-auth-btn');
    const accountLink = document.getElementById('nav-account-link');
    const adminLink = document.getElementById('nav-admin-link');
    // Mobile
    const signInMobile = document.getElementById('nav-auth-btn-mobile');
    const accountMobile = document.getElementById('nav-account-link-mobile');
    const adminMobile = document.getElementById('nav-admin-link-mobile');

    if (session && session.user) {
      if (signInBtn) signInBtn.style.display = 'none';
      if (signInMobile) signInMobile.style.display = 'none';

      if (accountLink) {
        accountLink.style.display = '';
        accountLink.textContent = 'Account';
      }
      if (accountMobile) {
        accountMobile.style.display = '';
        accountMobile.textContent = 'Account';
      }

      // Check admin status and show/hide admin link (nav link only for super admin)
      checkAdmin(session.user.id, session.user.email);
    } else {
      if (signInBtn) signInBtn.style.display = '';
      if (signInMobile) signInMobile.style.display = '';
      if (accountLink) accountLink.style.display = 'none';
      if (accountMobile) accountMobile.style.display = 'none';
      if (adminLink) adminLink.style.display = 'none';
      if (adminMobile) adminMobile.style.display = 'none';
    }
  }

  // ── Admin check ──
  let _isAdmin = false;

  async function checkAdmin(userId, email) {
    const adminLink = document.getElementById('nav-admin-link');
    const adminMobile = document.getElementById('nav-admin-link-mobile');
    _isAdmin = false;
    if (!supabaseClient || !userId) return;
    try {
      // Check by auth UUID first
      const { data, error } = await supabaseClient
        .from('admins')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      if (!error && data) {
        _isAdmin = true;
      } else {
        // Fall back: check by email
        if (email) {
          const { data: d2 } = await supabaseClient
            .from('admins')
            .select('id, email')
            .eq('email', email)
            .maybeSingle();
          if (d2) {
            _isAdmin = true;
            // Backfill the auth UUID if missing
            if (!d2.id || d2.id !== userId) {
              await supabaseClient.from('admins').update({ id: userId }).eq('email', email);
            }
          }
        }
      }
      // Show Admin nav link for all admins
      if (_isAdmin) {
        if (adminLink) adminLink.style.display = '';
        if (adminMobile) adminMobile.style.display = '';
      }
    } catch (_) {}
  }

  // ── Sign in handler ──
  async function signInWithGoogle() {
    if (!supabaseClient) { alert('Auth not available'); return; }
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) console.error('[auth] sign-in error:', error);
  }

  // ── Init on DOM ready ──
  function init() {
    // Bind sign-in buttons
    const signInBtn = document.getElementById('nav-auth-btn');
    const signInMobile = document.getElementById('nav-auth-btn-mobile');
    if (signInBtn) signInBtn.addEventListener('click', signInWithGoogle);
    if (signInMobile) signInMobile.addEventListener('click', signInWithGoogle);

    if (!supabaseClient) {
      updateNavAuth(null);
      return;
    }

    // Check existing session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      updateNavAuth(session);
    });

    // Listen for auth changes (sign in / sign out / token refresh)
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      updateNavAuth(session);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Public API ──
  window.sbAuth = {
    get supabaseClient() { return supabaseClient; },
    get isAdmin() { return _isAdmin; },
    getSession: function () {
      return supabaseClient ? supabaseClient.auth.getSession() : Promise.resolve({ data: { session: null } });
    },
    getUser: function () {
      return supabaseClient ? supabaseClient.auth.getUser() : Promise.resolve({ data: { user: null } });
    },
    signOut: function () {
      return supabaseClient ? supabaseClient.auth.signOut() : Promise.resolve();
    },
    signInWithGoogle: signInWithGoogle
  };
})();

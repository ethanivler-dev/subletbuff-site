// ── Shared Google Auth (loaded on every page via <script src="/auth.js">) ──
// Manages sign-in state in the nav bar across all pages.
// Exposes window.sbAuth = { getSession, getUser, onAuthChange, supabaseClient }
(function () {
  'use strict';

  const SUPABASE_URL = 'https://doehqqwqwjebhfgdvyum.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZWhxcXdxd2plYmhmZ2R2eXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjI5NjksImV4cCI6MjA4NzEzODk2OX0.oDepDKzyGBP72NLgdF0MXdh8wPWN0ozW_SNCuBhKnU0';

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

  // ── Google SVG icon ──
  const GOOGLE_SVG = '<svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

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
      const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Account';

      if (signInBtn) signInBtn.style.display = 'none';
      if (signInMobile) signInMobile.style.display = 'none';

      if (accountLink) {
        accountLink.style.display = '';
        accountLink.textContent = name;
      }
      if (accountMobile) {
        accountMobile.style.display = '';
        accountMobile.textContent = name;
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
  const SUPER_ADMIN_EMAIL = 'ethanivler@gmail.com';

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
      // Only show Admin nav link for super admin
      if (_isAdmin && email === SUPER_ADMIN_EMAIL) {
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

/*
 * login-logic.js — SubletBuff email OTP login flow
 *
 * FLOW:
 *   1. On load: check existing session via window.sbAuth.getSession().
 *      - If signed in → show "already signed in" panel.
 *      - If not → show Step 1 (email input).
 *
 *   2. Step 1 — Send code:
 *      - Validate email ends with @colorado.edu (inline error if not).
 *      - Call supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }).
 *        No emailRedirectTo — Supabase email template sends a plain 6-digit {{ .Token }}.
 *      - On success: show Step 2 panel with a 60-second resend cooldown.
 *
 *   3. Step 2 — Verify code:
 *      - Input: digits only, maxlength 6, auto-submits on 6th digit.
 *      - Call supabase.auth.verifyOtp({ email, token, type: 'email' }).
 *      - On success: redirect to ?return= query param (sanitised) or /account.html.
 *      - On error: show inline error, re-enable Verify button.
 *
 *   4. Resend: re-calls signInWithOtp with the same email and restarts the 60s countdown.
 *   5. Change email: returns to Step 1 with email field pre-filled.
 *   6. Sign out (already-signed-in panel): calls window.sbAuth.signOut() → Step 1.
 *
 * Depends on: window.sbAuth (from auth.js) and window.sbAuth.supabaseClient.
 *
 * MANUAL TEST CHECKLIST:
 *   [ ] "Sign In" nav button → /login.html?return=<current-path>
 *   [ ] Non-@colorado.edu email → inline error shown
 *   [ ] Valid CU email → "Code sent!" success message; button disabled 60s
 *   [ ] Resend countdown reaches 0 → "Resend code" link appears
 *   [ ] Resend link → sends another code, countdown resets
 *   [ ] Wrong/expired code → inline error; Verify re-enabled
 *   [ ] Correct code → redirected to ?return= or /account.html
 *   [ ] Logged-in visit to /login.html → "You're signed in" panel
 *   [ ] "Sign out" in already-signed-in panel → returns to Step 1; nav resets
 *   [ ] Nav "Account" link visible after sign-in on any page
 */

(function () {
  'use strict';

  const RESEND_COOLDOWN_S = 60;

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const panelAlready  = document.getElementById('panel-already');
  const panelEmail    = document.getElementById('panel-email');
  const panelVerify   = document.getElementById('panel-verify');

  const alreadyEmail  = document.getElementById('already-email');
  const btnSignout    = document.getElementById('btn-signout');

  const inputEmail    = document.getElementById('input-email');
  const errorEmail    = document.getElementById('error-email');
  const btnSend       = document.getElementById('btn-send');

  const sentToEmail   = document.getElementById('sent-to-email');
  const successMsg    = document.getElementById('success-msg');
  const inputCode     = document.getElementById('input-code');
  const errorCode     = document.getElementById('error-code');
  const btnVerify     = document.getElementById('btn-verify');
  const resendCountdown = document.getElementById('resend-countdown');
  const btnResend     = document.getElementById('btn-resend');
  const btnChangeEmail = document.getElementById('btn-change-email');

  // ── State ─────────────────────────────────────────────────────────────────
  let currentEmail = '';
  let cooldownTimer = null;
  let cooldownRemaining = 0;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function showPanel(panel) {
    [panelAlready, panelEmail, panelVerify].forEach(p => {
      if (p) p.style.display = (p === panel) ? '' : 'none';
    });
  }

  function setError(el, msg) {
    if (!el) return;
    el.textContent = msg || '';
    el.style.display = msg ? 'block' : 'none';
  }

  function isCuEmail(email) {
    return typeof email === 'string' && email.trim().toLowerCase().endsWith('@colorado.edu');
  }

  function getSafeReturnUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('return') || '';
      // Only allow same-origin relative paths
      if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
        return raw;
      }
    } catch (_) {}
    return '/account.html';
  }

  // ── Resend cooldown ───────────────────────────────────────────────────────
  function startCooldown() {
    clearInterval(cooldownTimer);
    cooldownRemaining = RESEND_COOLDOWN_S;
    btnResend.style.display = 'none';
    resendCountdown.textContent = 'Resend in ' + cooldownRemaining + 's';

    cooldownTimer = setInterval(() => {
      cooldownRemaining -= 1;
      if (cooldownRemaining <= 0) {
        clearInterval(cooldownTimer);
        resendCountdown.textContent = '';
        btnResend.style.display = '';
      } else {
        resendCountdown.textContent = 'Resend in ' + cooldownRemaining + 's';
      }
    }, 1000);
  }

  // ── Send OTP ──────────────────────────────────────────────────────────────
  async function sendOtp(email, isResend) {
    const sb = window.sbAuth && window.sbAuth.supabaseClient;
    if (!sb) {
      setError(errorEmail, 'Auth service unavailable. Please refresh.');
      return false;
    }

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    });

    if (error) {
      console.error('[login] signInWithOtp error', error);
      if (isResend) {
        setError(errorCode, error.message || 'Failed to resend code. Try again.');
      } else {
        setError(errorEmail, error.message || 'Failed to send code. Please try again.');
      }
      return false;
    }

    console.log('[login] OTP sent to', email);
    return true;
  }

  // ── Step 1: Send code ─────────────────────────────────────────────────────
  async function handleSendCode() {
    const email = inputEmail.value.trim().toLowerCase();
    setError(errorEmail, '');

    if (!email) {
      setError(errorEmail, 'Please enter your CU Boulder email.');
      inputEmail.focus();
      return;
    }
    if (!isCuEmail(email)) {
      setError(errorEmail, 'Only @colorado.edu emails are allowed. Please use your CU Boulder email.');
      inputEmail.focus();
      return;
    }

    btnSend.disabled = true;
    btnSend.textContent = 'Sending…';

    const ok = await sendOtp(email, false);

    btnSend.disabled = false;
    btnSend.textContent = 'Send Code';

    if (!ok) return;

    currentEmail = email;
    sentToEmail.textContent = email;
    successMsg.style.display = 'block';
    setError(errorCode, '');
    inputCode.value = '';
    showPanel(panelVerify);
    startCooldown();
    inputCode.focus();
  }

  // ── Step 2: Verify code ───────────────────────────────────────────────────
  async function handleVerify() {
    const code = inputCode.value.trim();
    setError(errorCode, '');

    if (!code || code.length < 6) {
      setError(errorCode, 'Please enter the full 6-digit code.');
      inputCode.focus();
      return;
    }

    const sb = window.sbAuth && window.sbAuth.supabaseClient;
    if (!sb) {
      setError(errorCode, 'Auth service unavailable. Please refresh.');
      return;
    }

    btnVerify.disabled = true;
    btnVerify.textContent = 'Verifying…';

    const { error } = await sb.auth.verifyOtp({
      email: currentEmail,
      token: code,
      type: 'email'
    });

    if (error) {
      console.error('[login] verifyOtp error', error);
      setError(errorCode, error.message || 'Invalid or expired code. Please try again.');
      btnVerify.disabled = false;
      btnVerify.textContent = 'Verify';
      return;
    }

    console.log('[login] OTP verified — session created');
    // supabase-js persists the session automatically
    window.location.href = getSafeReturnUrl();
  }

  // ── Resend ────────────────────────────────────────────────────────────────
  async function handleResend() {
    btnResend.style.display = 'none';
    setError(errorCode, '');
    successMsg.style.display = 'none';

    const ok = await sendOtp(currentEmail, true);
    if (!ok) return;

    successMsg.style.display = 'block';
    startCooldown();
    inputCode.value = '';
    inputCode.focus();
  }

  // ── Already signed in: sign out ───────────────────────────────────────────
  async function handleSignOut() {
    btnSignout.disabled = true;
    btnSignout.textContent = 'Signing out…';
    await window.sbAuth.signOut();
    // auth.js onAuthStateChange will update the nav; we reset the login page
    btnSignout.disabled = false;
    btnSignout.textContent = 'Sign out';
    inputEmail.value = '';
    setError(errorEmail, '');
    showPanel(panelEmail);
    inputEmail.focus();
  }

  // ── Wire up events ────────────────────────────────────────────────────────
  btnSend.addEventListener('click', handleSendCode);

  inputEmail.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSendCode();
  });

  btnVerify.addEventListener('click', handleVerify);

  // Auto-submit when 6th digit is typed
  inputCode.addEventListener('input', () => {
    // Strip non-digits
    inputCode.value = inputCode.value.replace(/\D/g, '').slice(0, 6);
    if (inputCode.value.length === 6) handleVerify();
  });

  btnResend.addEventListener('click', handleResend);

  btnChangeEmail.addEventListener('click', () => {
    clearInterval(cooldownTimer);
    setError(errorCode, '');
    successMsg.style.display = 'none';
    showPanel(panelEmail);
    inputEmail.value = currentEmail;
    inputEmail.focus();
  });

  btnSignout.addEventListener('click', handleSignOut);

  // ── Init: check session ───────────────────────────────────────────────────
  async function init() {
    // Wait for sbAuth to be ready (auth.js runs before this script)
    if (!window.sbAuth) {
      showPanel(panelEmail);
      return;
    }

    try {
      const { data: { session } } = await window.sbAuth.getSession();
      if (session && session.user) {
        alreadyEmail.textContent = session.user.email || '';
        showPanel(panelAlready);
      } else {
        showPanel(panelEmail);
        inputEmail.focus();
      }
    } catch (_) {
      showPanel(panelEmail);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

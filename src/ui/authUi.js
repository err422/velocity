// Multi-provider Auth Modal UI (Email/Password, Privacy-First Anonymous Guest, Google, and Guest-to-Email Upgrade).
(function () {
  let authModalMode = 'signin'; // 'signin' | 'signup' | 'reset'
  let authBusy = false;

  function getEl(id) {
    return document.getElementById(id);
  }

  function isSignedInUser(user) {
    if (window.VelocityAuthHelpers && typeof window.VelocityAuthHelpers.isUserSignedIn === 'function') {
      return window.VelocityAuthHelpers.isUserSignedIn(user);
    }
    return Boolean(user && typeof user.uid === 'string' && user.uid.length > 0);
  }

  function setAuthStatus(message, tone) {
    const el = getEl('authModalStatus');
    if (!el) return;
    if (!message) {
      el.textContent = '';
      el.style.display = 'none';
      el.className = 'auth-status';
      return;
    }
    el.textContent = String(message);
    el.style.display = '';
    el.className = 'auth-status ' + (tone === 'ok' ? 'ok' : 'err');
  }

  function setAuthBusy(busy) {
    authBusy = Boolean(busy);
    const modal = getEl('authModal');
    if (!modal) return;
    modal.querySelectorAll('button[type="submit"], #authGuestBtn, #authGoogleBtn, #authSignOutBtn').forEach((btn) => {
      btn.disabled = authBusy;
    });
  }

  function setAuthTab(mode) {
    authModalMode = mode === 'signup' ? 'signup' : mode === 'reset' ? 'reset' : 'signin';
    const tabSignIn = getEl('authTabSignIn');
    const tabSignUp = getEl('authTabSignUp');
    const signInForm = getEl('authSignInForm');
    const signUpForm = getEl('authSignUpForm');
    const resetForm = getEl('authResetForm');

    if (tabSignIn) {
      const active = authModalMode === 'signin' || authModalMode === 'reset';
      tabSignIn.classList.toggle('active', active);
      tabSignIn.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    if (tabSignUp) {
      const active = authModalMode === 'signup';
      tabSignUp.classList.toggle('active', active);
      tabSignUp.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    if (signInForm) signInForm.style.display = authModalMode === 'signin' ? '' : 'none';
    if (signUpForm) signUpForm.style.display = authModalMode === 'signup' ? '' : 'none';
    if (resetForm) resetForm.style.display = authModalMode === 'reset' ? '' : 'none';
    setAuthStatus('', '');
  }

  function renderAuthModalContent() {
    const st = window.DailyBackend ? window.DailyBackend.getState() : { user: null };
    const user = st.user || null;
    const signedIn = isSignedInUser(user);

    const signedOutView = getEl('authSignedOutView');
    const signedInView = getEl('authSignedInView');
    const kickerEl = getEl('authModalKicker');
    const titleEl = getEl('authModalTitle');
    const subEl = getEl('authModalSub');

    if (signedOutView) signedOutView.style.display = signedIn ? 'none' : '';
    if (signedInView) signedInView.style.display = signedIn ? '' : 'none';

    if (!signedIn) {
      if (kickerEl) kickerEl.textContent = 'ACCOUNT ACCESS';
      if (titleEl) titleEl.textContent = 'Sign In to VELOCITY';
      if (subEl) subEl.textContent = 'Use any email address, continue privately without an email, or sign in with Google.';
      setAuthTab(authModalMode);
      return;
    }

    const badge = window.VelocityAuthHelpers
      ? window.VelocityAuthHelpers.describeAccountBadge(user)
      : { kind: user.isAnonymous ? 'anonymous' : 'email', label: user.isAnonymous ? 'PRIVATE GUEST' : 'SIGNED IN', canUpgrade: Boolean(user.isAnonymous) };
    const effectiveName = typeof getEffectiveUserName === 'function'
      ? getEffectiveUserName(user)
      : (user.displayName || 'Runner');

    if (kickerEl) kickerEl.textContent = 'ACCOUNT';
    if (titleEl) titleEl.textContent = effectiveName;
    if (subEl) {
      subEl.textContent = badge.kind === 'anonymous'
        ? 'You are playing privately without sharing an email. PvP lobbies and browser progress are active.'
        : 'Your loadouts, armory inventory, settings, and PvP lobbies are synced to your account.';
    }

    const badgeEl = getEl('authAccountBadge');
    const nameEl = getEl('authAccountName');
    const detailEl = getEl('authAccountDetail');
    const upgradeBox = getEl('authUpgradeBox');
    const signOutHint = getEl('authSignOutHint');

    if (badgeEl) {
      badgeEl.textContent = badge.label;
      badgeEl.dataset.kind = badge.kind;
    }
    if (nameEl) nameEl.textContent = effectiveName;
    if (detailEl) {
      if (badge.kind === 'anonymous') {
        detailEl.textContent = 'No email shared · Active on this browser';
      } else if (badge.kind === 'email') {
        detailEl.textContent = user.email ? `Email account · ${user.email}` : 'Email & password account';
      } else {
        detailEl.textContent = user.email ? `Google account · ${user.email}` : 'Google account';
      }
    }
    if (upgradeBox) upgradeBox.style.display = badge.canUpgrade ? '' : 'none';
    if (signOutHint) {
      signOutHint.textContent = badge.kind === 'anonymous'
        ? 'Signing out ends this Private Guest session on this browser unless you link an email above.'
        : 'You can sign back in on any device at any time.';
    }
  }

  function openAuthModal(initialMode) {
    const modal = getEl('authModal');
    if (!modal) return;
    if (initialMode === 'signup' || initialMode === 'signin' || initialMode === 'reset') {
      authModalMode = initialMode;
    } else {
      authModalMode = 'signin';
    }
    setAuthStatus('', '');
    renderAuthModalContent();
    modal.style.display = 'grid';

    // Focus first relevant field without stealing focus on signed-in view
    const st = window.DailyBackend ? window.DailyBackend.getState() : { user: null };
    if (!isSignedInUser(st.user)) {
      const targetInput = authModalMode === 'signup'
        ? getEl('authSignUpEmail')
        : authModalMode === 'reset'
          ? getEl('authResetEmail')
          : getEl('authSignInEmail');
      if (targetInput) setTimeout(() => targetInput.focus(), 20);
    }
  }

  function closeAuthModal() {
    const modal = getEl('authModal');
    if (!modal) return;
    modal.style.display = 'none';
    setAuthStatus('', '');
    const pwFields = ['authSignInPassword', 'authSignUpPassword', 'authUpgradePassword'];
    for (const id of pwFields) {
      const el = getEl(id);
      if (el) el.value = '';
    }
  }

  function isAuthModalOpen() {
    const modal = getEl('authModal');
    return Boolean(modal && modal.style.display !== 'none');
  }

  function afterSuccessfulAuth(toastMessage) {
    closeAuthModal();
    if (typeof showToast === 'function' && toastMessage) {
      showToast(toastMessage);
    }
    if (typeof selectedDateKey !== 'undefined' && selectedDateKey && typeof dailyHubEl !== 'undefined' && dailyHubEl && dailyHubEl.style.display !== 'none') {
      if (typeof loadLeaderboardFor === 'function') loadLeaderboardFor(selectedDateKey);
    }
  }

  function showAuthError(err) {
    const formatted = window.VelocityAuthHelpers
      ? window.VelocityAuthHelpers.formatAuthError(err)
      : (err && err.message ? String(err.message) : 'Sign-in failed. Please try again.');
    if (formatted) {
      setAuthStatus(formatted, 'err');
    }
  }

  function wireAuthModal() {
    const modal = getEl('authModal');
    if (!modal || modal.dataset.wired === '1') return;
    modal.dataset.wired = '1';

    const closeBtn = getEl('authModalCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal && !authBusy) closeAuthModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && isAuthModalOpen() && !authBusy) {
        e.preventDefault();
        e.stopPropagation();
        closeAuthModal();
      }
    }, true);

    const tabSignIn = getEl('authTabSignIn');
    const tabSignUp = getEl('authTabSignUp');
    if (tabSignIn) tabSignIn.addEventListener('click', () => setAuthTab('signin'));
    if (tabSignUp) tabSignUp.addEventListener('click', () => setAuthTab('signup'));

    const forgotBtn = getEl('authForgotBtn');
    const resetBackBtn = getEl('authResetBackBtn');
    if (forgotBtn) {
      forgotBtn.addEventListener('click', () => {
        const signInEmail = getEl('authSignInEmail');
        const resetEmail = getEl('authResetEmail');
        if (signInEmail && resetEmail && signInEmail.value.trim()) {
          resetEmail.value = signInEmail.value.trim();
        }
        setAuthTab('reset');
        if (resetEmail) setTimeout(() => resetEmail.focus(), 20);
      });
    }
    if (resetBackBtn) {
      resetBackBtn.addEventListener('click', () => setAuthTab('signin'));
    }

    // Email Sign In
    const signInForm = getEl('authSignInForm');
    if (signInForm) {
      signInForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (authBusy) return;
        const email = (getEl('authSignInEmail')?.value || '').trim();
        const password = getEl('authSignInPassword')?.value || '';
        if (window.VelocityAuthHelpers) {
          const ev = window.VelocityAuthHelpers.validateEmail(email);
          if (!ev.valid) { setAuthStatus(ev.error, 'err'); return; }
          const pv = window.VelocityAuthHelpers.validatePassword(password, { isSignUp: false });
          if (!pv.valid) { setAuthStatus(pv.error, 'err'); return; }
        }
        if (!window.DailyBackend || typeof window.DailyBackend.signInWithEmail !== 'function') {
          setAuthStatus('Cloud backend is still loading. Try again in a moment.', 'err');
          return;
        }
        setAuthStatus('', '');
        setAuthBusy(true);
        try {
          await window.DailyBackend.signInWithEmail({ email, password });
          afterSuccessfulAuth('SIGNED IN WITH EMAIL');
        } catch (err) {
          showAuthError(err);
        } finally {
          setAuthBusy(false);
        }
      });
    }

    // Email Sign Up
    const signUpForm = getEl('authSignUpForm');
    if (signUpForm) {
      signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (authBusy) return;
        const displayName = (getEl('authSignUpCallsign')?.value || '').trim();
        const email = (getEl('authSignUpEmail')?.value || '').trim();
        const password = getEl('authSignUpPassword')?.value || '';
        if (window.VelocityAuthHelpers) {
          const ev = window.VelocityAuthHelpers.validateEmail(email);
          if (!ev.valid) { setAuthStatus(ev.error, 'err'); return; }
          const pv = window.VelocityAuthHelpers.validatePassword(password, { isSignUp: true });
          if (!pv.valid) { setAuthStatus(pv.error, 'err'); return; }
        }
        if (!window.DailyBackend || typeof window.DailyBackend.signUpWithEmail !== 'function') {
          setAuthStatus('Cloud backend is still loading. Try again in a moment.', 'err');
          return;
        }
        setAuthStatus('', '');
        setAuthBusy(true);
        try {
          await window.DailyBackend.signUpWithEmail({ email, password, displayName });
          afterSuccessfulAuth('ACCOUNT CREATED · WELCOME TO VELOCITY');
        } catch (err) {
          showAuthError(err);
        } finally {
          setAuthBusy(false);
        }
      });
    }

    // Password Reset
    const resetForm = getEl('authResetForm');
    if (resetForm) {
      resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (authBusy) return;
        const email = (getEl('authResetEmail')?.value || '').trim();
        if (window.VelocityAuthHelpers) {
          const ev = window.VelocityAuthHelpers.validateEmail(email);
          if (!ev.valid) { setAuthStatus(ev.error, 'err'); return; }
        }
        if (!window.DailyBackend || typeof window.DailyBackend.sendPasswordReset !== 'function') {
          setAuthStatus('Cloud backend is still loading. Try again in a moment.', 'err');
          return;
        }
        setAuthStatus('', '');
        setAuthBusy(true);
        try {
          await window.DailyBackend.sendPasswordReset(email);
          setAuthStatus('If an account exists for that email, a password reset link has been sent.', 'ok');
        } catch (err) {
          showAuthError(err);
        } finally {
          setAuthBusy(false);
        }
      });
    }

    // Privacy-First Anonymous Guest
    const guestBtn = getEl('authGuestBtn');
    if (guestBtn) {
      guestBtn.addEventListener('click', async () => {
        if (authBusy) return;
        if (!window.DailyBackend || typeof window.DailyBackend.signInAsGuest !== 'function') {
          setAuthStatus('Cloud backend is still loading. Try again in a moment.', 'err');
          return;
        }
        const callsign = (getEl('authGuestCallsign')?.value || '').trim();
        setAuthStatus('', '');
        setAuthBusy(true);
        try {
          await window.DailyBackend.signInAsGuest(callsign);
          afterSuccessfulAuth('SIGNED IN PRIVATELY AS GUEST');
        } catch (err) {
          showAuthError(err);
        } finally {
          setAuthBusy(false);
        }
      });
    }

    // Google Sign In
    const googleBtn = getEl('authGoogleBtn');
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        if (authBusy) return;
        if (!window.DailyBackend || typeof window.DailyBackend.signInWithGoogle !== 'function') {
          setAuthStatus('Cloud backend is still loading. Try again in a moment.', 'err');
          return;
        }
        setAuthStatus('', '');
        setAuthBusy(true);
        try {
          await window.DailyBackend.signInWithGoogle();
          afterSuccessfulAuth('SIGNED IN WITH GOOGLE');
        } catch (err) {
          showAuthError(err);
        } finally {
          setAuthBusy(false);
        }
      });
    }

    // Upgrade Private Guest -> Email Account
    const upgradeForm = getEl('authUpgradeForm');
    if (upgradeForm) {
      upgradeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (authBusy) return;
        const email = (getEl('authUpgradeEmail')?.value || '').trim();
        const password = getEl('authUpgradePassword')?.value || '';
        if (window.VelocityAuthHelpers) {
          const ev = window.VelocityAuthHelpers.validateEmail(email);
          if (!ev.valid) { setAuthStatus(ev.error, 'err'); return; }
          const pv = window.VelocityAuthHelpers.validatePassword(password, { isSignUp: true });
          if (!pv.valid) { setAuthStatus(pv.error, 'err'); return; }
        }
        if (!window.DailyBackend || typeof window.DailyBackend.upgradeGuestWithEmail !== 'function') {
          setAuthStatus('Cloud backend is still loading. Try again in a moment.', 'err');
          return;
        }
        setAuthStatus('', '');
        setAuthBusy(true);
        try {
          await window.DailyBackend.upgradeGuestWithEmail({ email, password });
          const uEmail = getEl('authUpgradeEmail');
          const uPw = getEl('authUpgradePassword');
          if (uEmail) uEmail.value = '';
          if (uPw) uPw.value = '';
          renderAuthModalContent();
          setAuthStatus('Email linked! Your progress now syncs across all devices.', 'ok');
          if (typeof showToast === 'function') showToast('GUEST UPGRADED TO EMAIL ACCOUNT');
        } catch (err) {
          showAuthError(err);
        } finally {
          setAuthBusy(false);
        }
      });
    }

    // Sign Out
    const signOutBtn = getEl('authSignOutBtn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', async () => {
        if (authBusy) return;
        if (!window.DailyBackend) return;
        setAuthBusy(true);
        try {
          await window.DailyBackend.signOutUser();
          closeAuthModal();
          if (typeof showToast === 'function') showToast('SIGNED OUT');
        } catch (err) {
          showAuthError(err);
        } finally {
          setAuthBusy(false);
        }
      });
    }
  }

  window.VelocityAuthUI = {
    openAuthModal,
    closeAuthModal,
    isAuthModalOpen,
    renderAuthModalContent,
    wireAuthModal
  };
  window.openAuthModal = openAuthModal;
  window.closeAuthModal = closeAuthModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireAuthModal);
  } else {
    wireAuthModal();
  }
})();

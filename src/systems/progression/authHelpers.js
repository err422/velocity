// Pure authentication validation, account-kind helpers, and safe error formatting for VELOCITY.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VelocityAuthHelpers = factory();
  }
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const MIN_PASSWORD_LENGTH = 8;
  const MAX_PASSWORD_LENGTH = 128;
  const MAX_EMAIL_LENGTH = 254;
  const MAX_CALLSIGN_LENGTH = 32;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function sanitizeCallsign(raw) {
    if (typeof raw !== 'string') return '';
    return raw
      .replace(/\s+/g, ' ')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim()
      .slice(0, MAX_CALLSIGN_LENGTH);
  }

  function validateEmail(raw) {
    const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    if (!email) {
      return { valid: false, email: '', error: 'Please enter your email address.' };
    }
    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
      return { valid: false, email, error: 'Please enter a valid email address (any provider works).' };
    }
    return { valid: true, email };
  }

  function validatePassword(raw, opts) {
    const options = opts && typeof opts === 'object' ? opts : {};
    const isSignUp = Boolean(options.isSignUp);
    if (typeof raw !== 'string' || raw.length === 0) {
      return { valid: false, error: 'Please enter a password.' };
    }
    if (raw.length > MAX_PASSWORD_LENGTH) {
      return { valid: false, error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.` };
    }
    if (isSignUp && raw.length < MIN_PASSWORD_LENGTH) {
      return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
    }
    return { valid: true };
  }

  function buildGuestCallsign(preferred, uid) {
    const clean = sanitizeCallsign(preferred || '');
    if (clean.length > 0) return clean;
    const rawUid = typeof uid === 'string' ? uid.replace(/[^a-zA-Z0-9]/g, '') : '';
    const suffix = rawUid.length >= 4
      ? rawUid.slice(-4).toUpperCase()
      : String(Math.floor(1000 + Math.random() * 9000));
    return `Guest-${suffix}`;
  }

  function isUserSignedIn(user) {
    return Boolean(user && typeof user.uid === 'string' && user.uid.length > 0);
  }

  function getAuthProviderKind(user) {
    if (!isUserSignedIn(user)) return 'none';
    if (user.isAnonymous) return 'anonymous';
    const providers = Array.isArray(user.providerData) ? user.providerData : [];
    if (providers.some((p) => p && p.providerId === 'google.com')) return 'google';
    if (providers.some((p) => p && p.providerId === 'password')) return 'email';
    return user.email ? 'email' : 'anonymous';
  }

  function describeAccountBadge(user) {
    const kind = getAuthProviderKind(user);
    if (kind === 'anonymous') {
      return {
        kind: 'anonymous',
        label: 'PRIVATE GUEST',
        syncLabel: 'PRIVATE GUEST · SYNCED',
        canUpgrade: true
      };
    }
    if (kind === 'email') {
      return {
        kind: 'email',
        label: 'EMAIL ACCOUNT',
        syncLabel: 'CLOUD SYNCED',
        canUpgrade: false
      };
    }
    if (kind === 'google') {
      return {
        kind: 'google',
        label: 'GOOGLE ACCOUNT',
        syncLabel: 'CLOUD SYNCED',
        canUpgrade: false
      };
    }
    return {
      kind: 'none',
      label: 'LOCAL ONLY',
      syncLabel: 'LOCAL ONLY',
      canUpgrade: false
    };
  }

  function formatAuthError(err) {
    const code = err && typeof err.code === 'string' ? err.code : '';
    const rawMsg = err && typeof err.message === 'string' ? err.message : '';
    const combined = `${code} ${rawMsg}`.toLowerCase();

    if (combined.includes('popup-closed-by-user') || combined.includes('cancelled-popup-request')) {
      return '';
    }
    if (combined.includes('operation-not-allowed') || combined.includes('admin-restricted-operation')) {
      return 'This sign-in option is not enabled in Firebase Console yet (Authentication → Sign-in method).';
    }
    if (combined.includes('email-already-in-use') || combined.includes('credential-already-in-use')) {
      return 'An account with that email already exists. Try signing in instead.';
    }
    if (
      combined.includes('invalid-credential') ||
      combined.includes('wrong-password') ||
      combined.includes('user-not-found') ||
      combined.includes('invalid-login-credentials')
    ) {
      return 'Invalid email or password. Double-check your details or reset your password.';
    }
    if (combined.includes('invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (combined.includes('weak-password')) {
      return `Password is too weak. Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (combined.includes('too-many-requests')) {
      return 'Too many attempts. Please wait a minute and try again.';
    }
    if (combined.includes('network-request-failed')) {
      return 'Network error. Check your internet connection and try again.';
    }
    if (combined.includes('unauthorized-domain')) {
      return 'This site domain is not authorized in Firebase Auth settings yet.';
    }
    if (combined.includes('popup-blocked')) {
      return 'Sign-in popup was blocked by your browser. Allow popups or use Email / Private Guest.';
    }
    if (combined.includes('requires-recent-login')) {
      return 'Please sign in again to complete that account update.';
    }
    if (err && err.isValidationError && rawMsg) {
      return rawMsg;
    }
    return 'Sign-in could not be completed. Please try again.';
  }

  return {
    MIN_PASSWORD_LENGTH,
    MAX_PASSWORD_LENGTH,
    MAX_EMAIL_LENGTH,
    MAX_CALLSIGN_LENGTH,
    sanitizeCallsign,
    validateEmail,
    validatePassword,
    buildGuestCallsign,
    isUserSignedIn,
    getAuthProviderKind,
    describeAccountBadge,
    formatAuthError
  };
});

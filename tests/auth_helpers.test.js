const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const AuthHelpers = require('../src/systems/progression/authHelpers.js');
const VelocitySettings = require('../src/systems/progression/settings.js');

test('validateEmail accepts non-Gmail providers and rejects malformed addresses', () => {
  for (const ok of [
    'player@proton.me',
    '  Alex.Smith+vel@outlook.com  ',
    'pilot@icloud.com',
    'user@yahoo.co.uk',
    'runner@custom-domain.io'
  ]) {
    const res = AuthHelpers.validateEmail(ok);
    assert.equal(res.valid, true, `expected valid for ${ok}`);
    assert.equal(res.email, ok.trim().toLowerCase());
  }

  for (const bad of ['', '   ', 'no-at-sign', 'bad@domain', '@example.com', 'a b@example.com']) {
    const res = AuthHelpers.validateEmail(bad);
    assert.equal(res.valid, false, `expected invalid for ${bad}`);
    assert.ok(res.error && res.error.length > 0);
  }
});

test('validatePassword enforces minimum length on sign-up and non-empty on sign-in', () => {
  assert.equal(AuthHelpers.validatePassword('', { isSignUp: false }).valid, false);
  assert.equal(AuthHelpers.validatePassword('short', { isSignUp: false }).valid, true);
  assert.equal(AuthHelpers.validatePassword('1234567', { isSignUp: true }).valid, false);
  assert.equal(AuthHelpers.validatePassword('12345678', { isSignUp: true }).valid, true);
  assert.equal(AuthHelpers.validatePassword('a'.repeat(129), { isSignUp: true }).valid, false);
});

test('buildGuestCallsign sanitizes user callsign or derives clean Guest-XXXX tag', () => {
  assert.equal(AuthHelpers.buildGuestCallsign('  Shadow\tNinja  ', 'abc12345'), 'Shadow Ninja');
  assert.equal(AuthHelpers.buildGuestCallsign('', 'uid_9f2a'), 'Guest-9F2A');
  assert.match(AuthHelpers.buildGuestCallsign('   ', ''), /^Guest-\d{4}$/);
  assert.equal(AuthHelpers.sanitizeCallsign('X'.repeat(60)).length, 32);
});

test('describeAccountBadge classifies Anonymous, Email, Google, and Signed-Out users without exposing raw email', () => {
  const anon = AuthHelpers.describeAccountBadge({ uid: 'u1', isAnonymous: true });
  assert.equal(anon.kind, 'anonymous');
  assert.equal(anon.label, 'PRIVATE GUEST');
  assert.equal(anon.canUpgrade, true);

  const email = AuthHelpers.describeAccountBadge({
    uid: 'u2',
    isAnonymous: false,
    email: 'secret@proton.me',
    providerData: [{ providerId: 'password' }]
  });
  assert.equal(email.kind, 'email');
  assert.equal(email.label, 'EMAIL ACCOUNT');
  assert.equal(email.canUpgrade, false);
  assert.equal(email.label.includes('secret@proton.me'), false);

  const google = AuthHelpers.describeAccountBadge({
    uid: 'u3',
    isAnonymous: false,
    email: 'alex@gmail.com',
    providerData: [{ providerId: 'google.com' }]
  });
  assert.equal(google.kind, 'google');
  assert.equal(google.label, 'GOOGLE ACCOUNT');
  assert.equal(google.canUpgrade, false);

  const none = AuthHelpers.describeAccountBadge(null);
  assert.equal(none.kind, 'none');
  assert.equal(none.canUpgrade, false);
});

test('formatAuthError maps Firebase error codes safely and silences popup cancellation', () => {
  assert.equal(AuthHelpers.formatAuthError({ code: 'auth/popup-closed-by-user' }), '');
  assert.match(
    AuthHelpers.formatAuthError({ code: 'auth/operation-not-allowed' }),
    /Firebase Console/i
  );
  assert.match(
    AuthHelpers.formatAuthError({ code: 'auth/email-already-in-use' }),
    /already exists/i
  );
  assert.match(
    AuthHelpers.formatAuthError({ code: 'auth/invalid-credential' }),
    /Invalid email or password/i
  );
  assert.match(
    AuthHelpers.formatAuthError({ code: 'auth/weak-password' }),
    /at least 8 characters/i
  );
  assert.equal(
    AuthHelpers.formatAuthError({ message: 'Password must be at least 8 characters.', isValidationError: true }),
    'Password must be at least 8 characters.'
  );
  // Generic unknown internal errors never leak raw message strings
  assert.equal(
    AuthHelpers.formatAuthError({ code: 'auth/internal-error', message: 'RAW_STACK_SECRET_123' }),
    'Sign-in could not be completed. Please try again.'
  );
});

test('resolveEffectiveDisplayName provides a clean Guest callsign for anonymous sessions', () => {
  assert.equal(
    VelocitySettings.resolveEffectiveDisplayName({ displayName: '' }, { uid: 'anon_7b4c', isAnonymous: true }),
    'Guest-7B4C'
  );
  assert.equal(
    VelocitySettings.resolveEffectiveDisplayName({ displayName: 'Ghost' }, { uid: 'anon_7b4c', isAnonymous: true }),
    'Ghost'
  );
  assert.equal(
    VelocitySettings.resolveEffectiveDisplayName({ displayName: '' }, { uid: 'anon_7b4c', isAnonymous: true, displayName: 'Viper' }),
    'Viper'
  );
});

test('firestore.rules supports Email/Password and Anonymous players without email_verified-only lockout', () => {
  const rulesText = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  assert.equal(rulesText.includes('email_verified'), false);
  assert.equal(rulesText.includes('isSignedIn()'), true);
  // Ensure strict ownership and default-deny remain intact
  assert.equal(rulesText.includes('allow read, write: if false;'), true);
  assert.equal(rulesText.includes('request.auth.uid == uid'), true);
});

test('isOfflineFirestoreError detects offline/unavailable errors and never masks permission-denied', () => {
  assert.equal(
    AuthHelpers.isOfflineFirestoreError(new Error('Failed to get document because the client is offline.')),
    true
  );
  assert.equal(
    AuthHelpers.isOfflineFirestoreError({ code: 'unavailable', message: 'Backend unreachable' }),
    true
  );
  assert.equal(
    AuthHelpers.isOfflineFirestoreError(
      new Error('Could not reach Cloud Firestore backend. Backend didn\'t respond within 10 seconds.')
    ),
    true
  );
  assert.equal(
    AuthHelpers.isOfflineFirestoreError(new Error('Failed to get document from server.')),
    true
  );
  assert.equal(
    AuthHelpers.isOfflineFirestoreError({ code: 'permission-denied', message: 'Missing or insufficient permissions.' }),
    false
  );
  assert.equal(
    AuthHelpers.isOfflineFirestoreError(new Error('Missing or insufficient permissions.')),
    false
  );
  assert.equal(AuthHelpers.isOfflineFirestoreError(null), false);
});

test('firebaseBackend.js initializes resilient Firestore transport and retains startup probe + permission handler', () => {
  const backendText = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'systems', 'progression', 'firebaseBackend.js'),
    'utf8'
  );
  assert.equal(backendText.includes('initializeFirestore('), true);
  assert.equal(backendText.includes('experimentalAutoDetectLongPolling: true'), true);
  assert.equal(backendText.includes('useFetchStreams: false'), true);
  assert.equal(backendText.includes("getDocFromServer(doc(db, 'test', 'connection'))"), true);
  assert.equal(backendText.includes('function handleFirestoreError('), true);
  assert.equal(backendText.includes('isOfflineError('), true);
});


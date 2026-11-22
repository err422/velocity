# VELOCITY Firestore Security Specification

## 1. Data Invariants

1. **Immutable Daily Seeds**: A document at `/dailyCourses/{dateKey}` represents a canonical daily course for a single UTC date (`YYYY-MM-DD`). Once created by a verified authenticated user, it can never be updated or deleted from client SDKs.
2. **No Orphaned Leaderboard Runs**: A run at `/dailyCourses/{dateKey}/runs/{uid}` cannot be created or updated unless its parent `/dailyCourses/{dateKey}` exists (Master Gate).
3. **Strict Self-Ownership**: Only a verified authenticated user whose `request.auth.uid == uid` can create, improve, or delete their own run document, and `data.uid` must match both `request.auth.uid` and the path `{uid}`.
4. **Monotonic PB Improvements**: Updating `/dailyCourses/{dateKey}/runs/{uid}` is only permitted when `incoming().bestTime < existing().bestTime`, and only `displayName`, `bestTime`, `splits`, and `updatedAt` may change. `uid`, `dateKey`, `isPublic`, and `createdAt` are immortal.
5. **No PII Storage**: Neither `dailyCourses` nor `runs` stores email addresses, phone numbers, or private tokens—only public course seeds and public runner display names/times.
6. **Strict Bounds & Server Timestamps**: Every string has `.size()` bounds, every array has `.size()` bounds and element type checks, `isPublic == true` is required and enforced on `list` queries, and `createdAt`/`updatedAt` must equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)

1. **Unauthenticated Write**: Guest attempts to `create` `/dailyCourses/2026-11-22` without `request.auth`.
2. **Unverified Email Write**: Authenticated user with `email_verified == false` attempts to post a run.
3. **Identity Spoofing**: User `alice` attempts to `create` `/dailyCourses/2026-11-22/runs/bob` or sets `uid: "bob"` inside `/runs/alice`.
4. **Shadow / Ghost Field Injection**: User `alice` creates a `DailyRun` containing an extra field `isAdmin: true` or `verified: true`.
5. **Daily Seed Tampering**: Any user attempts to `update` or `delete` `/dailyCourses/2026-11-22` to alter `seed`.
6. **Orphaned Run Creation**: User attempts to create `/dailyCourses/2099-01-01/runs/alice` when `/dailyCourses/2099-01-01` does not exist.
7. **Path ID Poisoning**: User attempts to write to `/dailyCourses/invalid-date-key` or a 500-char `{uid}`.
8. **Score Regression / Sandbagging**: User updates their existing `bestTime: 28.5` to a slower `bestTime: 45.0` or negative `bestTime: -5`.
9. **Immortal Field Tampering**: User updates `createdAt` or `dateKey` on an existing `DailyRun`.
10. **Client-Spoofed Timestamp**: User passes a client-fabricated `createdAt` or `updatedAt` != `request.time`.
11. **Array Flooding (Denial of Wallet)**: User submits `splits` with 100 entries (`> 32`) or `mechanics` with 20 entries (`> 8`) or unknown mechanic strings.
12. **Value Poisoning on Update**: User updates `displayName` to a 500-char string or non-string (`12345`), or sets `bestTime` to `"fast"`.

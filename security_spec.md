# VELOCITY Firestore Security Specification

## 1. Data Invariants

1. **Immutable Daily Seeds**: A document at `/dailyCourses/{dateKey}` represents a canonical daily course for a single UTC date (`YYYY-MM-DD`). Once created by a verified authenticated user, it can never be updated or deleted from client SDKs.
2. **No Orphaned Leaderboard Runs**: A run at `/dailyCourses/{dateKey}/runs/{uid}` cannot be created or updated unless its parent `/dailyCourses/{dateKey}` exists (Master Gate).
3. **Strict Self-Ownership**: Only a verified authenticated user whose `request.auth.uid == uid` can create, improve, or delete their own run document, and `data.uid` must match both `request.auth.uid` and the path `{uid}`.
4. **Monotonic PB Improvements & Safe Renames**: Updating `/dailyCourses/{dateKey}/runs/{uid}` is only permitted via two explicit actions: (a) a Personal Best Improvement where `incoming().bestTime < existing().bestTime` (affecting only `displayName`, `bestTime`, `splits`, `updatedAt`), or (b) a Display Name Update where `bestTime` and `splits` remain unchanged (affecting only `displayName`, `updatedAt`). `uid`, `dateKey`, `isPublic`, and `createdAt` are immortal.
5. **Strictly Private User Settings & Inventory**: Documents at `/userSettings/{uid}`, `/userInventory/{uid}`, `/userInventory/{uid}/knives/{knifeId}`, and `/userInventory/{uid}/gloves/{gloveId}` are strictly owner-only (`request.auth.uid == uid` with verified email). Root collection `list` is unconditionally denied (`allow list: if false`); subcollections `knives` and `gloves` `list` enforce `existing().uid == request.auth.uid`. Every knife or glove document requires its parent `/userInventory/{uid}` document to exist (Master Gate), is immutable once created (no tampering with float, patternSeed, or rarity via `update`), and validates exact enums/ranges.
6. **No PII Storage**: Neither `dailyCourses`, `runs`, `userSettings`, nor `userInventory` stores email addresses, phone numbers, or private tokens—only public course seeds, public runner display names/times, gameplay preferences, and cosmetic knife/glove inventories.
7. **Strict Bounds & Server Timestamps**: Every string has `.size()` bounds, every array has `.size()` bounds and element type checks, `isPublic == true` is required and enforced on `list` queries, and `createdAt`/`updatedAt` must equal `request.time`.

## 2. The "Dirty Dozen+" Adversarial Payloads (Must Return PERMISSION_DENIED)

1. **Unauthenticated Write**: Guest attempts to `create` `/dailyCourses/2026-11-22`, `/userSettings/alice`, or `/userInventory/alice` without `request.auth`.
2. **Unverified Email Write**: Authenticated user with `email_verified == false` attempts to post a run, save settings, or save inventory.
3. **Identity Spoofing / Cross-User Read**: User `alice` attempts to `get`/`create`/`update` `/userSettings/bob` or `/userInventory/bob`, `list` `/userInventory`, or `list` `/userInventory/bob/knives` or `/userInventory/bob/gloves`.
4. **Shadow / Ghost Field Injection**: User `alice` writes an extra field `isAdmin: true` on `DailyRun`, `UserSettings`, `UserInventory`, `caseCounts`, `KnifeItem`, or `GloveItem`.
5. **Daily Seed Tampering**: Any user attempts to `update` or `delete` `/dailyCourses/2026-11-22` to alter `seed`.
6. **Orphaned Subcollection Creation**: User attempts to create `/dailyCourses/2099-01-01/runs/alice`, `/userInventory/alice/knives/k1`, or `/userInventory/alice/gloves/g1` when the parent doc does not exist.
7. **Path ID Poisoning**: User attempts to write to `/dailyCourses/invalid-date-key` or a 500-char `{uid}`, `{knifeId}`, or `{gloveId}`.
8. **Score Regression / Item Mutability Tampering**: User updates `bestTime` to a slower time, or attempts to `update` an existing `KnifeItem` or `GloveItem` to change its `floatValue`, `patternSeed`, or `rarity`.
9. **Immortal Field Tampering**: User updates `createdAt`, `uid`, or `dateKey` on an existing `DailyRun`, `UserSettings`, or `UserInventory`.
10. **Client-Spoofed Timestamp**: User passes a client-fabricated `createdAt` or `updatedAt` != `request.time`.
11. **Array Flooding (Denial of Wallet)**: User submits `splits` with 100 entries (`> 32`) or `mechanics` with 20 entries (`> 8`) or unknown mechanic strings.
12. **Settings & Inventory Range Poisoning**: User writes `sensitivity: 99`, `baseFov: 300`, `viewmodel.offsetX: 50`, `viewmodel.fov: 150`, `keybinds.inspect: "Escape"`, `caseCounts.velocity: -5`, `patternSeed: 5000`, `floatValue: 2.5`, or an unknown `knifeType`/`gloveType`/`skinId`.

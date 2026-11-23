# VELOCITY Firestore Security Specification

## 1. Data Invariants

1. **Immutable Daily Seeds**: A document at `/dailyCourses/{dateKey}` represents a canonical daily course for a single UTC date (`YYYY-MM-DD`). Once created by a verified authenticated user, it can never be updated or deleted from client SDKs.
2. **No Orphaned Leaderboard Runs**: A run at `/dailyCourses/{dateKey}/runs/{uid}` cannot be created or updated unless its parent `/dailyCourses/{dateKey}` exists (Master Gate).
3. **Strict Self-Ownership**: Only a verified authenticated user whose `request.auth.uid == uid` can create, improve, or delete their own run document, and `data.uid` must match both `request.auth.uid` and the path `{uid}`.
4. **Monotonic PB Improvements & Safe Renames**: Updating `/dailyCourses/{dateKey}/runs/{uid}` is only permitted via two explicit actions: (a) a Personal Best Improvement where `incoming().bestTime < existing().bestTime` (affecting only `displayName`, `bestTime`, `splits`, `updatedAt`), or (b) a Display Name Update where `bestTime` and `splits` remain unchanged (affecting only `displayName`, `updatedAt`). `uid`, `dateKey`, `isPublic`, and `createdAt` are immortal.
5. **Strictly Private User Settings & Inventory**: Documents at `/userSettings/{uid}`, `/userInventory/{uid}`, `/userInventory/{uid}/knives/{knifeId}`, `/userInventory/{uid}/gloves/{gloveId}`, and `/userInventory/{uid}/weapons/{weaponId}` are strictly owner-only (`request.auth.uid == uid` with verified email). Root collection `list` is unconditionally denied (`allow list: if false`); subcollections `knives`, `gloves`, and `weapons` `list` enforce `existing().uid == request.auth.uid`. Every knife, glove, or weapon document requires its parent `/userInventory/{uid}` document to exist (Master Gate), is immutable once created, and validates exact enums/ranges.
6. **Serverless WebRTC Lobby Directory & Signaling Isolation**: Public lobbies at `/lobbies/{lobbyId}` are listable only by verified users when `isPrivate == false` and `status in ['open', 'in_progress']`; private rooms use deterministic `code_XXXX` IDs resolved via `allow get` so private rooms never leak on `list`. Only the room host (`existing().hostUid == request.auth.uid`) may update heartbeats/player counts or delete a lobby. Signaling docs at `/lobbies/{lobbyId}/peers/{peerUid}` enforce the parent lobby Master Gate, restrict reads/deletes strictly to the joining peer or lobby host, and split `update` permissions so a joiner can only trickle `offerCandidates` while the host can only write `answerSdp`/`answerCandidates` (bounded to <= 16KB SDP and <= 30 ICE strings).
7. **No PII Storage**: No collection stores email addresses, phone numbers, or private tokens—only public course seeds, runner display names/times, gameplay preferences, cosmetic inventories, and ephemeral WebRTC signaling metadata.
8. **Strict Bounds & Server Timestamps**: Every string has `.size()` bounds, every array has `.size()` bounds and element type checks, `isPublic == true` / `isPrivate == false` are enforced on `list` queries, and `createdAt`/`updatedAt`/`heartbeatAt` must equal `request.time`.

## 2. The "Dirty Dozen+" Adversarial Payloads (Must Return PERMISSION_DENIED)

1. **Unauthenticated Write**: Guest attempts to `create` `/dailyCourses/2026-11-22`, `/userSettings/alice`, `/userInventory/alice`, or `/lobbies/lob1` without `request.auth`.
2. **Unverified Email Write**: Authenticated user with `email_verified == false` attempts to post a run, save settings/inventory, host a lobby, or write WebRTC signaling.
3. **Identity Spoofing / Cross-User Read**: User `alice` attempts to `get`/`create`/`update` `/userSettings/bob`, `/userInventory/bob`, `list` `/userInventory/bob/weapons`, or read `/lobbies/lob1/peers/bob` when `alice` is neither `bob` nor the lobby host.
4. **Shadow / Ghost Field Injection**: User writes an extra field `isAdmin: true` on `DailyRun`, `UserSettings`, `UserInventory`, `KnifeItem`, `GloveItem`, `WeaponItem`, `Lobby`, or `LobbyPeer`.
5. **Daily Seed Tampering**: Any user attempts to `update` or `delete` `/dailyCourses/2026-11-22` to alter `seed`.
6. **Orphaned Subcollection Creation**: User attempts to create `/userInventory/alice/weapons/w1` or `/lobbies/nonexistent/peers/alice` when the parent doc does not exist.
7. **Path ID Poisoning**: User attempts to write to `/dailyCourses/invalid-date-key` or a 500-char `{uid}`, `{weaponId}`, or `{lobbyId}`.
8. **Score Regression / Item Mutability Tampering**: User updates `bestTime` to a slower time, or attempts to `update` an existing `KnifeItem`, `GloveItem`, or `WeaponItem`.
9. **Lobby Hijacking**: Non-host user attempts to `update` or `delete` someone else's `/lobbies/{lobbyId}` or overwrite another peer's `offerSdp` / `answerSdp`.
10. **Client-Spoofed Timestamp**: User passes a client-fabricated `createdAt`, `updatedAt`, or `heartbeatAt` != `request.time`.
11. **Array / SDP Flooding (Denial of Wallet)**: User submits `splits` > 32, `offerCandidates` > 30, `answerCandidates` > 30, or `offerSdp` > 16384 bytes.
12. **Private Lobby Leakage**: User runs a `list` query against `/lobbies` attempting to enumerate `isPrivate == true` rooms.

# Direct Aippy source update

`vite-plugin-github-import.ts` is Node-only and registered first in Vite. It does nothing on serve or when `enabled:false`. Active manifest mode verifies immutable URLs, manifest SHA-256, file byte sizes/hashes, safe destinations and declared runtime dependency floors before touching game files. It merges explicit asset keys while preserving unrelated host assets, preserves an existing assets.ts wrapper, stages all concurrent downloads, promotes with backups and rollback, and writes a completion receipt only after verification.

`github-import.config.json` starts inactive. A prepared update needs mode:manifest, enabled:true, repository:benryaus-cmd/barbie, exact manifestUrl/manifestSha256/sourceCommit and a fresh requestId. Reusing the same completed request skips all requests and preserves later local source edits. Root config, main.tsx, developer viewer files, src/dev and src/types do not arrive through the game manifest. SettingsModal.tsx is explicitly updated because it now contains real graphics/sound/About controls and the original hidden title-tap/password handlers.

Generate a manifest with `node scripts/make-manifest.mjs EXACT_PUBLISHED_SOURCE_COMMIT`. Commit that manifest separately. All game-file URLs inside point to the source commit, never the moving branch; the manifest itself then has its own immutable commit URL. The generated prompt supplies both identities. No recursive tree mode, required main.tsx rule, upstream folder, iframe or second React root is needed.

For an Aippy project that already has an importer, modify/reuse that single importer. The complete prepared prompt contains a tested manifest-mode implementation for a project missing it or for replacing its legacy download logic, while preserving the rest of Vite/Aippy tooling.

The original ZIP omitted gameplay tokens.ts because its hidden file-manifest plugin filtered every filename containing `token`. The project copy narrows that rule to credential token filenames. In the host, make this same one-line filter correction without replacing its developer utilities.

Verification: `npm test` includes a local network-mocked importer transaction test. An actual Aippy build and receipt must still be checked after pasting the activation prompt; configuring an importer is not proof the destination imported successfully.

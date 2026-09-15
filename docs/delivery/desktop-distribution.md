# macOS Desktop Distribution Evidence

`opl-studio` remains the side-by-side successor candidate. Its current bundle identity is
`cn.onepersonlab.opl.studio.preview`; this evidence does not adopt it as the active release shell or replace the
installed AionUI-based App.

## Planned mainline transition

The future Studio mainline will use `cn.onepersonlab.opl`, the mainline
`One Person Lab.app` installation path, and the App-owned mainline update feed.
The renderer technology does not require a new mainline application identity.
This is a migration design, not an implemented or qualified migration promise.
Publishing Preview now does not activate this transition.

| Existing installation | Future update route | Required proof before activation |
| --- | --- | --- |
| AionUI mainline (`cn.onepersonlab.opl`) | Existing mainline feed delivers a Studio implementation with the same bundle identity, signing team, installation path, and monotonically increasing mainline updater version | Real old signed installation updates, restarts, and retains history, workspace references, instructions and credentials |
| Studio Preview (`cn.onepersonlab.opl.studio.preview`) | Preview feed first delivers a signed bridge release; that release installs and starts the verified mainline bundle, then retires Preview only after successful readback | Real Preview update to bridge, identity migration, data preservation, retry and rollback; no direct cross-identity Squirrel assumption |

App owns activation, target identity, feed routing and migration policy; Studio
implements the carrier adapter. The bridge must verify the exact target version,
digest, Developer ID team and Apple trust before installation. A version such as
`0.1.x` from Preview must not reset the mainline version sequence. Until App
explicitly activates the transition, Preview updates remain on the dedicated
Preview repository and preserve the Preview bundle identity.

The old Preview feed must remain available for users who skip releases or return
after a long offline period. It must keep serving a compatible bridge, never
silently point an unprepared old updater at a different bundle identity. Test
the oldest supported versions as well as the immediately preceding release;
inventory updaterless historical builds and disclose any manual prerequisite.
Do not promise automatic migration for an installation that has no working updater.

If mainline and Preview coexist, detect both installations and active turns;
wait for a safe idle point, verify the existing mainline version and never
downgrade or overwrite a running application. Keep migration retryable and retain
the old app until the new app proves startup and canonical data access. Import
legacy AionUI history through the existing importer, preserving its source and
idempotency. Preserve Codex Home and Framework-owned credentials in place; do
not copy secrets into a renderer store or treat changing a bundle ID as data
migration. Test Keychain access and signing requirements across the identity change.

Before App activates the transition, qualify both routes in isolated macOS VMs:
download, signature validation, idle handling, installation, relaunch, history and
attachment access, failure rollback, repeated migration and subsequent ordinary
updates. Include co-installed apps, skipped versions, interrupted downloads and
insufficient disk space. These are future cutover gates; they do not block an
ordinary same-identity Preview release.

The carrier-specific release surface is declared in `contracts/desktop-release-carrier.json`. OPL App owns the
shared Electron toolchain, artifact/update policy, signing/notarization stages, publication, and public readback;
this repository owns only the Studio bundle, builder configuration, renderer payload, and Studio qualification
commands. A local package or updater smoke does not create a second release owner.

`npm run dist:mac` builds the shared Electron renderer/host, emits the Developer ID signed updater ZIP and
ULFO DMG, creates byte-identical `latest-mac.yml` and `latest-arm64-mac.yml`, and validates every feed
size/hash against the final artifacts. The extracted updater App must have the package version, a Developer
ID Application chain, TeamIdentifier, hardened runtime, and the dedicated `gaofeng21cn/opl-studio` feed.

The default qualification records Gatekeeper and stapling readback but does not convert missing Apple trust
evidence into success. `npm run qualify:desktop:mac:release` is fail-closed and requires Gatekeeper acceptance
plus stapled App and DMG tickets. Local Developer ID signing alone is a distributable candidate, not release
readiness, notarization, installed replacement, active-shell adoption, or public artifact authority.

`npm run qualify:desktop:updater:local` exercises the packaged Squirrel.Mac path against a credential-free
loopback feed. It builds an isolated base App and one-patch-newer ZIP with a qualification-only bundle id,
downloads and installs the update, reads the replaced App version, relaunches it, and reads the running updater
version through the host contract. HOME, Electron state, installation, builder output, and feed all live under
one temporary root; the command removes them after writing `out/macos-desktop-updater-qualification.json`.
This proves the local packaged update chain, not the GitHub release feed or Apple notarization.

`npm run smoke:preview` runs the carrier-neutral renderer harness against an existing CDP page. It reads the
Preview bundle identity when `--app-path` is supplied, exercises Standard and Full Framework readback through
the native bridge, then opens Settings, Account & Models, About, Run status, and the task inspector. Optional
Gateway setup and Codex turn hooks are supplied only through `OPL_STUDIO_GATEWAY_CREDENTIALS_FILE` or
`OPL_STUDIO_GATEWAY_EMAIL`/`OPL_STUDIO_GATEWAY_PASSWORD`, and `OPL_STUDIO_CODEX_TURN_HOOK_FILE` or
`OPL_STUDIO_CODEX_TURN_PROMPT`; secrets and prompts are never written to the receipt. Set
`OPL_STUDIO_RUNTIME_PROFILES=standard,full` to require both mapped profiles, and use
`--require-gateway-setup` or `--require-codex-turn` when those hooks are part of the run's acceptance.

`npm run qualify:desktop:clean-vm` clones the configured Tart macOS base, installs the exact local DMG,
launches the packaged App through a temporary SSH/CDP tunnel, and delegates to the same Preview smoke
harness. `--attach` reuses an already running CDP target for debugging; it does not claim package identity
unless `--app-path` allows a real `Info.plist` readback. Its receipt always keeps `cleanVmReady=false` and
`releaseReady=false`: a successful local install is candidate evidence only, while a missing Framework/Codex
runtime is recorded as a typed blocker instead of being hidden behind a shell fallback. The harness deletes
the temporary VM by default; use `--keep-vm` only for local debugging.

`npm run diagnose:gateway:persistence` checks the Framework-owned
`credentials.json`, `account.json`, and `installation.json` files without printing their contents, then
performs a real Preview cold start and compares mode, size, and SHA-256 before/after. It also compares the
sanitized `opl app state` Gateway projection with the renderer's `window.oplStudio.readState()` result.
The Studio renderer cache is not treated as credential authority.

The desktop main process resolves existing `codex` and `opl` installations into the documented
`OPL_CODEX_BIN` and `OPL_APP_OPL_BIN` environment boundaries before the shared host starts. This keeps
Finder launches independent of a terminal-only `PATH` while preserving explicit operator overrides. The
About and Updates surfaces read the running package version and the same main-process updater state; they
do not maintain a second version or update store.

Packaged Preview checks for App and eligible Framework updates daily in the main process. App updates
download silently and install after normal Host shutdown; an explicit update restart waits for an idle
Codex transport. Framework background apply stages Base and delegates installed official Package updates
to their native carriers. The idle lease holds new Codex requests until Package refresh finishes, and the
About page reports maintenance progress or retry state. Failed and busy runs retry after five minutes.

Before starting its persistent App Server, Preview supplies a fresh `OPL_APP_PROCESS_INSTANCE_ID` and
calls `opl update activate --json`. Framework owns verification, pending generation activation and rollback.
Explicit Codex executables remain selected; otherwise the activation receipt selects the managed binary.
The Standard bootstrap upgrades an older managed installation once if it lacks that public activation
command, then preserves subsequent managed Framework updates. Explicit external Framework roots are
preserved. External Temporal servers and developer or user-managed Packages remain with their owners.
`OPL_STUDIO_MANAGED_UPDATES=0` disables component maintenance, and explicit read-only mode blocks it.

For public macOS builds, `APPLE_KEYCHAIN_PROFILE` selects an existing notarytool credential profile through
electron-builder. Staple the final DMG, regenerate its feed hash, and run the release qualification against
the anonymous GitHub asset URL after publication. The dedicated Preview feed remains independent of
the ordinary App's Stable feed.

The Full wrapper defaults the release and updater versions to Studio's
`package.json` and forwards build arguments to the App-owned builder:

```bash
OPL_APP_REPO_ROOT=/path/to/one-person-lab-app npm run build:full -- \
  --out-dir /path/to/studio-release/full --skip-gui-build
```

`--skip-gui-build` requires an already built Studio App at the builder's expected
output path. Seal the Standard ZIP, blockmap, DMG, and both update feeds in a
separate release directory before building Full; the App builder refreshes the
GUI output and removes its temporary update feeds. Finalize both DMGs with the
App-owned `scripts/notarize-macos-dmg.ts`, then refresh the Standard DMG's feed
size and SHA-512 and the Full public manifest's final size and SHA-256. Keep the
Standard updater ZIP bound to the stapled Standard App. Full is appended to the
same release with `scripts/studio-full-release-adapter.ts`, preserving all
sealed Standard assets and update metadata. For a combined OCI release, follow
the [publication order](../oci-distribution.md#publication-order) before creating
the desktop release tag.

## Codex CLI version ownership

The macOS Standard and Full App bundles do not embed a second Codex CLI.
`opl-codex-native` starts the exact external or Framework-managed executable
selected through `OPL_CODEX_BIN` and the existing desktop resolver. Respect
explicit user-managed paths; Framework owns managed installation and updates.
The clean-VM qualification tarball is a test input, not the shipped CLI version.

The Docker/WebUI carrier does include Codex CLI and pins its default npm spec
in `Dockerfile` and `compose.yaml`. Preview 0.1.13 pins the stable `0.154.0`
release; runtime acceptance must read the image binary version as well as
exercise the App Server protocol. DSH Alpha selection does not change the Codex
stable channel.

The macOS afterPack hook boots the Host from the actual `app.asar` using the
packaged Electron binary and an isolated temporary profile with fake owners.
Missing runtime peers fail the build before signing. Desktop smoke selects the
current architecture output directly, never a recursively discovered old backup.

App Server stdio uses LF-delimited JSON frames, decoded across UTF-8 byte chunks.
Do not use Node `readline` for responses: Unicode line and paragraph separators
(U+2028/U+2029) are legal inside JSON strings, but newer Node versions split them.
Real histories containing these characters otherwise produce invalid fragments
and a misleading `thread/list` timeout. The history transport regression covers
large responses, Unicode separators, fragmented UTF-8, and CRLF framing without
truncating or rewriting canonical history.

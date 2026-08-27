# Ling

[简体中文](./README.md) · [English](./README.en.md)

**An open-source, local-first desktop application designed for continuous AI counseling.**

Ling treats AI counseling as a studio people can return to, not a disposable question-and-answer window. Its central engineering question is not how to make a model produce advice faster, but how an AI can listen across an ongoing dialogue, form tentative understandings, accept correction, and carry an established counseling context into the next meeting.

[Website](https://ling.xiaoqunpsy.cn/) · [Releases](../../releases) · [Product brief](./docs/brief.md) · [Architecture](./docs/architecture.md)

## From the interface to continuity of care

Ling is a complete Electron desktop application. The waiting room introduces counselors, supports booking and informed consent, and provides navigation through the studio. Chengling, Zhouzhou, and Lin Leshui each have a dedicated room, theoretical orientation, focus of attention, and conversational voice. Stories, resources, session history, counselor letters, and the lakeside garden provide spaces for reading, reflection, and transition outside a formal session.

```text
Enter the studio
  → choose a counselor and complete informed consent
  → begin a streaming session
  → preserve the record and run post-session work in the background
  → create conceptualization, supervision, a consultation memo, and a letter
  → continue from the established context when the user enables continuity
```

Ling currently provides:

- three independently designed and continuously tested built-in AI counselors;
- streaming responses, stop, retry, history restoration, archives, continuation, and optional continuity across sessions;
- `txt` / `md` imports, oversized-text materialization, Markdown export, and full local backup and restore;
- session summaries, session and longitudinal case conceptualization, independent supervision, consultation memos, and counselor letters;
- a local access lock, recovery phrase, reading, language, speech-input, and continuity settings;
- user-selected local or remote models, with separate assignments for counseling, preparation, supervision, and letters.

Ling is intended for emotional support, self-exploration, and psychology learning. It does not provide medical diagnosis or replace qualified counseling, psychiatric care, or real-world emergency support.

## How the counseling system works

Ling does not collapse counseling theory, safety policy, and scene instructions into one unmaintainable prompt. Live counseling is assembled from layers with explicit responsibilities and tests:

1. **Counselor core** defines who the counselor is, how they understand the relationship, and their theoretical orientation.
2. **Shared counseling values** establish the common stance: do not rush to conclusions, do not apply theory as a label, and allow understanding to be confirmed, revised, or rejected in dialogue.
3. **Session scene and voice** translate those principles into listening and response behavior for the current conversation.
4. **Live ethics and safety policy** is injected by Ling on every request and cannot be replaced by extensions or an old snapshot.
5. **Context planning** assembles the basic profile, rolling summary, previous consultation memo, and recent verbatim messages within explicit token budgets; the user's current words remain authoritative.
6. **Model capability resolution** selects system messages, split system messages, or a reasoning user-prefix and controls reasoning and sampling parameters for the selected model.

When a session is created, Ling freezes the counselor prompts, locale, package version, content hash, and model runtime contract. This keeps one session internally stable and prevents a package or application update from silently rewriting an existing relationship. Ethics and live safety policy remain current.

After a session, a background pipeline produces a session conceptualization and updates the longitudinal case understanding. An independent supervision module reviews pacing, relational process, omissions, and conclusions stated with excessive certainty. Ling then prepares a memo for the next session and a counselor letter for the user. These tasks are decoupled from the interface, so the rest of the application remains available while processing continues.

## Technical architecture and data boundaries

```text
Electron main
├── SQLite repositories and migrations
├── operating-system encrypted credential storage
├── model and speech-provider gateways
├── prompt compiler, context planner and safety routing
├── counseling lifecycle and post-session jobs
└── narrow, validated IPC contracts

React renderer
├── onboarding and local access lock
├── waiting room and counseling rooms
├── archives, letters, stories and local resources
└── model, privacy and accessibility settings
```

Core stack: Electron, React, TypeScript, Vite, Zustand, SQLite, and Vitest.

- Settings, sessions, messages, attachments, post-session artifacts, and letters are stored locally by default. Ling provides no first-party cloud sync, telemetry, advertising, or default external upload.
- The Renderer never accesses the database, operating-system files, or complete API keys directly. Electron main exposes required operations through validated IPC contracts.
- API keys are encrypted with operating-system secure storage, kept outside SQLite and backups, and never exposed to the Renderer.
- With a local model, model computation can remain on the device. With a remote API, only the prompts, messages, and budgeted context required by the selected function are sent to the provider chosen by the user.
- Context audits record message identifiers, roles, structure, and token counts, never conversation text.

## Desktop platforms

Official Electron installers target:

- macOS Apple silicon (ARM64)
- macOS Intel (x64)
- Windows x64
- Linux ARM64 (DEB)

Installers are available from the [official website](https://ling.xiaoqunpsy.cn/) or repository [Releases](../../releases). Ling checks the official website for a newer version and shows a download notice; it does not install updates silently.

## Local development

You need Node.js 22, npm, and the native build toolchain for Node.js modules on your operating system.

```bash
git clone https://github.com/Ling-Team/Open-Ling.git
cd Open-Ling
npm ci
npm run app
```

Configure model connections and API keys inside the app. Never place real credentials in source files or Git commits.

Common verification commands:

```bash
npm run typecheck
npm test -- --run
npm run build
npm run public-boundary:verify
```

`better-sqlite3` uses different native ABIs under Node/Vitest and Electron. Project scripts switch to the required build before tests, development startup, and packaging.

## Counselor extensions

A Ling counselor package is a declarative extension containing only `manifest.json`, prompts, and image assets. It executes no third-party JavaScript and cannot access the database, API keys, or user files.

Packages can define a counselor's identity and relationship stance, theoretical approach, live-session strategy, localized interface copy, and visual assets. Ling owns shared counseling values, ethics and live safety policy, context budgets, model-aware prompt compilation, memory injection, and post-session tasks. New sessions use an installed update; existing sessions retain the snapshot created with them.

```bash
npm run counselor:create -- ./my-counselor my-counselor
```

See the [professional counselor extension specification](./docs/professional-counselor-extension-spec.md) and [technical package format](./docs/counselor-packages.md).

## Open source and licensing

Community source releases are published at [Ling-Team/Open-Ling](https://github.com/Ling-Team/Open-Ling). Clear boundaries between code, brand, and asset licensing let developers study, verify, and improve the counseling system without treating the official character artwork as part of the Apache-2.0 code license.

Software code is licensed under [Apache-2.0](./LICENSE). The Ling and Qunxin Counseling Studio brands, official logos and app icons, and the official names and character images of Chengling, Zhouzhou, and Lin Leshui are not licensed under Apache-2.0. See the [Trademark Policy](./TRADEMARKS.md), [Asset License Notice](./ASSETS_LICENSE.md), and [Third-Party Notices](./THIRD_PARTY_NOTICES.md).

The official publisher and copyright holder is Shanghai Xiaoqun Education Technology Co., Ltd. `Ling-Team` is the GitHub maintainer account; “Qunxin Counseling Studio” is the AI counselor team presented inside the app.

## Documentation and contact

- [Project status](./docs/progress/README.md)
- [Public-release checklist](./docs/open-source-release-checklist.md)
- [Project identity](./docs/project-identity.md)
- GitHub: [Ling-Team](https://github.com/Ling-Team)
- Email: openling@xiaoqunpsy.cn
- Website: [ling.xiaoqunpsy.cn](https://ling.xiaoqunpsy.cn/)

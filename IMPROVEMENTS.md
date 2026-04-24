# waoowaoo — Improvements

Living list of things we want to change. Each item has:
- **What** — the change in plain language
- **Why** — what problem it solves
- **Where** — the files/paths that need touching
- **Status** — `idea` / `designing` / `in-progress` / `done`

---

## Design observations (current state, worth keeping)

### O1. Last frame = next panel's first frame

The `firstlastframe` video mode doesn't generate a dedicated last frame — it reuses an adjacent panel's first frame by `storyboardId` + `panelIndex` ([video.worker.ts:124-142](src/lib/workers/video.worker.ts#L124-L142)).

**Keep this.** It's elegant: zero extra image cost, guarantees the next clip starts exactly where this one ended, and it preserves character/location consistency for free. A separate last-frame image would just diverge from the next panel and break continuity.

Optional follow-up (low priority): allow the user to *override* the last frame with a different panel's image, a hand-picked variant, or a manual upload — for cases where they want a deliberate jump cut. UI surface would be a second image slot in the panel's video-gen dialog.

---

## Improvements (backlog)

### 1. Pass reference images to the video generation step

**What:** Currently the video step only receives the first frame (and optionally a last frame). Reference images — character sheets, location stills, props — are consumed *only* at the image-generation step and then discarded by the time Seedance/FAL/etc. runs. We want to add them as an additional input to the video step.

**Why:**
- Character drift is the single most-complained-about failure mode in image-to-video generation. Even if the first frame is pristine, the model often morphs faces/outfits during motion.
- Providers already support this. Ark/Seedance accepts `role: 'reference_image'` entries in the `content` array ([ark.ts:63](src/lib/generators/ark.ts#L63)) — the wire format is there, it's just not wired up in our code.
- FAL has `image_urls` on several endpoints (already used for image gen — can be piped through to video for models that accept it).
- Giving the model the *source-of-truth* character sheet alongside the first frame should tighten identity preservation through motion.

**Where:**
- Extend `VideoGenerateParams` in [src/lib/generators/base.ts](src/lib/generators/base.ts) to include `referenceImages?: string[]`.
- Update `ArkVideoGenerator.doGenerate` ([ark.ts:307](src/lib/generators/ark.ts#L307)):
  - Accept `referenceImages` from params
  - Append `{ type: 'image_url', image_url: { url: ... }, role: 'reference_image' }` items to the `content` array
  - Add `referenceImages` to the allowlist at [ark.ts:329-346](src/lib/generators/ark.ts#L329-L346)
- Update capability catalog so only models that accept reference images get them (per-model gating; others error out early).
- Update [src/lib/workers/video.worker.ts](src/lib/workers/video.worker.ts) (`generateVideoForPanel`) to gather the same reference set the image step used (`collectPanelReferenceImages`) and pass it through.
- UI: add a "include reference images" toggle on the video-gen dialog, default ON. Show which references will be attached.
- Billing: factor extra image tokens into cost estimate.
- Other providers (FAL, Google Veo, MiniMax, Vidu, OpenAI): add support incrementally where the provider API allows it; no-op where it doesn't.

**Open questions:**
- How many references is too many? Seedance has an effective cap; exceeding it degrades quality. Start with max 3 (priority: selected character appearance, location still, optional sketch).
- Should the set differ between first-frame-gen and video-gen? Probably not — consistency across the pipeline > cleverness.

**Status:** idea

---

### 2. Resolve double-audio when Seedance native audio + TTS voice lines both play

**What:** The Remotion composition layers two independent audio sources with no coordination: the source video's baked-in audio (which Seedance 2.x can generate natively via `generate_audio`) and the TTS voice-line track attached to each clip. Both play at full volume simultaneously.

**Why:** Concrete failure mode — if a user enables Seedance 2's `generate_audio` (or leaves it on the provider default for 2.0) and also has voice lines generated via FAL/Bailian, the final export plays two layers of speech on top of each other: Seedance's synthetic narration plus the properly-voiced TTS line. Result: garbled audio, no user-facing warning, no automatic resolution. The design intent is clearly "TTS is the narrative track" but nothing enforces it.

**Where:**
- [src/features/video-editor/remotion/VideoComposition.tsx:165-186](src/features/video-editor/remotion/VideoComposition.tsx#L165-L186) — `<Video>` element has no `muted` / `volume` prop. When a TTS voice-line attachment exists, the clip's own audio should be muted (or ducked, configurable).
- [src/lib/workers/video.worker.ts:112-114](src/lib/workers/video.worker.ts#L112-L114) — consider auto-setting `generateAudio: false` when the panel has matched voice lines, unless the user explicitly opts in.
- [src/features/video-editor/types/editor.types.ts:35](src/features/video-editor/types/editor.types.ts#L35) — add `videoVolume: number` (default 1.0, auto-set to 0 when TTS attachment present) to `VideoClip`.
- UI: when user toggles Seedance `generateAudio` on while voice lines exist, show a warning: "Native audio + voiceover will overlap — mute one?"

**Design options (pick one):**
1. **Mute source video when TTS voice line is attached** (simplest, most predictable).
2. **Duck source video to ~30% when TTS voice line is attached** (keeps ambient, lets TTS sit on top).
3. **Auto-disable Seedance `generate_audio` when a voice line is matched to the panel** (cheaper — no wasted audio generation).
4. Let the user decide per-project in settings, default to option 1.

**Open questions:**
- Some videos benefit from Seedance's ambient audio (wind, footsteps, music) even with TTS narration. Is full mute too aggressive? Option 2 might be the right default.
- Should BGM duck as well when TTS plays? (Currently BGM fades in/out on its own timeline; no crosstalk with voice lines.)

**Status:** idea

---

### 3. Auto-derive video duration from the panel's planned length

**What:** Each storyboard panel has a `duration` field computed from the script/narration timing, and voice lines have their own measured audio length — but the video generation step ignores both and uses whatever duration is set in project/user config (same value for every panel).

**Why:** A panel whose narration needs 8 seconds shouldn't be rendered at a fixed 5 seconds just because that's the project default. Picking one duration up-front and applying it uniformly means either (a) videos get cut short of their narration, (b) audio runs longer than the clip, or (c) the user has to manually adjust each panel's duration pill. The data to pick the right length per panel already exists — it just isn't plumbed through.

**Status:** idea

---

### 4. Restore capability-tiered pricing for `fal::gpt-image-2`

**What:** The pricing entry for `fal::gpt-image-2` is temporarily `mode: "flat"` with a placeholder `flatAmount: 0.4` ([standards/pricing/image-video.pricing.json:347-354](standards/pricing/image-video.pricing.json#L347-L354)). The real pricing is capability-tiered by `quality`: low=0.08, medium=0.4, high=1.92. Restore the capability tiers once the underlying plumbing bug is fixed.

**Why:** Without this, every generation is billed at the middle tier regardless of what quality the user selected. Low-quality gens get overcharged 5×; high-quality gens get undercharged 5×.

**Where — root cause to fix before restoring tiers:** the user's `quality` selection from `capabilityOverrides` isn't reaching `calcImage()`'s `metadata`/`selections` argument. Suspected gaps:
- [src/lib/billing/task-policy.ts:119](src/lib/billing/task-policy.ts#L119) `buildImageTaskInfo` — likely not pulling `capabilityOverrides[modelKey]` into the billing metadata.
- Panel-image regen route + `/api/assets/:id/generate` route — may not be passing capability selections to `buildImageTaskInfo` in the first place.

**Where — restore after fix:** revert the single JSON entry at [standards/pricing/image-video.pricing.json:347-354](standards/pricing/image-video.pricing.json#L347-L354) back to the capability-tiered form (committed in earlier history; `git log -S "gpt-image-2" standards/pricing/image-video.pricing.json` will surface the shape).

**Verification:** after restoring tiers, generate one image at each quality (low / medium / high) and confirm billing records 0.08 / 0.4 / 1.92 respectively.

**Status:** idea

---

## Template for new items

```md
### N. Short title

**What:** one-paragraph description.

**Why:** problem this solves, evidence it's a real issue.

**Where:** file paths / functions to modify.

**Open questions:** what's unclear.

**Status:** idea / designing / in-progress / done
```

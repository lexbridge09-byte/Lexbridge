# Done Checklist

Benchmark to pass **before** any page or feature is reported as done. Every item comes from a real
mistake made on this project; each time something new goes wrong, add it here.

---

## 0. HARD RULE — research before building (every page, every feature)

- [ ] Web search how the best products solve this exact screen/flow (UI **and** logic) **before** writing code.
- [ ] Name the reference patterns used (e.g. Zendesk agent workspace, Everlaw review pane) in the report.
- [ ] If REA is asked for, try it; if it can't run, say so plainly and use live-site inspection instead.

## 1. Verify in the browser, not just the build

- [ ] Opened the page in Chrome (Claude in Chrome) and **looked at it** — a 200 response or passing lint is not "done".
- [ ] Clicked through the whole flow (every step, every dropdown, every button), not only the first screen.
- [ ] Checked at 100% **and** zoomed in (≈150%) and at a phone width. Short viewports break pinned bars and popovers.
- [ ] Opened every dropdown / menu / tooltip and confirmed nothing covers or clips it.
- [ ] Clicked outside every open menu and confirmed it closes (including the empty space beside a wide panel).
- [ ] Console has no new errors.
- [ ] Ran `pnpm lint` (includes the en/hi i18n check) and `node scripts/checkUiFlows.mjs`.

## 2. Layout and space

- [ ] **No title bars / heroes on inner pages.** The site header says where you are. Heading stays only as `sr-only`.
- [ ] **No sub-headings or hint lines.** Supporting text goes in a `?` (`InfoTip`) beside the heading or label.
- [ ] Tool pages use the wide container (`TaskPage` is always wide) — no narrow centred column with empty sides.
- [ ] Tool pages (forms/flows) are app screens: tool + slim right rail. No "How it works", FAQ or CTA sections.
- [ ] Each form step fits one screen; the Continue/Back bar is pinned (`STICKY_FORM_ACTIONS_CLASS`).
- [ ] Tight spacing between fields (`space-y-3`); no big gaps between sections.
- [ ] Back office (admin/team) uses the full width (`Container size="full"`) — no centred column with empty sides.
- [ ] Record/detail pages are workspaces: no page scroll on desktop; the main object (e.g. a document) is centre and full height; properties/actions in a side panel that scrolls on its own. No `position: fixed` rails.
- [ ] Nothing that the user called "unnecessary space" (`+N more` counts, empty card areas, lone tiles in a grid).

## 3. Behaviour

- [ ] Menu links, cards and search open a **service page first**; forms are an action on that page, never the first click.
- [ ] Nothing is limited artificially in navigation (show every service; "Show more" — no computed counts).
- [ ] Buttons never change width on click (use `isLoading`, never swap the label).
- [ ] No mystery icons: any action whose icon isn't universally obvious (only ×/close is) carries a visible text label; a screen with unfamiliar controls gets a one-line "?" explaining it.
- [ ] Every step change animates (direction-aware slide) and scrolls the new step into view.
- [ ] Failures never dead-end: the user can still send their request; no "Something went wrong" as a headline.
- [ ] No duplicate controls (e.g. an "Edit description" link when the description is already editable in place).

## 4. Visual consistency

- [ ] One navigation bar on every public page (only checkout/login use the minimal header).
- [ ] Dark canvas everywhere; forms sit on the light `FormSheet`; no stray light cards on dark pages.
- [ ] Every popover/tooltip is screen-aware: portal + flip (vertical) + shift (stays inside the viewport). Test near the right edge.
- [ ] Long values never truncate into nonsense (e.g. emails): show a short human label (`derivePersonLabel`) with the full value on hover.
- [ ] Settings screens copy a proven product's mental model (e.g. Cal.com availability: weekly hours + overrides + one Save), not an internal model ("slots", "publish").
- [ ] Nothing pokes outside rounded corners (no edge decorations on unclipped panels).
- [ ] Fonts: Cormorant (headings/brand) + Inter (everything else). Rose-gold palette only.

## 5. Copy

- [ ] Short, precise, pleasing words. Positive framing ("We'll fit you in", not "No times available").
- [ ] No repeated wording (title + sub-title + hint saying the same thing).
- [ ] Every new string added in **both** `en` and `hi`.
- [ ] Copy passed to client components is plain strings (no functions) — use `{placeholder}` templates.
- [ ] Every enum value shown in the UI (statuses, types) has a label in `en` and `hi` — no raw keys like `assigned`.

## 5b. Email

- [ ] All emails go through `sendMail` → branded HTML (600px, key message first, contact details in footer) + plain-text version. Never build a one-off email layout.
- [ ] Render a sample in the browser before reporting (sign-in code, a details email, a link email).

## 6. Code

- [ ] Follows `NAMING_CONVENTIONS.md` (camelCase files, verb-first functions, `is/has` booleans, UPPER_SNAKE constants, named exports).
- [ ] Tailwind classes are written in full — never built at runtime (`motion-safe:${…}` silently produces no CSS).
- [ ] No `overflow-hidden` on an ancestor of a `sticky` element.
- [ ] No raw `<select>` anywhere (lint enforces it) — use `Select` / `SelectField` / `SelectMenu` so one change restyles every dropdown.
- [ ] Toggles/lists update state functionally (`setList((list) => …)`) — rapid taps must not overwrite each other.
- [ ] Nested overlays: an Esc handled by an inner control (dropdown) must not also close the outer one (sheet/modal).
- [ ] Test data created while verifying is cleaned up before reporting.
- [ ] **Never write to the user's real data while diagnosing.** Probe with requests that are guaranteed to be rejected, or use a throwaway database (e.g. `lexbridge_seat_test`, dropped afterwards). Before any write, record the current state so it can be restored.
- [ ] Concurrency-sensitive logic (seats, stock, OTP attempts) is race-tested in a throwaway database before reporting.
- [ ] Editors make invalid states impossible (paint grid instead of free-form start/end pairs) rather than validating after the fact.
- [ ] Shared components changed once (affects user **and** admin), not patched per page.
- [ ] Research first (web search + reference products) before redesigning; redesign from scratch when asked, don't patch.
- [ ] Backend and UI together per page: one round trip per screen (counts/aggregates in the list call), lean payloads, indexes checked.

## 7. Process

- [ ] **Never run git** (no commits, no co-author lines). The user commits and pushes.
- [ ] Don't ask for permission — implement directly.
- [ ] Report only after this checklist passes; say exactly what was and wasn't verified.

---

## Known blockers (environment)

- MongoDB service is manual and needs an **Administrator** shell: `net start MongoDB` (and `sc.exe config MongoDB start= auto`).
- AI features need `ANTHROPIC_API_KEY` in `apps/api/.env`.
- REA is installed only as a skill (instructions); its MCP analysis server is not installed, so it can't analyse sites.

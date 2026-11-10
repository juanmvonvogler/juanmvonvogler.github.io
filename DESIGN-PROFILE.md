# Design profile: juanvonvogler.com

Written by `apply-style` on 2026-11-03, from the design decisions already made for this site instead
of a fresh intake. Updated 2026-11-05 after the full audit pass (twelve reviewers plus a critic) and a second review round
(seven lenses, each checked by a skeptic).
Change it by saying "change the style" or editing this file.

## What it is
- Kind: public page
- Audience and job: hiring managers (cleared programs and commercial vendors) and business owners read it and get in touch about a role or a problem.
- Feel: calm, precise, confident
- Reference: Apple (+ soft 12 to 14px corners from the house rules, in place of Apple's pills)

## Tokens
Live in `styles.css` on `:root`, with dark values under `[data-theme="dark"]`.
- Colour: ground #ffffff, tile #f5f5f7, ink #1d1d1f, muted #6e6e73, accent bottle green #1f5c49 (#6fc3a3 on dark)
- Type: system SF stack, tabular figures, no monospace. One scale: 13 small, 15 meta, 17 body, 21 lead, 28 card heads, 35 sub, 56 headline, 104 display (`--fs-*` tokens). Detail page titles and the footer name stay at 80. The one exception is the giant zero in Approach, a single numeral used as a picture. The Who I Am prose sits at body size in a 31em measure.
- Line breaks: names, units, dates and clearance levels never split (no-break spaces), stack lines break only between items, and two-sentence subheads set one sentence per line.
- Motion timings: press 140ms, hover 200ms, UI 300ms, reveals 600ms (`--t-*` tokens), one easing curve (`--ease`).
- Edges: cards 14px, tiles 10px, buttons 12px, flat tone step with no borders
- Hover: lift and tilt on client cards that link somewhere, blur only glow plus a hairline edge trace on buttons (hover only on real pointers)
- Signature motion: packets hop along the hero sphere's links and light the route behind them; hovering "Bring me a problem" routes every packet to the node nearest the button. A packet rides the tip of the roadmap fill and each stop pings once as it is reached. A quiet "Pause motion" control in the hero stops the sphere (WCAG 2.2.2); it hides under reduced motion, where nothing loops anyway.
- Light by default; dark only through the toggle. In dark, the illustrations invert into light line drawings on the tile tone with the green turned back to the dark accent, the topology only dims, and the credentials section lifts to the tile tone so the night still arrives.

## Words
- Voice: Juan
- Copy mode: clean only. No hyphens in descriptive phrases and no em dashes (Juan's writing rules); "My journey" is a banned phrase, so the record is "Track Record" everywhere.
- Locked words: the Who I Am page prose and the statement on the home page stay in Juan's own words. Product and skill names keep their hyphens (EVE-NG, Multi-Agent AI Operating System, idea-to-brief).
- Name the AI system "Multi-Agent AI Operating System"; its memory is the second brain, not a separate project.

## Must not change
- All data flow: the form posts the same four fields to Formspree.
- Hero sphere, scroll roadmap, dark credentials section, the three Approach pop-ups, the capability index on the home page.

## Public record rules
- Nothing from a customer network goes on a page or into an image: no VLAN numbers, authentication methods, transport vendors, site moves, or lab copies of a customer topology. Results and scale only.
- The repository is public. `_config.yml` keeps this file and the README off the live site; `archive/` and `.claude/` stay untracked.
- The AI topology is published only from a sanitized copy of the draw.io file: no names, email address, card brands, or retail, airline or social account names.

## House rule exceptions
| Rule | Exception | Reason |
| --- | --- | --- |
| No spaced en dash | Allowed in date ranges | It marks a range there and does not stand in for an em dash |
| Glass / blur | Sticky nav only | The nav is the one bar that floats over content |
| No large glows | Button hover only | Blur only glow carried over from Lysivo |
| Circles | Headshot, roadmap stops and its packet, theme toggle, pop-up plus | These are not cards or buttons |

## Imagery
Isometric illustrations from Higgsfield (`gpt_image_2_5`, high, 3:2) on light gray with the green accent as the only colour, using existing assets as style references. New ones carry no text and fill about two thirds of the frame. After generation, greens are pulled to #1f5c49 and cool tints neutralized by script before an image ships. Illustrations that sit inside a card have their flat ground shifted to exactly #f5f5f7 so no seam shows in either theme. Every page uses its own pictures; a home teaser may share an image with its own detail entry, nothing else repeats. Client work stays flat screenshots.

## Done means
- Screens: index, about, ai, capabilities, projects, track-record, 404
- Widths: 390, 768, 1440, light and dark
- Before/after page: no

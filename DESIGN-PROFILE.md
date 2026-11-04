# Design profile: juanvonvogler.com

Written by `apply-style` on 2026-11-03, from the design decisions already made for this site instead
of a fresh intake. Change it by saying "change the style" or editing this file.

## What it is
- Kind: public page
- Audience and job: hiring managers and business owners read it and get in touch about a role or a problem.
- Feel: calm, precise, confident
- Reference: Apple (+ soft 12 to 14px corners from the house rules, in place of Apple's pills)

## Tokens
Live in `styles.css` on `:root`, with dark values under `[data-theme="dark"]`.
- Colour: ground #ffffff, tile #f5f5f7, ink #1d1d1f, muted #6e6e73, accent bottle green #1f5c49 (#6fc3a3 on dark)
- Type: system SF stack, tabular figures, no monospace
- Edges: cards 14px, tiles 10px, buttons 12px, flat tone step with no borders
- Hover: lift and tilt on client cards, blur only glow plus a hairline edge trace on buttons
- Signature motion: packets hop along the hero sphere's links and light the route behind them
- Light by default; dark only through the toggle

## Words
- Voice: Juan
- Copy mode: clean only
- Locked words: the Who I Am page text and the statement on the home page stay in Juan's own words. Product and skill names keep their hyphens (EVE-NG, Multi-Agent AI Operating System, idea-to-brief).

## Must not change
- All behaviour and data flow.
- Hero sphere, scroll roadmap, dark credentials section, pop-ups.

## House rule exceptions
| Rule | Exception | Reason |
| --- | --- | --- |
| No spaced en dash | Allowed in date ranges | It marks a range there and does not stand in for an em dash |
| Glass / blur | Sticky nav and open mobile menu only | The nav is the one bar that floats over content |
| No large glows | Button hover only | Blur only glow carried over from Lysivo |
| Circles | Headshot, roadmap stops, theme toggle | These are not cards or buttons |

## Imagery
Isometric illustrations from Higgsfield (`gpt_image_2_5`) at 3:2, on light gray with the green accent as the only colour, using existing assets as style references. New ones carry no text. Client work stays flat screenshots.

## Done means
- Screens: index, about, ai, capabilities, projects, track-record
- Widths: 390, 768, 1440
- Before/after page: no

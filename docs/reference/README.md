# H.U.N reference reconnaissance — 2026-09-23

Scope: five public URLs only. Read in full: `docs/phase/01-foundation.md` and `docs/implementation-plan.md`. This directory contains **24 actual headless Chrome PNG screenshots**, structured per-shot measurements, and a dependency-free repeatable capture script. This does **not** complete visual sign-off or grant a right to reuse brand assets.

## URLs and availability

At roughly 16:57–17:02 ICT on 2026-09-23, GET through the web-fetch tool and HEAD through PowerShell returned **HTTP 200** for each URL:

| Route | URL | Rendered browser state captured |
| --- | --- | --- |
| Home | https://hunthanhlykygui.com/ | Desktop/mobile default |
| About | https://hunthanhlykygui.com/about | Desktop/mobile top and bottom |
| Consign | https://hunthanhlykygui.com/consign | Desktop/mobile top, direct tab panel, online tab panel, online bottom |
| Buy | https://hunthanhlykygui.com/buy | Desktop/mobile top, direct tab panel, online tab panel, online bottom |
| Sales | https://hunthanhlykygui.com/sales | Desktop/mobile default, **no lookup submitted** |

Every route's HTTP body was the same **628-byte HTML SPA shell**, not server-rendered route content; generic `web_fetch` returned only the common title, `H.U.N - Thanh Lý & Ký Gửi`. A headless Chrome 153 instance executed the site JavaScript and confirmed actual route DOM for the screenshots. HTTP 200 alone does not establish runtime health or backend availability. The browser run did not record network errors, console errors, animation frame timing, Cloudflare verification, or form results.

## Capture inventory and reproduction

`browser-measurements.json` is authoritative for the exact filename, URL, viewport, active tab, scroll position, bounding boxes, computed styles, image presence and Chrome version **for every shot**. Filenames follow `{route}-{state}-{desktop|mobile}-{width}x{height}.png`. Exactly 24 PNGs are present: 12 desktop and 12 mobile. All PNG IHDRs were validated against their declared **1440×900 / 390×844 pixel** sizes. The corresponding CSS viewport is exactly that size, `devicePixelRatio=1`; Chrome flags `--headless=new`, `--disable-gpu`, `--disable-extensions`, `--no-first-run`; the mobile series uses Chrome's `Emulation.setDeviceMetricsOverride(mobile:true)` and is **emulation, not physical-device evidence**. Browser zoom was **not explicitly set or measured**: do not claim a verified 100% zoom. The marquee is animated and **not frozen**, so its captured lettering can differ between runs. Fonts were awaited via `document.fonts.ready`, but actual Montserrat font file/network source was **not verified**.

Run `node docs/reference/capture.mjs` to recreate screenshots and JSON (requires local `C:\Program Files\Google\Chrome\Application\chrome.exe`, Node with global WebSocket, and access to the website). It opens an isolated temporary Chrome profile and clicks only the identified online tab, never submits private data. `default` means scroll top and initial direct tab. `direct-panel`/`online-panel` scroll the *inner* `.tab-content` container to bring the tabs onscreen. `bottom` means its maximum scroll, with the online tab selected for consign/buy. The filename, metric `scrollers[].scrollTop` and active tab jointly define the UI state. `/sales` has no meaningful bottom scroll in this capture and only a default screenshot. Home is also captured only at default. Since images cannot be visually inspected by this agent's text-only image model, treat screenshots as **captured artifacts, not visually reviewed/approved**.

## Measured example baseline (CSS pixels, this run only)

Values are from DOM bounding boxes and computed styles; these are **measured for the named capture**, not assumed site-wide tokens. The 1440px series has a 1425px scrolling-content width due to a 15px scrollbar; do not equate that width with the nominal viewport.

| Element | Desktop 1440×900 | Mobile-emulated 390×844 |
| --- | --- | --- |
| `.ticker` fixed top strip | x=0, y=0, 1425×77.47, black | x=0, y=0, 390×55.88, black |
| `.back-btn` on internal pages | x=42.75, y=99, 116.55×40.27 | x=18, y=86.4, 116.55×40.27 |
| `/` `.home-title` | font 108px/500, width 308.06, y=284.20 | font 54px/500, width 154.03, y=180.45 |
| `/consign` and `/buy` `.section-heading` | x=147.30, y=147, font 72px | x=11.69, y=147, font 50.4px |
| `/sales` `.input-section h2` | x=316.2, y=171, font 63px | x=39.5, y=151, font 36px |
| Footer computed background | `rgb(17, 17, 17)` | `rgb(17, 17, 17)` |

The selected `.methods__tab.is-active` and panel step counts were verified in rendered DOM: consign **4 direct / 5 online**, buy **3 direct / 4 online**, in both viewport modes. At desktop, consign tabs start y=850.6 on initial top, buy y=1022.2; therefore their initial screenshots alone **do not show the switcher**. Companion `*-direct-panel-*` and `*-online-panel-*` shots place the controls onscreen. At 390px, observed tab boxes were 310.6×92.2 for both routes, versus 1023.4×41.6 at desktop. The 390px route top shots reported document width 390px (no observed document-level horizontal overflow), but other mobile widths, real phones and all breakpoints remain untested. The app uses an inner `.tab-content` scroller: for example online consign bottom is scrollTop=1050 desktop and 2302 mobile; refer to JSON for all states. These dimensions can change with site updates, font loading or browser differences.

## Accessible resources and limitations

The shell references `/assets/main-BZ5j29ON.js` (**34,979-byte HTTP Content-Length**), `/assets/api-CiL8dw0U.js` (**149,391**), `/assets/api-BWD9CUYB.css` (**16,961**) and `/assets/main-CS8Fjo5e.css` (**24,038**); each HEAD returned 200 with its expected JS/CSS content type. These are **publicly reachable** but have not been downloaded into this repository; reachability is not a reuse license. The declared `/assets/favicon.svg` returned 200 but **`text/html`, 628 bytes, the same SPA shell**, not a verified SVG icon; do not treat status 200 as an image. Initial consign DOM contained three loaded `data:image/svg+xml` phone icons; about DOM contained three external TikTok short links, logged in JSON. The JavaScript contains `https://zalo.me/hunthanhly` and Cloudflare Turnstile script URL, but those destinations and integration outcomes were **not followed/verified**. No accessible standalone raster/logo/font files were confirmed by this reconnaissance. CSS names Montserrat, but the distribution/source and permission to copy font assets remain unconfirmed.

## What is not established

No physical mobile screenshots, 375/768/1024 viewport captures, precise responsive breakpoints, controlled zoom value, complete color/spacing/typography token inventory, hover/focus, animation timings, external-link target outcomes, sales validation/results/API, CAPTCHA status, or rights to brand/content/images were verified. No private/customer data, phone lookup or reverse engineering of protected APIs was attempted. The prior plan's 1265×712 observations are **historical notes**, not remeasured here. New app routes have no matching source baseline. The project must not claim 1:1 sign-off until someone visually reviews all screenshots and fills these gaps, including additional states and mobile device testing.

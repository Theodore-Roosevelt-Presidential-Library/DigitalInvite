# TRPL Digital Invite

A reusable JavaScript embed that turns any invitation artwork into a Paperless Post–style
envelope animation: the envelope rises, the guest's name is hand-lettered on the front in
script, it turns over to reveal the elkhorn brand seal, the flap opens, the invitation slides
out and settles, and an RSVP button appears.

**Builder:** <https://rsvp.labs.trlibrary.com/>
**Demo:** <https://rsvp.labs.trlibrary.com/demo/>

---

## Quick start

Open the [builder](https://rsvp.labs.trlibrary.com/), pick a brand combination, paste the
invitation image URL and RSVP link, then copy the snippet:

```html
<!-- TRPL Digital Invite -->
<div data-trpl-invite
     data-card-image="https://www.trlibrary.com/path/to/invitation.jpg"
     data-rsvp-url="https://www.trlibrary.com/rsvp/kennerly"></div>
<script src="https://rsvp.labs.trlibrary.com/dist/trpl-invite.js" defer></script>
```

That is the whole integration. The embed renders inside a shadow root, so it neither inherits
nor disturbs the host page's CSS — it drops into Drupal, a landing page, or an email-linked
microsite without a fight.

### Personalising the name

The embed reads a query-string parameter off the page URL:

```
https://example.trlibrary.com/invite?name=Edith%20Kermit%20Roosevelt
```

Send each guest their own link in a mail merge and their name is lettered onto the envelope.
When the parameter is missing, `data-name-fallback` is used instead.

---

## Brand system

Defaults ship as the **Badlands Night** combination and every colour picker in the builder is
loaded with the TRPL palette, so an on-brand invitation takes one click.

### Palette

| Name | Hex | Pantone |
|---|---|---|
| Dark Gray | `#25282A` | 426C |
| White | `#FFFFFF` | — |
| Sand | `#D1CCBD` | 7534C |
| Deep Orange | `#E7805D` | 2022C |
| Sunset Orange | `#FC924E` | 2024C |
| Sunset Pink | `#F36079` | 709C |
| Sunset Yellow | `#F9D635` | 128C |
| Spring Green | `#87BB41` | 368C |
| Bright Forest | `#8FC895` | 2255C |
| Dark Forest | `#1B4532` | 7484C |
| Night Sky | `#092A4D` | 654C |
| Gray Sky | `#99ADC5` | 536C |

### Approved combinations

Badlands Night · Elkhorn · Night Sky · Sunset · Gray Sky · Sand & Forest · Prairie Dusk ·
Bright Forest. Each is a one-click preset in the builder, and all eight clear WCAG AA contrast
on the RSVP button — the builder shows the live ratio as you edit.

### Typography

| Role | Face | Used for |
|---|---|---|
| Display | Dharma Gothic E | RSVP button, "TO" label, replay, postmark — all caps |
| Body | ITC Clearface | Prompt copy |
| Script | Great Vibes | Recipient name only |

Dharma Gothic E, ITC Clearface and Frutiger Next are licensed through Adobe Fonts and cannot be
bundled in a public repository. Point `data-font-kit-url` at the Library's Adobe Fonts kit and
the embed renders the real faces:

```html
data-font-kit-url="https://use.typekit.net/xxxxxxx.css"
```

Without it, Oswald and Georgia stand in automatically — close enough that nothing looks broken,
but not the brand faces. Get the kit URL from whoever maintains trlibrary.com.

The calligraphic script for the recipient's name sits **outside** the brand type system on
purpose: a hand-addressed envelope is the whole illusion, and the system has no script face.

---

## Configuration

Every option works as a `data-*` attribute (kebab-case) or a JavaScript property (camelCase).
Only the values that differ from the defaults need to appear in the snippet.

### Required

| Option | Description |
|---|---|
| `card-image` | URL of the invitation artwork. Portrait (5:7 or 2:3) works best. Must be publicly reachable. |

### Invitation & RSVP

| Option | Default | Description |
|---|---|---|
| `card-alt` | `Invitation` | Alt text for the artwork |
| `card-aspect` | `0` | Width ÷ height; `0` auto-detects from the image |
| `card-radius` | `2px` | Corner radius on the card |
| `rsvp-url` | — | RSVP destination; the button is hidden if omitted |
| `rsvp-text` | `RSVP` | Button label |
| `rsvp-target` | `_blank` | `_blank` or `_self` |

### Recipient name

| Option | Default | Description |
|---|---|---|
| `name` | — | Hard-code a name and skip the query string entirely |
| `name-param` | `name` | Query-string key to read |
| `name-fallback` | `Friend of the Library` | Used when the parameter is absent |
| `name-color` | `#25282A` | Ink colour |
| `name-font` | Great Vibes stack | CSS font stack |
| `name-font-url` | Google Fonts | Stylesheet for the script face |
| `postmark` | `MEDORA · NORTH DAKOTA` | Text around the postmark ring |

### Stage & background

| Option | Default | Description |
|---|---|---|
| `background-color` | `#25282A` | Dark Gray |
| `background-image` | — | Sits above the colour; a Badlands photo works well |
| `background-size` | `cover` | `cover`, `contain`, `auto` |
| `background-position` | `center` | Standard CSS value |
| `vignette` | `true` | Soft dark edge — turn off on light backgrounds |
| `aspect` | `4 / 5` | Frame proportion |
| `max-width` | `620px` | Widest the embed will render |
| `min-height` | `420px` | Floor for very narrow columns |

### Envelope

| Option | Default | Description |
|---|---|---|
| `envelope-color` | `#D1CCBD` | Paper — Sand |
| `liner-color` | `#E7805D` | Inside and flap underside — Deep Orange |
| `envelope-aspect` | `0.72` | Width ÷ height; `~1.40` for landscape |
| `envelope-scale` | `1` | Size multiplier |
| `flap-shape` | `point` | `point` or `straight` |
| `flap-depth` | `0.42` | Flap height as a share of envelope height |

### Stamp & seal

| Option | Default | Description |
|---|---|---|
| `seal-color` | `#FC924E` | Elkhorn brand mark — recoloured live, no upload needed |
| `seal-image` | — | Override the bundled mark with any image URL |
| `seal-scale` | `1` | Size multiplier |
| `stamp-paper` | `#FFFFFF` | Postage stamp background |
| `stamp-ink` | `#25282A` | TRPL wordmark colour |
| `stamp-accent` | `#D1CCBD` | Hairline frame inside the perforation |
| `stamp-image` | — | Override the wordmark |

### Buttons & behaviour

| Option | Default | Description |
|---|---|---|
| `prompt` | `Click the envelope to open` | Copy under the sealed envelope |
| `prompt-color` | `auto` | `auto` picks white or Dark Gray from the background luminance |
| `accent-color` | `#FC924E` | RSVP button fill |
| `accent-text-color` | `#25282A` | RSVP button text |
| `replay` | `true` | Replay control, lower left |
| `replay-text` | `Replay` | Its label |
| `auto-open` | `0` | Milliseconds after the intro; `0` waits for a click |
| `open-once` | `false` | Remember the opened state for the session |

### Fonts

| Option | Default | Description |
|---|---|---|
| `font-kit-url` | — | Adobe Fonts kit CSS for the licensed brand faces |
| `display-font` | Dharma Gothic E stack | Buttons, labels, postmark |
| `body-font` | ITC Clearface stack | Prompt copy |
| `fallback-font-url` | Google Fonts (Oswald) | Free stand-in loaded alongside |

---

## JavaScript API

```html
<div id="invite"></div>
<script src="https://rsvp.labs.trlibrary.com/dist/trpl-invite.js"></script>
<script>
  var invite = TRPLInvite.create('#invite', {
    cardImage: 'https://www.trlibrary.com/invite.jpg',
    rsvpUrl:   'https://www.trlibrary.com/rsvp',
    linerColor:'#1B4532',
    sealColor: '#87BB41'
  });
</script>
```

| Member | Description |
|---|---|
| `TRPLInvite.create(target, options)` | Mount on a selector or element; returns the instance |
| `TRPLInvite.initAll(scope)` | Mount every `[data-trpl-invite]` in scope (runs automatically on load) |
| `TRPLInvite.defaults` | The full defaults object |
| `instance.open()` | Trigger the opening animation |
| `instance.reset()` / `instance.start()` | Replay from the beginning |
| `instance.destroy()` | Tear down and release observers |

The host element fires `trplinvite:opened` (bubbling, `detail.name` carries the recipient) when
the animation finishes — useful for an analytics event:

```js
document.querySelector('#invite').addEventListener('trplinvite:opened', function (e) {
  dataLayer.push({ event: 'invite_opened', recipient: e.detail.name });
});
```

---

## Accessibility

- The envelope is a real `<button>` — reachable by keyboard, activated with Enter or Space,
  labelled "Open your invitation".
- The card carries the alt text from `card-alt`.
- `prefers-reduced-motion: reduce` collapses every transition; the invitation simply appears.
- The builder reports the live WCAG contrast ratio for the RSVP button colour pair.
- `prompt-color: auto` keeps the prompt legible on both dark and light stages.

---

## Repository layout

```
dist/trpl-invite.js   the embed — this is the file pages load
assets/               elkhorn brand seal mask, TRPL wordmark
index.html            the interactive builder
demo/                 working example + sample invitation artwork
CNAME                 rsvp.labs.trlibrary.com
```

Assets resolve relative to the script's own URL, so the embed finds its seal and wordmark no
matter which page it is dropped into.

## Hosting

Served from GitHub Pages at `rsvp.labs.trlibrary.com`. Push to `main` and it deploys; the
`CNAME` and `.nojekyll` files are already in place. Enable Pages under **Settings → Pages**
with the source set to the `main` branch root, and point a DNS `CNAME` record for
`rsvp.labs` at `theodore-roosevelt-presidential-library.github.io`.

Because it is one cacheable JS file plus two small assets, the embed can also be copied into
any other host if Pages ever isn't the right home.

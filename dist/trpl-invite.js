/*!
 * TRPL Digital Invite — Paperless Post style envelope invitation embed
 * Theodore Roosevelt Presidential Library
 *
 * Usage:
 *   <div data-trpl-invite
 *        data-card-image="https://.../invitation.jpg"
 *        data-rsvp-url="https://.../rsvp"></div>
 *   <script src="https://rsvp.labs.trlibrary.com/dist/trpl-invite.js" defer></script>
 *
 * Or programmatically:
 *   TRPLInvite.create('#mount', { cardImage: '...', rsvpUrl: '...' });
 *
 * MIT-style: free to reuse within TRPL properties.
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Asset base — resolved from this script's own URL so bundled assets
   * (brand seal mask, wordmark) load no matter where the embed is used.
   * ------------------------------------------------------------------ */
  var ASSET_BASE = (function () {
    var s = document.currentScript;
    if (!s) {
      var all = document.getElementsByTagName('script');
      for (var i = all.length - 1; i >= 0; i--) {
        if (/trpl-invite(\.min)?\.js/.test(all[i].src)) { s = all[i]; break; }
      }
    }
    if (!s || !s.src) return './assets/';
    // .../dist/trpl-invite.js  ->  .../assets/
    return s.src.replace(/\/dist\/[^/]*$/, '/').replace(/[^/]*$/, '') + 'assets/';
  })();

  var VERSION = '1.0.0';

  /* ------------------------------------------------------------------ *
   * Defaults
   * ------------------------------------------------------------------ */
  var DEFAULTS = {
    // --- Stage / background -----------------------------------------
    backgroundColor:  '#25282A',     // TRPL Dark Gray, Pantone 426C
    backgroundImage:  '',            // url string; overlays backgroundColor
    backgroundSize:   'cover',       // cover | contain | auto
    backgroundPosition: 'center',
    vignette:         true,          // soft dark edge over the background
    aspect:           'auto',        // 'auto' sizes the height to fit; or a ratio like '4 / 5'
    maxWidth:         '100%',        // fills its container by default
    minHeight:        '420px',
    maxHeight:        '88vh',        // ceiling when aspect is 'auto'; accepts vh or px
    stageRadius:      '0',           // corner radius on the background

    // --- Envelope ----------------------------------------------------
    envelopeColor:    '#D1CCBD',     // TRPL Sand, Pantone 7534C
    envelopeAspect:   1.38,          // width / height — A7, the standard 7.25 x 5.25 envelope
    envelopeScale:    1,             // multiplier on default size
    linerColor:       '#E7805D',     // TRPL Deep Orange, Pantone 2022C
    flapDepth:        0.42,          // flap height as a share of envelope height
    flapShape:        'point',       // point | straight

    // --- Brand seal (back flap) --------------------------------------
    sealColor:        '#FC924E',     // TRPL Sunset Orange, Pantone 2024C
    sealImage:        '',            // optional override: any image URL
    sealScale:        1,

    // --- Postage stamp (front) ---------------------------------------
    stampPaper:       '#ffffff',
    stampInk:         'auto',        // TRPL wordmark colour; 'auto' follows the stamp paper
    stampImage:       '',            // optional override for the wordmark
    stampAspect:      1.708,         // width / height of the stamp artwork (TRPL wordmark)
    stampPadding:     'auto',        // margin around the artwork; 'auto' ~ 12px, or set e.g. '14px'
    stampAccent:      'auto',        // hairline border around the stamp

    // --- Recipient name ----------------------------------------------
    name:             '',            // hard-coded name; otherwise read from URL
    nameParam:        'name',        // query-string key
    nameFallback:     'Friend of the Library',
    nameColor:        'auto',        // 'auto' = Dark Gray or White, whichever reads on the envelope
    nameFont:         '',            // blank = follow bodyFont (ITC Clearface)
    nameFontUrl:      '',            // only needed for a non-brand face
    postmark:         'MEDORA · NORTH DAKOTA',

    // --- TRPL typographic system ---------------------------------------
    // Dharma Gothic E, ITC Clearface and Frutiger Next are licensed faces.
    // Point fontKitUrl at the Library's Adobe Fonts kit to render the real
    // thing; the free fallbacks below stand in wherever the kit is absent.
    fontKitUrl:       '',            // e.g. https://use.typekit.net/xxxxxxx.css
    displayFont:      "'dharma-gothic-e','Oswald','Haettenschweiler','Arial Narrow',sans-serif",
    bodyFont:         "'itc-clearface',Georgia,'Iowan Old Style','Times New Roman',serif",
    fallbackFontUrl:  'https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&display=swap',

    // --- Invitation card ---------------------------------------------
    cardImage:        '',            // REQUIRED
    cardAlt:          'Invitation',
    cardAspect:       0,             // 0 = auto-detect from the image
    cardRadius:       '2px',

    // --- Calls to action ---------------------------------------------
    prompt:           'Click the envelope to open',
    promptColor:      'auto',        // 'auto' picks white or Dark Gray from the background
    rsvpUrl:          '',
    rsvpText:         'RSVP',
    rsvpTarget:       '_blank',
    accentColor:      '#FC924E',     // TRPL Sunset Orange
    accentTextColor:  'auto',        // 'auto' = Dark Gray or White, whichever reads on the button

    // --- Behaviour ----------------------------------------------------
    replay:           true,
    replayText:       'Replay',
    autoOpen:         0,             // ms after intro; 0 = wait for a click
    openOnce:         false          // if true, remember opened state per session
  };

  var NUMERIC = ['envelopeAspect', 'envelopeScale', 'flapDepth', 'sealScale',
                 'cardAspect', 'autoOpen', 'stampAspect'];
  var BOOLEAN = ['vignette', 'replay', 'openOnce'];

  /* Animation timeline (ms) */
  var T = {
    introDelay:  250,
    introRise:   1250,
    promptIn:    400,
    flip:        1150,
    flapDelay:   140,
    flapOpen:    900,
    cardDelay:   260,
    cardRise:    850,
    cardSettle:  900,
    ctaIn:       450
  };

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  function camel(s) { return s.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); }); }

  function readConfig(el, overrides) {
    var cfg = {}, k;
    for (k in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) cfg[k] = DEFAULTS[k];

    // data-* attributes
    if (el && el.attributes) {
      for (var i = 0; i < el.attributes.length; i++) {
        var a = el.attributes[i];
        if (a.name.indexOf('data-') !== 0) continue;
        var key = camel(a.name.slice(5));
        if (key === 'trplInvite') continue;
        if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) continue;
        cfg[key] = a.value;
      }
    }
    // programmatic overrides win
    if (overrides) for (k in overrides) if (overrides[k] !== undefined && overrides[k] !== null) cfg[k] = overrides[k];

    NUMERIC.forEach(function (n) { if (typeof cfg[n] === 'string') cfg[n] = parseFloat(cfg[n]) || DEFAULTS[n]; });
    BOOLEAN.forEach(function (b) {
      if (typeof cfg[b] === 'string') cfg[b] = !/^(false|0|no|off)$/i.test(cfg[b]);
    });
    return cfg;
  }

  function queryParam(key) {
    try {
      var v = new URLSearchParams(global.location.search).get(key);
      return v ? v.trim() : '';
    } catch (e) { return ''; }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cssUrl(u) {
    return "url('" + String(u)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/[\n\r]/g, '') + "')";
  }

  /* Only ever emit links a visitor can safely follow. */
  function safeUrl(u) {
    var v = String(u || '').trim();
    return /^(https?:|mailto:|tel:|\/|#|\?)/i.test(v) ? v : '';
  }

  var fontsLoaded = {};
  function loadFont(url) {
    if (!url || fontsLoaded[url]) return;
    // this is the one place the embed touches the host document, so be strict
    if (!/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|p\.typekit\.net)\//i.test(url)) return;
    fontsLoaded[url] = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = url;
    document.head.appendChild(l);
  }

  /* Relative luminance of a #rrggbb colour, per WCAG. */
  function luminance(hex) {
    var v = String(hex).trim();
    var sh = /^#([0-9a-f]{3})$/i.exec(v);
    if (sh) v = '#' + sh[1].replace(/./g, function (c) { return c + c; });
    var m = /^#([0-9a-f]{6})$/i.exec(v);
    if (!m) return 1;   // unknown colour -> assume a light stage, dark text
    var ch = [0, 2, 4].map(function (i) {
      var v = parseInt(m[1].substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  /* WCAG contrast between two #rrggbb colours. */
  function contrast(a, b) {
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  /* Whichever of Dark Gray / White reads better on the given background. */
  function autoInk(bg) {
    return contrast(bg, '#25282A') >= contrast(bg, '#FFFFFF') ? '#25282A' : '#FFFFFF';
  }

  function resolveInk(value, bg) {
    return (!value || value === 'auto') ? autoInk(bg) : value;
  }

  function prefersReducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ------------------------------------------------------------------ *
   * Stylesheet
   * ------------------------------------------------------------------ */
  function styles() {
    return [
      ':host{display:block;width:100%;}',
      '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}',

      '.stage{position:relative;width:100%;max-width:var(--max-w);margin:0 auto;',
      '  aspect-ratio:var(--aspect);min-height:var(--min-h);overflow:hidden;',
      '  border-radius:var(--stage-r);background-color:var(--bg);background-image:var(--bg-img);',
      '  background-size:var(--bg-size);background-position:var(--bg-pos);',
      '  background-repeat:no-repeat;font-family:var(--body-font);',
      '  -webkit-font-smoothing:antialiased;perspective:1600px;user-select:none;-webkit-user-select:none;}',

      '.vig{position:absolute;top:0;right:0;bottom:0;left:0;pointer-events:none;z-index:1;',
      '  background:radial-gradient(120% 100% at 50% 42%,rgba(0,0,0,0) 40%,rgba(0,0,0,.38) 100%);}',
      '.stage.no-vig .vig{display:none;}',

      /* ---------- envelope shell ---------- */
      '.env{position:absolute;left:50%;top:52%;width:var(--env-w);height:var(--env-h);',
      '  margin-left:calc(var(--env-w) / -2);margin-top:calc(var(--env-h) / -2);',
      '  z-index:5;transform:translateY(135%) rotate(-2deg);opacity:0;',
      '  transition:transform var(--t-rise) cubic-bezier(.16,.9,.3,1.02),opacity 500ms ease;}',
      '.stage.intro .env{transform:translateY(0) rotate(0deg);opacity:1;}',

      '.env-hit{position:absolute;top:-2%;bottom:-2%;left:-3%;right:-3%;z-index:40;cursor:pointer;border:0;background:none;',
      '  border-radius:8px;outline-offset:6px;}',
      '.stage.opening .env-hit,.stage.opened .env-hit{cursor:default;pointer-events:none;}',
      '.env-hit:focus-visible{outline:2px solid var(--accent);}',

      '.env-inner{position:absolute;top:0;right:0;bottom:0;left:0;transform-style:preserve-3d;}',
      '.stage.idle .env-inner{animation:breathe 3.6s ease-in-out 1.1s infinite;}',
      '@keyframes breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.2%)}}',

      /* Turning an envelope over is a hand movement: it lifts, cocks back a
         little, swings through, then settles flat again. A plain rotateY
         reads as a flat card spinning, so the tilt and lift carry the 3D. */
      '.stage.flipping .env-inner{animation:turnOver var(--t-flip) cubic-bezier(.45,.05,.25,1) forwards;}',
      '@keyframes turnOver{',
      '  0%{transform:translateY(0) rotateY(0deg) rotateX(0deg) scale(1);}',
      '  14%{transform:translateY(-3.5%) rotateY(-14deg) rotateX(7deg) scale(1.035);}',
      '  50%{transform:translateY(-5.5%) rotateY(88deg) rotateX(5deg) scale(1.045);}',
      '  86%{transform:translateY(-1.2%) rotateY(174deg) rotateX(1.5deg) scale(1.008);}',
      '  100%{transform:translateY(0) rotateY(180deg) rotateX(0deg) scale(1);}',
      '}',

      '.face{position:absolute;top:0;right:0;bottom:0;left:0;',
      '  backface-visibility:hidden;-webkit-backface-visibility:hidden;',
      '  border-radius:3px;overflow:hidden;background:var(--env);',
      '  box-shadow:0 12px 22px rgba(0,0,0,.30);}',
      /* both faces need an explicit 3D transform or Safari keeps painting the
         front through the back, which is what makes the type look mirrored */
      '.face.front{transform:rotateY(0deg) translateZ(0.6px);}',
      '.face.back{transform:rotateY(180deg) translateZ(0.6px);}',

      /* ---------- envelope FRONT ---------- */
      '.paper{position:absolute;top:0;right:0;bottom:0;left:0;background:var(--env);}',
      '.edge{position:absolute;top:0;right:0;bottom:0;left:0;border-radius:3px;pointer-events:none;',
      '  box-shadow:inset 0 0 0 1px var(--paper-edge);}',

      /* The stamp is the wordmark's own proportions plus an even margin,
         with softly rounded corners rather than a perforated edge. */
      '.stamp{position:absolute;top:9%;left:7%;width:var(--stamp-w);height:var(--stamp-h);',
      '  background:var(--stamp-paper);padding:var(--stamp-pad);',
      '  display:flex;align-items:center;justify-content:center;',
      '  border:1px solid var(--stamp-accent);border-radius:var(--stamp-r);',
      '  box-shadow:0 1px 3px rgba(0,0,0,.22);}',
      '.stamp-logo{position:relative;width:100%;height:100%;background-color:var(--stamp-ink);',
      '  -webkit-mask-image:var(--wordmark);mask-image:var(--wordmark);',
      '  -webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;',
      '  -webkit-mask-position:center;mask-position:center;}',
      '.stamp-logo.img{background:none;-webkit-mask:none;mask:none;',
      '  background-image:var(--wordmark);background-size:contain;background-repeat:no-repeat;background-position:center;}',

      '.postmark{position:absolute;top:var(--pm-top);right:8%;width:var(--pm-d);height:var(--pm-d);',
      '  color:var(--name-c);opacity:.38;',
      '  transform:rotate(-11deg);pointer-events:none;}',
      '.postmark svg{width:100%;height:100%;}',

      '.addr{position:absolute;left:10%;right:10%;top:54%;text-align:center;}',
      '.to{font-family:var(--display-font);font-size:calc(var(--env-w) * .026);letter-spacing:.26em;',
      '  text-transform:uppercase;color:var(--name-c);opacity:.55;margin-bottom:.35em;}',
      '.who{font-family:var(--name-font);color:var(--name-c);line-height:1.22;',
      '  font-size:calc(var(--env-w) * .052);letter-spacing:.005em;word-break:break-word;}',
      '.rule{width:38%;height:1px;margin:calc(var(--env-w) * .026) auto 0;background:var(--name-c);opacity:.22;}',

      /* ---------- envelope BACK (static, used during the flip) ---------- */
      '.back-panel{position:absolute;top:0;right:0;bottom:0;left:0;background:var(--env);}',
      '.seam{position:absolute;left:0;right:0;top:var(--throat-h);height:1px;background:rgba(0,0,0,.10);}',
      '.static-flap{position:absolute;left:0;right:0;top:0;height:var(--flap-h);}',

      /* flap surface, shared by static + live versions */
      '.flap-face{position:absolute;top:0;right:0;bottom:0;left:0;background:var(--env);',
      '  box-shadow:0 4px 10px rgba(0,0,0,.14);}',
      '.flap-face.point{-webkit-clip-path:polygon(0 0,100% 0,100% 52%,50% 100%,0 52%);',
      '  clip-path:polygon(0 0,100% 0,100% 52%,50% 100%,0 52%);}',
      '.flap-face.straight{clip-path:polygon(0 0,100% 0,100% 100%,0 100%);}',
      '.flap-lining{position:absolute;top:0;right:0;bottom:0;left:0;background:var(--liner);}',

      '.seal{position:absolute;left:50%;top:calc(var(--flap-h) * 0.60);',
      '  width:var(--seal-d);height:var(--seal-d);transform:translate(-50%,-50%);z-index:3;pointer-events:none;',
      '  background-color:var(--seal-c);-webkit-mask-image:var(--seal-img);mask-image:var(--seal-img);',
      '  -webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;',
      '  -webkit-mask-position:center;mask-position:center;',
      '  filter:drop-shadow(0 1px 1px rgba(0,0,0,.25));}',
      '.seal.img{background:none;-webkit-mask:none;mask:none;background-image:var(--seal-img);',
      '  background-size:contain;background-repeat:no-repeat;background-position:center;}',

      /* ---------- live back stage (after the flip) ---------- */
      '.backstage{position:absolute;top:0;right:0;bottom:0;left:0;opacity:0;pointer-events:none;perspective:1100px;}',
      '.stage.live .backstage{opacity:1;}',
      '.stage.live .env-inner{opacity:0;}',

      '.throat{position:absolute;left:0;right:0;top:0;height:calc(var(--throat-h) + 1px);',
      '  background:var(--liner);z-index:2;border-radius:3px 3px 0 0;}',

      '.pocket{position:absolute;left:0;right:0;top:var(--throat-h);bottom:0;z-index:6;',
      '  background:var(--env);border-radius:0 0 3px 3px;',
      '  box-shadow:0 -2px 6px rgba(0,0,0,.10),0 14px 24px rgba(0,0,0,.30),',
      '           inset 0 0 0 1px var(--paper-edge);}',

      '.flap{position:absolute;left:0;right:0;top:0;height:var(--flap-h);z-index:8;',
      '  transform-style:preserve-3d;transform-origin:top center;transform:rotateX(0deg);',
      '  transition:transform var(--t-flap) cubic-bezier(.5,.05,.25,1);}',
      '.stage.flap-open .flap{transform:rotateX(-172deg);}',
      '.flap .side{position:absolute;top:0;right:0;bottom:0;left:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;}',
      '.flap .side.in{transform:rotateY(180deg);}',

      /* ---------- the card ---------- */
      /* the card lives inside .env so it can sit in the throat, behind the pocket */
      '.card{position:absolute;left:50%;top:50%;width:var(--card-w);height:var(--card-h);',
      '  z-index:4;transform-origin:50% 50%;',
      '  transform:translate(-50%,calc(-50% + var(--card-tuck)));',
      '  box-shadow:0 8px 20px rgba(0,0,0,.32);border-radius:var(--card-r);overflow:hidden;background:#fff;',
      /* A portrait card cannot fit a landscape envelope, so everything below
         the throat is clipped away. The clip eases in lockstep with the rise. */
      '  -webkit-clip-path:inset(0 0 var(--card-clip) 0);clip-path:inset(0 0 var(--card-clip) 0);',
      '  transition:transform var(--t-cardrise) cubic-bezier(.28,.7,.3,1),',
      '             clip-path var(--t-cardrise) cubic-bezier(.28,.7,.3,1),',
      '             -webkit-clip-path var(--t-cardrise) cubic-bezier(.28,.7,.3,1);}',
      '.card img{display:block;width:100%;height:100%;object-fit:cover;}',
      /* once the flap is up and out of the way the card comes forward */
      '.stage.card-out .card{z-index:12;',
      '  transform:translate(-50%,calc(-50% + var(--card-tuck) - var(--card-lift)));',
      '  -webkit-clip-path:inset(0 0 var(--card-clip-out) 0);clip-path:inset(0 0 var(--card-clip-out) 0);}',
      /* the envelope withdraws; the card is left holding the frame */
      '.stage.card-final .throat,.stage.card-final .pocket{transform:translateY(30%);opacity:0;',
      '  transition:transform var(--t-settle) cubic-bezier(.4,0,.2,1),opacity calc(var(--t-settle) * .75) ease;}',
      '.stage.card-final .flap{opacity:0;transition:opacity calc(var(--t-settle) * .55) ease;}',
      '.stage.card-final .card{z-index:20;',
      '  -webkit-clip-path:inset(0 0 0 0);clip-path:inset(0 0 0 0);',
      '  transition:transform var(--t-settle) cubic-bezier(.22,.8,.26,1),',
      '             clip-path var(--t-settle) ease,-webkit-clip-path var(--t-settle) ease,',
      '             box-shadow var(--t-settle) ease;',
      '  transform:translate(-50%,-50%) translateY(var(--card-final-y)) scale(var(--card-final-s));',
      '  box-shadow:0 20px 46px rgba(0,0,0,.42);}',

      /* ---------- prompt + CTA ---------- */
      '.prompt{position:absolute;left:8%;right:8%;bottom:5.5%;z-index:12;text-align:center;',
      '  color:var(--prompt-c);opacity:0;transform:translateY(8px);pointer-events:none;',
      '  font-family:var(--body-font);font-size:calc(var(--u) * .028);letter-spacing:.02em;',
      '  text-shadow:var(--prompt-shadow);transition:opacity 500ms ease,transform 500ms ease;}',
      '.stage.idle .prompt{opacity:.92;transform:translateY(0);animation:nudge 2.6s ease-in-out .8s infinite;}',
      '@keyframes nudge{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',

      '.cta{position:absolute;left:0;right:0;bottom:4.5%;z-index:30;display:flex;justify-content:center;',
      '  opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity var(--t-cta) ease,transform var(--t-cta) ease;}',
      '.stage.done .cta{opacity:1;transform:translateY(0);pointer-events:auto;}',
      /* Dharma Gothic E is a display face — all caps, calls to action only */
      '.cta a{display:inline-block;text-decoration:none;background:var(--accent);color:var(--accent-t);',
      '  font-family:var(--display-font);font-weight:600;letter-spacing:.14em;text-transform:uppercase;',
      '  font-size:calc(var(--u) * .034);padding:.6em 2.1em .5em;border-radius:2px;',
      '  box-shadow:0 8px 22px rgba(0,0,0,.4);transition:transform 160ms ease,filter 160ms ease;}',
      '.cta a:hover{transform:translateY(-2px);filter:brightness(1.07);}',
      '.cta a:focus-visible{outline:2px solid #fff;outline-offset:3px;}',

      '.replay{position:absolute;left:3.5%;bottom:4%;z-index:31;border:0;cursor:pointer;',
      '  background:var(--replay-bg);color:#fff;font-family:var(--display-font);border-radius:999px;',
      '  font-size:calc(var(--u) * .026);letter-spacing:.1em;text-transform:uppercase;',
      '  padding:.6em 1.1em .6em .85em;display:inline-flex;align-items:center;gap:.45em;',
      '  opacity:0;pointer-events:none;transition:opacity 400ms ease,background 160ms ease;',
      '  backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);}',
      '.stage.done .replay{opacity:.85;pointer-events:auto;}',
      '.replay:hover{opacity:1;background:rgba(0,0,0,.62);}',
      '.replay:focus-visible{outline:2px solid #fff;outline-offset:2px;}',
      '.replay svg{width:1.05em;height:1.05em;fill:currentColor;}',

      '.err{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;',
      '  color:#fff;font-family:system-ui,sans-serif;font-size:14px;text-align:center;padding:24px;z-index:50;}',

      '@media (prefers-reduced-motion: reduce){',
      '  .stage *{transition-duration:1ms !important;animation:none !important;}',
      '}'
    ].join('\n');
  }

  function postmarkSvg(text) {
    var t = escapeHtml(text || '');
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" ' +
      'xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true">' +
      '<defs><path id="pmArc" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0"/></defs>' +
      '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="5"/>' +
      '<circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" stroke-width="3"/>' +
      '<text font-family="Oswald,\'Arial Narrow\',sans-serif" font-weight="500" ' +
      'font-size="17" letter-spacing="2.4" fill="currentColor">' +
      '<textPath href="#pmArc" xlink:href="#pmArc" startOffset="50%" text-anchor="middle">' + t + '</textPath></text>' +
      '<g stroke="currentColor" stroke-width="4" stroke-linecap="round">' +
      '<path d="M52 92h96M52 108h96"/></g>' +
      '</svg>';
  }

  /* ------------------------------------------------------------------ *
   * Instance
   * ------------------------------------------------------------------ */
  function Invite(host, overrides) {
    var cfg = this.cfg = readConfig(host, overrides);
    this.host = host;
    this.timers = [];
    this.state = 'init';

    loadFont(cfg.fontKitUrl);       // TRPL Adobe Fonts kit, when configured
    loadFont(cfg.fallbackFontUrl);  // free stand-ins for the licensed faces
    loadFont(cfg.nameFontUrl);

    // Without shadow DOM the stylesheet would leak into the host page and
    // reset its box model, so refuse to render instead.
    if (!host.shadowRoot && !host.attachShadow) {
      host.textContent = '';
      this.stage = null;
      return;
    }
    var root = this.root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    root.innerHTML = '';

    var style = document.createElement('style');
    style.textContent = styles();
    root.appendChild(style);

    if (!cfg.cardImage) {
      var e = document.createElement('div');
      e.className = 'err';
      e.textContent = 'TRPL Invite: data-card-image is required.';
      var wrap = document.createElement('div');
      wrap.className = 'stage';
      wrap.appendChild(e);
      root.appendChild(wrap);
      this.stage = null;   // reset()/start()/open() all no-op from here
      return;
    }

    this.build();
    this.applyVars();
    this.observe();
    this.start();
  }

  Invite.prototype.build = function () {
    var cfg = this.cfg;
    var name = cfg.name || queryParam(cfg.nameParam) || cfg.nameFallback;
    this.recipient = name;

    var sealSrc  = cfg.sealImage  || (ASSET_BASE + 'brand-seal-mask.png');
    var markSrc  = cfg.stampImage || (ASSET_BASE + 'trpl-wordmark.svg');
    var sealIsImg  = !!cfg.sealImage;
    var markIsImg  = !!cfg.stampImage;
    var flapShape  = (cfg.flapShape === 'straight') ? 'straight' : 'point';

    var stage = document.createElement('div');
    stage.className = 'stage' + (cfg.vignette ? '' : ' no-vig');

    stage.innerHTML = [
      '<div class="vig"></div>',

      '<div class="env" part="envelope">',
      '  <div class="env-inner">',

      /* ---- FRONT ---- */
      '    <div class="face front">',
      '      <div class="paper"></div>',
      '      <div class="postmark">' + postmarkSvg(cfg.postmark) + '</div>',
      '      <div class="stamp">',
      '        <div class="stamp-logo' + (markIsImg ? ' img' : '') + '"></div>',
      '      </div>',
      '      <div class="addr">',
      '        <div class="to">To</div>',
      '        <div class="who">' + escapeHtml(name) + '</div>',
      '        <div class="rule"></div>',
      '      </div>',
      '      <div class="edge"></div>',
      '    </div>',

      /* ---- BACK (static, only seen mid-flip) ---- */
      '    <div class="face back">',
      '      <div class="back-panel"></div>',
      '      <div class="seam"></div>',
      '      <div class="static-flap"><div class="flap-face ' + flapShape + '"></div></div>',
      '      <div class="seal' + (sealIsImg ? ' img' : '') + '"></div>',
      '      <div class="edge"></div>',
      '    </div>',
      '  </div>',

      /* ---- LIVE BACK STAGE (opening happens here) ---- */
      '  <div class="backstage">',
      '    <div class="throat"></div>',
      '    <div class="card"><img alt="' + escapeHtml(cfg.cardAlt) + '" src="' + escapeHtml(cfg.cardImage) + '"></div>',
      '    <div class="pocket"></div>',
      '    <div class="flap">',
      '      <div class="side out"><div class="flap-face ' + flapShape + '"></div>',
      '        <div class="seal' + (sealIsImg ? ' img' : '') + '" style="top:60%"></div></div>',
      '      <div class="side in"><div class="flap-face ' + flapShape + '"><div class="flap-lining"></div></div></div>',
      '    </div>',
      '  </div>',

      '  <button class="env-hit" type="button" aria-label="Open your invitation"></button>',
      '</div>',

      '<div class="prompt">' + escapeHtml(cfg.prompt) + '</div>',

      '<div class="cta">' + (safeUrl(cfg.rsvpUrl)
        ? '<a href="' + escapeHtml(safeUrl(cfg.rsvpUrl)) + '" target="' + escapeHtml(cfg.rsvpTarget) +
          '" rel="noopener noreferrer">' + escapeHtml(cfg.rsvpText) + '</a>'
        : '') + '</div>',

      cfg.replay
        ? '<button class="replay" type="button">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/></svg>' +
          escapeHtml(cfg.replayText) + '</button>'
        : ''
    ].join('\n');

    var self = this;
    this.root.appendChild(stage);
    this.stage = stage;
    this.card  = stage.querySelector('.card');
    this.img   = stage.querySelector('.card img');

    /* CSS custom properties that come from config */
    var s = stage.style;
    s.setProperty('--bg', cfg.backgroundColor);
    s.setProperty('--bg-img', cfg.backgroundImage ? cssUrl(cfg.backgroundImage) : 'none');
    s.setProperty('--bg-size', cfg.backgroundSize);
    s.setProperty('--bg-pos', cfg.backgroundPosition);
    s.setProperty('--aspect', (cfg.aspect === 'auto') ? 'auto' : cfg.aspect);
    s.setProperty('--max-w', cfg.maxWidth);
    s.setProperty('--min-h', cfg.minHeight);
    s.setProperty('--stage-r', cfg.stageRadius);
    s.setProperty('--env', cfg.envelopeColor);
    s.setProperty('--liner', cfg.linerColor);
    s.setProperty('--seal-c', cfg.sealColor);
    s.setProperty('--seal-img', cssUrl(sealSrc));
    s.setProperty('--seal-s', cfg.sealScale);
    s.setProperty('--stamp-paper', cfg.stampPaper);
    var stampInk = resolveInk(cfg.stampInk, cfg.stampPaper);
    s.setProperty('--stamp-ink', stampInk);
    s.setProperty('--stamp-accent',
      (!cfg.stampAccent || cfg.stampAccent === 'auto') ? stampInk : cfg.stampAccent);
    s.setProperty('--wordmark', cssUrl(markSrc));
    s.setProperty('--name-c', resolveInk(cfg.nameColor, cfg.envelopeColor));
    // a flat envelope still needs its edge read against the stage
    s.setProperty('--paper-edge', luminance(cfg.envelopeColor) > 0.5
      ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.18)');
    s.setProperty('--name-font', cfg.nameFont || cfg.bodyFont);
    s.setProperty('--display-font', cfg.displayFont);
    s.setProperty('--body-font', cfg.bodyFont);
    s.setProperty('--accent', cfg.accentColor);
    s.setProperty('--accent-t', resolveInk(cfg.accentTextColor, cfg.accentColor));

    // Prompt copy has to stay legible whether the stage is Dark Gray or Sand.
    var darkStage = luminance(cfg.backgroundColor) < 0.35 || !!cfg.backgroundImage;
    var promptColor = (cfg.promptColor && cfg.promptColor !== 'auto')
      ? cfg.promptColor : (darkStage ? '#FFFFFF' : '#25282A');
    s.setProperty('--prompt-c', promptColor);
    s.setProperty('--prompt-shadow', darkStage
      ? '0 1px 10px rgba(0,0,0,.55)' : '0 1px 2px rgba(255,255,255,.55)');
    s.setProperty('--replay-bg', darkStage ? 'rgba(0,0,0,.42)' : 'rgba(37,40,42,.72)');
    s.setProperty('--card-r', cfg.cardRadius);
    s.setProperty('--t-rise', T.introRise + 'ms');
    s.setProperty('--t-flip', T.flip + 'ms');
    s.setProperty('--t-flap', T.flapOpen + 'ms');
    s.setProperty('--t-cardrise', T.cardRise + 'ms');
    s.setProperty('--t-settle', T.cardSettle + 'ms');
    s.setProperty('--t-cta', T.ctaIn + 'ms');

    /* interactions */
    stage.querySelector('.env-hit').addEventListener('click', function () { self.open(); });
    var rp = stage.querySelector('.replay');
    if (rp) rp.addEventListener('click', function () { self.reset(); self.start(true); });

    /* a custom stamp image sets the stamp's proportions */
    this.stampAR = 0;
    if (cfg.stampImage) {
      var probe = new Image();
      probe.onload = function () {
        if (probe.naturalWidth && probe.naturalHeight) {
          self.stampAR = probe.naturalWidth / probe.naturalHeight;
          self.applyVars();
        }
      };
      probe.src = cfg.stampImage;
    }

    /* card aspect: detect from the image unless pinned */
    if (cfg.cardAspect > 0) {
      this.cardAR = cfg.cardAspect;
    } else {
      this.cardAR = 0.668;
      this.img.addEventListener('load', function () {
        if (self.img.naturalWidth && self.img.naturalHeight) {
          self.cardAR = self.img.naturalWidth / self.img.naturalHeight;
          self.applyVars();
        }
      });
    }
  };

  /* Resolve a CSS length that may be expressed in vh or px. */
  function lengthPx(value, fallback) {
    var v = String(value || '').trim();
    var m = /^([\d.]+)(vh|px)?$/.exec(v);
    if (!m) return fallback;
    var n = parseFloat(m[1]);
    if (m[2] === 'vh') return n / 100 * (global.innerHeight || 800);
    return n;
  }

  /* Geometry — recomputed on resize so everything scales cleanly */
  Invite.prototype.applyVars = function () {
    if (!this.stage) return;
    var cfg = this.cfg, s = this.stage.style;
    var W = this.stage.clientWidth || parseFloat(cfg.maxWidth) || 620;

    // With aspect:'auto' the height is derived from the width — the frame stays
    // a comfortable portrait shape on a narrow column and is capped by the
    // viewport once the embed runs full width.
    if (cfg.aspect === 'auto') {
      var wanted = Math.min(W * 1.25, lengthPx(cfg.maxHeight, 700));
      wanted = Math.max(wanted, lengthPx(cfg.minHeight, 420));
      this.stage.style.height = Math.round(wanted) + 'px';
    } else {
      this.stage.style.height = '';
    }

    var H = this.stage.clientHeight || W * 1.25;

    // Fit the envelope by whichever edge binds first, so a landscape A7 and a
    // portrait invitation envelope both sit comfortably in the frame.
    var envW = Math.min(W * 0.78, H * 0.62 * cfg.envelopeAspect) * cfg.envelopeScale;
    var envH = envW / cfg.envelopeAspect;

    var flapH  = envH * cfg.flapDepth;
    // A pointed flap only seals across its shoulders (52% down the clip path),
    // so the pocket has to start there or the corners beside the point show through.
    var throatH = flapH * (cfg.flapShape === 'straight' ? 1 : 0.52);

    var ar = this.cardAR || 0.668;
    var cardW = envW * 0.82;
    var cardH = cardW / ar;

    // The card sits with its head in the throat. Everything below the throat
    // is clipped, which is what lets a tall card live in a wide envelope.
    var restTop = throatH * 0.35;
    var tuck    = restTop + cardH / 2 - envH / 2;
    var clipRest = Math.max(0, restTop + cardH - throatH);

    // Rise as far as the frame allows without pushing the card's head off the top.
    var envTopStage = H * 0.52 - envH / 2;
    var headroom = (envTopStage + restTop) - H * 0.04;
    var lift = Math.max(0, Math.min(headroom, clipRest));
    var clipOut = Math.max(0, clipRest - lift);

    // Final size: fill most of the frame without crowding the RSVP button.
    var finalH = Math.min(H * 0.78, W * 0.98 / ar);
    var finalS = finalH / cardH;

    s.setProperty('--w', W + 'px');
    // Type scales off the smaller dimension so a full-width embed doesn't
    // blow the RSVP button up to headline size on a wide layout.
    s.setProperty('--u', Math.min(W, H * 0.78, 760).toFixed(1) + 'px');
    s.setProperty('--env-w', envW.toFixed(1) + 'px');
    s.setProperty('--env-h', envH.toFixed(1) + 'px');
    s.setProperty('--flap-h', flapH.toFixed(1) + 'px');
    s.setProperty('--throat-h', throatH.toFixed(1) + 'px');
    s.setProperty('--card-w', cardW.toFixed(1) + 'px');
    s.setProperty('--card-h', cardH.toFixed(1) + 'px');
    s.setProperty('--card-ar', String(ar));
    s.setProperty('--card-tuck', tuck.toFixed(1) + 'px');
    s.setProperty('--card-lift', lift.toFixed(1) + 'px');
    s.setProperty('--card-clip', clipRest.toFixed(1) + 'px');
    s.setProperty('--card-clip-out', clipOut.toFixed(1) + 'px');
    s.setProperty('--card-final-s', finalS.toFixed(4));
    // the card is anchored at the envelope's centre; nudge it to 45.5% of the frame
    s.setProperty('--card-final-y', (H * (0.455 - 0.52)).toFixed(1) + 'px');

    // The stamp is the wordmark box plus an even margin on all four sides,
    // so its proportions follow the artwork rather than a fixed rectangle.
    var logoW = envW * 0.17;
    var logoH = logoW / (this.stampAR || cfg.stampAspect || 1.465);
    var pad = parseFloat(cfg.stampPadding);
    if (!(pad > 0)) pad = Math.max(6, Math.min(16, envW * 0.025));
    var stampW = logoW + pad * 2;
    var stampH = logoH + pad * 2;
    s.setProperty('--stamp-pad', pad.toFixed(1) + 'px');
    s.setProperty('--stamp-w', stampW.toFixed(1) + 'px');
    s.setProperty('--stamp-h', stampH.toFixed(1) + 'px');
    s.setProperty('--stamp-r', Math.max(3, Math.min(9, stampW * 0.06)).toFixed(1) + 'px');
    var pmD = stampH * 1.25;
    s.setProperty('--pm-d', pmD.toFixed(1) + 'px');
    // centre the postmark on the stamp's own centre line
    s.setProperty('--pm-top', (envH * 0.09 + (stampH - pmD) / 2).toFixed(1) + 'px');
    s.setProperty('--seal-d', (envH * 0.34 * cfg.sealScale).toFixed(1) + 'px');
  };

  Invite.prototype.observe = function () {
    var self = this;
    if (global.ResizeObserver) {
      this.ro = new ResizeObserver(function () { self.applyVars(); });
      this.ro.observe(this.stage);
    }
    // A ResizeObserver never fires when only the viewport height changes, which
    // the automatic height depends on, so listen for that as well.
    this._onResize = function () { self.applyVars(); };
    global.addEventListener('resize', this._onResize);
  };

  Invite.prototype.at = function (ms, fn) {
    // the stylesheet already collapses transitions; collapse the schedule too
    var scale = prefersReducedMotion() ? 0.02 : 1;
    this.timers.push(setTimeout(fn, Math.round(ms * scale)));
  };

  Invite.prototype.clearTimers = function () {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  };

  Invite.prototype.reset = function () {
    if (!this.stage) return;
    this.clearTimers();
    this.stage.className = 'stage' + (this.cfg.vignette ? '' : ' no-vig');
    this.state = 'init';
    // force reflow so the intro transition replays
    void this.stage.offsetWidth;
  };

  Invite.prototype.start = function (force) {
    if (!this.stage) return;
    var self = this, cfg = this.cfg;
    this.applyVars();

    if (!force && cfg.openOnce && this._sessionOpened()) {
      this.stage.classList.add('intro', 'live', 'flap-open', 'card-out', 'card-final', 'done', 'opened');
      this.state = 'done';
      return;
    }

    this.at(T.introDelay, function () { self.stage.classList.add('intro'); });
    this.at(T.introDelay + T.introRise, function () {
      self.stage.classList.add('idle');
      self.state = 'idle';
      if (cfg.autoOpen > 0) self.at(cfg.autoOpen, function () { self.open(); });
    });
  };

  Invite.prototype.open = function () {
    if (!this.stage || this.state !== 'idle') return;
    var self = this;
    this.state = 'opening';
    this.stage.classList.remove('idle');
    this.stage.classList.add('opening', 'flipping');

    // swap the static back face for the live, openable one
    this.at(T.flip, function () {
      self.stage.classList.add('live');
    });
    this.at(T.flip + T.flapDelay, function () {
      self.stage.classList.add('flap-open');
    });
    this.at(T.flip + T.flapDelay + T.flapOpen * 0.62 + T.cardDelay, function () {
      self.stage.classList.add('card-out');
    });
    var settleAt = T.flip + T.flapDelay + T.flapOpen * 0.62 + T.cardDelay + T.cardRise * 0.82;
    this.at(settleAt, function () {
      self.stage.classList.add('card-final');
    });
    this.at(settleAt + T.cardSettle * 0.7, function () {
      self.stage.classList.add('done', 'opened');
      self.state = 'done';
      if (self.cfg.openOnce) self._markOpened();
      self.host.dispatchEvent(new CustomEvent('trplinvite:opened', {
        bubbles: true, detail: { name: self.recipient }
      }));
    });
  };

  Invite.prototype._key = function () { return 'trplInviteOpened:' + (this.cfg.cardImage || ''); };
  Invite.prototype._sessionOpened = function () {
    try { return !!global.sessionStorage.getItem(this._key()); } catch (e) { return false; }
  };
  Invite.prototype._markOpened = function () {
    try { global.sessionStorage.setItem(this._key(), '1'); } catch (e) {}
  };

  Invite.prototype.destroy = function () {
    this.clearTimers();
    if (this.ro) this.ro.disconnect();
    if (this._onResize) global.removeEventListener('resize', this._onResize);
    if (this.root && 'innerHTML' in this.root) this.root.innerHTML = '';
    this.stage = null;
    try { delete this.host.__trplInvite; } catch (e) { this.host.__trplInvite = null; }
  };

  /* ------------------------------------------------------------------ *
   * Public API
   * ------------------------------------------------------------------ */
  var API = {
    version: VERSION,
    defaults: DEFAULTS,
    assetBase: ASSET_BASE,

    create: function (target, options) {
      var el = (typeof target === 'string') ? document.querySelector(target) : target;
      if (!el) return null;
      if (el.__trplInvite) el.__trplInvite.destroy();
      var inst = new Invite(el, options || {});
      el.__trplInvite = inst;
      return inst;
    },

    initAll: function (scope) {
      var nodes = (scope || document).querySelectorAll('[data-trpl-invite]');
      var out = [];
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].__trplInvite) continue;
        out.push(API.create(nodes[i]));
      }
      return out;
    }
  };

  global.TRPLInvite = API;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { API.initAll(); });
  } else {
    API.initAll();
  }

})(typeof window !== 'undefined' ? window : this);

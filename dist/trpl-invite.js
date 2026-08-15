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
    aspect:           '4 / 5',       // stage aspect ratio (w / h)
    maxWidth:         '620px',
    minHeight:        '420px',

    // --- Envelope ----------------------------------------------------
    envelopeColor:    '#D1CCBD',     // TRPL Sand, Pantone 7534C
    envelopeAspect:   0.72,          // width / height (portrait)
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
    stampInk:         '#25282A',     // TRPL wordmark colour
    stampImage:       '',            // optional override for the wordmark
    stampAccent:      '#D1CCBD',     // thin frame inside the perforation

    // --- Recipient name ----------------------------------------------
    name:             '',            // hard-coded name; otherwise read from URL
    nameParam:        'name',        // query-string key
    nameFallback:     'Friend of the Library',
    nameColor:        '#25282A',
    nameFont:         "'Great Vibes', 'Snell Roundhand', 'Apple Chancery', cursive",
    nameFontUrl:      'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap',
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
    accentTextColor:  '#25282A',     // Dark Gray reads best on Sunset Orange

    // --- Behaviour ----------------------------------------------------
    replay:           true,
    replayText:       'Replay',
    autoOpen:         0,             // ms after intro; 0 = wait for a click
    openOnce:         false          // if true, remember opened state per session
  };

  var NUMERIC = ['envelopeAspect', 'envelopeScale', 'flapDepth', 'sealScale',
                 'cardAspect', 'autoOpen'];
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
        if (!(key in DEFAULTS)) continue;
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

  function cssUrl(u) { return "url('" + String(u).replace(/'/g, "\\'") + "')"; }

  var fontsLoaded = {};
  function loadFont(url) {
    if (!url || fontsLoaded[url]) return;
    fontsLoaded[url] = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = url;
    document.head.appendChild(l);
  }

  /* Relative luminance of a #rrggbb colour, per WCAG. */
  function luminance(hex) {
    var m = /^#([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return 0;
    var ch = [0, 2, 4].map(function (i) {
      var v = parseInt(m[1].substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
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
      '  border-radius:6px;background-color:var(--bg);background-image:var(--bg-img);',
      '  background-size:var(--bg-size);background-position:var(--bg-pos);',
      '  background-repeat:no-repeat;font-family:var(--body-font);',
      '  -webkit-font-smoothing:antialiased;perspective:1600px;user-select:none;}',

      '.vig{position:absolute;inset:0;pointer-events:none;z-index:1;',
      '  background:radial-gradient(120% 100% at 50% 42%,rgba(0,0,0,0) 40%,rgba(0,0,0,.38) 100%);}',
      '.stage.no-vig .vig{display:none;}',

      /* ---------- envelope shell ---------- */
      '.env{position:absolute;left:50%;top:52%;width:var(--env-w);height:var(--env-h);',
      '  margin-left:calc(var(--env-w) / -2);margin-top:calc(var(--env-h) / -2);',
      '  z-index:5;transform:translateY(135%) rotate(-2deg);opacity:0;',
      '  transition:transform var(--t-rise) cubic-bezier(.16,.9,.3,1.02),opacity 500ms ease;}',
      '.stage.intro .env{transform:translateY(0) rotate(0deg);opacity:1;}',

      '.env-hit{position:absolute;inset:-2% -3%;z-index:40;cursor:pointer;border:0;background:none;',
      '  border-radius:8px;outline-offset:6px;}',
      '.stage.opening .env-hit,.stage.opened .env-hit{cursor:default;pointer-events:none;}',
      '.env-hit:focus-visible{outline:2px solid var(--accent);}',

      '.env-inner{position:absolute;inset:0;transform-style:preserve-3d;',
      '  transition:transform var(--t-flip) cubic-bezier(.55,.02,.3,1);',
      '  filter:drop-shadow(0 12px 22px rgba(0,0,0,.30));}',
      '.stage.idle .env-inner{animation:breathe 3.6s ease-in-out 1.1s infinite;}',
      '.stage.flipping .env-inner{transform:rotateY(180deg);}',
      '@keyframes breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.2%)}}',

      '.face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;',
      '  border-radius:3px;overflow:hidden;background:var(--env);}',
      '.face.back{transform:rotateY(180deg);}',

      /* ---------- envelope FRONT ---------- */
      '.paper{position:absolute;inset:0;background:var(--env);',
      '  background-image:linear-gradient(150deg,rgba(255,255,255,.75),rgba(0,0,0,.05) 62%),',
      '   radial-gradient(140% 120% at 15% 0%,rgba(255,255,255,.5),rgba(0,0,0,0) 55%);}',
      '.edge{position:absolute;inset:0;border-radius:3px;pointer-events:none;',
      '  box-shadow:inset 0 0 0 1px rgba(0,0,0,.10),inset 0 -14px 26px rgba(0,0,0,.07);}',

      '.stamp{position:absolute;top:5.5%;right:6.5%;width:26%;aspect-ratio:.82;',
      '  background:var(--stamp-paper);padding:6%;display:flex;align-items:center;justify-content:center;',
      '  filter:drop-shadow(0 1px 2px rgba(0,0,0,.28));',
      '  -webkit-mask-image:var(--perf);mask-image:var(--perf);',
      '  -webkit-mask-size:100% 100%;mask-size:100% 100%;}',
      '.stamp-frame{position:absolute;inset:8%;border:1px solid var(--stamp-accent);}',
      '.stamp-logo{position:relative;width:82%;height:62%;background-color:var(--stamp-ink);',
      '  -webkit-mask-image:var(--wordmark);mask-image:var(--wordmark);',
      '  -webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;',
      '  -webkit-mask-position:center;mask-position:center;}',
      '.stamp-logo.img{background:none;-webkit-mask:none;mask:none;',
      '  background-image:var(--wordmark);background-size:contain;background-repeat:no-repeat;background-position:center;}',

      '.postmark{position:absolute;top:7%;right:36%;width:30%;aspect-ratio:1;opacity:.30;',
      '  transform:rotate(-11deg);pointer-events:none;}',
      '.postmark svg{width:100%;height:100%;}',

      '.addr{position:absolute;left:9%;right:9%;top:47%;text-align:center;}',
      '.to{font-family:var(--display-font);font-size:calc(var(--w) * .020);letter-spacing:.26em;',
      '  text-transform:uppercase;color:var(--name-c);opacity:.55;margin-bottom:.35em;}',
      '.who{font-family:var(--name-font);color:var(--name-c);line-height:1.06;',
      '  font-size:calc(var(--w) * .066);word-break:break-word;}',
      '.rule{width:42%;height:1px;margin:calc(var(--w) * .022) auto 0;background:var(--name-c);opacity:.22;}',

      /* ---------- envelope BACK (static, used during the flip) ---------- */
      '.back-panel{position:absolute;inset:0;background:var(--env);',
      '  background-image:linear-gradient(200deg,rgba(255,255,255,.6),rgba(0,0,0,.06) 70%);}',
      '.seam{position:absolute;left:0;right:0;top:var(--throat-h);height:1px;background:rgba(0,0,0,.10);}',
      '.static-flap{position:absolute;left:0;right:0;top:0;height:var(--flap-h);}',

      /* flap surface, shared by static + live versions */
      '.flap-face{position:absolute;inset:0;background:var(--env);',
      '  background-image:linear-gradient(180deg,rgba(255,255,255,.55),rgba(0,0,0,.08));',
      '  box-shadow:0 5px 12px rgba(0,0,0,.16);}',
      '.flap-face.point{clip-path:polygon(0 0,100% 0,100% 52%,50% 100%,0 52%);}',
      '.flap-face.straight{clip-path:polygon(0 0,100% 0,100% 100%,0 100%);}',
      '.flap-lining{position:absolute;inset:0;background:var(--liner);',
      '  background-image:linear-gradient(180deg,rgba(0,0,0,.22),rgba(255,255,255,.10));}',

      '.seal{position:absolute;left:50%;top:calc(var(--flap-h) * 0.60);width:calc(var(--env-w) * .30 * var(--seal-s));',
      '  aspect-ratio:1;transform:translate(-50%,-50%);z-index:3;pointer-events:none;',
      '  background-color:var(--seal-c);-webkit-mask-image:var(--seal-img);mask-image:var(--seal-img);',
      '  -webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;',
      '  -webkit-mask-position:center;mask-position:center;',
      '  filter:drop-shadow(0 1px 1px rgba(0,0,0,.25));}',
      '.seal.img{background:none;-webkit-mask:none;mask:none;background-image:var(--seal-img);',
      '  background-size:contain;background-repeat:no-repeat;background-position:center;}',

      /* ---------- live back stage (after the flip) ---------- */
      '.backstage{position:absolute;inset:0;opacity:0;pointer-events:none;perspective:1100px;}',
      '.stage.live .backstage{opacity:1;}',
      '.stage.live .env-inner{opacity:0;}',

      '.throat{position:absolute;left:0;right:0;top:0;height:calc(var(--throat-h) + 1px);',
      '  background:var(--liner);background-image:linear-gradient(180deg,rgba(0,0,0,.34),rgba(0,0,0,.06));',
      '  z-index:2;border-radius:3px 3px 0 0;}',
      '.throat::after{content:"";position:absolute;left:0;right:0;top:0;height:14%;',
      '  background:linear-gradient(180deg,rgba(0,0,0,.45),rgba(0,0,0,0));}',

      '.pocket{position:absolute;left:0;right:0;top:var(--throat-h);bottom:0;z-index:6;',
      '  background:var(--env);background-image:linear-gradient(200deg,rgba(255,255,255,.55),rgba(0,0,0,.07) 70%);',
      '  border-radius:0 0 3px 3px;',
      '  box-shadow:0 -2px 6px rgba(0,0,0,.10),0 14px 24px rgba(0,0,0,.30),inset 0 0 0 1px rgba(0,0,0,.08);}',

      '.flap{position:absolute;left:0;right:0;top:0;height:var(--flap-h);z-index:8;',
      '  transform-style:preserve-3d;transform-origin:top center;transform:rotateX(0deg);',
      '  transition:transform var(--t-flap) cubic-bezier(.5,.05,.25,1);}',
      '.stage.flap-open .flap{transform:rotateX(-172deg);}',
      '.flap .side{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;}',
      '.flap .side.in{transform:rotateY(180deg);}',

      /* ---------- the card ---------- */
      /* the card lives inside .env so it can sit in the throat, behind the pocket */
      '.card{position:absolute;left:50%;top:50%;width:var(--card-w);aspect-ratio:var(--card-ar);',
      '  z-index:4;transform-origin:50% 50%;',
      '  transform:translate(-50%,calc(-50% + var(--card-tuck)));',
      '  box-shadow:0 8px 20px rgba(0,0,0,.32);border-radius:var(--card-r);overflow:hidden;background:#fff;',
      '  transition:transform var(--t-cardrise) cubic-bezier(.28,.7,.3,1);}',
      '.card img{display:block;width:100%;height:100%;object-fit:cover;}',
      '.stage.card-out .card{transform:translate(-50%,calc(-50% + var(--card-tuck) - var(--card-lift)));}',
      /* the envelope withdraws; the card is left holding the frame */
      '.stage.card-final .throat,.stage.card-final .pocket{transform:translateY(30%);opacity:0;',
      '  transition:transform var(--t-settle) cubic-bezier(.4,0,.2,1),opacity calc(var(--t-settle) * .75) ease;}',
      '.stage.card-final .flap{opacity:0;transition:opacity calc(var(--t-settle) * .55) ease;}',
      '.stage.card-final .card{z-index:20;',
      '  transition:transform var(--t-settle) cubic-bezier(.22,.8,.26,1),box-shadow var(--t-settle) ease;',
      '  transform:translate(-50%,-50%) translateY(var(--card-final-y)) scale(var(--card-final-s));',
      '  box-shadow:0 20px 46px rgba(0,0,0,.42);}',

      /* ---------- prompt + CTA ---------- */
      '.prompt{position:absolute;left:8%;right:8%;bottom:5.5%;z-index:12;text-align:center;',
      '  color:var(--prompt-c);opacity:0;transform:translateY(8px);pointer-events:none;',
      '  font-family:var(--body-font);font-size:calc(var(--w) * .028);letter-spacing:.02em;',
      '  text-shadow:var(--prompt-shadow);transition:opacity 500ms ease,transform 500ms ease;}',
      '.stage.idle .prompt{opacity:.92;transform:translateY(0);animation:nudge 2.6s ease-in-out .8s infinite;}',
      '@keyframes nudge{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',

      '.cta{position:absolute;left:0;right:0;bottom:4.5%;z-index:30;display:flex;justify-content:center;',
      '  opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity var(--t-cta) ease,transform var(--t-cta) ease;}',
      '.stage.done .cta{opacity:1;transform:translateY(0);pointer-events:auto;}',
      /* Dharma Gothic E is a display face — all caps, calls to action only */
      '.cta a{display:inline-block;text-decoration:none;background:var(--accent);color:var(--accent-t);',
      '  font-family:var(--display-font);font-weight:600;letter-spacing:.14em;text-transform:uppercase;',
      '  font-size:calc(var(--w) * .034);padding:.6em 2.1em .5em;border-radius:2px;',
      '  box-shadow:0 8px 22px rgba(0,0,0,.4);transition:transform 160ms ease,filter 160ms ease;}',
      '.cta a:hover{transform:translateY(-2px);filter:brightness(1.07);}',
      '.cta a:focus-visible{outline:2px solid #fff;outline-offset:3px;}',

      '.replay{position:absolute;left:3.5%;bottom:4%;z-index:31;border:0;cursor:pointer;',
      '  background:var(--replay-bg);color:#fff;font-family:var(--display-font);border-radius:999px;',
      '  font-size:calc(var(--w) * .026);letter-spacing:.1em;text-transform:uppercase;',
      '  padding:.6em 1.1em .6em .85em;display:inline-flex;align-items:center;gap:.45em;',
      '  opacity:0;pointer-events:none;transition:opacity 400ms ease,background 160ms ease;',
      '  backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);}',
      '.stage.done .replay{opacity:.85;pointer-events:auto;}',
      '.replay:hover{opacity:1;background:rgba(0,0,0,.62);}',
      '.replay:focus-visible{outline:2px solid #fff;outline-offset:2px;}',
      '.replay svg{width:1.05em;height:1.05em;fill:currentColor;}',

      '.err{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;',
      '  color:#fff;font-family:system-ui,sans-serif;font-size:14px;text-align:center;padding:24px;z-index:50;}',

      '@media (prefers-reduced-motion: reduce){',
      '  .stage *{transition-duration:1ms !important;animation:none !important;}',
      '}'
    ].join('\n');
  }

  /* Perforated-stamp edge, as an inline SVG mask */
  function perfMask() {
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 122" preserveAspectRatio="none">' +
      '<defs><mask id="m"><rect width="100" height="122" fill="#fff"/>' +
      (function () {
        var out = '', i;
        for (i = 0; i <= 10; i++) out += '<circle cx="' + (i * 10) + '" cy="0" r="2.6" fill="#000"/>';
        for (i = 0; i <= 10; i++) out += '<circle cx="' + (i * 10) + '" cy="122" r="2.6" fill="#000"/>';
        for (i = 0; i <= 12; i++) out += '<circle cx="0" cy="' + (i * 10.16) + '" r="2.6" fill="#000"/>';
        for (i = 0; i <= 12; i++) out += '<circle cx="100" cy="' + (i * 10.16) + '" r="2.6" fill="#000"/>';
        return out;
      })() +
      '</mask></defs>' +
      '<rect width="100" height="122" fill="#fff" mask="url(#m)"/></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function postmarkSvg(text) {
    var t = escapeHtml(text || '');
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs><path id="pmArc" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0"/></defs>' +
      '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="5"/>' +
      '<circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" stroke-width="3"/>' +
      '<text font-family="Oswald,\'Arial Narrow\',sans-serif" font-weight="500" ' +
      'font-size="17" letter-spacing="2.4" fill="currentColor">' +
      '<textPath href="#pmArc" startOffset="50%" text-anchor="middle">' + t + '</textPath></text>' +
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

    // reuse an existing shadow root — attachShadow throws if called twice
    var root = this.root = host.shadowRoot ||
      (host.attachShadow ? host.attachShadow({ mode: 'open' }) : host);
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
      '        <div class="stamp-frame"></div>',
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

      '<div class="cta">' + (cfg.rsvpUrl
        ? '<a href="' + escapeHtml(cfg.rsvpUrl) + '" target="' + escapeHtml(cfg.rsvpTarget) +
          '" rel="noopener noreferrer">' + escapeHtml(cfg.rsvpText) + '</a>'
        : '') + '</div>',

      cfg.replay
        ? '<button class="replay" type="button">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/></svg>' +
          escapeHtml(cfg.replayText) + '</button>'
        : ''
    ].join('\n');

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
    s.setProperty('--aspect', cfg.aspect);
    s.setProperty('--max-w', cfg.maxWidth);
    s.setProperty('--min-h', cfg.minHeight);
    s.setProperty('--env', cfg.envelopeColor);
    s.setProperty('--liner', cfg.linerColor);
    s.setProperty('--seal-c', cfg.sealColor);
    s.setProperty('--seal-img', cssUrl(sealSrc));
    s.setProperty('--seal-s', cfg.sealScale);
    s.setProperty('--stamp-paper', cfg.stampPaper);
    s.setProperty('--stamp-ink', cfg.stampInk);
    s.setProperty('--stamp-accent', cfg.stampAccent);
    s.setProperty('--wordmark', cssUrl(markSrc));
    s.setProperty('--perf', cssUrl(perfMask()));
    s.setProperty('--name-c', cfg.nameColor);
    s.setProperty('--name-font', cfg.nameFont);
    s.setProperty('--display-font', cfg.displayFont);
    s.setProperty('--body-font', cfg.bodyFont);
    s.setProperty('--accent', cfg.accentColor);
    s.setProperty('--accent-t', cfg.accentTextColor);

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
    var self = this;
    stage.querySelector('.env-hit').addEventListener('click', function () { self.open(); });
    var rp = stage.querySelector('.replay');
    if (rp) rp.addEventListener('click', function () { self.reset(); self.start(); });

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

  /* Geometry — recomputed on resize so everything scales cleanly */
  Invite.prototype.applyVars = function () {
    if (!this.stage) return;
    var cfg = this.cfg, s = this.stage.style;
    var W = this.stage.clientWidth || parseFloat(cfg.maxWidth) || 620;
    var H = this.stage.clientHeight || W * 1.25;

    var envW = W * 0.50 * cfg.envelopeScale;
    var envH = envW / cfg.envelopeAspect;
    // keep the envelope inside the frame on very short stages
    var maxEnvH = H * 0.62;
    if (envH > maxEnvH) { envH = maxEnvH; envW = envH * cfg.envelopeAspect; }

    var ar = this.cardAR || 0.668;
    var cardW = envW * 0.92;
    var cardH = cardW / ar;
    // the card must tuck fully inside the envelope, so cap its height
    var maxCardH = envH * 0.94;
    if (cardH > maxCardH) { cardH = maxCardH; cardW = cardH * ar; }
    // sit the card low in the envelope, a hair above the bottom edge
    var tuck = envH * 0.47 - cardH / 2;

    // How far the card rides up out of the throat before it settles.
    // Never so far that its top leaves the frame.
    var restCentreY = H * 0.52 + tuck;
    var headroom = restCentreY - cardH / 2 - H * 0.04;
    var lift = Math.max(envH * 0.22, Math.min(envH * 0.55, headroom));
    // final size: fill most of the frame without crowding the CTA
    var finalH = Math.min(H * 0.78, W * 0.98 / ar);
    var finalS = finalH / cardH;

    s.setProperty('--w', W + 'px');
    s.setProperty('--env-w', envW + 'px');
    s.setProperty('--env-h', envH + 'px');
    // A pointed flap only seals across its shoulders (52% down the clip path),
    // so the pocket has to start there or the corners beside the point show through.
    var flapH = envH * cfg.flapDepth;
    s.setProperty('--flap-h', flapH.toFixed(1) + 'px');
    s.setProperty('--throat-h', (flapH * (cfg.flapShape === 'straight' ? 1 : 0.52)).toFixed(1) + 'px');
    s.setProperty('--card-w', cardW + 'px');
    s.setProperty('--card-ar', String(ar));
    s.setProperty('--card-tuck', tuck.toFixed(1) + 'px');
    s.setProperty('--card-lift', lift + 'px');
    s.setProperty('--card-final-s', finalS.toFixed(4));
    // card is anchored at top:52%; nudge it to sit at 45.5% of the frame
    s.setProperty('--card-final-y', (H * (0.455 - 0.52)).toFixed(1) + 'px');
  };

  Invite.prototype.observe = function () {
    var self = this;
    if (global.ResizeObserver) {
      this.ro = new ResizeObserver(function () { self.applyVars(); });
      this.ro.observe(this.stage);
    } else {
      this._onResize = function () { self.applyVars(); };
      global.addEventListener('resize', this._onResize);
    }
  };

  Invite.prototype.at = function (ms, fn) {
    this.timers.push(setTimeout(fn, ms));
  };

  Invite.prototype.clearTimers = function () {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  };

  Invite.prototype.reset = function () {
    this.clearTimers();
    this.stage.className = 'stage' + (this.cfg.vignette ? '' : ' no-vig');
    this.state = 'init';
    // force reflow so the intro transition replays
    void this.stage.offsetWidth;
  };

  Invite.prototype.start = function () {
    var self = this, cfg = this.cfg;
    this.applyVars();

    if (cfg.openOnce && this._sessionOpened()) {
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
    if (this.state !== 'idle') return;
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
    if (this.host.shadowRoot) this.host.shadowRoot.innerHTML = '';
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

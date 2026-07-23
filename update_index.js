const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Meta Viewport
html = html.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, interactive-widget=resizes-content">'
);

// 2. CSS adjustments
html = html.replace('body { font-size: 13px; }', 'body { font-size: 12px; }');
html = html.replace('h2 { font-size: 18px; }', 'h2 { font-size: 14px; }');
html = html.replace('h3 { font-size: 15px; }', 'h3 { font-size: 13px; }');
html = html.replace('.card { border-radius: 14px; padding: 10px; box-shadow: 0 16px 34px rgba(0,0,0,.24); }', '.card { border-radius: 14px; padding: 8px; box-shadow: 0 16px 34px rgba(0,0,0,.24); }');
html = html.replace('.stats .card { min-height: 72px; padding: 10px; }', '.stats .card { min-height: 72px; padding: 8px; }');
html = html.replace('.grid { gap: 6px; }', '.grid { gap: 4px; }');
html = html.replace('.content { padding: 12px; }', '.content { padding: 8px; }');

// Add sticky actions & skeleton to CSS
html = html.replace('</style>', `
    .skeleton-loading { opacity: 0.5; pointer-events: none; animation: pulse 1s infinite alternate; }
    @keyframes pulse { from { opacity: 0.5; } to { opacity: 0.8; } }
    @media (max-width: 900px) {
      .sticky-actions { position: sticky; bottom: 0; background: var(--bg, #0a1526); padding: 8px 0; z-index: 10; margin-top: auto; border-top: 1px solid var(--line); display:flex; justify-content: flex-end; width: 100%; box-shadow: 0 -10px 20px rgba(0,0,0,0.5); }
    }
    </style>`);

// 3. JS Helpers (input)
html = html.replace(
  'return `<label style="position:relative">${label}<input name="${name}" type="${type}" value="${value}" ${required ? "required" : ""} ${styleAttr} onblur="if(this.type===\'text\') this.value=this.value.trim()">${eyeHtml}</label>`;',
  'let extra = ""; if (type === "text" && (name.toLowerCase().includes("qty") || name.toLowerCase().includes("harga") || name.toLowerCase().includes("stok") || name.toLowerCase().includes("amount"))) { extra = ` inputmode="numeric" enterkeyhint="done" `; }\n      return `<label style="position:relative">${label}<input name="${name}" type="${type}" value="${value}" ${required ? "required" : ""} ${styleAttr} ${extra} onblur="if(this.type===\'text\') this.value=this.value.trim()">${eyeHtml}</label>`;'
);

html = html.replace(
  'return `<label style="position:relative">${label}<input name="${name}" type="text" inputmode="numeric" value="${value}" ${required ? "required" : ""} oninput="formatNumberInput(this)"></label>`;',
  'return `<label style="position:relative">${label}<input name="${name}" type="text" inputmode="numeric" enterkeyhint="done" value="${value}" ${required ? "required" : ""} oninput="formatNumberInput(this)"></label>`;'
);

html = html.replace(
  'return `<div class="actions" style="align-self:end"><button class="btn primary">Simpan</button><button class="btn" type="reset">Reset</button></div>`;',
  'return `<div class="actions sticky-actions" style="align-self:end"><button class="btn primary">Simpan</button><button class="btn" type="reset">Reset</button></div>`;'
);

// 4. Smooth Auto Scroll
html = html.replace(/f\.scrollIntoView\(\);/g, "f.scrollIntoView({ behavior: 'smooth', block: 'center' });");

// 5. Skeleton Loading in load()
html = html.replace(
  'state.data = await gas("bootstrap");',
  'el("content").classList.add("skeleton-loading");\n      state.data = await gas("bootstrap");\n      el("content").classList.remove("skeleton-loading");'
);

// 6. Haptic Feedback & Smart Dismiss (Append to script)
const scriptAdditions = `
    // Shopee-Style Smart UX Extensions
    window.triggerVibrate = (type = 'click') => {
      try {
        if(!navigator.vibrate) return;
        if(type === 'click') navigator.vibrate(30);
        else if(type === 'success') navigator.vibrate([50, 30, 50]);
        else if(type === 'error') navigator.vibrate([100, 50, 100]);
      } catch(e) {}
    };
    document.addEventListener('click', (e) => {
      if(e.target.tagName === 'BUTTON' || e.target.closest('.btn')) {
        window.triggerVibrate('click');
      }
    });
    let isScrolling;
    window.addEventListener('scroll', () => {
      window.clearTimeout(isScrolling);
      isScrolling = setTimeout(function() {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          if (window.innerWidth <= 900) {
            document.activeElement.blur();
          }
        }
      }, 66);
    }, {passive: true});
`;

html = html.replace('window.deferredInstallPrompt = null;', 'window.deferredInstallPrompt = null;' + scriptAdditions);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Update success');

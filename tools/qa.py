"""Tight Surface QA for this page (checklist groups 1–6).

Usage:
  npm run build && npx vite preview --port 4173 &
  python3 tools/qa.py http://localhost:4173/            # needs: pip install playwright && playwright install chromium

Prints findings grouped like the checklist and exits 1 when anything fails.
"""
import asyncio, json, pathlib, sys
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173/"
ONLY = sys.argv[2] if len(sys.argv) > 2 else "all"   # all | widths | overflow | interaction | states | modes
ROOT = pathlib.Path(__file__).resolve().parent.parent
AXE = (ROOT / "node_modules/axe-core/axe.min.js").read_text()
OUT = ROOT / "qa-out"
OUT.mkdir(exist_ok=True)
FAIL = []

def fail(group, msg):
    FAIL.append(f"[{group}] {msg}")
    print(f"  FAIL {msg}")

# ---------- in-page probes ----------
TEXT_JS = r"""() => {
  const out = { text: [], small: [], orphans: [], cssGlyphs: [], attrs: [] };
  const rules = [
    [/[一-鿿][A-Za-z0-9$]|[A-Za-z0-9][一-鿿]/, 'CJK-Latin no space'],
    [/[一-鿿][,:;!?()]|[,:;!?(][一-鿿]/, 'half-width punct'],
    [/"/, 'ASCII quote'],
    [/  /, 'double space'],
    [/[一-鿿][  　]+[一-鿿]/, 'space between CJK'],
    [/[^\s，。、；：！？）」”》][  ]+[，。、；：！？）」”》]|[，。、；：！？）」”》][  ]+[^\s·（「“《]|[（「“《][  ]+\S/, 'space next to full-width punct'],
    [/　/, 'ideographic space'],
    [/[▶↗↑☰⇢✕✓▍◆★☆]/, 'glyph icon'],
  ];
  const check = (t, where) => { for (const [re, why] of rules) if (re.test(t)) out.text.push(why + ' :: ' + where + ' :: ' + t.slice(0, 80)); };
  // visible text: join the text of each block so split nodes (<b>11</b>组) are seen together
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('script,style,svg,.sr-only,noscript')) continue;
    const cs = getComputedStyle(el);
    if (!/block|list-item|table-cell|flex|grid/.test(cs.display)) continue;
    if (![...el.childNodes].some(k => k.nodeType === 3 && k.nodeValue.trim())) continue;
    if (!el.getBoundingClientRect().width) continue;
    const t = el.innerText.replace(/\s+/g, ' ').trim();
    if (!t || seen.has(t)) continue; seen.add(t);
    check(t, el.tagName.toLowerCase() + '.' + [...el.classList].slice(0, 2).join('.'));
  }
  for (const el of document.querySelectorAll('[aria-label],[title],[placeholder],[aria-valuetext]')) {
    for (const a of ['aria-label', 'title', 'placeholder', 'aria-valuetext']) { const v = el.getAttribute(a); if (v) check(v, '@' + a); }
  }
  // text below 12px (brand mark and nav numbers excepted)
  { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let t;
    while ((t = w.nextNode())) {
      const p = t.parentElement; if (!p || !t.nodeValue.trim() || p.closest('script,style,.sr-only,.brand-mark,.n,noscript')) continue;
      const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || !p.getBoundingClientRect().width) continue;
      const fs = parseFloat(s.fontSize); if (fs < 11.95) out.small.push(fs.toFixed(1) + 'px :: ' + t.nodeValue.trim().slice(0, 30));
    } }
  // single CJK character on the last line
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (!/block|list-item|table-cell|flex|grid/.test(cs.display) || cs.writingMode !== 'horizontal-tb' || !el.getBoundingClientRect().width) continue;
    if (![...el.childNodes].some(k => k.nodeType === 3 && k.nodeValue.trim())) continue;
    const lines = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t;
    while ((t = w.nextNode())) {
      let q = t.parentElement, nested = false;
      while (q && q !== el) { if (/block|list-item|table|flex|grid/.test(getComputedStyle(q).display)) { nested = true; break; } q = q.parentElement; }
      if (nested || t.parentElement.closest('.sr-only')) continue;
      for (let i = 0; i < t.nodeValue.length; i++) {
        const c = t.nodeValue[i]; if (/\s/.test(c)) continue;
        const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); const b = r.getClientRects()[0]; if (!b || !b.width) continue;
        const y = Math.round(b.top + b.height / 2), L = lines[lines.length - 1];
        if (L && Math.abs(L.y - y) < 6) L.s += c; else lines.push({ y, s: c });
      }
    }
    if (lines.length < 2) continue;
    const core = lines[lines.length - 1].s.replace(/[，。、；：！？）」”》,.;:!?)\]]/g, '');
    if (core.length === 1 && /[一-鿿]/.test(core)) out.orphans.push(lines[lines.length - 2].s.slice(-10) + ' | ' + lines[lines.length - 1].s);
  }
  // glyph icons hidden in CSS
  const GLYPH = /[←-⇿⌀-⏿─-➿⟰-⟿⤀-⥿⬀-⯿️]|[\u{1F000}-\u{1FAFF}]/u;
  const walk = (rules, where) => { for (const rule of rules) {
    if (rule.cssRules) walk(rule.cssRules, where);
    if (!rule.style) continue;
    for (const prop of ['content', 'list-style-type', 'list-style']) {
      const v = rule.style.getPropertyValue(prop);
      if (v && GLYPH.test(v)) out.cssGlyphs.push(where + ' ' + (rule.selectorText || '') + ' { ' + prop + ': ' + v + ' }');
    } } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules, sh.href ? sh.href.split('/').pop() : '<style>'); } catch (e) { out.cssGlyphs.push('unreadable ' + sh.href); } }
  for (const el of document.querySelectorAll('body *')) for (const ps of ['::before', '::after', '::marker']) {
    const v = getComputedStyle(el, ps).content;
    if (v && v !== 'none' && v !== 'normal' && GLYPH.test(v)) out.cssGlyphs.push('rendered ' + el.className + ps + ' ' + v);
  }
  // numerals of one phrase set in two fonts (Chakra Petch has narrow proportional figures, Noto Sans SC tabular ones):
  // "11 / 11" with the first 11 in Chakra and the second in Noto looks condensed
  out.mixedNum = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (!/block|list-item|table-cell|flex|grid/.test(cs.display) || !el.getBoundingClientRect().width) continue;
    const fams = new Set(); const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t;
    while ((t = w.nextNode())) {
      if (!/\d/.test(t.nodeValue)) continue;
      let q = t.parentElement, nested = false;
      while (q && q !== el) { if (/block|list-item|table|flex|grid/.test(getComputedStyle(q).display)) { nested = true; break; } q = q.parentElement; }
      if (nested || t.parentElement.closest('.sr-only, svg')) continue;
      fams.add(getComputedStyle(t.parentElement).fontFamily.split(',')[0].trim());
    }
    if (fams.size > 1) out.mixedNum.push([...fams].join(' + ') + ' :: ' + el.tagName.toLowerCase() + '.' + [...el.classList].slice(0, 2).join('.') + ' :: ' + el.textContent.trim().slice(0, 40));
  }
  return out;
}"""

SIZES_JS = r"""() => {
  const groups = {
    'chip 26': '.hero-sub [data-kumo-component="Badge"], .ver-mech [data-kumo-component="Badge"], .cmp-chips [data-kumo-component="Badge"], .lvl',
    'route pill 26': '.route-pill',
    'tray chip 26': '.tray-chip',
    'filter 36': '[data-ts-variant="filter"]',
    'action 36': '[data-kumo-component="Button"]:not([data-ts-variant="filter"]):not([data-size="sm"])',
    'stage 36': '.stage',
    'resource 48': '[data-ts-variant="resource"]',
    'nav link 40': '.nav ol a',
    'back-to-top 44': '.totop',
    'input 36': 'input[data-kumo-component="Input"]',
    'select 36': 'button[data-kumo-component="Select"], [data-kumo-component="Select"] button',
    'tab 36 track': '[role="tablist"]',
  };
  const out = {};
  for (const [k, sel] of Object.entries(groups)) {
    const hs = [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length).map(e => Math.round(e.getBoundingClientRect().height * 10) / 10);
    if (hs.length) out[k] = [...new Set(hs)].sort((a, b) => a - b).join(',') + '  (n=' + hs.length + ')';
  }
  const sm = [...document.querySelectorAll('[data-kumo-component="Button"]')].filter(e => e.getClientRects().length).map(e => [e.textContent.trim().slice(0, 12), Math.round(e.getBoundingClientRect().height)]);
  out.buttons = JSON.stringify(sm);
  return out;
}"""

LAYOUT_JS = r"""() => {
  const out = { sw: document.documentElement.scrollWidth, vw: innerWidth, trunc: [], overflowEls: [] };
  const sel = '.stage .rt, .stage .vn, .ex-item .rt, .ls-label b, .fig-key span, .tray-chip .tx, [data-ts-variant="resource"] span, .route-pill, .brand-name, .hero .datastrip span, .bars .nm';
  for (const e of document.querySelectorAll(sel)) {
    if (!e.getClientRects().length) continue;
    if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).textOverflow === 'ellipsis') out.trunc.push(e.className + ' :: ' + e.textContent.trim().slice(0, 40));
  }
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if (r.right > innerWidth + 1 && !e.closest('.tbl, .nav ol, [role=region][tabindex]') && getComputedStyle(e).position !== 'fixed') out.overflowEls.push(e.tagName + '.' + e.className.toString().slice(0, 40) + ' right=' + Math.round(r.right));
  }
  out.overflowEls = out.overflowEls.slice(0, 8);
  // fixed layers (compare tray, back-to-top, toasts) must sit fully inside the viewport
  out.fixedOut = [];
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e);
    if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.left < -0.5 || r.right > innerWidth + 0.5) out.fixedOut.push(e.tagName + '.' + e.className.toString().slice(0, 30) + ' left=' + Math.round(r.left) + ' right=' + Math.round(r.right));
  }
  return out;
}"""

LINKS_JS = r"""() => {
  const out = {};
  out.broken = [...document.querySelectorAll('a[href^="#"]')].filter(a => a.getAttribute('href') !== '#' && !document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)))).map(a => a.getAttribute('href'));
  out.extBad = [...document.querySelectorAll('a[href^="http"]')].filter(a => a.target !== '_blank' || a.rel !== 'noopener').map(a => a.href);
  out.figs = [...document.querySelectorAll('figcaption b')].map(x => (x.textContent.match(/FIG\.(\d+)/) || [])[1]).join(' ');
  out.secs = [...document.querySelectorAll('.sh-idx')].map(x => x.textContent).join(' ');
  out.libs = /mermaid|chart\.js|echarts/i.test(document.documentElement.outerHTML);
  // cross-checks: stats vs data on page
  const stat = Object.fromEntries([...document.querySelectorAll('.hero .datastrip div')].map(d => [d.querySelector('span').textContent, +d.querySelector('b').textContent]));
  out.stat = stat;
  out.rowsRoutes = document.querySelectorAll('.routes > li').length;
  out.rowsTable = document.querySelectorAll('.src-tbl tbody tr').length;
  out.refs = document.querySelectorAll('.refs > li').length;
  out.listItems = document.querySelectorAll('.ex-list > li').length;
  out.layerCells = [...document.querySelectorAll('.ls-cells')].map(e => e.children.length).join(',');
  out.layerText = [...document.querySelectorAll('.ls-comp')].map(e => e.textContent).join(' | ');
  return out;
}"""

async def settle(pg):
    await pg.wait_for_load_state("networkidle")
    await pg.evaluate("document.fonts.ready")
    h = await pg.evaluate("document.documentElement.scrollHeight")
    for y in range(0, h, 400):
        await pg.evaluate(f"window.scrollTo(0,{y})"); await pg.wait_for_timeout(40)
    await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(700)

async def audit_width(b, w, h=900):
    print(f"\n=== {w}px ===")
    ctx = await b.new_context(viewport={"width": w, "height": h})
    pg = await ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    await pg.goto(URL); await settle(pg)
    t = await pg.evaluate(TEXT_JS)
    print("1 text"); [fail("text", x) for x in t["text"]]; [fail("small", x) for x in t["small"]]; [fail("orphan", x) for x in t["orphans"]]; [fail("css glyph", x) for x in t["cssGlyphs"]]; [fail("mixed-font numerals", x) for x in t["mixedNum"]]
    s = await pg.evaluate(SIZES_JS)
    print("2 sizes"); [print("   ", k.ljust(16), v) for k, v in s.items() if k != "buttons"]; print("    buttons", s["buttons"][:600])
    l = await pg.evaluate(LAYOUT_JS)
    print("3 layout", "scrollWidth", l["sw"], "viewport", l["vw"])
    if l["sw"] > l["vw"]: fail("layout", f"horizontal overflow {l['sw']} > {l['vw']}: {l['overflowEls']}")
    [fail("truncation", x) for x in l["trunc"]]
    [fail("fixed layer outside viewport", x) for x in l["fixedOut"]]
    k = await pg.evaluate(LINKS_JS)
    print("4 links/data", json.dumps(k, ensure_ascii=False))
    if k["broken"]: fail("links", f"broken anchors {k['broken']}")
    if k["extBad"]: fail("links", f"external links without target/rel {k['extBad'][:3]}")
    if k["figs"] != "01 02 03 04": fail("fig", f"FIG sequence {k['figs']}")
    if k["libs"]: fail("libs", "mermaid / chart.js / echarts found in page source")
    await pg.add_script_tag(content=AXE)
    ax = await pg.evaluate("""async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice'] } });
       return { v: r.violations.map(v => v.id + ' (' + v.nodes.length + '): ' + v.nodes.slice(0,3).map(n => n.target.join(' ')).join(' | ')), inc: r.incomplete.map(v => v.id + ' ' + v.nodes.length) } }""")
    print("4 axe violations", len(ax["v"]), "incomplete", ax["inc"])
    [fail("axe", x) for x in ax["v"]]
    if errs: fail("console", "; ".join(errs[:5]))
    await pg.screenshot(path=str(OUT / f"qa-{w}.png"), full_page=True)
    await ctx.close()

async def overflow_widths(b):
    print("\n=== overflow at extra widths (incl. foldables) ===")
    for w, h, label in [(1180, 820, ""), (1024, 768, ""), (890, 626, "iPhone Duo open, landscape"), (760, 900, ""), (626, 890, "iPhone Duo open, portrait"),
                        (466, 678, "iPhone Duo cover"), (360, 780, ""), (344, 882, "Galaxy Z Fold cover"), (320, 640, ""), (844, 390, "phone landscape")]:
        ctx = await b.new_context(viewport={"width": w, "height": h}); pg = await ctx.new_page()
        await pg.goto(URL); await settle(pg)
        l = await pg.evaluate(LAYOUT_JS)
        o = await pg.evaluate(TEXT_JS)
        status = "ok" if l["sw"] <= l["vw"] and not l["trunc"] and not o["orphans"] else "FAIL"
        print(f"  {w}x{h} {label:28} scrollWidth={l['sw']} trunc={len(l['trunc'])} orphans={len(o['orphans'])} {status}")
        if l["sw"] > l["vw"]: fail("layout", f"{w}px overflow {l['overflowEls']}")
        [fail("truncation", f"{w}px {x}") for x in l["trunc"]]
        [fail("orphan", f"{w}px {x}") for x in o["orphans"]]
        if label: await pg.screenshot(path=str(OUT / f"fold-{w}x{h}.png"), full_page=False)
        await ctx.close()

STATE_JS = """() => ({
  pressed: [...document.querySelectorAll('[data-ts-variant=filter][aria-pressed=true]')].map(b => b.textContent.trim()),
  dim: [...document.querySelectorAll('.routes > li')].filter(li => +getComputedStyle(li).opacity < 0.99).length,
  sel: document.querySelector('.ex-item[aria-current=true] .tt')?.textContent || null,
  tray: document.querySelectorAll('.tray-chip').length,
})"""

async def interactions(b):
    print("\n=== 5 interaction ===")
    # mouse + keyboard on desktop
    ctx = await b.new_context(viewport={"width": 1440, "height": 900}); pg = await ctx.new_page()
    await pg.goto(URL); await settle(pg)
    flt = pg.locator('[data-ts-variant=filter]', has_text="稀疏")
    await flt.click(); await pg.wait_for_timeout(500)
    s1 = await pg.evaluate(STATE_JS)
    await flt.click(); await pg.wait_for_timeout(500)
    s2 = await pg.evaluate(STATE_JS)
    print("  filter pin:", s1["pressed"], "dimmed rows", s1["dim"], "-> release:", s2["pressed"], "dimmed", s2["dim"])
    if not (s1["dim"] == 4 and s2["dim"] == 0 and s2["pressed"] == ["全部"]): fail("interaction", "family pin toggle did not dim 4 rows / release")
    # hover lift on a stage (mouse only)
    st = pg.locator(".stage").nth(4)
    await st.hover(); await pg.wait_for_timeout(400)
    tr = await st.evaluate("e => getComputedStyle(e).transform")
    print("  stage hover transform:", tr)
    # click stage -> explorer selection
    await pg.locator(".stage", has_text="Token Sparse").click(); await pg.wait_for_timeout(900)
    s3 = await pg.evaluate(STATE_JS)
    print("  stage click -> explorer selected:", s3["sel"])
    if s3["sel"] != "DeepSeek V3.2 → V4": fail("interaction", "stage click did not select DeepSeek in explorer")
    # barcode: mouse move + keyboard
    bar = pg.locator(".ls-bar").first
    await bar.scroll_into_view_if_needed(); bb = await bar.bounding_box()
    await pg.mouse.move(bb["x"] + bb["width"] * 0.5, bb["y"] + bb["height"] / 2); await pg.wait_for_timeout(300)
    v1 = await bar.get_attribute("aria-valuetext")
    await bar.focus(); await pg.keyboard.press("End"); await pg.wait_for_timeout(200)
    v2 = await bar.get_attribute("aria-valuetext")
    await pg.keyboard.press("ArrowLeft"); v3 = await bar.get_attribute("aria-valuetext")
    print("  barcode mouse:", v1, "| End:", v2, "| Left:", v3)
    if not (v2.startswith("第 93 / 93 层") and v3.startswith("第 92 / 93 层") and "Gated MLA" in v2 and "Gated MLA" in v3): fail("interaction", "barcode keyboard values wrong")
    # tabs: proportional mode width change
    w_abs = await pg.evaluate("document.querySelectorAll('.ls-bar')[1].getBoundingClientRect().width")
    await pg.get_by_role("tab", name="按比例拉伸").click(); await pg.wait_for_timeout(700)
    w_fit = await pg.evaluate("document.querySelectorAll('.ls-bar')[1].getBoundingClientRect().width")
    print("  GLM-5.3-Flash bar width abs/fit:", round(w_abs), round(w_fit))
    if not w_fit > w_abs * 1.9: fail("interaction", "proportional mode did not widen the 45-layer bar")
    # compare: add 4 -> toast + 3 kept, open dialog
    for gid in ["qwen", "kimi", "minimax", "deepseek"]:
        await pg.locator(f"#g-{gid} .ex-item").click(); await pg.wait_for_timeout(450)
        await pg.locator("#ex-pane").get_by_text("加入对比").click(); await pg.wait_for_timeout(300)
    s4 = await pg.evaluate(STATE_JS)
    toast = await pg.locator("[role=region][aria-live]").inner_text()
    print("  compare tray chips:", s4["tray"], "| toast:", toast.replace("\n", " ")[:60])
    l = await pg.evaluate(LAYOUT_JS)
    if l["fixedOut"]: fail("layout", f"desktop tray outside viewport {l['fixedOut']}")
    if s4["tray"] != 3 or "最多" not in toast: fail("interaction", "compare limit not enforced")
    await pg.get_by_role("button", name="开始对比").click(); await pg.wait_for_timeout(700)
    dlg = await pg.locator("[role=dialog]").count()
    cols = await pg.locator(".cmp-col").count()
    print("  compare dialog open:", dlg, "columns:", cols)
    if cols != 3: fail("interaction", "compare dialog did not show 3 columns")
    await pg.add_script_tag(content=AXE)
    ax = await pg.evaluate("async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice'] } })).violations.map(v => v.id + ' ' + v.nodes.length + ' ' + v.nodes[0].target.join(' '))")
    print("  axe with dialog open:", ax); [fail("axe", "dialog: " + x) for x in ax]
    await pg.screenshot(path=str(OUT / "dialog-1440.png"))
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(400)
    # palette
    await pg.keyboard.press("Control+k"); await pg.wait_for_timeout(500)
    await pg.keyboard.type("MiMo"); await pg.wait_for_timeout(300)
    await pg.screenshot(path=str(OUT / "palette-1440.png"))
    ax = await pg.evaluate("async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice'] } })).violations.map(v => v.id + ' ' + v.nodes.length + ' ' + v.nodes[0].target.join(' '))")
    print("  axe with palette open:", ax); [fail("axe", "palette: " + x) for x in ax]
    await pg.keyboard.press("Enter"); await pg.wait_for_timeout(1200)
    s5 = await pg.evaluate(STATE_JS)
    print("  palette -> selected:", s5["sel"])
    if s5["sel"] != "小米 MiMo-V2-Flash": fail("interaction", "palette did not open MiMo")
    # keyboard focus ring
    await pg.keyboard.press("Tab"); fr = await pg.evaluate("(() => { const e = document.activeElement; const s = getComputedStyle(e); return e.tagName + ' ' + s.outlineStyle + ' ' + s.outlineWidth + ' ' + s.outlineColor + ' off ' + s.outlineOffset })()")
    print("  focus ring:", fr)
    await ctx.close()

    # touch: taps must not leave hover lift or dims behind
    ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
    pg = await ctx.new_page(); await pg.goto(URL); await settle(pg)
    flt = pg.locator('[data-ts-variant=filter]', has_text="窗口")
    await flt.scroll_into_view_if_needed(); bb = await flt.bounding_box()
    await pg.touchscreen.tap(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2); await pg.wait_for_timeout(500)
    a = await pg.evaluate(STATE_JS)
    await pg.touchscreen.tap(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2); await pg.wait_for_timeout(500)
    c = await pg.evaluate(STATE_JS)
    lift = await flt.evaluate("e => getComputedStyle(e).transform")
    print("  touch pin:", a["pressed"], a["dim"], "-> second tap:", c["pressed"], c["dim"], "| transform after tap:", lift)
    if not (a["dim"] == 7 and c["dim"] == 0): fail("interaction", "touch pin toggle")
    bar = pg.locator(".ls-bar").nth(3); await bar.scroll_into_view_if_needed(); bb = await bar.bounding_box()
    await pg.touchscreen.tap(bb["x"] + 2, bb["y"] + bb["height"] / 2); await pg.wait_for_timeout(300)
    v = await bar.get_attribute("aria-valuetext"); print("  touch tap barcode (MiMo first layer):", v)
    if not v.startswith("第 1 / 48 层：SWA"): fail("interaction", "MiMo first layer should be SWA (8 blocks of 5 SWA + 1 Global)")
    st = pg.locator(".stage", has_text="SSM Hybrid"); await st.scroll_into_view_if_needed(); bb = await st.bounding_box()
    await pg.touchscreen.tap(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2); await pg.wait_for_timeout(1200)
    d = await pg.evaluate(STATE_JS)
    exp = await pg.locator("#g-hunyuan .ex-item").get_attribute("aria-expanded")
    print("  touch stage -> explorer:", d["sel"], "expanded", exp)
    if exp != "true": fail("interaction", "mobile stage tap did not expand Hunyuan")
    # touch: add to compare, the tray must be fully on screen and its buttons tappable
    await pg.locator("#exd-hunyuan").get_by_text("加入对比").tap(); await pg.wait_for_timeout(600)
    l = await pg.evaluate(LAYOUT_JS)
    tray = await pg.locator(".tray").bounding_box()
    print("  touch tray box:", {k: round(v) for k, v in tray.items()}, "fixed outside:", l["fixedOut"])
    if l["fixedOut"] or tray["x"] < 0 or tray["x"] + tray["width"] > 390: fail("layout", "mobile compare tray outside viewport")
    await pg.locator(".tray").get_by_role("button", name="清空").tap(); await pg.wait_for_timeout(600)
    if await pg.locator(".tray").count(): fail("interaction", "tray clear button not tappable")
    await pg.screenshot(path=str(OUT / "touch-390.png"))
    await ctx.close()

async def states(b):
    """Every reachable view, not just the default one: all 11 explorer details, all FIG.01 modes and
    query positions, every mechanism pin, the proportional barcode mode, the compare dialog, and the
    palette's empty state. Each state is checked with the text, numeral and layout probes."""
    print("\n=== 5b state sweep ===")
    def report(tag, t, l):
        for x in t["text"]: fail("state text", f"{tag}: {x}")
        for x in t["orphans"]: fail("state orphan", f"{tag}: {x}")
        for x in t["mixedNum"]: fail("state numerals", f"{tag}: {x}")
        for x in l["trunc"]: fail("state truncation", f"{tag}: {x}")
        for x in l["fixedOut"]: fail("state fixed layer", f"{tag}: {x}")
        if l["sw"] > l["vw"]: fail("state overflow", f"{tag}: {l['sw']} > {l['vw']}")
    n = 0
    for w, h, touch in [(1440, 900, False), (390, 844, True)]:
        ctx = await b.new_context(viewport={"width": w, "height": h}, has_touch=touch, is_mobile=touch)
        pg = await ctx.new_page(); await pg.goto(URL); await settle(pg)
        click = (lambda loc: loc.tap()) if touch else (lambda loc: loc.click())
        for gid in ["qwen", "kimi", "minimax", "ring", "deepseek", "glm", "step", "mimo", "hunyuan", "longcat", "hysparse"]:
            item = pg.locator(f"#g-{gid} .ex-item")
            if await item.get_attribute("aria-current") != "true": await click(item)
            await pg.wait_for_timeout(450)
            report(f"{w}px explorer {gid}", await pg.evaluate(TEXT_JS), await pg.evaluate(LAYOUT_JS)); n += 1
        for mode in ["全局", "窗口", "稀疏", "线性"]:
            await click(pg.get_by_role("tab", name=mode)); await pg.wait_for_timeout(200)
            for t in [1, 4, 5, 16]:
                await pg.evaluate(f"(() => {{ const r = document.querySelectorAll('.mask-grid i')[{(t - 1) * 16}]; r.click(); }})()"); await pg.wait_for_timeout(120)
                report(f"{w}px FIG.01 {mode} t={t}", await pg.evaluate(TEXT_JS), await pg.evaluate(LAYOUT_JS)); n += 1
        for fam in ["线性", "窗口", "稀疏", "全局", "复用", "压缩", "SSM"]:
            btn = pg.locator("[data-ts-variant=filter]", has_text=fam); await click(btn); await pg.wait_for_timeout(300)
            report(f"{w}px pin {fam}", await pg.evaluate(TEXT_JS), await pg.evaluate(LAYOUT_JS)); n += 1
            await click(btn); await pg.wait_for_timeout(300)
        await click(pg.get_by_role("tab", name="按比例拉伸")); await pg.wait_for_timeout(500)
        for v in ["kimi-k3", "glm-5.3-flash", "step-3.5-flash", "mimo-v2-flash"]:
            await pg.evaluate(f"document.getElementById('ls-{v}').querySelector('.ls-bar').focus()"); await pg.keyboard.press("End"); await pg.wait_for_timeout(100)
            report(f"{w}px barcode {v}", await pg.evaluate(TEXT_JS), await pg.evaluate(LAYOUT_JS)); n += 1
        for gid in ["kimi", "minimax", "hysparse"]:
            item = pg.locator(f"#g-{gid} .ex-item")
            if await item.get_attribute("aria-current") != "true": await click(item); await pg.wait_for_timeout(450)
            await click(pg.locator(f"#exd-{gid}").get_by_text("加入对比")); await pg.wait_for_timeout(350)
        report(f"{w}px compare tray", await pg.evaluate(TEXT_JS), await pg.evaluate(LAYOUT_JS)); n += 1
        await click(pg.get_by_role("button", name="开始对比")); await pg.wait_for_timeout(700)
        report(f"{w}px compare dialog", await pg.evaluate(TEXT_JS), await pg.evaluate(LAYOUT_JS)); n += 1
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(400)
        await pg.keyboard.press("Control+k"); await pg.wait_for_timeout(400); await pg.keyboard.type("不存在的模型"); await pg.wait_for_timeout(300)
        report(f"{w}px palette empty", await pg.evaluate(TEXT_JS), await pg.evaluate(LAYOUT_JS)); n += 1
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(300)
        await pg.locator(".ex-q input").fill("zzz"); await pg.wait_for_timeout(300)
        report(f"{w}px explorer empty", await pg.evaluate(TEXT_JS), await pg.evaluate(LAYOUT_JS)); n += 1
        await ctx.close()
    print(f"  {n} states checked")

async def modes(b):
    print("\n=== 6 reduced motion / forced colors ===")
    ctx = await b.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce"); pg = await ctx.new_page()
    await pg.goto(URL); await pg.wait_for_timeout(300)
    op = await pg.evaluate("getComputedStyle(document.querySelector('.hero h1')).opacity")
    sb = await pg.evaluate("getComputedStyle(document.documentElement).scrollBehavior")
    print("  reduced motion: h1 opacity after 300ms", op, "scroll-behavior", sb)
    if float(op) < 0.99 or sb != "auto": fail("motion", "reduced motion still animates")
    await ctx.close()
    ctx = await b.new_context(viewport={"width": 1440, "height": 900}, forced_colors="active"); pg = await ctx.new_page()
    await pg.goto(URL); await settle(pg)
    await pg.screenshot(path=str(OUT / "forced-colors.png"), full_page=True)
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        if ONLY in ("all", "widths"):
            await audit_width(b, 1440)
            await audit_width(b, 390, 844)
        if ONLY in ("all", "overflow"): await overflow_widths(b)
        if ONLY in ("all", "interaction"): await interactions(b)
        if ONLY in ("all", "states"): await states(b)
        if ONLY in ("all", "modes"): await modes(b)
        await b.close()
    print("\n" + ("ALL CHECKS PASSED" if not FAIL else f"{len(FAIL)} FAILURES:\n" + "\n".join(FAIL)))
    sys.exit(1 if FAIL else 0)

asyncio.run(main())

"""Contrast of every visible text against the pixels actually behind it (Tight Surface QA group 1).

Renders the page twice: once normally to read text colours, once with all text made transparent,
then samples the background under each text box. Catches gradients, tints and translucent layers
that axe-core leaves as "incomplete".   Usage: python3 tools/contrast.py http://localhost:4173/
"""
import asyncio, io, sys
from playwright.async_api import async_playwright
from PIL import Image

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173/"

def lum(c):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = c[:3]
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)

def ratio(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)

COLLECT = r"""() => {
  const cvs = document.createElement('canvas').getContext('2d');
  const rgba = (c) => { cvs.fillStyle = '#000'; cvs.fillStyle = c; const f = cvs.fillStyle;
    if (f.startsWith('#')) return [parseInt(f.slice(1,3),16), parseInt(f.slice(3,5),16), parseInt(f.slice(5,7),16), 1];
    const m = f.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] ?? 1]; };
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('script,style,svg,noscript,.sr-only,[aria-hidden="true"]')) continue;
    if (![...el.childNodes].some(k => k.nodeType === 3 && k.nodeValue.trim())) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    let op = 1; for (let q = el; q; q = q.parentElement) op *= +getComputedStyle(q).opacity;
    if (op < 0.98) continue;   // dimmed context (pinned filter) is intentionally low contrast
    const tn = [...el.childNodes].find(k => k.nodeType === 3 && k.nodeValue.trim());
    const range = document.createRange(); range.selectNodeContents(tn);   // the text itself, not sibling icons or swatches
    for (const r of range.getClientRects()) {
      if (r.width < 2 || r.height < 2) continue;
      out.push({ sel: el.tagName.toLowerCase() + '.' + [...el.classList].slice(0, 2).join('.'), text: el.textContent.trim().slice(0, 24),
        x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, color: rgba(cs.color), fs: parseFloat(cs.fontSize), fw: +cs.fontWeight });
      break;
    }
  }
  return out;
}"""

async def run(b, w, h):
    pg = await b.new_page(viewport={"width": w, "height": h})
    await pg.goto(URL, wait_until="networkidle")
    H = await pg.evaluate("document.documentElement.scrollHeight")
    for y in range(0, H, 400):
        await pg.evaluate(f"scrollTo(0,{y})"); await pg.wait_for_timeout(30)
    await pg.evaluate("scrollTo(0,0)"); await pg.wait_for_timeout(900)
    items = await pg.evaluate(COLLECT)
    await pg.add_style_tag(content="*{color:transparent!important;-webkit-text-fill-color:transparent!important;-webkit-text-stroke:0!important;text-shadow:none!important;caret-color:transparent!important}")
    await pg.wait_for_timeout(200)
    img = Image.open(io.BytesIO(await pg.screenshot(full_page=True))).convert("RGB")
    bad = []
    for it in items:
        x0, y0 = max(0, int(it["x"])), max(0, int(it["y"]))
        x1, y1 = min(img.width - 1, int(it["x"] + it["w"])), min(img.height - 1, int(it["y"] + it["h"]))
        if x1 <= x0 or y1 <= y0: continue
        px = [img.getpixel((x, y)) for x in range(x0, x1, max(1, (x1 - x0) // 12)) for y in range(y0, y1, max(1, (y1 - y0) // 4))]
        tc = it["color"]
        # composite translucent text colour over the median background
        px.sort(key=lum); bg = px[len(px) // 2]
        a = tc[3]; fg = tuple(round(tc[i] * a + bg[i] * (1 - a)) for i in range(3))
        worst = min(ratio(fg, p) for p in px[len(px) // 4: 3 * len(px) // 4 + 1])
        large = it["fs"] >= 24 or (it["fs"] >= 18.66 and it["fw"] >= 700)
        need = 3 if large else 4.5
        if worst < need: bad.append((round(worst, 2), need, it["sel"], it["text"], it["fs"]))
    print(f"{w}px: {len(items)} text boxes, {len(bad)} below threshold")
    for x in sorted(bad)[:40]: print("   ", x)
    await pg.close()
    return len(bad)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        n = await run(b, 1440, 900) + await run(b, 390, 844)
        await b.close()
    sys.exit(1 if n else 0)

asyncio.run(main())

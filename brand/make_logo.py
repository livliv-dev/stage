"""VTuber Stage's logo as SVG: "VTuber Stage" drawn in the strokes of the LivLiv wordmark, "Stage" in blue, with
"by livliv" under it. Standard library only; run from anywhere:

    python3 brand/make_logo.py

Writes (ink on light, and -white for dark backgrounds):
  brand/vtuber-stage-wordmark.svg    name + "by livliv": the logo where there is room (README, About, link previews)
  brand/vtuber-stage-name.svg        the name on one line, where there isn't (the top bar)
  brand/vtuber-stage-lockup.svg      the symbol beside name + "by livliv", and -compact: the symbol beside the name;
                                     kept for the rare place that wants both, not used by default
  media/vtuber-stage-wordmark*.svg   the README's copies
  stage/public/vtuber-stage-name.svg, vtuber-stage-wordmark.svg   the app's copies (stage/src/core/product.ts); on
                                     livliv.ai the app keeps its name, LivLiv Stage, and stage/public/wordmark.svg
The symbol alone is the icon (app, browser tab, dock, installers). It and the app icon (brand/vtuber-stage-symbol.svg, brand/vtuber-stage-icon.svg, stage/public/symbol.svg,
favicon.svg, desktop/build/stage/icon.png) are drawn by hand and not written here.

Units of the letters follow the LivLiv wordmark: baseline 171, x-height top 95, cap top 61, ascender top 50 (outer
edges), round caps and joins, stroke 19 (the LivLiv wordmark's own letters are 25).
"""
from __future__ import annotations

import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INK, WHITE, BLUE, CORAL = "#16181d", "#f4f4f5", "#3b7bf0", "#ff4d5e"
LABEL = "VTuber Stage by LivLiv"   # name + byline; the one-line versions say "VTuber Stage"


class Letters:
    """monoline letters; each returns (path, right centre-line x) from its left centre-line x"""

    def __init__(self, w, cap_top=61.0, x_top=95.0, base=171.0, asc_top=50.0, t_top=64.0, bowl=28.0):
        self.w = w
        self.xt, self.bt = x_top + w / 2, base - w / 2
        self.ct, self.at, self.tt = cap_top + w / 2, asc_top + w / 2, t_top + w / 2
        self.rx = bowl
        self.ry = (self.bt - self.xt) / 2
        self.cy = (self.xt + self.bt) / 2

    def V(self, x, half=28.0):
        return f"M{x:.2f} {self.ct:.2f}L{x + half:.2f} {self.bt:.2f}L{x + 2 * half:.2f} {self.ct:.2f}", x + 2 * half

    def T(self, x, half=28.0):
        return f"M{x:.2f} {self.ct:.2f}H{x + 2 * half:.2f}M{x + half:.2f} {self.ct:.2f}V{self.bt:.2f}", x + 2 * half

    def S(self, x, width=46.0):
        sx, sy, y0 = width / 40.0, (self.bt - self.ct) / 61.0, self.ct

        def P(px, py):
            return f"{x + px * sx:.2f} {y0 + py * sy:.2f}"
        return (f"M{P(39, 8)}C{P(33, 1)} {P(27, 0)} {P(20, 0)}C{P(8, 0)} {P(0, 6)} {P(0, 14.5)}"
                f"C{P(0, 27)} {P(8, 29)} {P(20, 30.5)}C{P(32, 32)} {P(40, 35.5)} {P(40, 47)}"
                f"C{P(40, 56)} {P(32, 61)} {P(20, 61)}C{P(12, 61)} {P(5, 59)} {P(0, 53)}", x + width)

    def u(self, x):
        r, ry = self.rx, min(self.ry, 27.0)
        y = self.bt - ry
        return (f"M{x:.2f} {self.xt:.2f}V{y:.2f}A{r} {ry} 0 0 0 {x + 2 * r:.2f} {y:.2f}"
                f"M{x + 2 * r:.2f} {self.xt:.2f}V{self.bt:.2f}", x + 2 * r)

    def _bowl(self, x):
        r, ry, cy = self.rx, self.ry, self.cy
        return f"M{x:.2f} {cy:.2f}A{r} {ry} 0 1 0 {x + 2 * r:.2f} {cy:.2f}A{r} {ry} 0 1 0 {x:.2f} {cy:.2f}"

    def b(self, x):
        return f"M{x:.2f} {self.at:.2f}V{self.bt:.2f}" + self._bowl(x), x + 2 * self.rx

    def e(self, x):
        r, ry, cy, th = self.rx, self.ry, self.cy, math.radians(44)
        return (f"M{x:.2f} {cy:.2f}H{x + 2 * r:.2f}A{r} {ry} 0 1 0 {x + r + r * math.cos(th):.2f} {cy + ry * math.sin(th):.2f}",
                x + 2 * r)

    def r(self, x, arm=27.0, rr=25.0):
        return (f"M{x:.2f} {self.xt:.2f}V{self.bt:.2f}M{x:.2f} {self.xt + rr:.2f}"
                f"A{rr} {rr} 0 0 1 {x + rr:.2f} {self.xt:.2f}H{x + arm:.2f}", x + arm)

    def t(self, x):
        s = x + 12
        return (f"M{s:.2f} {self.tt:.2f}V{self.bt - 14:.2f}Q{s:.2f} {self.bt:.2f} {s + 14:.2f} {self.bt:.2f}"
                f"M{x:.2f} {self.xt:.2f}H{x + 29:.2f}", x + 29)

    def a(self, x):
        s = x + 2 * self.rx
        return self._bowl(x) + f"M{s:.2f} {self.xt:.2f}V{self.bt:.2f}", s

    def g(self, x):
        s = x + 2 * self.rx
        return (self._bowl(x) + f"M{s:.2f} {self.xt:.2f}V{self.bt + 27:.2f}Q{s:.2f} {self.bt + 43:.2f} {s - 20:.2f} {self.bt + 43:.2f}"
                f"H{x + 12:.2f}", s)

    def y(self, x, half=24.0):
        x1, x2, y2 = x + 2 * half, x + half, self.bt
        k = 40 / (y2 - self.xt)
        return f"M{x:.2f} {self.xt:.2f}L{x2:.2f} {y2:.2f}M{x1:.2f} {self.xt:.2f}L{x2 + (x2 - x1) * k:.2f} {y2 + 40:.2f}", x1

    def word(self, text, x, gap, kern):
        out, prev = [], None
        for ch in text:
            if prev is not None:
                x += gap + kern.get(prev + ch, 0.0)
            d, x = getattr(self, ch)(x)
            out.append(d)
            prev = ch
        return "".join(out), x


# the LivLiv wordmark's letters, eye and wink (its own units: letters 101.5-383.7 across, 50-171 down)
LIVLIV = ("M101.5 62.5V141.5Q101.5 158.5 115.5 158.5M145 107.5V158.5M176.3 107.5L200.5 158.5L224.7 107.5"
          "M257.5 62.5V141.5Q257.5 158.5 271.5 158.5M303 107.5V158.5M335.3 107.5L359.5 158.5L383.7 107.5")


def livliv(ink):
    return (f'<path d="{LIVLIV}" fill="none" stroke="{ink}" stroke-width="25" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<circle cx="145" cy="67" r="13.5" fill="{CORAL}"/><rect x="285.5" y="69" width="35" height="16" rx="8" fill="{CORAL}"/>')


# the Stage symbol (1024 units; brand/vtuber-stage-symbol.svg), its visible box
def symbol(ink):
    return ('<defs><linearGradient id="vs-star" x2=".6" y2="1"><stop stop-color="#4b8aff"/><stop offset="1" stop-color="#2e6de8"/>'
            '</linearGradient></defs>'
            f'<path d="M282 205A360 360 0 0 0 282 819M742 205A360 360 0 0 1 742 819" fill="none" stroke="{ink}" stroke-width="128" stroke-linecap="round"/>'
            f'<circle cx="361" cy="512" r="86" fill="{ink}"/>'
            '<path d="M644 366Q658 498 790 512Q658 526 644 658Q630 526 498 512Q630 498 644 366Z" fill="url(#vs-star)" stroke="url(#vs-star)" stroke-width="16" stroke-linejoin="round"/>')


SYMBOL_BOX = (46.0, 141.0, 932.0, 742.0)


def svg(box, body, label=LABEL):
    x, y, w, h = box
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:.1f} {y:.1f} {w:.1f} {h:.1f}" role="img" aria-label="{label}">'
            f'{body}</svg>\n')


def build():
    W = 19.0
    L = Letters(W)
    gap = W + 16.0
    kern = {"VT": -9.0, "Tu": -16.0, "St": -2.0}
    vt, x1 = L.word("VTuber", 0.0, gap, kern)
    st, x3 = L.word("Stage", x1 + gap * 1.55, gap, kern)
    left, right = -W / 2, x3 + W / 2
    asc_top, desc_bot = L.at - W / 2, L.bt + 43 + W / 2
    cap_top, base = L.ct - W / 2, L.bt + W / 2

    # "by livliv": "by" in the LivLiv wordmark's strokes, then the wordmark itself, 0.36 of its size, under "VTuber"
    B = Letters(25.0, bowl=24.0)
    by_b, bx = B.b(0.0)
    by_y, byx = B.y(bx + 38.0)
    lx = byx + 62.0 - 101.5 + 12.5
    k = 0.36
    by_x, by_y0 = left + 12.5 * k, base + 22 - 50.0 * k
    by_base, by_bot = by_y0 + 171 * k, by_y0 + 211 * k

    def name(ink):
        stroke = f'fill="none" stroke-width="{W}" stroke-linecap="round" stroke-linejoin="round"'
        return f'<path d="{vt}" stroke="{ink}" {stroke}/><path d="{st}" stroke="{BLUE}" {stroke}/>'

    def byline(ink):
        return (f'<g transform="translate({by_x:.2f} {by_y0:.2f}) scale({k})">'
                f'<path d="{by_b}{by_y}" fill="none" stroke="{ink}" stroke-width="25" stroke-linecap="round" stroke-linejoin="round"/>'
                f'<g transform="translate({lx:.2f} 0)">{livliv(ink)}</g></g>')

    sx, sy, sw, sh = SYMBOL_BOX

    def mark(ink, h, cy):
        s = h / sh
        return f'<g transform="translate({-sx * s:.3f} {cy - h / 2 - sy * s:.3f}) scale({s:.5f})">{symbol(ink)}</g>', sw * s

    # lockup: the symbol as tall as cap top to the byline's baseline, centred on them; the text half a cap height away
    h, cy = (by_base - cap_top) * 1.01, (cap_top + by_base) / 2
    tx = sw * h / sh + 0.5 * (base - cap_top) + W / 2
    top, bot = min(asc_top, cy - h / 2), max(desc_bot, by_bot, cy + h / 2)
    lockup_box = (-2, top - 2, tx + right + 4, bot - top + 4)

    def lockup(ink):
        return mark(ink, h, cy)[0] + f'<g transform="translate({tx:.2f} 0)">{name(ink)}{byline(ink)}</g>'

    # compact: one line, no byline; the symbol 1.32 cap heights tall
    hc, cyc = (base - cap_top) * 1.32, (cap_top + base) / 2
    txc = sw * hc / sh + 0.40 * (base - cap_top) + W / 2
    topc, botc = min(asc_top, cyc - hc / 2), max(desc_bot, cyc + hc / 2)
    compact_box = (-2, topc - 2, txc + right + 4, botc - topc + 4)

    def compact(ink):
        return mark(ink, hc, cyc)[0] + f'<g transform="translate({txc:.2f} 0)">{name(ink)}</g>'

    word_box = (left - 2, asc_top - 2, right - left + 4, max(desc_bot, by_bot) - asc_top + 4)

    def wordmark(ink):
        return name(ink) + byline(ink)

    name_box = (left - 2, asc_top - 2, right - left + 4, desc_bot - asc_top + 4)

    return {
        "wordmark": (word_box, wordmark), "name": (name_box, name),
        "lockup": (lockup_box, lockup), "compact": (compact_box, compact),
    }


def main():
    parts = build()
    out = {}
    for kind, (box, draw) in parts.items():
        label = "VTuber Stage" if kind in ("name", "compact") else LABEL
        out[f"brand/vtuber-stage-{kind}.svg"] = svg(box, draw(INK), label)
        out[f"brand/vtuber-stage-{kind}-white.svg"] = svg(box, draw(WHITE), label)
    out["media/vtuber-stage-wordmark.svg"] = out["brand/vtuber-stage-wordmark.svg"]
    out["media/vtuber-stage-wordmark-white.svg"] = out["brand/vtuber-stage-wordmark-white.svg"]
    out["stage/public/vtuber-stage-name.svg"] = out["brand/vtuber-stage-name.svg"]
    out["stage/public/vtuber-stage-wordmark.svg"] = out["brand/vtuber-stage-wordmark.svg"]
    for path, text in out.items():
        (ROOT / path).write_text(text)
        print(path)


if __name__ == "__main__":
    main()

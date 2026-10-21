# Code-drawn industrial site for the home page. Each OT risk has an "area" group and a hotspot.
# Coordinates are in a 1200 x 620 viewBox. Labels are CyberForte's own words.

W, H = 1200, 620

# risk number -> (cx, cy, where-in-the-scene label)
HOTSPOTS = {
    1: (286, 392, "The shed with a forgotten PC and a supplier's 4G modem"),
    2: (1000, 404, "The PLC cabinet still on old firmware"),
    3: (492, 500, "The supplier's van at the gate"),
    4: (790, 424, "The production line that must never stop"),
    5: (538, 436, "The control room door and its shared code"),
    6: (600, 262, "The camera and the screens nobody watches"),
    7: (357, 316, "The wall between office IT and the plant"),
    8: (668, 470, "The contractor on site"),
    9: (1136, 196, "The old radio link on the tanks"),
    10: (452, 372, "The server rack with open USB ports"),
}


def _windows(x0, y0, cols, rows, w, h, gx, gy, cls="sc-glass"):
    out = []
    for r in range(rows):
        for c in range(cols):
            out.append('<rect class="%s" x="%d" y="%d" width="%d" height="%d" rx="2"/>' % (cls, x0 + c * (w + gx), y0 + r * (h + gy), w, h))
    return "".join(out)


def scene_svg():
    s = []
    s.append('<svg class="scene-svg" viewBox="0 0 %d %d" role="img" aria-labelledby="scene-title scene-desc" preserveAspectRatio="xMidYMid meet">' % (W, H))
    s.append('<title id="scene-title">An industrial site</title><desc id="scene-desc">A drawing of an office, a security wall, a control room, a factory hall with a production line, a PLC cabinet, storage tanks with a radio mast, a supplier van and a contractor. Ten numbered dots mark where each OWASP OT Top 10 risk can show up.</desc>')
    s.append('<defs><pattern id="sc-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" class="sc-gridline"/></pattern>'
             '<linearGradient id="sc-skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sc-sky1"/><stop offset="1" class="sc-sky2"/></linearGradient></defs>')
    # sky, grid, sun, hills
    s.append('<rect width="%d" height="%d" fill="url(#sc-skyg)"/>' % (W, H))
    s.append('<rect width="%d" height="500" fill="url(#sc-grid)" opacity=".6"/>' % W)
    s.append('<circle class="sc-sun" cx="1010" cy="110" r="46"/>')
    s.append('<path class="sc-hill" d="M0 420 C150 360 300 380 420 400 S700 350 860 380 S1100 360 1200 390 V500 H0z"/>')
    # ground and road
    s.append('<rect class="sc-ground" x="0" y="476" width="%d" height="%d"/>' % (W, H - 476))
    s.append('<rect class="sc-road" x="0" y="540" width="%d" height="44"/>' % W)
    s.append('<path class="sc-roadline" d="M0 562H1200" stroke-dasharray="26 22"/>')

    # 7: security wall between IT and OT (draw early, behind others)
    s.append('<g class="area" id="area-7">')
    s.append('<rect class="sc-wall2" x="340" y="268" width="34" height="208"/>')
    for y in range(276, 470, 16):
        off = 0 if (y // 16) % 2 else 8
        s.append('<path class="sc-brick" d="M340 %dH374M%d %dv16M%d %dv16"/>' % (y, 348 + off, y, 364 - off + 0, y))
    s.append('<path class="sc-accent-stroke" d="M336 268h42" stroke-width="4"/>')
    s.append('<rect class="sc-gate" x="336" y="430" width="42" height="46" rx="3"/>')
    s.append('</g>')

    # Office building (IT side, not an OT risk itself)
    s.append('<g class="sc-office">')
    s.append('<rect class="sc-wall" x="40" y="214" width="196" height="262" rx="3"/>')
    s.append('<rect class="sc-roof" x="32" y="204" width="212" height="14" rx="3"/>')
    s.append(_windows(58, 236, 4, 6, 30, 24, 14, 12))
    s.append('<rect class="sc-door" x="122" y="430" width="32" height="46" rx="2"/>')
    s.append('<text class="sc-label" x="138" y="198" text-anchor="middle">OFFICE IT</text>')
    s.append('</g>')

    # 1: shed with forgotten PC and 4G modem
    s.append('<g class="area" id="area-1">')
    s.append('<path class="sc-wall" d="M250 476V410l36-26 36 26v66z"/>')
    s.append('<rect class="sc-glass" x="262" y="420" width="26" height="20" rx="2"/>')
    s.append('<rect class="sc-dark" x="266" y="424" width="18" height="12" rx="1"/>')
    s.append('<rect class="sc-dark" x="296" y="432" width="16" height="10" rx="2"/>')
    s.append('<path class="sc-line" d="M308 432v-26M302 410a8 8 0 0 1 12 0M299 404a13 13 0 0 1 18 0"/>')
    s.append('<circle class="sc-led blink" cx="300" cy="437" r="2"/>')
    s.append('</g>')

    # Control room (5 door, 10 rack in the window)
    s.append('<rect class="sc-wall" x="398" y="318" width="172" height="158" rx="3"/>')
    s.append('<rect class="sc-roof" x="392" y="308" width="184" height="14" rx="3"/>')
    s.append('<text class="sc-label" x="484" y="300" text-anchor="middle">CONTROL ROOM</text>')
    s.append('<g class="area" id="area-10">')
    s.append('<rect class="sc-glass" x="412" y="334" width="80" height="78" rx="3"/>')
    s.append('<rect class="sc-dark" x="426" y="340" width="52" height="68" rx="2"/>')
    for i in range(5):
        s.append('<rect class="sc-rackline" x="430" y="%d" width="44" height="8" rx="1"/>' % (345 + i * 12))
        s.append('<circle class="sc-led%s" cx="469" cy="%d" r="1.6"/>' % (" blink" if i in (1, 3) else "", 349 + i * 12))
    s.append('<rect class="sc-accent" x="434" y="398" width="8" height="4" rx="1"/>')
    s.append('</g>')
    s.append('<g class="area" id="area-5">')
    s.append('<rect class="sc-door" x="514" y="414" width="34" height="62" rx="2"/>')
    s.append('<rect class="sc-dark" x="553" y="430" width="10" height="16" rx="2"/>')
    s.append('<circle class="sc-led" cx="558" cy="434" r="1.4"/>')
    s.append('<path class="sc-paper" d="M520 424h18v10h-18z"/>')
    s.append('</g>')
    # screens in control room (part of 6)
    s.append('<g class="area" id="area-6">')
    s.append('<rect class="sc-glass" x="500" y="334" width="56" height="44" rx="3"/>')
    s.append('<rect class="sc-screen" x="506" y="340" width="20" height="14" rx="1"/><rect class="sc-screen" x="530" y="340" width="20" height="14" rx="1"/>')
    s.append('<path class="sc-pulse" d="M508 350l4-4 3 3 4-5 5 4M532 351l5-2 4 2 6-6"/>')
    s.append('<path class="sc-line" d="M600 476V278"/>')
    s.append('<path class="sc-dark" d="M584 262h28l6 10h-30z"/>')
    s.append('<circle class="sc-led blink" cx="590" cy="267" r="2"/>')
    s.append('</g>')

    # Factory hall with sawtooth roof
    s.append('<g class="sc-hall">')
    s.append('<rect class="sc-wall" x="620" y="290" width="340" height="186"/>')
    teeth = "".join("L%d 290 L%d 250 L%d 290 " % (620 + i * 85, 620 + i * 85 + 60, 620 + (i + 1) * 85) for i in range(4))
    s.append('<path class="sc-roof" d="M620 290 %sZ"/>' % teeth)
    for i in range(4):
        x = 620 + i * 85 + 60
        s.append('<path class="sc-glass" d="M%d 254L%d 290L%d 290L%d 254z"/>' % (x - 2, x - 2, x + 4, x + 4))
    s.append(_windows(640, 304, 6, 1, 42, 26, 12, 0))
    s.append('<text class="sc-label" x="790" y="242" text-anchor="middle">PLANT</text>')
    # chimney + steam
    s.append('<rect class="sc-wall2" x="900" y="150" width="30" height="100"/>')
    s.append('<rect class="sc-accent" x="900" y="160" width="30" height="8"/>')
    s.append('<g class="steam"><circle class="sc-steam" cx="915" cy="132" r="14"/><circle class="sc-steam" cx="930" cy="110" r="18"/><circle class="sc-steam" cx="950" cy="84" r="22"/></g>')
    s.append('</g>')

    # 4: production line (cutaway)
    s.append('<g class="area" id="area-4">')
    s.append('<rect class="sc-dark" x="640" y="352" width="300" height="104" rx="4"/>')
    s.append('<rect class="sc-belt" x="652" y="420" width="276" height="12" rx="6"/>')
    s.append('<g class="belt-boxes">' + "".join('<rect class="sc-box" x="%d" y="398" width="24" height="22" rx="2"/>' % x for x in range(660, 940, 56)) + '</g>')
    s.append('<path class="sc-arm" d="M712 360v18l18 10v8"/><circle class="sc-led" cx="712" cy="360" r="4"/>')
    s.append('<path class="sc-arm" d="M860 360v14l-16 12v10"/><circle class="sc-led" cx="860" cy="360" r="4"/>')
    s.append('<path class="sc-pulse" d="M652 444h60l8-8 10 14 8-10h192"/>')
    s.append('</g>')

    # 2: PLC cabinet
    s.append('<g class="area" id="area-2">')
    s.append('<rect class="sc-wall2" x="972" y="380" width="58" height="96" rx="3"/>')
    s.append('<rect class="sc-dark" x="980" y="390" width="42" height="30" rx="2"/>')
    for i, cls in enumerate(["sc-led", "sc-led blink", "sc-led"]):
        s.append('<circle class="%s" cx="%d" cy="432" r="2"/>' % (cls, 986 + i * 10))
    s.append('<path class="sc-accent" d="M1001 442l9 16h-18z"/><path class="sc-paper-stroke" d="M1001 448v4M1001 455v.5"/>')
    s.append('</g>')

    # Tanks + 9 radio mast
    s.append('<g class="sc-tanks">')
    s.append('<rect class="sc-wall" x="1060" y="300" width="56" height="176" rx="26"/>')
    s.append('<rect class="sc-wall" x="1124" y="324" width="56" height="152" rx="26"/>')
    s.append('<path class="sc-line" d="M1060 360h56M1124 380h56M960 430h12M1030 430h30"/>')
    s.append('</g>')
    s.append('<g class="area" id="area-9">')
    s.append('<path class="sc-line" d="M1136 324L1136 214M1124 324l12-90 12 90M1127 290h18M1129 260h14"/>')
    s.append('<path class="sc-wave" d="M1150 200a14 14 0 0 1 0 20M1158 192a24 24 0 0 1 0 36"/>')
    s.append('<circle class="sc-accent" cx="1136" cy="210" r="5"/>')
    s.append('</g>')

    # 8: contractor
    s.append('<g class="area" id="area-8">')
    s.append('<circle class="sc-skin" cx="668" cy="474" r="9"/>')
    s.append('<path class="sc-accent" d="M657 472a11 11 0 0 1 22 0z"/>')
    s.append('<path class="sc-vest" d="M656 486h24l4 46h-32z"/>')
    s.append('<rect class="sc-paper" x="671" y="494" width="8" height="10" rx="1"/>')
    s.append('<path class="sc-line" d="M660 532v12M676 532v12"/>')
    s.append('</g>')

    # 3: supplier van
    s.append('<g class="area" id="area-3">')
    s.append('<path class="sc-van" d="M392 540v-50h80l20 22h12v28z"/>')
    s.append('<path class="sc-glass" d="M476 496l14 15h-14z"/>')
    s.append('<text class="sc-vanlabel" x="430" y="522" text-anchor="middle">SUPPLIER</text>')
    s.append('<circle class="sc-dark" cx="416" cy="542" r="10"/><circle class="sc-dark" cx="484" cy="542" r="10"/>')
    s.append('<circle class="sc-hub" cx="416" cy="542" r="4"/><circle class="sc-hub" cx="484" cy="542" r="4"/>')
    s.append('</g>')
    s.append('</svg>')
    return "".join(s)


# Three small code-drawn scenes for the scroll story
STORY = [
    # Design: blueprint of a device with a dashed trust boundary
    '<svg viewBox="0 0 400 300" aria-hidden="true"><rect width="400" height="300" class="st-bg"/>'
    '<path d="M0 0" /><g class="st-grid">' + "".join('<path d="M%d 0V300"/>' % x for x in range(20, 400, 20)) + "".join('<path d="M0 %dH400"/>' % y for y in range(20, 300, 20)) + '</g>'
    '<rect x="120" y="80" width="160" height="120" rx="12" class="st-dev"/>'
    '<rect x="140" y="100" width="70" height="44" rx="4" class="st-screen"/>'
    '<circle cx="246" cy="122" r="14" class="st-knob"/>'
    '<path d="M140 168h120M140 182h80" class="st-ink"/>'
    '<rect x="92" y="56" width="216" height="170" rx="18" class="st-boundary"/>'
    '<path d="M40 140h52M308 140h52" class="st-flow"/><circle cx="40" cy="140" r="8" class="st-node"/><circle cx="360" cy="140" r="8" class="st-node"/>'
    '<text x="200" y="256" text-anchor="middle" class="st-label">TRUST BOUNDARY</text></svg>',
    # Ship: box with a lock, admin/admin struck out
    '<svg viewBox="0 0 400 300" aria-hidden="true"><rect width="400" height="300" class="st-bg"/>'
    '<path d="M110 120l90-40 90 40v100l-90 40-90-40z" class="st-box"/><path d="M110 120l90 40 90-40M200 160v100" class="st-ink"/>'
    '<path d="M155 100l90 40" class="st-tape"/>'
    '<rect x="176" y="186" width="48" height="40" rx="6" class="st-lock"/><path d="M186 186v-12a14 14 0 0 1 28 0v12" class="st-shackle"/>'
    '<g class="st-cred"><rect x="250" y="40" width="120" height="40" rx="8" class="st-tag"/><text x="310" y="66" text-anchor="middle" class="st-mono">admin/admin</text><path d="M258 60h104" class="st-strike"/></g>'
    '<text x="200" y="290" text-anchor="middle" class="st-label">SHIPS LOCKED</text></svg>',
    # Operate: device in a plant zone with a shield
    '<svg viewBox="0 0 400 300" aria-hidden="true"><rect width="400" height="300" class="st-bg"/>'
    '<rect x="30" y="60" width="150" height="180" rx="12" class="st-zone"/><rect x="220" y="60" width="150" height="180" rx="12" class="st-zone"/>'
    '<text x="105" y="88" text-anchor="middle" class="st-label">IT</text><text x="295" y="88" text-anchor="middle" class="st-label">OT</text>'
    '<path d="M180 150h40" class="st-flow"/><rect x="190" y="136" width="20" height="28" rx="4" class="st-fw"/>'
    '<rect x="60" y="120" width="90" height="60" rx="6" class="st-dev"/><path d="M72 140h50M72 156h36" class="st-ink"/>'
    '<rect x="250" y="150" width="90" height="56" rx="6" class="st-dev"/><circle cx="270" cy="178" r="10" class="st-knob"/><path d="M290 170h36M290 186h26" class="st-ink"/>'
    '<path d="M295 104l20 8v14c0 12-9 20-20 24-11-4-20-12-20-24v-14z" class="st-shield"/><path d="M286 124l7 7 12-13" class="st-tick"/>'
    '<text x="200" y="280" text-anchor="middle" class="st-label">RUNS SAFELY</text></svg>',
]

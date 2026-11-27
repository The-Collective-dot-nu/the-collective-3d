
  /* ================================================================
     STORY: one scene per scroll, swipe or arrow key. Each stop sets the camera, the text, the panel and what stays lit.
     Some frames play a short sequence by themselves; Next (or a scroll) jumps past it.
     ================================================================ */
  const $ = s => document.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  const box = o => new THREE.Box3().setFromObject(o);
  function frame(b, from, fov, k = 1, lift = 0) {   // look at a box from a direction, close enough to fill the view
    const c = b.getCenter(V(0, 0, 0)), r = b.getSize(V(0, 0, 0)).length() / 2; c.y += lift;
    const d = r / Math.sin(THREE.MathUtils.degToRad(fov / 2)) * k;
    return { pos: c.clone().add(from.clone().normalize().multiplyScalar(d)), target: c, fov };
  }
  const K = (pos, target, fov = 40) => ({ pos: V(...pos), target: V(...target), fov });
  const abovePanel = (c, panelH, fit = 0.426) => {   // phones: the framed subject moves into the middle of the free space above a panel (header 80 px, panel bottom 92 px up), pulled back when that space is
    // smaller than fit (its share of the screen the framing was made for)
    const H = innerHeight, free = Math.max(120, H - 92 - panelH - 80), k = Math.max(0.87, fit * H / free), tanHalf = Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) / Math.min(1, innerWidth / H / 1.2);   // with the portrait zoom (see resize)
    c.pos.sub(c.target).multiplyScalar(k).add(c.target);
    const a = Math.atan((H / 2 - (80 + free / 2)) / (H / 2) * tanHalf), dir = c.target.clone().sub(c.pos), right = dir.clone().cross(V(0, 1, 0)).normalize();
    c.target.copy(c.pos).add(dir.applyAxisAngle(right, -a)); return c; };   // an exact tilt: the subject, on the axis before, ends up a above it
  const sec = n => orkest.getObjectByName(n);
  const player = n => orkest.getObjectByName("Muzikant · " + n);
  const orchBox = box(orkest), standBox = box(lessen), boardBox = box(bord), condBox = box(dir);
  const nextBox = box(bord2).union(box(rep));
  const nextFront = V(Math.sin(NEXT.board.rotY), 0.0, Math.cos(NEXT.board.rotY));

  /* ---------- the two melody lines (value streams), each through four players in different sections ---------- */
  const MELODY = [
    { rgb: "241, 64, 11", players: ["Viool 1", "Fluit 1", "Hoorn 1", "Cello 1"] },          // vermilion (--palette-vermilion)
    { rgb: "252, 232, 216", players: ["Klarinet 1", "Altviool 1", "Trompet 1", "Contrabas 1"] },  // cream (--palette-cream): the panel palette, as the coloured lines in "It isn't"
  ];
  MELODY.forEach(L => { L.anchors = L.players.map(n => { const m = player(n); const p = m.getWorldPosition(V(0, 0, 0)); p.y += 1.18; return p; }); L.draw = 0; });
  const LINE1 = new Set(MELODY[0].players), LINE2 = new Set(MELODY[1].players);

  /* ---------- the box office: only seen in the Means frame ---------- */
  const kassa = group("Kassa", root); kassa.userData.booth = true;
  { const p = new Part("Kassa");
    p.add(new THREE.BoxGeometry(1.7, 2.1, 1.3), "stage", M(0, 1.05, 0));
    p.add(new THREE.BoxGeometry(2.0, 0.12, 1.6), "tier", M(0, 2.16, 0.08));
    p.add(new THREE.BoxGeometry(1.1, 0.7, 0.02), "frameAud", M(0, 1.35, 0.66));
    p.add(new THREE.BoxGeometry(1.25, 0.06, 0.32), "tier", M(0, 0.98, 0.78));
    p.build(kassa, true);
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128; const x = cv.getContext("2d");
    x.fillStyle = CARD; x.fillRect(0, 0, 512, 128); x.strokeStyle = INK; x.lineWidth = 4; x.strokeRect(10, 10, 492, 108);   // white card and dark ink, like the programme board
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding;
    const draw = () => { x.fillStyle = CARD; x.fillRect(14, 14, 484, 100);
      x.fillStyle = INK; x.font = "700 64px 'Barlow Condensed', 'DIN Condensed', 'Arial Narrow', sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("BOX OFFICE", 256, 68); t.needsUpdate = true; };   // the same sans as the programme board
    draw(); document.fonts && document.fonts.load("700 64px 'Barlow Condensed'").then(draw, () => {});
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.375), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, emissive: 0x3a2014, emissiveIntensity: 0.3 }));
    sign.position.set(0, 2.5, 0.75); kassa.add(sign);
    const KX = 11.5, KZ = 45.5; kassa.position.set(KX, terrainH(KX, KZ), KZ); kassa.rotation.y = -0.75;
    kassa.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); }
  const kassaBox = box(kassa);
  { // a small clearing in the field around the booth: stalks thin out toward it
    const KC = new THREE.Vector3(), mm = new THREE.Matrix4(), pp = new THREE.Vector3(), qq = new THREE.Quaternion(), ss = new THREE.Vector3(); kassa.getWorldPosition(KC);
    scene.traverse(o => { if (!o.isInstancedMesh || !/^(Graanhalmen|Gras)$/.test(o.name)) return;
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, mm); mm.decompose(pp, qq, ss); const d = Math.hypot(pp.x - KC.x, pp.z - KC.z);
        if (d < 4.2) { ss.multiplyScalar(d < 2.6 ? 0 : (d - 2.6) / 1.6); mm.compose(pp, qq, ss); o.setMatrixAt(i, mm); } }
      o.instanceMatrix.needsUpdate = true; }); }

  /* ---------- the stops ---------- */
  const BOWL = orchBox.clone().union(nextBox);
  const NARROW = innerWidth <= 720;
  const shiftCam = (c, kx, ky) => { const f = c.target.clone().sub(c.pos), d = f.length(); f.normalize();   // slide the view so the text has room
    const r = f.clone().cross(V(0, 1, 0)).normalize(), u = r.clone().cross(f).normalize(), off = r.multiplyScalar(kx * d).add(u.multiplyScalar(ky * d));
    return { pos: c.pos.clone().add(off), target: c.target.clone().add(off), fov: c.fov }; };
  const sideOrUp = c => NARROW ? shiftCam(c, 0.04, -0.3) : shiftCam(c, 0, -0.27);
  const CAMC = sideOrUp(frame(BOWL, V(0.1, 0.75, 1), 40, NARROW ? 0.9 : 0.75, -1));            // high over the bowl: both stages
  const SECT = ["Strijkers", "Houtblazers", "Koper", "Slagwerk"];
  const CAM2 = NARROW ? frame(orchBox, V(0, 0.62, 1), 40, 0.84) : K([0, 3.2, 25], [0, 2.4, -4], 38);   // the closer view of frame 2, reused by Blueprint, Means and the dimensions; phones look down a little more, so the orchestra fills the width instead of a thin strip
  const oneByOne = (t, s, t0 = 0.6, step = 0.8) => { const i = Math.floor((s - t0) / step); return t.env || t.conductor || i < 0 || i > 3 || t.section === SECT[i] || (i === 0 && (t.section === "Harp" || t.section === "Piano")); };   // the whole orchestra first, then section by section (harp and piano with the strings), then all again: never the conductor alone
  const condStandBox = box(lessen.getObjectByName("Dirigent (partituur)"));
  const FW_STEP = 2;   // the framework builds up one part every FW_STEP s (frame 3): each part first big with its name in the middle, then it flies to its place (Kai, option C)
  const LINE_HOLD = 2.4, TW_DUR = 0.3;   // "It isn't": one line per step and one thing happening with it, each held LINE_HOLD seconds (Kai: calmer, one thing per sentence)
  const SECTION_STEP = 0.8;   // "Different roles": a section every SECTION_STEP seconds (oneByOne)
  const STOPS = [
    { id: "open", name: "The concert", ch: 0, cam: NARROW ? K([0, 5.5, 90], [0, 7.0, -20], 6.8) : K([0, 3.2, 90], [0, 5.95, -20], 11.2), beats: ["opening"] },   // a long lens from far back: flat stage, high rim, big hills; phones zoom in further, the orchestra a little wider than the screen and low in it
    // Frame 2: It isn't. Roles, skills, views, one performance
    { id: "t1", name: "The complexity", ch: 0, seq: "twist", bar: 0, hold: LINE_HOLD, dur: 0.5, cam: CAM2, beats: ["twist"], lines: 0, fadeLate: 1 },   // one thing per line: "It isn't." alone, the whole orchestra, once the camera has arrived
    { id: "t2", ch: 0, seq: "twist", bar: 1, hold: 4 * SECTION_STEP + 0.6, dur: TW_DUR, cam: CAM2, beats: ["twist"], lines: 1, focus: (t, s) => oneByOne(t, s, 0.3, SECTION_STEP) },   // Different roles: the sections one by one
    { id: "t3", ch: 0, seq: "twist", bar: 2, hold: LINE_HOLD, dur: TW_DUR, cam: CAM2, beats: ["twist"], lines: 2, glow: 1 },   // Different capabilities: the instruments glow
    { id: "t4", ch: 0, seq: "twist", bar: 3, hold: LINE_HOLD + 0.4, dur: TW_DUR, cam: CAM2, beats: ["twist"], lines: 3, glow: 1, chaos: 1 },   // Different perspectives: the loose coloured lines
    { id: "t6", ch: 0, seq: "twist", bar: 4, hold: LINE_HOLD, dur: TW_DUR, cam: CAM2, beats: ["twist"], lines: 4 },   // One performance: all together again, the lines gone
    { id: "t5", ch: 0, seq: "twist", bar: 5, hold: 5.4, dur: 1.6, cam: frame(box(sec("Koper")).union(condBox), V(0.05, 0.42, 1), 30, innerWidth <= 720 ? 0.6 : 0.62, 0.3), beats: ["off"], off: 1 },
    // Frame 3: the framework, built up over the concert
    { id: "f0", name: "The framework", ch: 1, seq: "fw", bar: 0, hold: FW_STEP, cam: K([0, 27, 25], [0, 0, -1.5], 40), beats: ["fw"], fw: "big", show: "", shade: 0.3 },   // one part every FW_STEP seconds
    { id: "f1", ch: 1, seq: "fw", bar: 1, hold: FW_STEP, dur: 0.15, cam: K([0, 27, 25], [0, 0, -1.5], 40), beats: ["fw"], fw: "big", show: "p", shade: 0.3 },
    { id: "f2", ch: 1, seq: "fw", bar: 1, hold: FW_STEP, dur: 0.15, cam: K([0, 27, 25], [0, 0, -1.5], 40), beats: ["fw"], fw: "big", show: "pb", shade: 0.3 },
    { id: "f3", ch: 1, seq: "fw", bar: 1, hold: FW_STEP, dur: 0.15, cam: K([0, 27, 25], [0, 0, -1.5], 40), beats: ["fw"], fw: "big", show: "pbm", shade: 0.3 },
    { id: "f4", ch: 1, seq: "fw", bar: 2, hold: FW_STEP, dur: 0.15, cam: K([0, 27, 25], [0, 0, -1.5], 40), beats: ["fw"], fw: "big", show: "pbmo", shade: 0.3 },
    { id: "f5", ch: 1, seq: "fw", bar: 2, hold: FW_STEP, dur: 0.15, cam: K([0, 27, 25], [0, 0, -1.5], 40), beats: ["fw"], fw: "big", show: "pbmor", shade: 0.3 },
    { id: "f6", ch: 1, seq: "fw", bar: 3, hold: 2.8, dur: 0.15, cam: K([0, 27, 25], [0, 0, -1.5], 40), beats: ["fw"], fw: "big", show: "pbmorc", shade: 0.3 },
    // Frame 4: Plan
    { id: "plan", name: "Plan", ch: 2, cam: NARROW ? abovePanel(frame(boardBox, V(0.62, 0.2, 1), 40, 1.25, 0.2), 155, 0.6) : frame(boardBox, V(0.62, 0.2, 1), 40, 1.9, 0.2), panel: "plan" },   // phones: close on the board, above the panel
    // Frame 5: Blueprint
    { id: "b1", more: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.", name: "Blueprint", ch: 3, seq: "bp", bar: 0, hold: 2.2, cam: CAM2, panel: "blueprint", focus: t => t.stand || t.env, caption: "The score on every stand" },
    { id: "b2", more: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.", ch: 3, seq: "bp", bar: 1, fadeLate: 1, hold: 2.8, dur: 1.8, cam: frame(condStandBox, V(0, 0.9, 0.55), 34, 1.15), panel: "blueprint", focus: t => t.env || t.condStand, caption: "The conductor’s score" },
    { id: "b3", more: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla.", ch: 3, seq: "bp", bar: 2, hold: 2.6, dur: 1.8, cam: frame(orchBox, V(0, 0.75, 1), 42, 0.74), panel: "blueprint", line: 1, fallen: 0.16, focus: t => t.env || t.stand || LINE1.has(t.player), caption: "One melody, many hands" },
    { id: "b4", more: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit.", ch: 3, seq: "bp", bar: 3, hold: 3.0, cam: frame(orchBox, V(0.06, 0.72, 1), 42, 0.72), panel: "blueprint", line: 2, fallen: 0.16, focus: t => t.env || t.stand || LINE1.has(t.player) || LINE2.has(t.player), caption: "Two melodies, eight specialists, four sections" },
    // Frame 6: Means
    { id: "m1", more: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.", name: "Means", ch: 4, seq: "means", bar: 0, hold: 3.6, cam: CAM2, panel: "means", focus: (t, s) => oneByOne(t, s, 0.4, 0.8), caption: "Four sections, many specialists" },
    { id: "m2", more: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.", ch: 4, seq: "means", bar: 1, hold: 2.6, dur: 0.5, cam: CAM2, panel: "means", glow: 1, caption: "Their instruments" },
    { id: "m3", more: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla.", ch: 4, seq: "means", bar: 2, hold: 3.0, dur: 2.2, cam: frame(kassaBox, V(-0.55, 0.32, 1), 38, 1.7), panel: "means", booth: 1, caption: "And the budget that keeps them playing" },
    // Frame 7: Orchestration
    { id: "orch", name: "Orchestration", ch: 5, cam: frame(condBox, V(0.1, 0.22, 1), 34, 1.7, 0.1), panel: "orchestration", focus: t => t.env || t.conductor || (t.stand && t.condStand) },
    // Frame 8: the two dimensions
    { id: "d1", name: "Run and Change", ch: 6, seq: "dims", bar: 0, hold: 3.4, dur: 2.2, cam: CAM2, panel: "dims" },
    { id: "d2", ch: 6, seq: "dims", bar: 1, hold: 3.0, dur: 2.6, cam: NARROW ? abovePanel(frame(nextBox, nextFront.clone().add(V(0.6, 0.55, 0.5)), 40, 1.15), 310) : frame(nextBox, nextFront.clone().add(V(0.6, 0.55, 0.5)), 40, 1.35), panel: "dims", late: 1 },
    // Frame 9 and 10: your organisation
    { id: "question", name: "Your organisation", ch: 7, cam: NARROW ? K([0, 2.2, 46], [0, 2.2, -3], 28) : K([0, 1.7, 45.5], [0, 3.0, -3], 46), beats: ["question"], shade: 0.25, fore: 1 },
    { id: "problems", name: "The problems", ch: 7, cam: NARROW ? K([0, 13, 33], [0, -16, -3]) : K([0, 24, 46], [0, 12.5, -3]), problems: true, shade: 0.72, fw: "side", show: "pbmorc" },   // the list on dark ground: the stage below it (desktop) or up behind the framework (phones)
    // Part 4: The Collective. The camera rises over the bowl: tonight's concert and next season's rehearsal in one view
    { id: "c0", name: "The Collective", ch: 8, cam: CAMC, coll: 1, shade: 0.45 },
  ];
  const STORY = { goTo: "Go to", next: "Next" };   // the segment and button labels
  const N = STOPS.length, idx = id => STOPS.findIndex(s => s.id === id);
  const SEQS = {};
  STOPS.forEach((s, i) => { if (!s.seq) return; const q = SEQS[s.seq] || (SEQS[s.seq] = { first: i, last: i, bars: [] }); q.last = i;
    q.bars[s.bar] = (q.bars[s.bar] || 0) + (s.dur || 1.2) + (s.hold || 0); });
  const SEGS = [];   // the timeline: one segment per scroll step, a stop on its own or a whole sequence
  STOPS.forEach((s, i) => { if (!s.seq || SEQS[s.seq].first === i) SEGS.push({ first: i, last: s.seq ? SEQS[s.seq].last : i }); });
  const segOf = i => SEGS.findIndex(g => i >= g.first && i <= g.last), nameAt = i => { while (!STOPS[i].name) i--; return STOPS[i].name; };

  /* ---------- focus: tag every mesh by what it belongs to, then fade what is not in the scene's focus ---------- */
  const meshes = []; let selected = null;   // the people loader adds its meshes here
  const FALLEN = 0.05;
  function tagsOf(o) {
    const t = {};
    for (let n = o; n; n = n.parent) {
      if (n === lessen) t.stand = true;
      if (n.name === "Dirigent (partituur)") t.condStand = true;
      if (n === dir) t.conductor = t.person = true;
      if (n === pub) t.audience = true;
      if (n === omg || n === pod || n === CHG || n === bord) t.env = true;
      if (n.name === "Lichaam" || n.name === "Persoon") t.person = true;
      if (n.name === "Instrument") t.instrument = true;
      if (n.name === "Stoel") t.chair = true;
      if (n.name === "Eerste violen") t.firstViolins = true;
      if (/^Muzikant · /.test(n.name)) t.player = n.name.slice(11);
      if (n.parent === orkest) t.section = n.name;
      if (n === kassa) t.booth = true;
      if (n === bord) t.board = true;
      if (n.name === "Graan") t.grass = true;
    }
    return t;
  }
  scene.traverse(o => { if (o.isMesh && o !== skyMesh) { meshes.push(o); o.material.transparent = true; } });

  /* ---------- shadows: the sun's shadow map is redrawn only when something that casts a shadow changes ---------- */
  // What changes it: a caster appearing or disappearing (fades), the people arriving, the brass turning in t5, and the live conductor, who moves all
  // the time: while he does, the whole map is redrawn SHADOW_RATE times per second (his shadow is at most 1/15 s late, not visible; Kai's choice "a").
  // The shadow camera is fixed (the sun's 150 m box does not follow the view), so camera moves need no redraw.
  const SHADOW_RATE = 15;
  renderer.shadowMap.autoUpdate = false;
  const shadows = { dirty: true, last: -1, count: 0 };
  function shadowTick(now) {
    if (meshes.length !== shadows.count) { shadows.count = meshes.length; shadows.dirty = true; }   // the people arrived
    const live = typeof conductor !== "undefined" && conductor && conductor.attached && !reduceMQ.matches;
    if (live && now - shadows.last >= 1 / SHADOW_RATE - 1e-3) shadows.dirty = true;
    if (shadows.dirty) { renderer.shadowMap.needsUpdate = true; shadows.dirty = false; shadows.last = now; }
  }
  const AUDIENCE_FROM = STOPS.findIndex(s => s.id === "question");   // the audience is there from "So, how does your organisation sound?" on
  const litOf = (s, t, since) => (t.grass || t.board) && s.id === "open" || t.audience && STOPS.indexOf(s) < AUDIENCE_FROM ? -FALLEN / (1 - FALLEN) : t.booth ? (s.booth ? 1 : -FALLEN / (1 - FALLEN)) : s.booth ? (t.env || t.audience ? 1 : 0.6) : !s.focus ? 1 : s.focus(t, since) ? 1 : (s.fallen || 0) / (1 - FALLEN);

  /* ---------- elements ---------- */
  const stage = $("#stage"), fx = $("#fx"), fctx = fx.getContext("2d");
  const beats = {}; document.querySelectorAll("[data-beat]").forEach(el => (beats[el.dataset.beat] = el));
  const panels = {}; document.querySelectorAll("[data-panel]").forEach(el => (panels[el.dataset.panel] = el));
  const caption = $("#caption"), capText = $("#captionText");
  const shade = $("#shade"), fore = $("#fore"), problems = $("#problems");
  let scrollRest = 0; const setProblemsScroll = () => { document.documentElement.style.setProperty("--problems-scroll", problems.scrollTop + "px");   // phones: the framework above the list scrolls along
    fwEl.classList.add("is-scrolling"); clearTimeout(scrollRest); scrollRest = setTimeout(() => fwEl.classList.remove("is-scrolling"), 150); };
  problems.addEventListener("scroll", setProblemsScroll, { passive: true });
  const tlNav = $("[data-timeline]"), tlBar = $("[data-timeline-bar]"), tlLabel = $("[data-timeline-label]"), tlSkip = $("[data-timeline-skip]"), tlPrev = $("[data-timeline-prev]"), tlPlay = $("[data-timeline-play]");
  const collEl = $("#coll"), meetBtn = $("#meet");
  const fwGlass = $("[data-fw-glass]");
  // "It isn't": each step shows one more line (S.lines), and one thing happens with it (t1-t6)
  const showLines = S => { const n = S.lines ?? 4; lineEls.forEach(li => li.classList.toggle("is-shown", +li.dataset.line <= n)); };
  const lineEls = [...document.querySelectorAll("[data-line]")], dimsLate = $("#dimsLate"), fwEl = $("#fw");
  { // the framework figure, B2: floating rounded bands inside a circle, two columns, the Orchestration ring with its arrow
    const CX = 320, CY = 262, R = 192;   // all colours and the text sizes come from styles.css (.fw .part, .fw .ring, .fw .arc, .fw .sub): the parts look like the panels
    const pill = (x, y, w, h) => `<rect class="part" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(Math.min(w, h) / 2).toFixed(1)}"/>`;
    const band = (d, k, l, sub) => { const hw = Math.sqrt(R * R - (Math.abs(d) + 32) ** 2);
      return `<g class="k" data-k="${k}">${pill(CX - hw, CY + d - 30, 2 * hw, 60)}<text class="lab band" x="${(CX - hw + 26).toFixed(1)}" y="${CY + d - 6}">${l.toUpperCase()}</text><text class="sub" x="${(CX - hw + 26).toFixed(1)}" y="${CY + d + 12}">${sub}</text></g>`; };   // label and sub centred in the band as a block
    const SPAN = 104 + 30;   // Run and Change reach from the top of Plan to the bottom of Means, so their labels line up
    const col = (dx, k, l) => { const hh = SPAN;
      return `<g class="k" data-k="${k}">${pill(CX + dx - 28, CY - hh, 56, 2 * hh)}<text class="lab" x="${CX + dx}" y="${(CY - hh - 10).toFixed(1)}" text-anchor="middle">${l.toUpperCase()}</text></g>`; };   // RUN and CHANGE only: no text down the columns (Kai tried the sub up the column, 27 Nov: no)
    const RO = 228, a = 0.2;   // the arrow ends just before its start: almost a full circle
    fwEl.innerHTML = `<defs><marker id="fwArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="tip" d="M0 0L10 5L0 10z"/></marker></defs>
      <circle class="ring" cx="${CX}" cy="${CY}" r="205"/>`
      + band(-104, "p", "Plan", "the piece") + band(0, "b", "Blueprint", "the score") + band(104, "m", "Means", "the orchestra") + col(40, "r", "Run") + col(110, "c", "Change")
      + `<g class="k" data-k="o"><path d="M ${CX} ${CY - RO} A ${RO} ${RO} 0 1 1 ${(CX - RO * Math.sin(a)).toFixed(1)} ${(CY - RO * Math.cos(a)).toFixed(1)}" class="arc" pathLength="1" marker-end="url(#fwArrow)"/>
        <text class="lab lab--big" x="${CX}" y="${CY + RO + 30}" text-anchor="middle">ORCHESTRATION</text><text class="sub" x="${CX}" y="${CY + RO + 50}" text-anchor="middle">the conductor</text></g>`;
  }
  { // the Orchestration arrow: the line draws itself clockwise and its head rides on the drawn end, so the head appears and moves with the line.
    // Once elsewhere; on the framework frame it loops: drawn, held, then the tail runs after the head until both are gone, and again.
    // The head is a separate path, set up on first use.
    const g = fwEl.querySelector('[data-k="o"]'), arc = g.querySelector(".arc"), ARC = { draw: 0.9, loop: 4.2, drawn: 0.4, hold: 0.65 };
    let tip = null, L = 0, mode = "off", t0 = 0, idle = false;
    const show = (tail, head) => { const a = Math.max(0, head - tail);
      arc.style.strokeDasharray = (a * L).toFixed(2) + " " + (2 * L).toFixed(2); arc.style.strokeDashoffset = (-tail * L).toFixed(2);
      if (a < 0.002) { tip.style.opacity = "0"; return; }
      const p = arc.getPointAtLength(head * L), q = arc.getPointAtLength(Math.max(0, head * L - 2));
      tip.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${(Math.atan2(p.y - q.y, p.x - q.x) * 180 / Math.PI).toFixed(1)})`);
      tip.style.opacity = Math.min(1, a / 0.05).toFixed(3); };   // a tiny arrow fades rather than pops
    var arcTick = now => {
      if (!tip || (mode === "off" && idle)) return;
      if (mode === "off") { show(0, 0); idle = true; return; } idle = false;
      if (reduceMQ.matches) return show(0, 1);
      if (mode === "once") return show(0, smoother(clamp((now - t0) / ARC.draw, 0, 1)));
      const u = ((now - t0) % ARC.loop) / ARC.loop;
      if (u < ARC.drawn) show(0, smoother(u / ARC.drawn)); else if (u < ARC.hold) show(0, 1); else show(smoother((u - ARC.hold) / (1 - ARC.hold)), 1);
    };
    var drawArc = (on, loop) => {
      if (!tip) { arc.removeAttribute("marker-end"); arc.removeAttribute("pathLength"); L = arc.getTotalLength();
        tip = document.createElementNS("http://www.w3.org/2000/svg", "path"); tip.setAttribute("class", "tip"); tip.setAttribute("d", "M-6 -5.5L6 0L-6 5.5z"); g.appendChild(tip); }
      const now = clock.getElapsedTime(), next = !on ? "off" : loop && !reduceMQ.matches ? "loop" : "once";
      if (next === mode) return;
      if (next === "loop") t0 = mode === "once" ? now - ARC.loop * ARC.drawn : now;   // already drawn: go on from the drawn state
      else if (next === "once") t0 = mode === "loop" ? -1e9 : now;
      mode = next; idle = false; g.classList.toggle("is-shown", on); arcTick(now);
    };
  }
  let vw = 0, vh = 0, dpr = 1;
  const toScreen = v => { const q = v.clone().project(camera); return [(q.x + 1) / 2 * vw, (1 - q.y) / 2 * vh, q.z < 1]; };

  /* ---------- moving between stops ---------- */
  const clock = new THREE.Clock();
  let at = 0, from = 0, fromSince = 0, anim = null, arrived = 0, started = 0, paused = false, held = false, preview = -1, barStart = 0, curBar = -1, curSeg = -1;   // held: the visitor pressed pause
  const camNow = () => ({ pos: camera.position.clone(), target: camTarget.clone(), fov: camera.fov });
  const camTarget = STOPS[0].cam.target.clone();
  const sameCam = (a, b) => a.pos.equals(b.pos) && a.target.equals(b.target) && a.fov === b.fov;
  // The audience loads after the opening has started. A visitor who jumps straight to a stop that shows it before it is in waits there a moment:
  // the camera leaves once the audience has arrived (it then fades in during the move), or after AUDIENCE_WAIT seconds if it cannot load.
  const AUDIENCE_WAIT = 8, pubBox = box(pub), seeCam = new THREE.PerspectiveCamera(), seeFrustum = new THREE.Frustum(), seeM = new THREE.Matrix4();
  let waitGo = null;
  const grassBox = new THREE.Box3(); { const M4 = new THREE.Matrix4(), P = V(0, 0, 0);   // the grain field's extent, from its instances (Box3 ignores instances)
    graan.updateMatrixWorld(true); graan.traverse(o => { if (!o.isInstancedMesh) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const top = o.geometry.boundingBox.max.y;
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M4); M4.premultiply(o.matrixWorld); P.setFromMatrixPosition(M4); grassBox.expandByPoint(P); grassBox.expandByPoint(P.clone().setY(P.y + top * 1.5)); } }); }
  function showsAudience(S) {
    if (litOf(S, { audience: true }, 99) < 0.5) return false;   // hidden or faded there
    Object.assign(seeCam, { fov: S.cam.fov, aspect: camera.aspect, zoom: camera.zoom, near: camera.near, far: camera.far }); seeCam.position.copy(S.cam.pos); seeCam.lookAt(S.cam.target);
    seeCam.updateMatrixWorld(); seeCam.updateProjectionMatrix(); seeFrustum.setFromProjectionMatrix(seeM.multiplyMatrices(seeCam.projectionMatrix, seeCam.matrixWorldInverse));
    return seeFrustum.intersectsBox(pubBox);
  }
  function goTo(i, instant) {
    i = clamp(i, 0, N - 1); if (i === at && !anim) return;
    if (!window.__audience && clock.getElapsedTime() - (waitGo ? waitGo.since : clock.getElapsedTime()) < AUDIENCE_WAIT && showsAudience(STOPS[i])) {
      waitGo = { i, instant, since: waitGo ? waitGo.since : clock.getElapsedTime() }; return; }   // the latest wish wins; see frameLoop
    waitGo = null;
    if (held && segOf(i) !== segOf(at)) setHeld(false);   // a new part plays again
    const now = clock.getElapsedTime(), S = STOPS[i], P = STOPS[at];
    if (anim && !instant && sameCam(S.cam, STOPS[anim.to].cam)) {   // same view as where the camera is heading: let that move run on
      anim.to = i; at = i; started = now;
      if (S.seq && S.bar !== curBar) { curBar = S.bar; barStart = now; }
      applyStop(S); return;
    }
    const inSeq = S.seq && P.seq === S.seq && i === at + 1;
    const dist = camera.position.distanceTo(S.cam.pos);
    const dur = reduceMQ.matches || instant ? 0 : inSeq ? (S.dur || 1.2) : clamp(1.1 + dist * 0.022, 1.2, 2.8);
    if (!anim) fromSince = now - arrived;   // how far the stop being left had got: its timed focus holds there during the move
    from = anim ? (anim.k > 0.5 ? anim.to : from) : at;
    anim = { start: camNow(), to: i, t0: now, dur, k: 0 }; at = i; started = now;
    if (!dur) { anim.k = 1; }
    if (S.seq && S.bar !== curBar) { curBar = S.bar; barStart = now; }
    if (!S.seq) curBar = -1;
    applyStop(S);
  }
  function applyStop(S) {
    for (const k in beats) beats[k].classList.toggle("is-on", (S.beats || []).includes(k));
    for (const k in panels) panels[k].classList.toggle("is-on", S.panel === k);
    caption.classList.toggle("is-on", !!S.caption);
    if (S.caption) capText.textContent = S.caption;
    problems.classList.toggle("is-on", !!S.problems); if (!S.problems && problems.scrollTop) { problems.scrollTop = 0; setProblemsScroll(); } if (!S.problems) { closeDoor(); closeDrawers(); }
    showLines(S);
    dimsLate.classList.toggle("is-late", !!S.late); $("#dimsOrgC").classList.toggle("is-late", !!S.late);
    fwEl.classList.toggle("is-on", !!S.fw); fwEl.classList.toggle("is-side", S.fw === "side"); fwEl.classList.toggle("is-coll", S.fw === "coll");
    if (!S.coll) meetFrom = null;   // leaving the About page in any way forgets where the button was pressed
    collEl.classList.toggle("is-on", !!S.coll); collEl.classList.toggle("is-overlay", !!S.coll && meetFrom !== null);   // opened with the button: a page over the story, with a cross
    meetBtn.classList.toggle("is-hidden", !!S.coll);
    const fresh = S.fw === "big" && !reduceMQ.matches ? [...(S.show || "")].filter(k => !fwShown.has(k)) : [];
    flyClear(); fwShown = new Set(S.fw ? S.show || "" : "");
    fwEl.querySelectorAll(".k").forEach(g => { const k = g.dataset.k, on = (S.show || "").includes(k);
      if (on && fresh.length === 1 && fresh[0] === k) { g.style.opacity = 0; if (k === "o") drawArc(false); flyIn(g, () => { g.style.opacity = 1; if (k === "o") drawArc(true, true); }); return; }   // one new part: its name first, big
      g.style.opacity = on ? 1 : 0; if (k === "o") drawArc(!!S.fw && on, S.fw === "big"); });
    shade.style.opacity = S.shade || 0; fore.classList.toggle("is-on", !!S.fore);
    const n = segOf(at), lastSeg = n === SEGS.length - 1;
    segBtns.forEach((b, k) => { b.setAttribute("aria-current", k === n ? "step" : "false"); b.tabIndex = k === n ? 0 : -1; segFills[k].style.transform = `scaleX(${k < n ? 1 : 0})`; });
    if (tlBar.contains(document.activeElement) && document.activeElement !== segBtns[n]) segBtns[n].focus({ preventScroll: true });   // focus follows only if it is already in the bar
    segFills[n].parentNode.appendChild(tlDot);
    if (preview < 0) showSeg(nameAt(at), n);
    tlSkip.setAttribute("aria-disabled", lastSeg); tlPrev.setAttribute("aria-disabled", n === 0 && at === 0);   // Next everywhere but the last part, Previous everywhere but the opening
    tlPlay.setAttribute("aria-disabled", !S.seq);   // pause only means something in a part that plays by itself
    if (n !== curSeg) { curSeg = n; wake(3200); }   // every new part shows the bar for a moment
    panelSteps(S); music.sync(STOPS.indexOf(S));
  }
  /* ---------- the story panels: a small framework on top (where we are), and in a part that plays by itself one more text per step, with a bar per step ---------- */
  const PANEL_PART = { plan: "p", blueprint: "b", means: "m", orchestration: "o", dims: "rc" }, PART_ORDER = ["plan", "blueprint", "means", "orchestration", "dims"];
  // the compass in the cards (Kai): the framework small on top of each story panel, without words; the panel's own part bright, the parts told before half lit
  { const fig = fwEl.innerHTML.replace(/<defs>[\s\S]*?<\/defs>/, "").replace(/<text[\s\S]*?<\/text>/g, "").replace(/ marker-end="[^"]*"/, "").replace(/ pathLength="1"/, ""), end = fig.lastIndexOf("</g>");   // the same figure without its words; the arrow's head drawn fixed
    PART_ORDER.forEach((part, here) => { const panel = $(`[data-panel="${part}"]`); if (!panel) return;
      const c = document.createElement("div"); c.className = "compass"; c.setAttribute("aria-hidden", "true");
      c.innerHTML = `<svg viewBox="0 0 640 560">${fig.slice(0, end)}<path class="tip" d="M-9 -8L9 0L-9 8z" transform="translate(274.7 38.6) rotate(-11)"/>${fig.slice(end)}</svg>`;
      c.querySelectorAll(".k").forEach(g => { const pos = PART_ORDER.findIndex(q => PANEL_PART[q].includes(g.dataset.k)); g.setAttribute("class", "k " + (pos === here ? "is-now" : pos < here ? "is-seen" : "is-later")); });
      panel.prepend(c); }); }
  for (const k in panels) { const P = panels[k];
    const more = document.createElement("div"); more.className = "panel__more"; more.dataset.panelMore = "";
    const steps = document.createElement("div"); steps.className = "panel__steps"; steps.dataset.panelSteps = "";
    const org = P.querySelector(".panel__org"); org ? org.before(more) : P.append(more); P.append(steps); }
  let stepFills = [];
  function panelSteps(S) {
    const q = S.seq && S.panel && SEQS[S.seq]; if (!S.panel) return;
    const P = panels[S.panel], more = P.querySelector("[data-panel-more]"), steps = P.querySelector("[data-panel-steps]");
    if (!q) { more.innerHTML = steps.innerHTML = ""; steps.dataset.seq = ""; stepFills = []; return; }
    if (steps.dataset.seq !== S.seq) { steps.dataset.seq = S.seq; more.innerHTML = "";
      steps.innerHTML = q.bars.map((_, b) => `<button class="panel__step" type="button" data-step="${b}" aria-label="Step ${b + 1}"><span><i></i></span></button>`).join("");
      steps.querySelectorAll("[data-step]").forEach(b => b.addEventListener("click", () => { const j = STOPS.findIndex((T, j) => j >= q.first && j <= q.last && T.bar === +b.dataset.step); if (j >= 0) goTo(j); })); }   // back (or on) to that step
    stepFills = [...steps.querySelectorAll("i")];
    for (let j = q.first; j <= q.last; j++) { const T = STOPS[j]; if (!T.more) continue; let el = more.querySelector(`[data-j="${j}"]`);
      if (j <= at && !el) { el = document.createElement("div"); el.className = "panel__more-text"; el.dataset.j = j; el.innerHTML = `<p>${T.more}</p>`; more.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-in"))); }   // the newest text comes last, after the camera and the caption
      else if (j > at && el) el.remove(); }
  }
  /* ---------- framework build-up: a new part's name appears big in the middle of the figure, then shrinks into its place and the part appears ---------- */
  let fwShown = new Set(), flyTimers = [];
  const FLY_NAME = { p: ["Plan", "the piece"], b: ["Blueprint", "the score"], m: ["Means", "the orchestra"], o: ["Orchestration", "the conductor"], r: ["Run", "tonight's concert"], c: ["Change", "next season's symphony"] };
  function flyClear() { flyTimers.forEach(clearTimeout); flyTimers = []; fwEl.querySelectorAll(".fly").forEach(f => f.remove()); fwEl.classList.remove("is-flying"); }
  function flyIn(g, done) {
    const [name, sub] = FLY_NAME[g.dataset.k], f = document.createElementNS("http://www.w3.org/2000/svg", "g"); f.setAttribute("class", "fly");
    f.innerHTML = `<text class="fly__name" x="320" y="262" text-anchor="middle">${name}</text><text class="fly__sub" x="320" y="300" text-anchor="middle">${sub}</text>`;
    fwEl.appendChild(f); fwEl.classList.add("is-flying");   // the rest dims and blurs while the name stands big (Kai: option C)
    const lab = g.querySelector(".lab"), t = lab.getBBox(), c = f.getBBox(), k = t.height / (c.height * 0.55);   // land on the part's own label
    const dx = t.x + t.width / 2 - 320, dy = t.y + t.height / 2 - 270;
    requestAnimationFrame(() => f.classList.add("is-in"));
    flyTimers.push(setTimeout(() => { f.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${k.toFixed(3)})`; f.classList.add("is-out"); fwEl.classList.remove("is-flying"); }, 1250),
      setTimeout(done, 1490), setTimeout(() => f.remove(), 2050));   // the name stays big about 1.2 s (Kai: it went too fast)
  }
  /* ---------- music: asked once the site is ready; The Show Must Go On under the story, a scratch into The Next Episode when the view goes to Change ---------- */
  // Files: bron/assets/audio/*.mp3 (royalty-free versions, Kai), copied by build.py to site/audio/ and fetched only after "Yes".
  var music = (() => {
    const TRACKS = { show: { url: "__AUDIO:show-must-go-on.mp3__", vol: 0.55 }, next: { url: "__AUDIO:next-episode.mp3__", vol: 0.6 } };
    const CHANGE_AT = STOPS.findIndex(s => s.id === "d2");   // the camera goes to the rehearsal: Change
    const btn = $("[data-sound]"), ask = $("[data-sound-ask]");
    let ctx = null, on = false, cur = null, want = "show", scratchBuf = null;
    const SHOW_END = 251.1, NEXT_IN = 0.34;   // seconds: where The Show Must Go On falls silent, where The Next Episode starts to sound
    let nextSrc = null;   // The Next Episode loops from its decoded buffer: gapless, without the silence at its start
    const want0 = i => i >= CHANGE_AT ? "next" : "show";
    function setup() {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      for (const k in TRACKS) { const T = TRACKS[k], a = new Audio(); a.src = T.url; a.loop = true; a.preload = "auto"; a.crossOrigin = "anonymous";
        T.el = a; T.gain = ctx.createGain(); T.gain.gain.value = 0; ctx.createMediaElementSource(a).connect(T.gain).connect(fx ? fx.bus : fxIn()); }
      TRACKS.show.el.addEventListener("timeupdate", () => { const e = TRACKS.show.el; if (e.currentTime > SHOW_END) e.currentTime = 0; });   // the file ends in 3 s of silence: loop before it
      fetch(TRACKS.next.url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => { scratchBuf = buf; }).catch(() => {});   // the scratch is cut from the start of the new song
    }
    const fade = (k, to, sec) => { const g = TRACKS[k].gain.gain, t = ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + sec); };
    function scratch() {   // forward, back, forward, back: short pieces of the record at changing speed, through a narrow band like a needle on vinyl
      if (!scratchBuf) return 0;
      const len = Math.floor(0.3 * scratchBuf.sampleRate), rev = ctx.createBuffer(scratchBuf.numberOfChannels, len, scratchBuf.sampleRate), fwd = ctx.createBuffer(scratchBuf.numberOfChannels, len, scratchBuf.sampleRate);
      for (let c = 0; c < scratchBuf.numberOfChannels; c++) { const o = Math.floor(NEXT_IN * scratchBuf.sampleRate), src = scratchBuf.getChannelData(c).subarray(o, o + len); fwd.copyToChannel(src, c); const r = new Float32Array(len); for (let i = 0; i < len; i++) r[i] = src[len - 1 - i]; rev.copyToChannel(r, c); }
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 0.6; const g = ctx.createGain(); g.gain.value = 1.15; bp.connect(g).connect(ctx.destination);
      let t = ctx.currentTime + 0.45;   // after the tape stop of the old song (play): baby scratches, a fast chop, then one long rewind before the drop (Kai: longer, unmistakable)
      const PARTS = [[fwd, 1.6, 0.14], [rev, 2.2, 0.1], [fwd, 1.8, 0.12], [rev, 2.6, 0.08], [fwd, 2.0, 0.1], [rev, 2.4, 0.09], [fwd, 2.6, 0.06], [rev, 2.6, 0.06], [fwd, 2.6, 0.06], [rev, 2.6, 0.06], [fwd, 1.4, 0.16], [rev, 3.2, 0.26]];
      for (const [b, rate, d] of PARTS) { const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.setValueAtTime(rate * 0.6, t); s.playbackRate.linearRampToValueAtTime(rate, t + d * 0.5); s.playbackRate.linearRampToValueAtTime(rate * 0.4, t + d);
        s.connect(bp); s.start(t); s.stop(t + d); t += d + 0.015; }
      return t - ctx.currentTime;
    }
    // "When one part is off" (Kai): wherever the song happens to be, it sags and wobbles out of tune, like a warped record, then comes back
    let sourOn = false, sourAmt = 0, sourTimer = null;
    function setSour(v) {
      if (v === sourOn) return; sourOn = v; if (!ctx || sourTimer) return;
      for (const k in TRACKS) { const e = TRACKS[k].el; e.preservesPitch = e.mozPreservesPitch = e.webkitPreservesPitch = false; }
      const t0 = performance.now();
      sourTimer = setInterval(() => {
        sourAmt = Math.max(0, Math.min(1, sourAmt + (sourOn ? 0.05 : -0.08)));   // in over about a second, out a little faster
        const t = (performance.now() - t0) / 1000, r = 1 - sourAmt * (0.035 + 0.03 * Math.sin(t * 2 * Math.PI * 0.55) + 0.012 * Math.sin(t * 2 * Math.PI * 3.1));
        for (const k in TRACKS) { if (!TRACKS[k].el.paused) TRACKS[k].el.playbackRate = r; }
        if (nextSrc) nextSrc.playbackRate.value = r;
        if (!sourOn && sourAmt === 0) { clearInterval(sourTimer); sourTimer = null; for (const k in TRACKS) TRACKS[k].el.playbackRate = 1; if (nextSrc) nextSrc.playbackRate.value = 1; }
      }, 40);
    }
    function startTrack(k) {
      if (k === "next" && scratchBuf) { if (nextSrc) return; const s = ctx.createBufferSource(); s.buffer = scratchBuf; s.loop = true; s.loopStart = NEXT_IN; s.loopEnd = scratchBuf.duration; s.connect(TRACKS.next.gain); s.start(0, NEXT_IN); nextSrc = s; return; }
      if (k === "next" && TRACKS.next.el.currentTime < NEXT_IN) TRACKS.next.el.currentTime = NEXT_IN;
      TRACKS[k].el.play().catch(() => {});
    }
    function stopTrack(k) { if (k === "next" && nextSrc) { nextSrc.stop(); nextSrc = null; } TRACKS[k].el.pause(); }
    function tapeStop(el) {   // the old record slows down under the hand, like a turntable switched off
      el.preservesPitch = el.mozPreservesPitch = el.webkitPreservesPitch = false; const t0 = performance.now();
      const id = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / 550); el.playbackRate = Math.max(0.25, 1 - 0.75 * k * k); if (k >= 1) { clearInterval(id); setTimeout(() => { el.playbackRate = 1; }, 700); } }, 30);
    }
    // ---- sound design (Kai): one filter chain on the mix that follows the story; with one mixed recording it suggests sections by pitch range and left/right, wherever the song is
    let fx = null, fxTimers = [], lastI = -1, lastSec = -2;
    function fxIn() {
      const c = ctx, n = { bus: c.createGain(), split: c.createChannelSplitter(2), dl: c.createDelay(0.1), dr: c.createDelay(0.1), gl: c.createGain(), gr: c.createGain(), merge: c.createChannelMerger(2),
        hp: c.createBiquadFilter(), lp: c.createBiquadFilter(), peak: c.createBiquadFilter(), shelf: c.createBiquadFilter(), out: c.createGain(), lfo: c.createOscillator(), wob: c.createGain(), inv: c.createGain() };
      n.hp.type = "highpass"; n.hp.frequency.value = 20; n.lp.type = "lowpass"; n.lp.frequency.value = 20000; n.peak.type = "peaking"; n.peak.Q.value = 0.9; n.peak.gain.value = 0; n.shelf.type = "highshelf"; n.shelf.frequency.value = 3500; n.shelf.gain.value = 0;
      n.dl.delayTime.value = 0; n.dr.delayTime.value = 0; n.lfo.frequency.value = 0.6; n.wob.gain.value = 0; n.inv.gain.value = -1;
      n.bus.connect(n.split); n.split.connect(n.dl, 0); n.split.connect(n.dr, 1); n.dl.connect(n.gl).connect(n.merge, 0, 0); n.dr.connect(n.gr).connect(n.merge, 0, 1);
      n.merge.connect(n.hp).connect(n.lp).connect(n.peak).connect(n.shelf).connect(n.out).connect(c.destination);
      n.lfo.connect(n.wob); n.wob.connect(n.dl.delayTime); n.wob.connect(n.inv).connect(n.dr.delayTime); n.lfo.start();
      fx = n; return n.bus;
    }
    function shape(p = {}, tau = 0.5) {
      if (!fx) return; const t = ctx.currentTime, P = Object.assign({ hp: 20, lp: 20000, pf: 1000, pg: 0, sg: 0, l: 1, r: 1, dl: 0, dr: 0, wob: 0, out: 1 }, p);
      [[fx.hp.frequency, P.hp], [fx.lp.frequency, P.lp], [fx.peak.frequency, P.pf], [fx.peak.gain, P.pg], [fx.shelf.gain, P.sg], [fx.gl.gain, P.l], [fx.gr.gain, P.r], [fx.dl.delayTime, P.dl], [fx.dr.delayTime, P.dr], [fx.wob.gain, P.wob], [fx.out.gain, P.out]]
        .forEach(([a, v]) => { a.cancelScheduledValues(t); a.setTargetAtTime(v, t, tau); });
    }
    const SECTION_SOUND = { Strijkers: { hp: 300, lp: 4500, pf: 900, pg: 9, r: 0.12 }, Houtblazers: { hp: 700, lp: 9000, pf: 2500, pg: 9, l: 0.7, r: 0.7, out: 1.1 }, Koper: { hp: 150, lp: 1800, pf: 500, pg: 9, l: 0.12 }, Slagwerk: { lp: 260, pf: 70, pg: 10, out: 1.35 } };   // strong on purpose: on a full mix, mild filters are not heard (Kai)
    function fxFor(i) {   // what the music does at each stop
      fxTimers.forEach(clearTimeout); fxTimers = []; lastI = i; lastSec = -2; if (!fx) return;
      const S = STOPS[i], later = (ms, p, tau) => fxTimers.push(setTimeout(() => shape(p, tau), ms));
      switch (S.id) {
        case "open": shape({ lp: 300, out: 0.8 }, 0.05); later(1500, {}, 1.0); break;   // from far away, then the orchestra opens up
        case "t2": shape({}); break;   // Different roles: the sound follows the section that lights up (tick, on the same clock as the light)
        case "t3": shape({ sg: 10, pf: 300, pg: 5 }, 0.4); break;   // Different capabilities: warmer and brighter, like the glow
        case "t4": shape({ sg: 6, pf: 300, pg: 3, dl: 0.03, dr: 0.004, wob: 0.009 }, 0.4); break;   // Different perspectives: each ear hears it differently
        case "t6": shape({ out: 1.45 }, 0.2); later(1000, {}, 1.0); break;   // One performance: everything back in place, with a swell
        case "b3": shape({ r: 0.08, pf: 1500, pg: 5 }, 0.4); break;   // one melody line: left
        case "b4": shape({ l: 0.08, pf: 1500, pg: 5 }, 0.4); later(2200, { pf: 1500, pg: 3 }, 0.8); break;   // the second line right, then both
        case "question": shape({ lp: 1200, out: 0.85 }, 0.6); break;   // in the hall, among the audience
        case "problems": shape({ lp: 2500, out: 0.7 }, 0.6); break;
        default: shape({}, 0.6);
      }
    }
    function play(k) {
      if (!on || k === cur) return;
      const from = cur; cur = k; let delay = 0;
      if (from) { const dj = from === "show" && k === "next"; fade(from, 0, dj ? 0.55 : 1.0); if (dj) tapeStop(TRACKS[from].el); setTimeout(() => { if (cur !== from) stopTrack(from); }, 1200); }
      if (from === "show" && k === "next") { delay = scratch(); if (!scratchBuf) TRACKS.next.el.currentTime = 0; else if (nextSrc) { nextSrc.stop(); nextSrc = null; } }   // the DJ moment: the new song from its start
      setTimeout(() => { if (cur !== k || !on) return; startTrack(k); fade(k, TRACKS[k].vol, from ? (delay ? 0.05 : 1.0) : 2.0); }, delay * 1000);
    }
    function setOn(v) {
      on = v; btn.setAttribute("aria-pressed", v); btn.setAttribute("aria-label", v ? "Sound off" : "Sound on"); btn.classList.toggle("is-on", v); ask.classList.remove("is-on");
      if (v) { if (!ctx) setup(); ctx.resume(); cur = null; play(want); if (lastI >= 0) fxFor(lastI); if (sourOn) { sourOn = false; setSour(true); } }
      else if (ctx) { for (const k in TRACKS) { fade(k, 0, 0.4); setTimeout(() => { if (!on) stopTrack(k); }, 450); } cur = null; }
    }
    btn.addEventListener("click", () => setOn(!on));
    $("[data-sound-yes]").addEventListener("click", () => setOn(true));
    $("[data-sound-no]").addEventListener("click", () => setOn(false));
    document.addEventListener("visibilitychange", () => { if (!ctx || !on) return; document.hidden ? ctx.suspend() : ctx.resume(); });   // quiet in a background tab
    return { tick: (S, since, moving) => { if (!fx || !on || S.id !== "t2") return; let n = moving ? -1 : Math.floor((since - 0.3) / SECTION_STEP); if (n > 3) n = 4; if (n === lastSec) return; lastSec = n; shape(n >= 0 && n < 4 ? SECTION_SOUND[SECT[n]] : {}, 0.08); }, probe: () => fx && { lp: Math.round(fx.lp.frequency.value), pg: +fx.peak.gain.value.toFixed(1), l: +fx.gl.gain.value.toFixed(2), r: +fx.gr.gain.value.toFixed(2), out: +fx.out.gain.value.toFixed(2), state: ctx.state }, sync: i => { want = want0(i); play(want); setSour(!!STOPS[i].off); lastI = i; if (on) fxFor(i); }, ask: () => { if (!on) ask.classList.add("is-on"); } };
  })();
  function setPaused(v) {   // only the screenshot scripts pause a sequence (__story.pause)
    paused = v;
    if (!v) arrived = clock.getElapsedTime() - (STOPS[at].hold || 0) * 0.5;   // resume: a short wait, then on
  }
  tlSkip.addEventListener("click", () => { const n = segOf(at); if (n < SEGS.length - 1) goTo(SEGS[n + 1].first); });   // Next: the first step of the next part (a running sequence is passed as a whole)
  tlPrev.addEventListener("click", () => { const n = segOf(at); goTo(STOPS[at].seq && at > SEGS[n].first ? SEGS[n].first : SEGS[Math.max(0, n - 1)].first); });   // Previous: back to the start of this part (as a video player), or to the part before
  const setHeld = v => { held = paused = v; tlPlay.classList.toggle("is-paused", v); tlPlay.setAttribute("aria-label", v ? "Play" : "Pause"); };
  tlPlay.addEventListener("click", () => { if (STOPS[at].seq) setHeld(!held); });
  // the bar shows when the mouse moves, at the start and at each new part, then fades; it stays while the pointer or the keyboard is on it
  let wakeT = 0; function wake(ms = 2600) { tlNav.classList.add("is-awake"); clearTimeout(wakeT); wakeT = setTimeout(() => { if (!held) tlNav.classList.remove("is-awake"); }, ms); }   // paused: it stays, as in a video player
  addEventListener("pointermove", e => { if (e.pointerType === "mouse") wake(); }, { passive: true });
  function step(d) {   // one gesture = one scene; a running sequence counts as one scene
    if (document.body.classList.contains("is-loading")) return;
    meetFrom = null;
    const q = STOPS[at].seq && SEQS[STOPS[at].seq];
    if (q) { paused = false; setPaused(false); goTo(d > 0 ? q.last + 1 : q.first - 1); return; }
    goTo(at + d);
  }

  /* ---------- input: wheel, keys, swipe, timeline ---------- */
  const WHEEL_REST = 0.45; let wheelQuiet = 0, wheelAcc = 0;
  addEventListener("wheel", e => {
    if (e.target.closest && e.target.closest("[data-drawer], .door")) return;   // an open side panel (or Backstage) scrolls itself
        e.preventDefault();
    const now = clock.getElapsedTime(), quiet = now - wheelQuiet; wheelQuiet = now;
    if ((anim && anim.k < 0.85) || quiet < WHEEL_REST && wheelAcc === 0) return;
    wheelAcc += e.deltaY; if (Math.abs(wheelAcc) < 24) return;
    step(Math.sign(wheelAcc)); wheelAcc = 0;
  }, { passive: false });
  addEventListener("keydown", e => {
    if (e.key === "Escape" && door.classList.contains("is-on")) { closeDoor(); return; }
    if (e.target.closest && e.target.closest(".door")) return;   // inside Backstage, keys type and scroll
    if (e.key === "Escape" && (openProblem >= 0 || openPart)) { closeDrawers(true); return; }
    if (e.target.closest && e.target.closest("[data-drawer], input")) return;   // arrows and space scroll the open side panel, and type in the Backstage password
    if (e.target.closest && e.target.closest("button") && (e.key === " " || e.key === "Enter")) return;
    if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); step(1); }
    if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); step(-1); }
    if (document.body.classList.contains("is-loading")) return;
    if (e.key === "Home") goTo(0); if (e.key === "End") goTo(N - 1);
  });
  let touchY = null;
  stage.addEventListener("touchstart", e => { touchY = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener("touchmove", e => { if (!e.target.closest(".problems, .coll__page, [data-drawer], .door")) e.preventDefault(); }, { passive: false });
  stage.addEventListener("touchend", e => { if (touchY === null) return; if (e.target.closest("[data-drawer], .door")) { touchY = null; return; } for (const sel of [".coll__page", ".problems"]) { const el = e.target.closest(sel); if (el && el.scrollHeight > el.clientHeight + 4) { touchY = null; return; } } const dy = touchY - e.changedTouches[0].clientY; touchY = null; if (Math.abs(dy) > 40) step(Math.sign(dy)); });   // a list that scrolls (About, problems on phones) is scrolled, not swiped away
  const segBtns = SEGS.map((g, n) => { const b = document.createElement("button");
    b.type = "button"; b.className = "timeline__seg"; b.dataset.timelineSeg = n; b.tabIndex = -1;
    b.setAttribute("aria-label", `${STORY.goTo} ${STOPS[g.first].name}`);
    b.innerHTML = '<span class="timeline__line"><i class="timeline__fill"></i></span>'; tlBar.appendChild(b); return b; });
  const segFills = segBtns.map(b => b.querySelector(".timeline__fill"));
  const tlDot = document.createElement("span"); tlDot.className = "timeline__dot";
  function showSeg(name, n) { tlLabel.textContent = name; const b = segBtns[n]; if (b) tlNav.style.setProperty("--timeline-label-x", (b.offsetLeft + b.offsetWidth / 2) + "px"); }   // the name stands above its segment
  segBtns.forEach((b, n) => {   // hover or focus previews a segment's name; leaving shows the active one again
    const peek = () => { preview = n; showSeg(STOPS[SEGS[n].first].name, n); }, back = () => { preview = -1; showSeg(nameAt(at), segOf(at)); };
    b.addEventListener("pointerenter", peek); b.addEventListener("focus", peek); b.addEventListener("pointerleave", back); b.addEventListener("blur", back);
    b.addEventListener("click", () => { if (document.body.classList.contains("is-loading")) return; if (!held) paused = false; meetFrom = null; goTo(SEGS[n].first); });
  });
  tlBar.addEventListener("keydown", e => {   // roving tabindex: one tab stop, the arrows move between segments
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key], n = +e.target.dataset.timelineSeg; if (!d || Number.isNaN(n)) return;
    e.preventDefault(); e.stopPropagation(); const k = clamp(n + d, 0, SEGS.length - 1);
    segBtns.forEach((b, j) => (b.tabIndex = j === k ? 0 : -1)); segBtns[k].focus();
  });
  $("[data-brand]").addEventListener("click", () => {   // the logo: back to the opening
    if (document.body.classList.contains("is-loading")) return; paused = false; meetFrom = null; goTo(0); });
  /* ---------- side panels: a problem slides in from the left, a framework part from the right; words in content.js ---------- */
  const drawers = { problem: $("[data-drawer='problem']"), part: $("[data-drawer='part']") };
  let openProblem = -1, openPart = null, drawerFrom = null;
  const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const section = (label, html) => `<h3 class="drawer__h">${esc(label)}</h3>${html}`;
  function problemHTML(n) { const P = PROBLEMS[n];   // the title is the recognition; the figure beside it lights the parts and opens them
    return `<h2 class="drawer__title">${esc(P.line)}</h2>`
      + section(LABELS.wrong, `<p class="drawer__text">${esc(P.wrong)}</p>`) + section(LABELS.solve, `<p class="drawer__text">${esc(P.solve)}</p>`) + doorHTML("problem", n); }
  function partHTML(k) { const T = PARTS[k];   // the problems it helps solve light up in the list on the left, not here (Kai: they stood there twice)
    return `<p class="drawer__kicker">${esc(T.name)} · ${esc(T.sub)}</p><h2 class="drawer__title">${esc(T.title)}</h2><p class="drawer__question">${esc(T.question)}</p><p class="drawer__text">${esc(T.text)}</p>`
      + section(LABELS.org, `<p class="drawer__text">${esc(T.org)}</p>`) + doorHTML("part", k); }
  /* ---------- Backstage pass: a teaser, then the full text after the password (decrypted here; the texts are encrypted in site/backstage.json) ---------- */
  const bs = { file: null, key: null };
  const b64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
  const backstageHTML = id => `<div class="backstage" data-backstage="${esc(id)}"><button class="backstage__open" type="button" aria-expanded="false">${esc(BACKSTAGE.label)}<span aria-hidden="true">&rarr;</span></button>
    <div class="backstage__body" hidden><p class="drawer__text">${esc(BACKSTAGE.teaser)}</p>
    <form class="backstage__form"><input type="password" autocomplete="off" placeholder="${esc(BACKSTAGE.prompt)}" aria-label="${esc(BACKSTAGE.prompt)}"><button type="submit">${esc(BACKSTAGE.unlock)}</button></form>
    <p class="backstage__msg" aria-live="polite"></p></div></div>`;
  async function bsKey(pw) {
    if (!(window.crypto && crypto.subtle)) throw new Error("nocrypto");
    const f = bs.file || (bs.file = await (await fetch(BACKSTAGE.url)).json());
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(f.salt), iterations: f.iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    await bsOpen(key, f.check); return key;   // throws on a wrong password
  }
  const bsOpen = async (key, box) => JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(box.iv) }, key, b64(box.data))));
  async function bsReveal(el) {
    const box = bs.file.items[el.dataset.backstage], body = el.querySelector(".backstage__body");
    if (!box) { body.querySelector(".backstage__msg").textContent = ""; return; }
    const T = await bsOpen(bs.key, box);
    body.innerHTML = `<h3 class="drawer__h">${esc(T.title)}</h3>` + T.paras.map(t => `<p class="drawer__text">${esc(t)}</p>`).join(""); el.classList.add("is-open");
  }
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest(".backstage__open"); if (!b || b.dataset.door) return;
    const el = b.closest(".backstage"), body = el.querySelector(".backstage__body"), open = body.hidden; body.hidden = !open; b.setAttribute("aria-expanded", open);
    if (open && bs.key) { bsReveal(el); instDeep(); } else if (open) { const i = body.querySelector("input"); i && i.focus({ preventScroll: true }); } });
  document.addEventListener("submit", async e => { const form = e.target.closest && e.target.closest(".backstage__form"); if (!form) return; e.preventDefault();
    const el = form.closest(".backstage"), msg = el.querySelector(".backstage__msg"), pw = form.querySelector("input").value;
    try { bs.key = await bsKey(pw); await bsReveal(el); instDeep(); } catch (err) { msg.textContent = err.message === "nocrypto" ? BACKSTAGE.nocrypto : BACKSTAGE.wrong; form.querySelector("input").select(); } });   // the key stays for this visit only
  /* ---------- the instruments per part (Kai): in a part's panel on the problems stop, the methods we use for it and a small picture of where each plays; how it plays in the framework is behind the Backstage pass ("i-<id>") ---------- */
  const INST_KEY = { p: "p", b: "b", m: "m", o: "o", r: "rc", c: "rc" };
  function instSVG(key) {
    const T = INSTRUMENTS[key], nm = k => esc(T.stages.find(x => x.k === k).name.toUpperCase()), out = [];
    const g = (k, x, y, w, h, inner, lx, ly, anchor) => out.push(`<g class="ts" data-st="${k}"><rect class="halo" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><text class="stn" x="${lx}" y="${ly}" text-anchor="${anchor || "middle"}">${nm(k)}</text>${inner}</g>`);
    const ln = (d, c) => `<path class="lnk${c ? " " + c : ""}" d="${d}"/>`, nd = (x, y, w, h, t, st) => `<rect class="nd" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"${st ? ` style="${st}"` : ""}/>` + (t ? `<text class="lbl" x="${x + 10}" y="${y + h / 2 + 3.5}">${t}</text>` : "");
    if (key === "p") {
      const G = [86, 132, 178], I = [[64, [0], 0, 7], [86, [0], 1, 4.5], [109, [0, 1], 0, 7, 1], [132, [1], 0, 3.5], [155, [1], 1, 5.5], [178, [2], 2, 4.5], [200, [2], 1, 7], [222, [], 3, 5]], B = [[70, "Now"], [112, "Next"], [154, "Later"], [204, "Not now"]];
      let L = G.map(y => ln(`M52 132 C80 132 84 ${y} 104 ${y}`)).join("");
      I.forEach(([y, gs, b, , syn]) => { L += gs.map(i => ln(`M152 ${G[i]} C190 ${G[i]} 192 ${y} 226 ${y}`, syn ? "syn" : "")).join("") + ln(`M238 ${y} C280 ${y} 284 ${B[b][0]} 312 ${B[b][0]}`, b === 0 ? "go" : ""); });
      out.push(L);
      g("ambition", 4, 0, 60, 236, `<circle class="nd" cx="34" cy="132" r="18"/><path d="M34 119l4 13-4-2.5-4 2.5z" class="hl"/>`, 34, 18);
      g("goals", 92, 0, 72, 236, G.map(y => nd(104, y - 12, 48, 24, "Goal")).join(""), 128, 18);
      g("initiatives", 200, 0, 64, 236, I.map(([y, gs, , r, syn]) => gs.length ? `<circle class="nd${syn ? " is-hl" : ""}" cx="232" cy="${y}" r="${r}"/>` : `<circle class="orph" cx="232" cy="${y}" r="${r}"/>`).join(""), 232, 18);
      g("choose", 302, 0, 96, 236, B.map(([y, n], i) => nd(312, y - 13, 76, 26, n, i === 3 ? "stroke:rgb(241 64 11 / .55)" : "")).join(""), 350, 18);
    } else if (key === "b") {
      let ch = ""; for (let i = 0; i < 5; i++) { const x = 118 + i * 56; ch += `<path class="nd${i === 2 ? " is-leak" : ""}" d="M${x} 34h48l8 13-8 13h-48l8-13z"/>`; }
      g("stream", 4, 4, 392, 66, ch, 12, 52, "start");
      let ly = ""; ["BUSINESS", "DATA", "TECH"].forEach((n, j) => { const y = 90 + j * 30; ly += `<text class="stn sm" x="12" y="${y + 10}">${n}</text>`; for (let i = 0; i < 5; i++) ly += `<rect class="cell${i === 2 ? " is-leak" : j < 2 || i === 1 ? " is-gold" : ""}" x="${126 + i * 56}" y="${y}" width="44" height="14" rx="2"/>`; });
      ly += `<path class="leakline" d="M238 64V170"/>`;
      g("layers", 4, 76, 392, 104, ly, 12, 82, "start");
      g("choice", 4, 186, 392, 46, `<rect class="cell is-gold" x="126" y="204" width="14" height="14" rx="2"/><text class="lbl" x="146" y="215">stand out: build</text><rect class="cell" x="262" y="204" width="14" height="14" rx="2"/><text class="lbl" x="282" y="215">standard: off the shelf</text>`, 12, 215, "start");
    } else if (key === "m") {
      let pot = `<text class="stn sm" x="300" y="22" text-anchor="middle">RUN | CHANGE</text>`; [["People", .7], ["Skills", .6], ["Tools", .75], ["Money", .8], ["Partners", .45]].forEach(([n, r], j) => { const y = 32 + j * 20; pot += `<text class="lbl" x="118" y="${y + 10}">${n}</text><rect class="pot-run" x="186" y="${y}" width="${(208 * r - 2).toFixed(0)}" height="12" rx="2"/><rect class="pot-change" x="${(186 + 208 * r).toFixed(0)}" y="${y}" width="${(208 * (1 - r)).toFixed(0)}" height="12" rx="2"/>`; });
      g("pot", 4, 4, 392, 128, pot, 12, 22, "start");
      g("need", 4, 138, 392, 44, ["Build", "Buy", "Borrow"].map((n, i) => `<rect class="nd" x="${118 + i * 90}" y="146" width="80" height="26" rx="13"/><text class="lbl" x="${158 + i * 90}" y="163" text-anchor="middle">${n}</text>`).join(""), 12, 163, "start");
      g("case", 4, 188, 392, 46, [["conservative", 70], ["realistic", 110], ["ultimate", 150]].map(([n, w], i) => `<rect class="pot-run" x="${118 + i * 92}" y="${222 - w / 8}" width="80" height="${w / 8}" rx="2"/><text class="lbl sm" x="${158 + i * 92}" y="232" text-anchor="middle">${n}</text>`).join(""), 12, 212, "start");
    } else if (key === "o") {
      let t = ""; ["SALES", "OPS", "FIN", "IT"].forEach((n, i) => { const x = 12 + i * 52; t += `<rect class="func" x="${x}" y="30" width="44" height="170" rx="3"/><text class="stn sm" x="${x + 22}" y="44" text-anchor="middle">${n}</text>`; });
      t += `<rect class="stream" x="6" y="70" width="216" height="22" rx="11"/><text class="lbl hl" x="16" y="85">product team · stream A</text><rect class="stream" x="6" y="104" width="216" height="22" rx="11"/><text class="lbl hl" x="16" y="119">product team · stream B</text>`;
      t += `<rect class="plat" x="6" y="170" width="216" height="20" rx="3"/><text class="lbl" x="16" y="184">platform · as a service</text><rect class="enab" x="228" y="66" width="14" height="64" rx="7"/>`;
      g("teams", 2, 2, 248, 232, t, 128, 18);
      let k = ""; for (let i = 0; i < 4; i++) { k += `<rect class="func" x="${262 + i * 17}" y="30" width="14" height="170" rx="2"/>`; for (let j = 0; j < [3, 2, 3, 4][i]; j++) k += `<rect class="${i === 3 ? "card done" : "card"}" x="${264 + i * 17}" y="${36 + j * 18}" width="10" height="13" rx="1"/>`; }
      g("board", 256, 2, 74, 232, k, 293, 18);
      g("rhythm", 334, 2, 64, 232, `<circle class="nd" cx="366" cy="110" r="10"/><circle class="ring" cx="366" cy="110" r="20"/><circle class="ring faint" cx="366" cy="110" r="29"/><text class="lbl sm" x="366" y="162" text-anchor="middle">week</text><text class="lbl sm" x="366" y="176" text-anchor="middle">quarter</text><text class="lbl sm" x="366" y="190" text-anchor="middle">year</text>`, 366, 18);
    } else {
      let r = ""; ["SALES", "OPS", "FINANCE", "IT"].forEach((n, i) => { r += `<rect class="func" x="${110 + i * 52}" y="34" width="44" height="54" rx="3"/><text class="stn sm" x="${132 + i * 52}" y="66" text-anchor="middle">${n}</text>`; });
      g("run", 4, 4, 310, 98, r, 12, 66, "start");
      g("change", 4, 110, 310, 98, `<rect class="stream" x="110" y="146" width="200" height="24" rx="12"/><text class="lbl hl" x="122" y="162">team across departments</text>`, 12, 162, "start");
      g("land", 320, 4, 76, 204, `<path class="lnk go" d="M310 158C350 158 358 120 358 70"/><path class="hlline" d="M352 78l6-10 6 10"/><text class="lbl sm" x="358" y="196" text-anchor="middle">lands in Run</text>`, 358, 22);
    }
    return out.join("");
  }
  function instHTML(k) { const key = INST_KEY[k], T = INSTRUMENTS[key]; if (!T) return "";
    return `<div class="inst" data-inst="${key}">` + section(INSTRUMENTS_TEXT.label, `<p class="inst__lead">${esc(INSTRUMENTS_TEXT.lead)}</p>
      <svg class="inst__score" viewBox="0 0 400 236" aria-hidden="true">${instSVG(key)}</svg>
      <div class="inst__chips">${T.instruments.map(x => `<button class="inst__chip" type="button" aria-pressed="false" data-i="${x.id}">${esc(x.n)}</button>`).join("")}</div>
      <div class="inst__detail" aria-live="polite"><p class="inst__hint">${esc(INSTRUMENTS_TEXT.hint)}</p></div>`) + `</div>`; }
  { const find = el => { const box = el.closest(".inst"); return box && { box, T: INSTRUMENTS[box.dataset.inst] }; };
    const light = (box, st, ids) => { const sc = box.querySelector(".inst__score"), ch = box.querySelector(".inst__chips");
      sc.classList.toggle("is-dim", !!st); sc.querySelectorAll(".ts").forEach(g => g.classList.toggle("is-lit", !!st && st.includes(g.dataset.st)));
      ch.classList.toggle("is-dim", !!ids); ch.querySelectorAll(".inst__chip").forEach(c => c.classList.toggle("is-lit", !!ids && ids.includes(c.dataset.i))); };
    const rest = ({ box, T }) => { const sel = box.dataset.sel && T.instruments.find(x => x.id === box.dataset.sel); light(box, sel ? sel.st : null, null); };
    const hover = e => { const f = e.target.closest && find(e.target); if (!f) return; const c = e.target.closest(".inst__chip"), g = e.target.closest(".ts");
      if (c) { const x = f.T.instruments.find(i => i.id === c.dataset.i); light(f.box, x.st, [x.id]); }
      else if (g) light(f.box, [g.dataset.st], f.T.instruments.filter(x => x.st.includes(g.dataset.st)).map(x => x.id)); else rest(f); };
    document.addEventListener("pointerover", hover); document.addEventListener("focusin", hover);
    document.addEventListener("pointerout", e => { const f = e.target.closest && find(e.target); if (f && !(e.relatedTarget && f.box.contains(e.relatedTarget))) rest(f); });
    document.addEventListener("click", e => { const c = e.target.closest && e.target.closest(".inst__chip"); if (!c) return; const f = find(c), x = f.T.instruments.find(i => i.id === c.dataset.i);
      f.box.dataset.sel = x.id; f.box.querySelectorAll(".inst__chip").forEach(b => b.setAttribute("aria-pressed", b === c));
      f.box.querySelector(".inst__detail").innerHTML = `<h4 class="inst__name">${esc(x.n)}</h4><p class="drawer__text">${esc(x.w)}</p><div class="inst__deep"></div>`; rest(f); instDeep(); }); }
  async function instDeep() {   // once the Backstage pass is in, the chosen instrument shows how it plays in the framework
    if (!bs.key || !bs.file) return;
    for (const box of document.querySelectorAll(".inst[data-sel]")) { const deep = box.querySelector(".inst__deep"), item = bs.file.items["i-" + box.dataset.sel]; if (!deep || !item || deep.dataset.i === box.dataset.sel) continue;
      deep.dataset.i = box.dataset.sel; try { const T = await bsOpen(bs.key, item); deep.innerHTML = T.paras.map(t => `<p class="drawer__text">${esc(t)}</p>`).join(""); } catch (err) {} }
  }
  /* ---------- Backstage (Kai, option B): the card's button unfolds the card into a full-screen page; the repertoire is public, how it plays in the framework opens with the password ---------- */
  const doorHTML = (kind, k) => `<div class="backstage"><button class="backstage__open" type="button" data-door="${kind}:${esc(k)}">${esc(BACKSTAGE.label)}<span aria-hidden="true">&rarr;</span></button></div>`;
  const door = document.createElement("section"); door.className = "door glass"; door.setAttribute("aria-label", BACKSTAGE.label); door.tabIndex = -1; door.inert = true;
  door.innerHTML = `<button class="close close--corner door__close" type="button" data-door-close aria-label="Close"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5"/></svg></button><div class="door__body" data-door-body></div>`;
  document.body.appendChild(door);
  let doorFrom = null, doorRect = null, doorWhat = null;
  const PART_TABS = ["p", "b", "m", "o", "r"], PART_TAB_NAME = { p: "Plan", b: "Blueprint", m: "Means", o: "Orchestration", r: "Run and Change" };
  const lockHTML = () => bs.key ? "" : `<form class="door__lock backstage__form"><p class="drawer__h">${esc(BACKSTAGE.label)}</p><p class="drawer__text">${esc(BACKSTAGE.lock)}</p>
    <div class="door__row"><input type="password" autocomplete="off" placeholder="${esc(BACKSTAGE.prompt)}" aria-label="${esc(BACKSTAGE.prompt)}"><button type="submit">${esc(BACKSTAGE.unlock)}</button></div><p class="backstage__msg" aria-live="polite"></p></form>`;
  function doorFill(kind, k) {
    doorWhat = [kind, k]; const body = door.querySelector("[data-door-body]");
    if (kind === "part") { const key = INST_KEY[k], T = INSTRUMENTS[key], tabKey = k === "c" ? "r" : k;
      body.innerHTML = `<p class="door__kicker">${esc(BACKSTAGE.label)} · ${esc(PART_TAB_NAME[tabKey])}</p>
        <div class="door__tabs" role="tablist">${PART_TABS.map(t => `<button type="button" role="tab" class="door__tab" aria-selected="${t === tabKey}" data-door-tab="${t}">${esc(PART_TAB_NAME[t])}</button>`).join("")}</div>
        <div class="inst door__grid" data-inst="${key}">
          <div class="door__main"><h2 class="door__title">${esc(INSTRUMENTS_TEXT.label)}</h2><p class="inst__lead">${esc(INSTRUMENTS_TEXT.lead)}</p>
            <svg class="inst__score" viewBox="0 0 400 236" aria-hidden="true">${instSVG(key)}</svg>
            <div class="inst__chips">${T.instruments.map(x => `<button class="inst__chip" type="button" aria-pressed="false" data-i="${x.id}">${esc(x.n)}</button>`).join("")}</div></div>
          <div class="door__side"><div class="inst__detail" aria-live="polite"><p class="inst__hint">${esc(INSTRUMENTS_TEXT.hint)}</p></div>${lockHTML()}<div class="door__part" data-door-text="${esc(k)}"></div></div>
        </div>`;
      const first = body.querySelector(".inst__chip"); first && first.click();
    } else { const P = PROBLEMS[k];
      body.innerHTML = `<p class="door__kicker">${esc(BACKSTAGE.label)}</p><div class="door__grid"><div class="door__main"><h2 class="door__title">${esc(P.line)}</h2><p class="drawer__text">${esc(BACKSTAGE.teaser)}</p></div>
        <div class="door__side">${lockHTML()}<div class="door__part" data-door-text="${esc(P.id)}"></div></div></div>`; }
    doorText();
  }
  async function doorText() {   // once in: the deeper text of the chosen method and the page's own backstage text
    if (!bs.key || !bs.file) return; instDeep();
    const el = door.querySelector("[data-door-text]"), item = el && bs.file.items[el.dataset.doorText]; if (!item) return;
    try { const T = await bsOpen(bs.key, item); el.innerHTML = `<h3 class="drawer__h">${esc(T.title)}</h3>` + T.paras.map(t => `<p class="drawer__text">${esc(t)}</p>`).join(""); } catch (err) {}
  }
  const inset = r => `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 18px)`;
  function openDoor(kind, k, btn) {
    const card = btn.closest("[data-drawer]"); doorFrom = btn; doorRect = card ? card.getBoundingClientRect() : null;
    clearTimeout(doorShut); door.classList.remove("is-closing"); doorFill(kind, k); door.inert = false; door.scrollTop = 0;
    if (doorRect && !reduceMQ.matches) { door.style.transition = "none"; door.style.clipPath = inset(doorRect); door.classList.add("is-on"); door.offsetWidth; door.style.transition = ""; door.style.clipPath = "inset(0px 0px 0px 0px round 0px)"; }
    else { door.style.clipPath = "none"; door.classList.add("is-on"); }
    door.focus({ preventScroll: true });
  }
  let doorShut = 0;
  function closeDoor() {
    if (!door.classList.contains("is-on")) return;
    const card = doorFrom && doorFrom.closest("[data-drawer]"), r = card && card.classList.contains("is-on") ? card.getBoundingClientRect() : doorRect;
    if (r && !reduceMQ.matches) { door.style.clipPath = inset(r); door.classList.add("is-closing"); doorShut = setTimeout(() => { door.classList.remove("is-on", "is-closing"); door.style.clipPath = ""; }, 520); }
    else door.classList.remove("is-on");
    door.inert = true; if (doorFrom && doorFrom.isConnected) doorFrom.focus({ preventScroll: true }); doorFrom = null;
  }
  document.addEventListener("click", e => { const t = e.target.closest && e.target; if (!t) return;
    const b = t.closest("[data-door]"); if (b) { const [kind, k] = b.dataset.door.split(":"); openDoor(kind, kind === "problem" ? +k : k, b); return; }
    if (t.closest("[data-door-close]")) { closeDoor(); return; }
    const tab = t.closest("[data-door-tab]"); if (tab) { doorFill("part", tab.dataset.doorTab); door.scrollTop = 0; } });
  door.addEventListener("submit", async e => { const form = e.target.closest(".door__lock"); if (!form) return; e.preventDefault(); e.stopPropagation();
    const msg = form.querySelector(".backstage__msg"), input = form.querySelector("input");
    try { bs.key = await bsKey(input.value); form.remove(); doorText(); } catch (err) { msg.textContent = err.message === "nocrypto" ? BACKSTAGE.nocrypto : BACKSTAGE.wrong; input.select(); } });
  function showDrawer(kind, html) {
    const d = drawers[kind], other = drawers[kind === "problem" ? "part" : "problem"];
    if (!drawerFrom || !drawerFrom.isConnected) drawerFrom = document.activeElement;
    if (innerWidth <= 720 && other.classList.contains("is-on")) { other.classList.remove("is-on"); other.inert = true; if (kind === "problem") openPart = null; else openProblem = -1; }   // one at a time on a phone
    d.querySelector("[data-drawer-body]").innerHTML = html; d.scrollTop = 0; d.inert = false; d.classList.add("is-on"); d.focus({ preventScroll: true });
    markDrawers();
  }
  function closeDrawers(back) {
    if (openProblem < 0 && !openPart) return;
    for (const k in drawers) { drawers[k].classList.remove("is-on"); drawers[k].inert = true; }
    openProblem = -1; openPart = null; markDrawers();
    if (back && drawerFrom && drawerFrom.isConnected) drawerFrom.focus({ preventScroll: true }); drawerFrom = null;
  }
  function closeDrawer(kind) {   // close one panel; if it was the only one open, close all and give focus back
    if (!(kind === "problem" ? openPart : openProblem >= 0)) return closeDrawers(true);
    drawers[kind].classList.remove("is-on"); drawers[kind].inert = true;
    if (kind === "problem") openProblem = -1; else openPart = null;
    markDrawers();
  }
  const openProblemFn = n => { openProblem = n; showDrawer("problem", problemHTML(n)); }, openPartFn = k => { openPart = k; showDrawer("part", partHTML(k)); };
  function markDrawers() {   // the open problem's card; in the figure, the parts that problem (or the open part) is about
    cards.forEach((c, n) => { c.classList.toggle("is-active", n === openProblem); c.setAttribute("aria-expanded", n === openProblem); c.classList.toggle("is-lit", !!openPart && PROBLEMS[n].parts.includes(openPart)); });
    problems.classList.toggle("has-focus", !!openPart);   // an open part: its problems light up in the list
    const lit = openPart ? [openPart] : openProblem >= 0 ? PROBLEMS[openProblem].parts : [];
    fwEl.classList.toggle("has-focus", lit.length > 0); fwEl.querySelectorAll(".k").forEach(g => g.classList.toggle("is-lit", lit.includes(g.dataset.k)));
  }
  const cards = PROBLEMS.map((P, n) => { const b = document.createElement("button");
    b.type = "button"; b.className = "prob glass"; b.dataset.problem = n; b.style.setProperty("--i", n); b.setAttribute("aria-controls", "drawerProblem"); b.setAttribute("aria-expanded", "false");
    b.innerHTML = `<span class="prob__line">${esc(P.short)}</span>`; $("[data-problems-list]").appendChild(b); return b; });
  document.addEventListener("click", e => {
    if (!STOPS[at].problems || !e.target.closest) return;
    const card = e.target.closest("[data-problem]"), part = e.target.closest("[data-open-part]") || (fwEl.classList.contains("is-side") && e.target.closest("#fw .k"));
    const prob = e.target.closest("[data-open-problem]"), close = e.target.closest("[data-drawer-close]");
    if (card) { const n = +card.dataset.problem; n === openProblem ? closeDrawer("problem") : openProblemFn(n); return; }
    if (part) { const k = part.dataset.openPart || part.dataset.k; k === openPart ? closeDrawer("part") : openPartFn(k); return; }
    if (prob) { openProblemFn(+prob.dataset.openProblem); return; }
    if (close) { closeDrawer(close.closest("[data-drawer]").dataset.drawer); return; }
    if (!e.target.closest("[data-drawer], [data-timeline], .meet, .brand, .door")) closeDrawers(false);   // a click anywhere else closes them
  });
  let meetFrom = null;   // the stop the Meet button was pressed on; a click outside the page goes back there
  meetBtn.addEventListener("click", () => { if (document.body.classList.contains("is-loading")) return; if (!STOPS[at].coll) meetFrom = at; goTo(idx("c0")); });
  const leaveColl = () => { const back = meetFrom; meetFrom = null; if (back !== null) goTo(back); else step(-1); };
  document.addEventListener("click", e => {
    if (!STOPS[at].coll || e.target.closest("button, a, .coll__page, .fw, [data-timeline]")) return;
    leaveColl();
  });
  $("[data-coll-close]").addEventListener("click", () => { if (STOPS[at].coll) leaveColl(); });   // the small cross does the same as a click beside the page
  document.querySelectorAll("[data-coll-go]").forEach(b => b.addEventListener("click", () => { meetFrom = null; goTo(idx(b.dataset.collGo)); }));   // About page: the link to the problems and the framework
  { // contact: one address (CONTACT in content.js) for the text, the copy button and Let's talk
    const mail = $("[data-mailto]"), copyBtn = $("[data-copy-email]"), label = $("[data-copy-label]"), COPY = { idle: "Copy", done: "Copied" };
    $("[data-email]").textContent = CONTACT.email; mail.href = "mailto:" + CONTACT.email + (CONTACT.subject ? "?subject=" + encodeURIComponent(CONTACT.subject) : "");
    let reset = 0;
    copyBtn.addEventListener("click", () => {
      const done = () => { label.textContent = COPY.done; copyBtn.classList.add("is-copied"); clearTimeout(reset); reset = setTimeout(() => { label.textContent = COPY.idle; copyBtn.classList.remove("is-copied"); }, 1800); };
      (navigator.clipboard ? navigator.clipboard.writeText(CONTACT.email) : Promise.reject()).then(done, () => {   // older browsers: select and copy
        const t = document.createElement("textarea"); t.value = CONTACT.email; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); done(); } catch (_) {} t.remove(); }); });
  }

  /* ---------- per frame ---------- */
  const OPEN_TOP = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--open-top")) / 100 || 0.55;   // read once: the opening text sits no lower than this, where the loader text is (--open-top in styles.css)
  function placeBeats() {   // beats marked data-anchor sit centred above the conductor, as on the site
    const [, y] = toScreen(V(0, STAGE.floor + STAGE.wall.high + 0.9, -STAGE.zb));   // above the back wall
    for (const k in beats) { const el = beats[k]; if (!el.dataset.anchor || !el.classList.contains("is-on")) continue;
      const h = el.offsetHeight; el.style.top = clamp(y - h - 26, vh < 600 ? 64 : 84, vh * OPEN_TOP).toFixed(0) + "px"; }
  }
  function drawMelody(now, dt) {
    const S = STOPS[at], live = !anim || anim.k > 0.6;
    MELODY.forEach((L, li) => {
      const want = (S.line || 0) > li && live ? 1 : 0;
      L.draw = want ? Math.min(1, L.draw + dt / (reduceMQ.matches ? 0.01 : 1.8)) : S.panel === "blueprint" ? Math.max(0, L.draw - dt * 2.5) : 0;   // leaving Blueprint: gone at once (they ran on into Means)
      L.alpha = want ? 1 : L.draw;
      if (L.draw <= 0.001) return;
      const P = L.anchors.map(a => toScreen(a)), pts = [];
      for (let i = 0; i < P.length - 1; i++) {   // arcs from player to player, lifted above the heads
        const A = P[i], B = P[i + 1], d = Math.hypot(B[0] - A[0], B[1] - A[1]), C = [(A[0] + B[0]) / 2, Math.min(A[1], B[1]) - d * 0.28 - 12];
        for (let k = 0; k <= 30; k++) { const u = k / 30, m = 1 - u; if (i && !k) continue; pts.push([m * m * A[0] + 2 * m * u * C[0] + u * u * B[0], m * m * A[1] + 2 * m * u * C[1] + u * u * B[1]]); }
      }
      const n = Math.max(2, Math.round(pts.length * smoother(L.draw)));
      fctx.lineCap = "round"; fctx.lineJoin = "round";
      for (const [w, a] of [[4, 0.08], [1.4, 0.9]]) {   // the same fine strokes as the lines in "It isn't"
        fctx.strokeStyle = `rgba(${L.rgb}, ${a * L.alpha})`; fctx.lineWidth = w; fctx.beginPath();
        for (let i = 0; i < n; i++) i ? fctx.lineTo(pts[i][0], pts[i][1]) : fctx.moveTo(pts[i][0], pts[i][1]); fctx.stroke();
      }
      const glow = (x, y, r, a) => { const g = fctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255, 240, 215, ${a})`); g.addColorStop(0.4, `rgba(${L.rgb}, ${a * 0.6})`); g.addColorStop(1, `rgba(${L.rgb}, 0)`);
        fctx.fillStyle = g; fctx.beginPath(); fctx.arc(x, y, r, 0, 7); fctx.fill(); };
      P.forEach((p, i) => { if (i / (P.length - 1) <= L.draw + 0.01) glow(p[0], p[1], 9, 0.75 * L.alpha); });
      if (L.draw >= 1 && !reduceMQ.matches) { const u = ((now * 0.32 + li * 0.5) % 1), q = pts[Math.floor(u * (pts.length - 1))]; glow(q[0], q[1], 13, 0.95 * L.alpha); }
    });
  }
  /* ---------- frame 2 and Means: the instruments glow while the musicians go grey ---------- */
  const GLOW = new THREE.Color(0xff7420), GLOW_SELF = 1.6, GLOW_AMOUNT = 0.06, glowTmp = new THREE.Color(); let glowK = 0; const glowMats = new Set();   // the instruments glow; the musicians keep their own colours (no grey step: Kai)
  function glowTick(dt) {
    const want = STOPS[at].glow && (!anim || anim.k > 0.4) ? 1 : 0; glowK += (want - glowK) * (1 - Math.exp(-dt * 4));
    if (!glowMats.size || (window.__people && !glowMats.people && (glowMats.people = true))) for (const m of meshes) { const t = m.userData.tags || (m.userData.tags = tagsOf(m)); if (t.instrument && m.material && m.material.emissive) { if (!m.userData.ownMat) { m.material = m.material.clone(); m.userData.ownMat = true; m.material.userData.e0 = m.material.emissive.clone(); m.material.userData.i0 = m.material.emissiveIntensity; } glowMats.add(m.material); } }
    for (const mt of glowMats) { glowTmp.copy(mt.color).multiplyScalar(GLOW_SELF).lerp(GLOW, GLOW_AMOUNT); mt.emissive.copy(mt.userData.e0).lerp(glowTmp, glowK); }   // they light up in their own colour (dark wood stays wood, brass stays brass), with a touch of warmth
  }
  /* ---------- frame 2: different views, as loose lines in many colours crossing over the orchestra ---------- */
  const CHAOS_RGB = ["250, 248, 246", "252, 232, 216", "241, 64, 11", "250, 248, 246", "232, 186, 160", "252, 232, 216", "214, 196, 214"];   // paper, cream, one vermilion, warm and lavender greys: the palette of the panels
  const allPlayers = []; orkest.traverse(n => { if (/^Muzikant · /.test(n.name)) allPlayers.push(n); });
  const CHAOS = Array.from({ length: 11 }, (_, i) => { const A = allPlayers[(i * 7 + 3) % allPlayers.length], B = allPlayers[(i * 13 + 11) % allPlayers.length];
    const pa = A.getWorldPosition(V(0, 0, 0)), pb = B.getWorldPosition(V(0, 0, 0)); pa.y += 1.3; pb.y += 1.3;
    return { a: pa, b: pb, rgb: CHAOS_RGB[i % CHAOS_RGB.length], ph: i * 1.7, lift: 1.2 + (i % 4) * 0.6, delay: i * 0.12 }; });
  let chaosK = 0, chaosT = 0;
  function drawChaos(now, dt) {
    const want = STOPS[at].chaos && (!anim || anim.k > 0.5) ? 1 : 0;
    chaosK += (want - chaosK) * (1 - Math.exp(-dt * (want ? 3 : 5))); chaosT = want ? chaosT + dt : 0;
    if (chaosK < 0.01) return;
    fctx.lineCap = "round";
    CHAOS.forEach(L => {
      const P = toScreen(L.a), Q = toScreen(L.b), d = Math.hypot(Q[0] - P[0], Q[1] - P[1]), w1 = Math.sin(now * 0.9 + L.ph), w2 = Math.cos(now * 0.7 + L.ph * 1.3);
      const c1 = [P[0] + (Q[0] - P[0]) * 0.3 + w1 * 40, Math.min(P[1], Q[1]) - d * 0.35 * L.lift + w2 * 30], c2 = [P[0] + (Q[0] - P[0]) * 0.7 - w2 * 40, Math.min(P[1], Q[1]) - d * 0.2 * L.lift - w1 * 30];
      const grow = reduceMQ.matches ? 1 : clamp((chaosT - L.delay) / 1.2, 0, 1), n = 40, pts = [];
      for (let k = 0; k <= n * smoother(want ? grow : 1); k++) { const u = k / n, m = 1 - u; pts.push([m*m*m*P[0] + 3*m*m*u*c1[0] + 3*m*u*u*c2[0] + u*u*u*Q[0], m*m*m*P[1] + 3*m*m*u*c1[1] + 3*m*u*u*c2[1] + u*u*u*Q[1]]); }
      if (pts.length < 2) return;
      for (const [w, a] of [[4, 0.06], [1, 0.62]]) { fctx.strokeStyle = `rgba(${L.rgb}, ${a * chaosK})`; fctx.lineWidth = w; fctx.beginPath(); pts.forEach((p, i) => i ? fctx.lineTo(p[0], p[1]) : fctx.moveTo(p[0], p[1])); fctx.stroke(); }
    });
  }
  /* ---------- tension: the brass turns away and plays for itself; the conductor gives up ---------- */
  const inSect = (n, name) => { for (let p = n; p; p = p.parent) if (p.parent === orkest) return p.name === name; return false; };
  const brass = allPlayers.filter(n => inSect(n, "Koper"));
  brass.forEach(n => { n.userData.ry = n.rotation.y; n.userData.rx = n.rotation.x; n.userData.y0 = n.position.y; });
  let offK = 0, offT = 0;
  window.__offT = () => offT;
  function tension(now, dt) {
    const want = STOPS[at].off && (!anim || anim.k > 0.6) ? 1 : 0;
    offT = want ? offT + dt : Math.max(0, offT - dt * 3); offK += (want - offK) * (1 - Math.exp(-dt * (want ? 2 : 6)));
    if (offK < 0.001 && !want) { if (brass.moved) { brass.forEach(n => { n.rotation.y = n.userData.ry; n.rotation.x = n.userData.rx; n.position.y = n.userData.y0; }); brass.moved = false; shadows.dirty = true; } return; }
    brass.moved = true; shadows.dirty = true;
    brass.forEach((n, i) => { const turn = smoother(clamp((offT - 0.2 - i * 0.12) / 1.4, 0, 1)), play = offK * Math.sin(now * 5.2 + i * 0.6);
      n.rotation.y = n.userData.ry + turn * (i % 2 ? 2.7 : -2.5); n.rotation.x = n.userData.rx + play * 0.035; n.position.y = n.userData.y0 + Math.max(0, play) * 0.02; });
    // the conductor lowers the baton once the brass has turned away
    if (typeof conductor !== "undefined" && conductor && conductor.attached && !reduceMQ.matches) {
      const k = smoother(clamp((offT - 2.0) / 1.2, 0, 1)) * offK, beat = Math.sin(now * 2.2) * (1 - k), sway = Math.sin(now * 1.1) * (1 - k);
      if (k > 0.001) poseArms(conductor, dir, { l: V(lerp(0.32, 0.24, k), lerp(1.32 + Math.sin(now * 2.2 + 1) * 0.05, 0.9, k), lerp(0.36, 0.1, k)), r: V(lerp(-0.34 + sway * 0.06, -0.24, k), lerp(1.36 + beat * 0.1, 0.92, k), lerp(0.4, 0.14, k)) }, beat, { l: 0.25, r: 0.75 }, V(0.25 * k, 1, 0.1 + 0.15 * k));
    }
  }
  /* ---------- fewer draw calls: meshes that always fade together are merged per material (site only; the model page keeps every part clickable) ---------- */
  // Units (what fades or moves as one; docs/perf.md, phase 4): each brass player and each melody player on its own, every other section as a whole,
  // the stands without the conductor's, his stand, the audience, the rehearsal (without its live conductor), the box office and the stage.
  // Inside a unit, meshes merge per kind (body, instrument, chair: glow and grey work per kind) and per identical material. The first material of
  // each group is kept as it is (a copy would lose its shader hooks); tinted clothes move their tint from the material to the vertices.
  const merged = { orch: false, aud: false }, KIND = { Instrument: "Instrument", Stoel: "Stoel", Lichaam: "Lichaam", Persoon: "Lichaam" };
  const matKey = o => { const x = o.material; return [x.type, x.map && x.map.uuid, x.alphaMap && x.alphaMap.uuid, x.color && x.color.getHexString(), x.emissive && x.emissive.getHexString(), x.emissiveIntensity,
    x.roughness, x.metalness, x.side, x.alphaTest, x.envMapIntensity, !!x.userData.tint, x.onBeforeCompile.toString(), o.castShadow, o.renderOrder, !!o.geometry.attributes.uv].join("|"); };
  function tintPerVertex(mat) {   // the tintBody recolouring, with the tint read from the vertices (one material for many people)
    mat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n attribute vec3 tintC; varying vec3 vTint;").replace("#include <begin_vertex>", "#include <begin_vertex>\n vTint = tintC;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n varying vec3 vTint;").replace("#include <map_fragment>", `#include <map_fragment>
        { vec3 c = diffuseColor.rgb; float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), sat = (mx - mn) / max(mx, 1e-4);
          float k = (1.0 - smoothstep(0.03, 0.06, mx)) * (1.0 - smoothstep(0.3, 0.5, sat));
          diffuseColor.rgb = mix(c, vTint * clamp(mx / 0.009, 0.45, 1.5), k); }`); };
    mat.customProgramCacheKey = () => "tintv"; mat.needsUpdate = true;
  }
  function flatGeometry(o, M, tint) {   // float copy of position, normal and uv in the unit's space; mirrored parts get their triangles turned back
    const g = o.geometry, out = new THREE.BufferGeometry(), n = g.attributes.position.count;
    for (const k of ["position", "normal", "uv"]) { const a = g.attributes[k]; if (!a) continue; const f = new Float32Array(n * a.itemSize);
      for (let i = 0; i < n; i++) { f[i * a.itemSize] = a.getX(i); f[i * a.itemSize + 1] = a.getY(i); if (a.itemSize > 2) f[i * a.itemSize + 2] = a.getZ(i); }
      out.setAttribute(k, new THREE.BufferAttribute(f, a.itemSize)); }
    if (tint) { const c = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.set([tint.r, tint.g, tint.b], i * 3); out.setAttribute("tintC", new THREE.BufferAttribute(c, 3)); }
    const idx = g.index ? Array.from(g.index.array) : Array.from({ length: n }, (_, i) => i);
    if (M.determinant() < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    out.setIndex(idx); out.applyMatrix4(M); return out;
  }
  function mergeUnit(root, skip) {
    root.updateMatrixWorld(true); const inMeshes = new Set(meshes), groups = new Map(), toRoot = root.matrixWorld.clone().invert();
    root.traverse(o => { if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || Array.isArray(o.material) || !inMeshes.has(o) || (skip && skip(o))) return;
      let kind = ""; for (let n = o.parent; n && n !== root && !kind; n = n.parent) kind = KIND[n.name] || "";
      const key = kind + "|" + matKey(o); if (!groups.has(key)) groups.set(key, { kind, list: [] }); groups.get(key).list.push(o); });
    const gone = new Set();
    for (const { kind, list } of groups.values()) {
      if (list.length < 2) continue;
      const mat = list[0].material, tinted = !!mat.userData.tint;
      const geo = THREE.BufferGeometryUtils.mergeBufferGeometries(list.map(o => flatGeometry(o, toRoot.clone().multiply(o.matrixWorld), tinted && o.material.userData.tint)), false);
      if (!geo) continue;
      if (tinted) tintPerVertex(mat);
      const c = V(0, 0, 0); list.forEach(o => c.add(V(0, 0, 0).setFromMatrixPosition(o.matrixWorld))); c.divideScalar(list.length).applyMatrix4(toRoot);   // transparent meshes are sorted by their position: keep the parts' average,
      geo.translate(-c.x, -c.y, -c.z);                                                                                                                       // so the merged mesh is drawn in the same order (faded players behind the floor)
      const me = new THREE.Mesh(geo, mat); me.position.copy(c); me.name = (kind || root.name) + " · samengevoegd"; me.castShadow = list[0].castShadow; me.receiveShadow = true; me.renderOrder = list[0].renderOrder; me.visible = list[0].visible;
      let holder = root; if (kind) { holder = root.children.find(c => c.name === kind && c.userData.merged) || Object.assign(new THREE.Group(), { name: kind }); holder.userData.merged = true; if (!holder.parent) root.add(holder); }
      holder.add(me); meshes.push(me); if (list[0].userData.ownMat) me.userData.ownMat = true;   // the glow already keeps this material's own colours (glowMats)
      list.forEach(o => { gone.add(o); o.removeFromParent(); if (o.geometry !== BLOB_GEO) o.geometry.dispose(); if (o.material !== mat) { glowMats.delete(o.material); o.material.dispose(); } });
    }
    for (let i = meshes.length - 1; i >= 0; i--) if (gone.has(meshes[i])) meshes.splice(i, 1);
  }
  function mergeTick() {
    if (!merged.orch && window.__people && window.__people.MUS) {
      merged.orch = true;
      const solo = new Set(); orkest.traverse(n => { if (/^Muzikant · /.test(n.name)) { const name = n.name.slice(11); if (inSect(n, "Koper") || LINE1.has(name) || LINE2.has(name)) solo.add(n); } });
      const inside = (o, set) => { for (let n = o; n; n = n.parent) if (set.has(n)) return true; return false; };
      solo.forEach(n => mergeUnit(n)); orkest.children.forEach(sec => mergeUnit(sec, o => inside(o, solo)));
      const condStand = lessen.getObjectByName("Dirigent (partituur)"); mergeUnit(condStand); mergeUnit(lessen, o => inside(o, new Set([condStand])));
      mergeUnit(CHG, o => inside(o, new Set([dir2]))); mergeUnit(kassa); mergeUnit(pod);
    }
    if (!merged.aud && window.__audience && !window.__audience.failed) { merged.aud = true; mergeUnit(pub); }
  }
  function frameLoop() {
    const now = clock.getElapsedTime(), dt = Math.min(0.1, now - (frameLoop.last || now)); frameLoop.last = now;
    let kk = 1;
    if (anim) {
      anim.k = anim.dur ? clamp((now - anim.t0) / anim.dur, 0, 1) : 1; kk = smoother(anim.k);
      const E = STOPS[anim.to].cam, s = anim.start;
      camera.position.lerpVectors(s.pos, E.pos, kk); camTarget.lerpVectors(s.target, E.target, kk);
      { // the lens follows the framed size, not the angle: what is in view grows or shrinks steadily, without zooming out and back in between a long and a wide lens
        const ds = s.pos.distanceTo(s.target), de = E.pos.distanceTo(E.target), d = camera.position.distanceTo(camTarget), tn = f => Math.tan(THREE.MathUtils.degToRad(f / 2));
        if (Math.max(s.fov, E.fov) / Math.min(s.fov, E.fov) < 1.6) camera.fov = lerp(s.fov, E.fov, kk);   // a small lens change: as before
        else { const h = Math.exp(lerp(Math.log(ds * tn(s.fov)), Math.log(de * tn(E.fov)), kk)); camera.fov = clamp(THREE.MathUtils.radToDeg(2 * Math.atan(h / Math.max(d, 1e-3))), Math.min(s.fov, E.fov), Math.max(s.fov, E.fov)); } }
      if (anim.k >= 1) { anim = null; arrived = now; from = at; }
    }
    camera.lookAt(camTarget); camera.updateProjectionMatrix();
    const S = STOPS[at], F = STOPS[from], since = anim ? 0 : now - arrived, fSince = anim ? fromSince : since, mix = anim ? kk : 1;
    music.tick(S, since, !!anim);
    if (waitGo && (window.__audience || now - waitGo.since >= AUDIENCE_WAIT)) goTo(waitGo.i, waitGo.instant);   // the audience is in (or will not come): go now
    // auto-advance inside a sequence
    const Q = S.seq && SEQS[S.seq];
    if (Q && !paused && at < Q.last && (anim ? S.fw && sameCam(STOPS[at + 1].cam, STOPS[anim.to].cam) && now - started >= S.hold : now - arrived >= S.hold)) goTo(at + 1);   // the framework's steps don't wait for the camera; every other sequence goes on once it has arrived ("It isn't" dimmed the orchestra mid-flight)
    if (paused && Q) barStart += dt;
    if (held && !anim) arrived += dt;   // pause: the step's own clock stands still too (timed focus, its hold)
    { // the glass disc behind the diagram follows its circle: place, size and fade
      const o = +getComputedStyle(fwEl).opacity;
      if (o > 0.005) { const c = fwEl.querySelector(":scope > circle").getBoundingClientRect(), p = fwGlass.offsetParent.getBoundingClientRect();
        fwGlass.style.transform = `translate(${(c.left - p.left).toFixed(1)}px, ${(c.top - p.top).toFixed(1)}px)`; fwGlass.style.width = c.width.toFixed(1) + "px"; fwGlass.style.height = c.height.toFixed(1) + "px"; }
      fwGlass.style.opacity = o.toFixed(3);
    }
    { // the active segment fills with the progress through its steps
      let f = anim ? anim.k : 1;
      if (Q) { let done = 0, all = 0; Q.bars.forEach((d, b) => { all += d; if (b < S.bar) done += d; }); f = (done + clamp((now - barStart) / Q.bars[S.bar], 0, 1) * Q.bars[S.bar]) / all; }
      segFills[segOf(at)].style.transform = `scaleX(${f.toFixed(3)})`; tlDot.style.left = (f * 100).toFixed(2) + "%";
      if (Q && stepFills.length) stepFills.forEach((el, b) => { el.style.transform = `scaleX(${b < S.bar ? 1 : b > S.bar ? 0 : clamp((now - barStart) / Q.bars[S.bar], 0, 1).toFixed(3)})`; }); }   // the panel's bar per step
    // focus
    const ease = 1 - Math.exp(-dt * 7);
    // the audience and the grass (hidden in the opening) change only where nobody sees it: while the camera still sees their place during a move
    // they keep their opacity; out of view they switch at once; in view after arriving they fade
    seeFrustum.setFromProjectionMatrix(seeM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const inView = { audience: seeFrustum.intersectsBox(pubBox), grass: seeFrustum.intersectsBox(grassBox), board: seeFrustum.intersectsBox(boardBox) };
    for (const m of meshes) {
      const t = m.userData.tags || (m.userData.tags = tagsOf(m));
      const lit = anim && S.fadeLate ? litOf(F, t, fSince) : lerp(litOf(F, t, fSince), litOf(S, t, since), mix);   // fadeLate: the rest stays until the camera has arrived, then fades
      const fresh = m.userData.fadeIn, goal = FALLEN + (1 - FALLEN) * lit; let op = m.material.opacity + (goal - m.material.opacity) * (anim && !fresh ? 1 : ease);   // the late audience fades in, also during a camera move
      if (t.audience || t.grass || t.board) { const seen = t.audience ? inView.audience : t.grass ? inView.grass : inView.board;   // things that come and go between stops:
        const gF = FALLEN + (1 - FALLEN) * litOf(F, t, fSince), gS = FALLEN + (1 - FALLEN) * litOf(S, t, since);
        if (!seen) op = goal;                                                                                   // out of view: switch at once
        else if (anim && gS > gF) op = m.material.opacity;                                                      // appearing in view: wait until out of view or arrived
        else if (anim && gS < gF) op = lerp(gF, gS, smoother(clamp(anim.k * 2, 0, 1))); }                       // leaving in view: gone in the first half of the flight, while the camera moves fastest
      if (Math.abs(goal - op) < 0.002) { op = goal; m.userData.fadeIn = false; }   // land exactly on the goal; the old "skip steps under 0.0005" could stall a fade at 0.054, just above the cut-off, leaving people "visible" at 5 % and casting full shadows
      if (op !== m.material.opacity || fresh) { const was = m.visible, cast = m.castShadow; m.material.opacity = op; m.material.depthWrite = op > 0.5; m.visible = t.booth || t.grass ? op > 0.02 : op > FALLEN + 0.004 || !!t.env;
        if (m.userData.cast0 === undefined) m.userData.cast0 = m.castShadow; m.castShadow = m.userData.cast0 && op > 0.5;   // a faded figure leaves no shadow behind
        if ((m.visible !== was && cast) || m.castShadow !== cast) shadows.dirty = true; }   // late arrivals (fresh) always get their visibility set once: at opacity 0 with a goal of 0 nothing else would
    }
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.clearRect(0, 0, vw, vh);
    drawMelody(now, dt); drawChaos(now, dt); glowTick(dt); placeBeats(); arcTick(now);
    windU.value = now; tickPeople(now); tension(now, dt);
    if (document.body.classList.contains("is-loading") && now - (frameLoop.drawn || -1) < 0.25) return;   // behind the loader nobody sees the scene: draw it 4 times a second, so slow devices load sooner
    mergeTick(); frameLoop.drawn = now; shadowTick(now); film.render();
  }

  function resize() {
    vw = stage.clientWidth; vh = stage.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setSize(vw, vh, false); film.setSize(vw, vh);
    fx.width = Math.round(vw * dpr); fx.height = Math.round(vh * dpr);
    camera.aspect = vw / vh; camera.zoom = Math.min(1, camera.aspect / 1.2);   // portrait screens: widen the view
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();
  camera.position.copy(STOPS[0].cam.pos); camera.fov = STOPS[0].cam.fov; applyStop(STOPS[0]);
  renderer.setAnimationLoop(frameLoop);
  { // loader: follow the people loader (people.glb in, then placed), then fade in and start the opening
    const loader = $("#loader"), pct = $("#loaderPct"), note = $("#loading");
    let shown = 0, doneAt = 0, last = performance.now();
    const tick = () => {
      const tNow = performance.now(), dt = Math.min(0.5, (tNow - last) / 1000); last = tNow;
      const ready = !!window.__people || /could not/.test(note.textContent);
      let goal = 0.04 + 0.96 * (window.__peopleProgress || 0);   // people.glb: bytes in (to 70 %), decoded (80 %), placed (100 %)
      if (ready) goal = 1;
      shown = Math.min(goal, shown + Math.max(dt * (ready ? 1.5 : 0.05), (goal - shown) * (1 - Math.exp(-dt * 5))));
      pct.textContent = Math.round(shown * 100) + "%";
      if (ready && shown > 0.995) {
        if (!doneAt) doneAt = performance.now();
        if (performance.now() - doneAt > 250) {
          loader.classList.add("is-done"); document.body.classList.remove("is-loading"); document.body.classList.add("is-ready"); setTimeout(music.ask, 1800);   // then: sound on?
          // no replay of the opening text: it already sits exactly under the loader text, so the hand-over is seamless
          return;
        }
      }
      requestAnimationFrame(tick);
    };
    tick();
  }
  // tuning hook: __story.go(i) jumps to a stop, __story.stops lists them
  window.__story = { go: i => goTo(typeof i === "string" ? idx(i) : i, true), stops: STOPS, pause: setPaused, hold: setHeld, sound: () => music.probe() };   // hold: the visitor's pause button
  window.__scene = { root, camera, view: (pos, target) => { anim = null; camera.position.copy(pos); camTarget.copy(target); } };
})();
</script>
</body>
</html>

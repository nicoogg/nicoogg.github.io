/* nicoogg portfolio · dot-matrix map, project blocks, small panel widgets */
(() => {
  "use strict";

  /* ───────── projects shown on the map (model space: 1000 × 700) ───────── */
  const PROJECTS = [
    { id: "corvex", no: "01", name: "corvex", x: 585, y: 165, size: 150, rot: 225, lab: [500, 120], labM: [610, 95],
      status: "In development", color: "#3ddc84",
      text: "Security agents powered by corvexai, our own AI that runs locally. They test dashboards, code and computers, find the gaps and fix them.",
      links: [["Website", "https://corvexdevelops.github.io/"], ["GitHub", "https://github.com/CorvexDevelops"]] },
    { id: "wantdownload", no: "02", name: "wantdownload", x: 255, y: 185, size: 140, rot: 135, lab: [345, 110], labM: [290, 95],
      status: "Live", color: "#2f6bff",
      text: "A web app to save YouTube videos as MP3 or MP4, with an account to find your downloads again.",
      links: [["Open app", "https://wantdownload.vercel.app/app"]] },
    { id: "gsloft", no: "03", name: "GS Loft", x: 230, y: 470, size: 140, rot: 45, lab: [355, 430],
      status: "Work · developer", color: "#f5a524",
      text: "My day job. Internal portals, data tools, bots and integrations that keep the company running.",
      links: [["GS-Loft-Dev", "https://github.com/GS-Loft-Dev"]] },
    { id: "corvexai", no: "04", name: "corvexai", x: 640, y: 560, size: 130, rot: 315, lab: [520, 625],
      status: "In development", color: "#3ddc84",
      text: "Our own AI model, built in-house for one job: security. 4B parameters, runs on your machine on 127.0.0.1, no question ever leaves. It powers CORVUS and the ORACLE code audit inside Corvex.",
      links: [["corvexai page", "https://corvexdevelops.github.io/corvexai.html"], ["Open source", "https://github.com/CorvexDevelops"]] },
    { id: "corvex-code", no: "06", name: "corvex-code", x: 845, y: 150, size: 112, rot: 135, lab: [868, 64], labM: [770, 66],
      status: "Live · v0.1", color: "#B69CFF", accent: "#B69CFF",
      text: "The executable code editor from Corvex: runs Python, JS, C, Go, Rust and more on your machine, chains scripts into flows, puts Claude Code, Codex and Gemini next to the code, and Corvex flags issues as you type. Portable for macOS and Windows, updates itself.",
      links: [["Page", "https://corvexdevelops.github.io/corvex-code.html"], ["Download", "https://github.com/CorvexDevelops/corvex-code-releases/releases/latest"]] },
    { id: "you", no: "05", name: "your idea", x: 860, y: 360, size: 130, rot: 225, ghost: true, lab: [870, 470], labM: [790, 480],
      status: "Open slot", color: "#fff",
      text: "Have a project in mind? Get in touch on GitHub and let's build it.",
      links: [["Say hi", "https://github.com/nicoogg"]] },
  ];
  const AVATAR = { x: 500, y: 350, size: 190 };

  const map = document.getElementById("map");
  const canvas = document.getElementById("dots");
  const ctx = canvas.getContext("2d");
  const svg = document.getElementById("shapes");
  const labels = document.getElementById("labels");
  const pop = document.getElementById("pop");
  const panel = document.querySelector(".panel");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ───────── helpers ───────── */
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const smooth = t => t * t * (3 - 2 * t);
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }
  const GLYPHS = "0123456789ABCDEF#:/<>=+";
  function scramble(el, text, dur = 520) {
    if (!el) return;
    if (reduce) { el.textContent = text; return; }
    cancelAnimationFrame(el._raf);
    const start = performance.now();
    const step = now => {
      const p = Math.max(0, Math.min(1, (now - start) / dur)), lock = Math.floor(p * text.length);
      let out = text.slice(0, lock);
      for (let i = lock; i < text.length; i++) out += text[i] === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      el.textContent = out;
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }
  const ease = t => 1 - Math.pow(1 - t, 3);

  // L-shaped block, centred, unit size 100
  const L = [[-50, -50], [-6, -50], [-6, 6], [50, 6], [50, 50], [-50, 50]];
  function blockPoints(p) {
    const r = p.rot * Math.PI / 180, k = p.size / 100, c = Math.cos(r), s = Math.sin(r);
    return L.map(([x, y]) => [p.x + (x * c - y * s) * k, p.y + (x * s + y * c) * k]);
  }

  /* ───────── layout: where model space sits on screen ───────── */
  let W = 0, H = 0, S = 1, OX = 0, OY = 0, dpr = 1, STACKED = false;
  function layout() {
    const r = map.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
    const stacked = STACKED = getComputedStyle(map).position === "relative";
    const left = stacked ? 0 : panel.getBoundingClientRect().right;
    const aw = W - left, ah = H;
    if (stacked) { S = Math.min(aw / 780, ah / 700); OX = aw / 2 - 535 * S; }   // phones: crop the empty sides
    else { S = Math.min(aw / 1000, ah / 700) * .98; OX = left + (aw - 1000 * S) / 2; }
    OY = (ah - 700 * S) / 2;
    map.style.setProperty("--pl", left + "px");
  }
  const toScreen = (x, y) => [OX + x * S, OY + y * S];
  const toModel = (x, y) => [(x - OX) / S, (y - OY) / S];
  const labPos = p => { const [x, y] = toScreen(...(STACKED && p.labM ? p.labM : p.lab)); return [x, y]; };

  /* ───────── dots ───────── */
  const base = document.createElement("canvas");
  const bctx = base.getContext("2d");
  let avatarPx = null; // brightness samples of the avatar

  function loadAvatar() {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        // max-pool a large copy so the thin contour lines survive as dots
        const big = 400, n = 80, k = big / n, c = document.createElement("canvas"); c.width = c.height = big;
        const g = c.getContext("2d"); g.drawImage(img, 0, 0, big, big);
        try {
          const d = g.getImageData(0, 0, big, big).data, out = new Float32Array(n * n);
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
            let m = 0, sum = 0;
            for (let y = j * k; y < (j + 1) * k; y++) for (let x = i * k; x < (i + 1) * k; x++) { const o = (y * big + x) * 4, v = (d[o] + d[o + 1] + d[o + 2]) / 765; if (v > m) m = v; sum += v; }
            out[j * n + i] = m * .6 + (sum / (k * k)) * 1.6;
          }
          avatarPx = { n, out };
        } catch (e) { avatarPx = null; } // file:// can taint the canvas: the map still draws
        res();
      };
      img.onerror = () => res();
      img.src = "assets/avatar.png";
    });
  }

  function drawBase() {
    base.width = canvas.width = Math.round(W * dpr);
    base.height = canvas.height = Math.round(H * dpr);
    const g = bctx; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    seed = 7;
    const cell = Math.max(4, Math.round(5 * Math.min(1.25, Math.max(.8, S * 1.15))));
    const ang = -32 * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
    const ghosts = PROJECTS.filter(p => p.ghost).map(p => { const pth = new Path2D(); blockPoints(p).forEach(([x, y], i) => { const [sx, sy] = toScreen(x, y); i ? pth.lineTo(sx, sy) : pth.moveTo(sx, sy); }); pth.closePath(); return pth; });
    const av = AVATAR, [ax0, ay0] = toScreen(av.x - av.size / 2, av.y - av.size / 2), asz = av.size * S;

    for (let y = cell / 2; y < H; y += cell) {
      for (let x = cell / 2; x < W; x += cell) {
        const [mx, my] = toModel(x, y);
        // keep the avatar square for later
        if (x > ax0 - 2 && x < ax0 + asz + 2 && y > ay0 - 2 && y < ay0 + asz + 2) continue;
        const u = mx * ca - my * sa, v = mx * sa + my * ca;
        const du = Math.abs(((u % 95) + 95) % 95 - 47.5), dv = Math.abs(((v % 95) + 95) % 95 - 47.5);
        const street = du > 45.5 || dv > 45.5;
        const lane = Math.abs(((u % 31.6) + 31.6) % 31.6 - 15.8) > 15 || Math.abs(((v % 31.6) + 31.6) % 31.6 - 15.8) > 15;
        const ring = Math.abs(Math.hypot(mx - 500, my - 350) - 300) < 2.2;
        const holes = noise(mx / 22 + 40, my / 22) > .74;
        const n = noise(mx / 70, my / 70) * .6 + noise(mx / 16 + 9, my / 16) * .4;
        let a = 0, sz = 0;
        if (ghosts.some(p => g.isPointInPath(p, x * dpr, y * dpr))) { a = .55 + rnd() * .45; sz = 1.8; }
        else if (ring && rnd() < .8) { a = .7; sz = 1.3; }
        else if (street && rnd() < .9) { a = .65 + rnd() * .35; sz = 1.4; }
        else if (holes) continue;
        else if (lane && rnd() < .45) { a = .35; sz = 1.1; }
        else if (rnd() < Math.pow(n, 2.6) * 1.5) { a = .25 + n * .7; sz = 1 + n; }
        // glow around the avatar block
        const dx = Math.max(ax0 - x, 0, x - ax0 - asz), dy = Math.max(ay0 - y, 0, y - ay0 - asz), dd = Math.hypot(dx, dy) / S;
        if (dd < 55 && rnd() < (1 - dd / 55) * .9) { a = Math.max(a, .85 - dd / 90); sz = Math.max(sz, 1.6); }
        if (!a) continue;
        g.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
        g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
    }

    // avatar, dithered into dots
    const step = Math.max(2.5, asz / 80);
    for (let y = 0; y < asz; y += step) {
      for (let x = 0; x < asz; x += step) {
        let b = .12 + rnd() * .12;
        if (avatarPx) { const i = Math.floor(y / asz * avatarPx.n) * avatarPx.n + Math.floor(x / asz * avatarPx.n); b = Math.max(b * .6, Math.min(1, avatarPx.out[i])); }
        const sz = Math.min(step * .95, .5 + b * step);
        g.fillStyle = `rgba(255,255,255,${Math.min(1, .35 + b).toFixed(2)})`;
        g.fillRect(ax0 + x + (step - sz) / 2, ay0 + y + (step - sz) / 2, sz, sz);
      }
    }
    g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 1; g.strokeRect(ax0 + .5, ay0 + .5, asz - 1, asz - 1);
    twinkles = Array.from({ length: 260 }, () => [Math.floor(rnd() * W / cell) * cell + cell / 2, Math.floor(rnd() * H / cell) * cell + cell / 2, rnd() * 6.28, 1 + rnd() * 1.2]);
  }

  let twinkles = [], boot = 0, ripples = [];
  const mouse = { x: 0, y: 0, in: false };
  function frame(t) {
    if (!boot) boot = t;
    t = Math.max(t, boot);  // a rAF timestamp can be a little older than performance.now()
    const [cx, cy] = toScreen(AVATAR.x, AVATAR.y), maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
    const intro = reduce ? 1 : Math.min(1, (t - boot) / 1700), r = ease(intro) * maxR;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (intro < 1) {
      ctx.save(); ctx.beginPath(); ctx.arc(cx * dpr, cy * dpr, r * dpr, 0, 7); ctx.clip();
      ctx.drawImage(base, 0, 0); ctx.restore();
    } else ctx.drawImage(base, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (intro < 1) { ctx.strokeStyle = `rgba(255,255,255,${(1 - intro) * .8})`; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    // spotlight: dots under the cursor light up
    if (mouse.in) {
      ctx.save(); ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 120, 0, 7); ctx.clip();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .85; ctx.drawImage(base, 0, 0);
      ctx.restore(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.setLineDash([1, 4]); ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 120, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
    // click ripples
    ripples = ripples.filter(rp => t - rp.t < 1100 && t >= rp.t);
    for (const rp of ripples) {
      const q = (t - rp.t) / 1100, rr = ease(q) * 220;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - q) * .8})`; ctx.lineWidth = 1.2; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.arc(rp.x, rp.y, Math.max(0, rr), 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(rp.x, rp.y, Math.max(0, rr * .55), 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255,255,255,${1 - q})`; ctx.fillRect(rp.x - 2, rp.y - 2, 4, 4);
    }
    if (reduce) return;
    // radar pulse from the avatar every few seconds
    const pr = ((t - boot) % 4200) / 4200;
    if (intro >= 1) { ctx.strokeStyle = `rgba(255,255,255,${(.5 * (1 - pr)).toFixed(3)})`; ctx.lineWidth = 1; ctx.setLineDash([1, 5]); ctx.beginPath(); ctx.arc(cx, cy, AVATAR.size * S * .7 + pr * 420 * S, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    // scan line across the avatar
    const asz = AVATAR.size * S, ax = cx - asz / 2, ay = cy - asz / 2, sp = ((t - boot) % 3000) / 3000;
    if (sp < .75) { const yy = ay + (sp / .75) * asz, gr = ctx.createLinearGradient(0, yy - 26, 0, yy);
      gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(255,255,255,.16)"); ctx.fillStyle = gr; ctx.fillRect(ax, yy - 26, asz, 26);
      ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(ax, yy, asz, 1); }
    // data packets travelling between the avatar and each project
    if (intro >= 1) PROJECTS.forEach((p, i) => {
      if (p.ghost) return;
      const [bx, by] = toScreen(p.x, p.y), d = Math.hypot(bx - cx, by - cy);
      for (let k = 0; k < 2; k++) {
        let q = (((t - boot) / (1400 + d * 4)) + i * .27 + k * .5) % 1; if (k) q = 1 - q;  // one packet out, one back
        const x = cx + (bx - cx) * q, y = cy + (by - cy) * q;
        ctx.fillStyle = p.accent ? (k ? p.accent + "8c" : p.accent) : (k ? "rgba(255,255,255,.55)" : "#fff"); ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    });
    for (const [x, y, ph, sz] of twinkles) {
      const a = Math.max(0, Math.sin(t / 900 + ph)) ** 6;
      if (a < .05) continue;
      ctx.fillStyle = `rgba(255,255,255,${(a * .9).toFixed(2)})`;
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
  }
  let last = 0;
  function loop(t) { if (t - last > 30) { frame(t); last = t; } requestAnimationFrame(loop); }

  /* ───────── blocks + labels ───────── */
  function drawShapes() {
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    labels.innerHTML = "";
    const [cx, cy] = toScreen(AVATAR.x, AVATAR.y);
    PROJECTS.forEach(p => { if (!p.ghost) { const [bx, by] = toScreen(p.x, p.y); svg.insertAdjacentHTML("beforeend", `<line class="wire" x1="${cx}" y1="${cy}" x2="${bx}" y2="${by}"/>`); } });
    svg.classList.toggle("intro", firstDraw);
    PROJECTS.forEach((p, i) => {
      const pts = blockPoints(p).map(([x, y]) => toScreen(x, y).map(v => v.toFixed(1)).join(",")).join(" ");
      if (!p.ghost) {
        const gEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
        gEl.setAttribute("class", "blk"); gEl.dataset.id = p.id;
        gEl.style.setProperty("--i", i);
        gEl.innerHTML = `<path class="o" pathLength="1" d="M${pts}Z" fill="#0d0d0d" stroke="${p.accent || "#fff"}" stroke-width="1.6" stroke-linejoin="miter"/>`;
        if (p.accent) gEl.style.setProperty("--acc", p.accent);
        // a soft grain inside the block
        gEl.innerHTML += `<path d="M${pts}Z" fill="url(#grain)" pointer-events="none"/>`;
        svg.appendChild(gEl);
      } else {
        const gEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
        gEl.setAttribute("class", "blk ghost"); gEl.dataset.id = p.id;
        gEl.innerHTML = `<path class="o" d="M${pts}Z" fill="transparent" stroke="rgba(255,255,255,.55)" stroke-width="1" stroke-dasharray="2 3"/>`;
        svg.appendChild(gEl);
      }
      const [lx, ly] = labPos(p);
      const el = document.createElement("div");
      el.className = firstDraw ? "lab intro" : "lab"; if (p.accent) { el.style.setProperty("--acc", p.accent); el.classList.add("acc"); } el.dataset.id = p.id; el.style.setProperty("--i", i);
      el.style.left = lx + "px"; el.style.top = ly + "px";
      el.style.fontSize = Math.max(10, Math.min(15, 14 * S)) + "px";
      el.innerHTML = `<span class="no">№</span><span class="nm">${p.no} ${p.name}</span><small>${p.status}</small>`;
      const nm = el.querySelector(".nm"), txt = nm.textContent;
      if (firstDraw) { nm.textContent = ""; setTimeout(() => scramble(nm, txt, 700), i * 140 + 1000); }
      el.addEventListener("mouseenter", () => scramble(nm, txt, 380));
      labels.appendChild(el);
      // keep every label fully on screen
      const hw = (firstDraw ? measure(el, txt) : el.offsetWidth) / 2 + 8; el.style.left = Math.max(hw, Math.min(W - hw, lx)) + "px";
    });
    firstDraw = false;
    svg.insertAdjacentHTML("afterbegin", `<defs><pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="rgba(255,255,255,.07)"/></pattern></defs>`);
  }

  let firstDraw = !reduce;
  function measure(el, txt) { const nm = el.querySelector(".nm"), keep = nm.textContent; nm.textContent = txt; const w = el.offsetWidth; nm.textContent = keep; return w; }

  /* ───────── popup ───────── */
  let current = null;
  function open(id) {
    const p = PROJECTS.find(q => q.id === id); if (!p) return;
    current = id;
    document.querySelectorAll("[data-id]").forEach(e => e.classList.toggle("on", e.dataset.id === id));
    pop.innerHTML = `<h3><span style="font-size:.6em;vertical-align:.4em">№</span>${p.no} ${p.name}</h3>
      <span class="st" style="--c:${p.color}"><i></i>${p.status}</span>
      <p>${p.text}</p>
      <div class="go"><span>${p.links.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${t} ↗</a>`).join(" &nbsp; ")}</span><button class="close" aria-label="Close">×</button></div>`;
    pop.hidden = false;
    pop.style.animation = "none"; void pop.offsetWidth; pop.style.animation = "";
    scramble(pop.querySelector("p"), p.text, 600);
    place();
  }
  function place() {
    if (!current || pop.hidden) return;
    const p = PROJECTS.find(q => q.id === current);
    let [x, y] = labPos(p);
    const w = pop.offsetWidth, h = pop.offsetHeight;
    x = x + 40; y = y - h / 2;
    if (x + w > W - 16) x = labPos(p)[0] - w - 40;
    const minX = getComputedStyle(map).position === "relative" ? 12 : panel.getBoundingClientRect().right + 12;
    x = Math.max(minX, Math.min(W - w - 12, x)); y = Math.max(70, Math.min(H - h - 12, y));
    pop.style.left = x + "px"; pop.style.top = y + "px";
  }
  function close() { current = null; pop.hidden = true; document.querySelectorAll("[data-id].on").forEach(e => e.classList.remove("on")); }
  map.addEventListener("click", e => {
    if (e.target.closest(".close")) return close();
    if (e.target.closest(".top-right, .ticker, .term")) return;
    const hit = e.target.closest("[data-id]");
    if (hit) open(hit.dataset.id);
    else if (!e.target.closest(".pop")) { close(); if (!reduce) ripples.push({ x: mouse.x, y: mouse.y, t: performance.now() }); }
  });

  /* ───────── map: cursor, crosshair, parallax, keys ───────── */
  const world = document.getElementById("world"), xh = document.getElementById("xh"), xhTxt = document.getElementById("xhTxt");
  const order = PROJECTS.map(p => p.id);
  map.addEventListener("mousemove", e => {
    const cr = canvas.getBoundingClientRect(), mr = map.getBoundingClientRect();
    mouse.x = e.clientX - cr.left; mouse.y = e.clientY - cr.top; mouse.in = !e.target.closest(".top-right, .pop, .ticker, .notes, .term");
    const lx = e.clientX - mr.left, ly = e.clientY - mr.top;
    xh.hidden = !mouse.in; xh.style.setProperty("--x", lx + "px"); xh.style.setProperty("--y", ly + "px");
    const [mx, my] = toModel(mouse.x, mouse.y);
    let near = null, nd = 1e9; PROJECTS.forEach(p => { const d = Math.hypot(p.x - mx, p.y - my); if (d < nd) { nd = d; near = p; } });
    xhTxt.textContent = `x ${String(Math.round(mx)).padStart(4, "0")} · y ${String(Math.round(my)).padStart(4, "0")} → №${near.no} ${Math.round(nd)}m`;
    if (!reduce && !STACKED) { const k = 12; world.style.transform = `translate(${(-(lx / mr.width - .5) * k).toFixed(1)}px, ${(-(ly / mr.height - .5) * k).toFixed(1)}px)`; }
  }, { passive: true });
  map.addEventListener("mouseleave", () => { mouse.in = false; xh.hidden = true; world.style.transform = ""; });
  addEventListener("keydown", e => {
    if (e.target.closest && e.target.closest("input, textarea")) return;
    if (e.key === "Escape") { close(); closeMenus(); return; }
    const t = document.getElementById("term");
    if (t && !t.classList.contains("min")) return;  // the open terminal takes the keyboard
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= PROJECTS.length) return open(order[n - 1]);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const i = current ? order.indexOf(current) : -1, d = e.key === "ArrowRight" ? 1 : -1;
      open(order[(i + d + order.length) % order.length]);
    }
  });
  function highlight(id, on) {
    document.querySelectorAll(`[data-id="${id}"]`).forEach(el => el.classList.toggle("on", on || current === id));
  }

  /* ───────── panel widgets ───────── */
  const clock = document.getElementById("clock");
  function tick() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short", hourCycle: "h23" }).formatToParts(new Date()).map(p => [p.type, p.value]));
    const h = +parts.hour, on = !["Sat", "Sun"].includes(parts.weekday) && h >= 9 && h < 18;
    clock.innerHTML = `<i class="live${on ? "" : " off"}"></i>${parts.hour}:${parts.minute}:${parts.second} CET · ${on ? "on duty" : "off"}`;
  }
  tick(); setInterval(tick, 1000);

  // flow diagram: zoom with the buttons or the wheel, drag to pan
  let z = 1, px = 0, py = 0; const flow = document.getElementById("flow"), fg = document.getElementById("flowg"), zv = document.getElementById("zval");
  const applyFlow = () => { fg.style.transform = `translate(${px}px, ${py}px) scale(${z})`; zv.textContent = Math.round(z * 100) + "%"; };
  const setZ = v => { z = Math.max(.6, Math.min(2.2, v)); applyFlow(); };
  document.getElementById("zin").onclick = () => setZ(z + .2);
  document.getElementById("zout").onclick = () => setZ(z - .2);
  flow.addEventListener("wheel", e => { e.preventDefault(); setZ(z - Math.sign(e.deltaY) * .1); }, { passive: false });
  flow.addEventListener("pointerdown", e => {
    const k = 320 / flow.getBoundingClientRect().width, sx = e.clientX, sy = e.clientY, bx = px, by = py;
    flow.setPointerCapture(e.pointerId); flow.classList.add("dragging");
    const mv = ev => { px = Math.max(-160, Math.min(160, bx + (ev.clientX - sx) * k)); py = Math.max(-60, Math.min(60, by + (ev.clientY - sy) * k)); applyFlow(); };
    flow.addEventListener("pointermove", mv);
    flow.addEventListener("pointerup", () => { flow.classList.remove("dragging"); flow.removeEventListener("pointermove", mv); }, { once: true });
  });
  flow.addEventListener("dblclick", () => { z = 1; px = py = 0; applyFlow(); });

  // status menu: jump to any project on the map
  const statusBtn = document.getElementById("statusBtn"), statusMenu = document.getElementById("statusMenu"), statusTxt = document.getElementById("statusTxt");
  statusMenu.innerHTML = PROJECTS.map(p => `<button data-go="${p.id}"><span>№${p.no} ${p.name}</span><small>${p.status}</small></button>`).join("");
  function closeMenus() { statusMenu.hidden = true; statusBtn.setAttribute("aria-expanded", "false"); notes.hidden = true; bell.setAttribute("aria-expanded", "false"); }
  statusBtn.onclick = e => { e.stopPropagation(); const o = statusMenu.hidden; closeMenus(); statusMenu.hidden = !o; statusBtn.setAttribute("aria-expanded", String(o)); };
  statusMenu.onclick = e => {
    const b = e.target.closest("[data-go]"); if (!b) return;
    const p = PROJECTS.find(q => q.id === b.dataset.go); closeMenus();
    scramble(statusTxt, p.status.toLowerCase(), 420);
    if (STACKED) map.scrollIntoView({ behavior: "smooth" });
    open(p.id);
  };
  document.addEventListener("click", e => { if (!e.target.closest(".chip-wrap, .bell-wrap")) closeMenus(); });

  // panel items that point at a project light it up on the map
  panel.querySelectorAll("[data-hl]").forEach(el => {
    const id = el.dataset.hl;
    el.addEventListener("mouseenter", () => highlight(id, true));
    el.addEventListener("mouseleave", () => highlight(id, false));
    el.addEventListener("click", () => { if (STACKED) map.scrollIntoView({ behavior: "smooth" }); open(id); });
  });

  // count-up, replayed on hover
  function countUp(el, delay = 0) {
    if (reduce) return;
    const end = +el.dataset.count, dec = +(el.dataset.dec || 0), suf = el.dataset.suf || "";
    el.textContent = (0).toFixed(dec) + suf;
    setTimeout(() => { const t0 = performance.now(); const f = now => { const q = Math.min(1, (now - t0) / 1100); el.textContent = (end * ease(q)).toFixed(dec) + suf; if (q < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }, delay);
  }
  panel.querySelectorAll(".tile").forEach(t => t.addEventListener("mouseenter", () => { const b = t.querySelector("[data-count]"); if (b && !b._busy) { b._busy = 1; countUp(b); setTimeout(() => b._busy = 0, 1200); } }));

  // focus balance drifts a little, like a live 24h feed
  const FOCUS = [40, 35, 25];
  function drift() {
    const rows = document.querySelectorAll("#balance > div");
    const next = FOCUS.map(v => Math.max(10, v + (Math.random() * 10 - 5))), sum = next.reduce((a, b) => a + b, 0);
    next.forEach((v, i) => {
      const pct = Math.round(v / sum * 100), b = rows[i].querySelector("b"), old = parseInt(b.textContent.replace(/\D/g, ""), 10);
      b.className = pct > old ? "up" : pct < old ? "down" : "";
      b.textContent = "+" + pct + "%"; rows[i].querySelector("i").style.setProperty("--w", Math.min(100, pct * 2) + "%");
      FOCUS[i] = v;
    });
  }

  // soft light following the mouse over the cards, as in the Corvex dashboard
  panel.addEventListener("mousemove", e => {
    const c = e.target.closest(".card"); if (!c) return;
    const r = c.getBoundingClientRect(); c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });

  /* ───────── live GitHub activity: ticker + bell ───────── */
  const tickerEl = document.getElementById("ticker"), bell = document.getElementById("bell"), notes = document.getElementById("notes"), notesList = document.getElementById("notesList"), badge = document.getElementById("badge");
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ago = d => { const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 60 ? m + "m ago" : m < 1440 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago"; };
  function describe(e) {
    const r = e.repo.name, pl = e.payload || {};
    switch (e.type) {
      case "PushEvent": { const c = (pl.commits || [])[0]; return ["push", c ? c.message.split("\n")[0] : `${pl.size || pl.distinct_size || "new"} commit${(pl.size || 2) > 1 ? "s" : ""} to ${(pl.ref || "main").replace("refs/heads/", "")}`]; }
      case "CreateEvent": return ["create", `${pl.ref_type}${pl.ref ? " " + pl.ref : ""}`];
      case "WatchEvent": return ["star", "starred"];
      case "ForkEvent": return ["fork", "forked"];
      case "PublicEvent": return ["open", "made public"];
      case "ReleaseEvent": return ["release", (pl.release && pl.release.tag_name) || "new release"];
      case "PullRequestEvent": return ["pr", `${pl.action} pull request`];
      case "IssuesEvent": return ["issue", `${pl.action} issue`];
      default: return [e.type.replace("Event", "").toLowerCase(), "activity"];
    }
  }
  function fillActivity(list) {
    if (!list.length) list = [{ type: "PublicEvent", repo: { name: "nicoogg/nicoogg.github.io" }, created_at: new Date().toISOString(), payload: {} }];
    const items = list.slice(0, 14).map(e => { const [k, msg] = describe(e); return { k, msg, repo: e.repo.name, at: e.created_at }; });
    const run = items.map(i => `<a href="https://github.com/${esc(i.repo)}" target="_blank" rel="noopener"><b>${esc(i.k)}</b> → ${esc(i.repo)} · ${esc(i.msg)}<small>${ago(i.at)}</small></a>`).join("");
    tickerEl.innerHTML = run + run;
    tickerEl.style.setProperty("--dur", Math.max(30, items.length * 7) + "s");
    notesList.innerHTML = items.map((i, j) => `<a class="note" style="--j:${j}" href="https://github.com/${esc(i.repo)}" target="_blank" rel="noopener"><i></i><span><b>${esc(i.k)}</b> · ${esc(i.repo)}<br>${esc(i.msg)}<small>${ago(i.at)}</small></span></a>`).join("");
    const seen = +localStorage.getItem("nicoogg-seen") || 0, fresh = items.filter(i => new Date(i.at) > seen && Date.now() - new Date(i.at) < 7 * 864e5).length;
    if (fresh) { badge.textContent = fresh > 9 ? "9+" : fresh; badge.hidden = false; }
  }
  const eventsP = fetch("https://api.github.com/users/nicoogg/events/public?per_page=30").then(r => r.ok ? r.json() : []).catch(() => []);
  eventsP.then(fillActivity);
  bell.onclick = e => {
    e.stopPropagation(); const o = notes.hidden; closeMenus(); notes.hidden = !o; bell.setAttribute("aria-expanded", String(o));
    if (o) { badge.hidden = true; localStorage.setItem("nicoogg-seen", Date.now()); notesList.querySelectorAll(".note").forEach(n => { n.style.animation = "none"; void n.offsetWidth; n.style.animation = ""; }); }
  };

  /* ───────── boot screen ───────── */
  const bootEl = document.getElementById("boot"), bootLog = document.getElementById("bootlog"), bootBar = document.getElementById("bootbar");
  const LINES = [["> nicoogg.os", " v2.0"], ["> mounting map", " ......... <em>ok</em>"], ["> linking projects", " ..... <b>" + PROJECTS.length + "</b>"], ["> fetching activity", " ..... <em>live</em>"], ["> operator", " online"]];
  const bootDone = new Promise(res => {
    let finished = false;
    const finish = () => { if (finished) return; finished = true; bootBar.style.width = "100%"; bootEl.classList.add("done"); document.body.classList.remove("booting"); setTimeout(() => bootEl.remove(), 800); res(); };
    if (reduce || sessionStorage.getItem("nicoogg-booted")) { bootEl.remove(); document.body.classList.remove("booting"); return res(); }
    sessionStorage.setItem("nicoogg-booted", "1");
    bootEl.addEventListener("click", finish);
    LINES.forEach(([a, b], i) => setTimeout(() => {
      if (finished) return;
      const row = document.createElement("div"); bootLog.appendChild(row);
      const span = document.createElement("span"); row.appendChild(span);
      scramble(span, a, 220); setTimeout(() => row.insertAdjacentHTML("beforeend", b), 230);
      bootBar.style.width = ((i + 1) / LINES.length * 100) + "%";
    }, 120 + i * 260));
    setTimeout(finish, 120 + LINES.length * 260 + 350);
  });

  bootDone.then(() => {
    [...panel.children].forEach((el, i) => el.style.setProperty("--i", i));
    panel.querySelectorAll(".dec").forEach((el, i) => { const t = el.textContent; el.style.minWidth = el.getBoundingClientRect().width + "px"; setTimeout(() => scramble(el, t, 900), 150 + i * 220); setTimeout(() => { el.style.minWidth = ""; }, 1400 + i * 220); });
    panel.querySelectorAll("[data-count]").forEach((el, i) => countUp(el, 600 + i * 120));
    if (!reduce) setInterval(drift, 3500);
  });
  panel.querySelectorAll(".row > .card").forEach((el, i) => el.style.setProperty("--i", 2 + i));
  panel.querySelectorAll(".balance i").forEach((el, i) => el.style.setProperty("--k", i));

  /* ───────── API for the terminal (term.js) ───────── */
  window.NICO = {
    projects: PROJECTS, open, close, highlight, describe, ago, events: eventsP, boot: bootDone, scramble,
    get stacked() { return STACKED; },
    ping(id) {  // ripple on a project block
      const p = PROJECTS.find(q => q.id === id); if (!p) return false;
      const [x, y] = toScreen(p.x, p.y); ripples.push({ x, y, t: performance.now() });
      highlight(id, true); setTimeout(() => highlight(id, false), 900); return true;
    },
    pulse() { const [x, y] = toScreen(AVATAR.x, AVATAR.y); for (let i = 0; i < 3; i++) setTimeout(() => ripples.push({ x, y, t: performance.now() }), i * 220); },
    focusMap() { if (STACKED) map.scrollIntoView({ behavior: "smooth" }); },
  };
  document.dispatchEvent(new Event("nico:ready"));

  /* ───────── start ───────── */
  function render() { layout(); drawBase(); drawShapes(); frame(performance.now()); if (current) { const id = current; open(id); } }
  let rt; addEventListener("resize", () => { if (!boot) return; clearTimeout(rt); rt = setTimeout(render, 120); });
  // the map intro plays when the map comes into view (on phones it sits below the panel)
  Promise.all([loadAvatar(), bootDone]).then(() => {
    const go = () => { render(); if (!reduce) requestAnimationFrame(loop); };
    if (reduce || !("IntersectionObserver" in window)) return go();
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { threshold: .25 });
    io.observe(map);
  });
})();

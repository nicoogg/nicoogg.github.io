/* nicoogg portfolio · an interactive terminal that drives the map */
(() => {
  "use strict";
  const N = () => window.NICO;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = id => document.getElementById(id);
  const term = $("term"), out = $("tOut"), input = $("tIn"), promptEl = $("tPrompt"), ghost = $("tGhost"), body = $("tBody");
  const USER = "nicoogg", HOST = "dash";
  const BORN = new Date("2026-11-25T12:00:00Z");

  /* ───────── a tiny file system ───────── */
  const FS = {
    "~": { type: "dir", children: ["about.txt", "contact.txt", "stack.txt", "projects", ".secret"] },
    "~/about.txt": { type: "file", body: () => [
      "nicoogg · developer, Verona (IT)",
      "",
      "I build web apps, internal tools and automations by day",
      "and security software by night.",
      "Day job: developer at GS Loft. Side quest: corvex and corvexai,",
      "our own security AI model that runs locally.",
      "",
      "try: <c>ls projects</c>  <c>cat projects/corvex.md</c>  <c>neofetch</c>"] },
    "~/contact.txt": { type: "file", body: () => [
      "github ...... <a href='https://github.com/nicoogg' target='_blank' rel='noopener'>github.com/nicoogg</a>",
      "work ........ <a href='https://github.com/GS-Loft-Dev' target='_blank' rel='noopener'>github.com/GS-Loft-Dev</a>",
      "corvex ...... <a href='https://github.com/CorvexDevelops' target='_blank' rel='noopener'>github.com/CorvexDevelops</a>",
      "", "the fastest way to reach me: open an issue or say hi on GitHub."] },
    "~/stack.txt": { type: "file", body: () => [
      "languages ... Python · TypeScript · JavaScript · SQL",
      "web ......... Next.js · React · Node · static sites that load fast",
      "infra ....... Vercel · GitHub Actions · Supabase · Docker",
      "security .... SAST, secrets, CVE matching, local AI (corvexai)"] },
    "~/projects": { type: "dir", children: ["corvex.md", "corvexai.md", "wantdownload.md", "gsloft.md", "your-idea.md"] },
    "~/.secret": { type: "file", body: () => ["you found it.", "the real secret: ship small, ship often. ☕", "(type <c>matrix</c>)"] },
  };
  const projFile = { "corvex.md": "corvex", "wantdownload.md": "wantdownload", "gsloft.md": "gsloft", "corvexai.md": "corvexai", "your-idea.md": "you" };
  Object.entries(projFile).forEach(([f, id]) => {
    FS["~/projects/" + f] = { type: "file", project: id, body: () => {
      const p = N().projects.find(q => q.id === id);
      return [`<b>№${p.no} ${esc(p.name)}</b>  <span class="t-dim">[${esc(p.status)}]</span>`, "", esc(p.text), "",
        ...p.links.map(([t, u]) => `→ <a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`), "", `<c>open ${id}</c> to see it on the map`];
    } };
  });
  let cwd = "~";
  const resolve = path => {
    if (!path || path === "~") return "~";
    let parts = (path.startsWith("~") ? path : cwd + "/" + path).split("/").filter(Boolean);
    const outp = [];
    parts.forEach(x => { if (x === ".") return; if (x === "..") { if (outp.length > 1) outp.pop(); } else outp.push(x); });
    return outp.join("/") || "~";
  };

  /* ───────── output ───────── */
  let queue = Promise.resolve();
  const sleep = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  function line(html = "", cls = "") {
    const d = document.createElement("div");
    d.className = "t-line " + cls;
    // <c>cmd</c> becomes a clickable command
    d.innerHTML = html.replace(/<c>(.*?)<\/c>/g, (_, c) => `<button class="t-cmd" data-cmd="${c}">${c}</button>`) || "&nbsp;";
    out.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }
  async function stream(lines, delay = 14) { for (const l of lines) { line(l); await sleep(delay); } }
  async function typeOut(el, text, per = 12) { if (reduce) { el.textContent = text; return; } for (let i = 1; i <= text.length; i++) { el.textContent = text.slice(0, i); await sleep(per); } }
  const promptHTML = () => `<span class="t-u">${USER}@${HOST}</span>:<span class="t-p">${esc(cwd)}</span>$`;
  const renderPrompt = () => { promptEl.innerHTML = promptHTML(); };

  /* ───────── commands ───────── */
  const C = {};
  const cmd = (names, fn, help) => names.split(" ").forEach((n, i) => { C[n] = { fn, help: i ? null : help }; });

  cmd("help", async () => {
    const rows = Object.entries(C).filter(([, v]) => v.help).map(([k, v]) => `  <c>${k}</c>${" ".repeat(Math.max(1, 12 - k.length))}<span class="t-dim">${v.help}</span>`);
    await stream(["available commands:", ...rows, "", "<span class='t-dim'>tab completes · ↑ ↓ history · ctrl+l clears · ` toggles this window</span>"], 10);
  }, "this list");
  cmd("whoami", () => stream(["nicoogg — developer @ GS Loft, building corvex, shipping wantdownload.", "<span class='t-dim'>more: <c>cat about.txt</c></span>"]), "who is this");
  cmd("about", () => run("cat ~/about.txt", true), "short bio");
  cmd("ls dir", async args => {
    const flags = args.filter(a => a.startsWith("-")), path = resolve(args.find(a => !a.startsWith("-")) || cwd), node = FS[path];
    if (!node) return line(`ls: ${esc(path)}: no such file or directory`, "t-err");
    if (node.type === "file") return line(esc(path.split("/").pop()));
    const all = flags.some(f => f.includes("a")), long = flags.some(f => f.includes("l"));
    const items = node.children.filter(n => all || !n.startsWith("."));
    if (long) {
      line(`total ${items.length}`);
      return stream(items.map((n, i) => { const full = path + "/" + n, d = FS[full] && FS[full].type === "dir";
        const size = d ? 4096 : (FS[full].body().join("\n").length); return `${d ? "drwxr-xr-x" : "-rw-r--r--"}  nicoogg  ${String(size).padStart(5)}  Nov 25  <button class="t-cmd ${d ? "t-dir" : ""}" data-cmd="${d ? "cd " + n : "cat " + (path === cwd ? n : full)}">${esc(n)}${d ? "/" : ""}</button>`; }), 18);
    }
    line(items.map(n => { const full = path + "/" + n, d = FS[full] && FS[full].type === "dir"; return `<button class="t-cmd ${d ? "t-dir" : ""}" data-cmd="${d ? "cd " + n : "cat " + (path === cwd ? n : full)}">${esc(n)}${d ? "/" : ""}</button>`; }).join("   "));
  }, "list files (-a hidden, -l details)");
  cmd("cd", args => {
    const path = resolve(args[0] || "~"), node = FS[path];
    if (!node) return line(`cd: ${esc(args[0])}: no such directory`, "t-err");
    if (node.type !== "dir") return line(`cd: ${esc(args[0])}: not a directory`, "t-err");
    cwd = path; renderPrompt();
  }, "change directory");
  cmd("pwd", () => line(cwd.replace("~", "/home/nicoogg")), "where am I");
  cmd("cat less more", async args => {
    if (!args[0]) return line("usage: cat &lt;file&gt;", "t-err");
    const path = resolve(args[0]), node = FS[path];
    if (!node) return line(`cat: ${esc(args[0])}: no such file`, "t-err");
    if (node.type === "dir") return line(`cat: ${esc(args[0])}: is a directory`, "t-err");
    if (node.project) N().ping(node.project);
    await stream(node.body());
  }, "print a file");
  cmd("projects", async () => {
    await stream(N().projects.map((p, i) => `  <c>open ${p.id}</c>${" ".repeat(Math.max(1, 19 - p.id.length))}№${p.no} ${esc(p.name)} <span class="t-dim">· ${esc(p.status)}</span>`), 40);
    N().projects.forEach((p, i) => setTimeout(() => N().ping(p.id), i * 160));
  }, "list projects, ping them on the map");
  cmd("open", args => {
    const q = (args[0] || "").toLowerCase().replace(/\.md$/, "");
    const p = N().projects.find(x => x.id === q || x.name.toLowerCase() === q || x.no === q.replace("№", "").padStart(2, "0"));
    if (!p) return line(`open: unknown project '${esc(q)}' — try <c>projects</c>`, "t-err");
    N().focusMap(); N().open(p.id); N().ping(p.id);
    line(`opening №${p.no} ${esc(p.name)} on the map…`, "t-ok");
  }, "open a project on the map");
  cmd("ping", async args => {
    const p = N().projects.find(x => x.id === (args[0] || "").toLowerCase());
    if (!p) return line("usage: ping &lt;" + N().projects.map(x => x.id).join("|") + "&gt;", "t-err");
    line(`PING ${p.id}.nicoogg (10.0.0.${p.no * 1}): 56 data bytes`);
    for (let i = 0; i < 4; i++) { N().ping(p.id); await sleep(420); line(`64 bytes from ${p.id}: icmp_seq=${i} ttl=64 time=${(4 + Math.random() * 9).toFixed(1)} ms`); }
    line(`--- ${p.id} ping statistics --- 4 packets, 0% loss`, "t-ok");
  }, "ping a project block");
  cmd("scan nmap", async () => {
    line("starting scan of nicoogg.map …"); N().pulse(); await sleep(300);
    for (const p of N().projects) {
      N().ping(p.id); await sleep(260);
      const st = p.ghost ? "<span class='t-dim'>filtered</span>" : p.status.toLowerCase().includes("live") ? "<span class='t-ok'>open<\/span>" : p.status === "Soon" ? "<span class='t-dim'>closed<\/span>" : "<span class='t-warn'>building<\/span>";
      line(`  ${String(p.no).padStart(2, "0")}/tcp   ${st.padEnd(8)}   ${esc(p.name)}`);
    }
    line(`scan done: ${N().projects.length} hosts, 0 vulnerabilities (corvex says hi)`, "t-ok");
  }, "scan the map");
  cmd("neofetch fetch", async () => {
    const up = Math.max(0, Date.now() - BORN), d = Math.floor(up / 864e5), h = Math.floor(up / 36e5) % 24;
    const art = ["      ██      ", "  ██  ██  ██  ", "    ██████    ", "  ██  ██  ██  ", "      ██      ", "              ", "              ", "              ", "              "];
    const info = [`<b>${USER}</b>@<b>${HOST}</b>`, "---------------", `<span class="t-k">os</span>       nicoogg.os 2.0`, `<span class="t-k">host</span>     GS Loft`, `<span class="t-k">projects</span> ${N().projects.length} (1 live, 2 in dev)`, `<span class="t-k">ai</span>       corvexai 4B · local`,
      `<span class="t-k">uptime</span>   ${d}d ${h}h`, `<span class="t-k">shell</span>    portfolio-sh`, `<span class="t-k">stack</span>    python · ts · next.js`];
    await stream(art.map((a, i) => `<span class="t-art">${a}</span>  ${info[i] || ""}`), 30);
    line(["#000", "#444", "#888", "#ccc", "#fff", "#3ddc84", "#f5a524", "#6f9bff"].map(c => `<i class="t-sw" style="background:${c}"></i>`).join(""));
  }, "system info");
  cmd("git", async args => {
    if (args[0] !== "log") return line("git: try <c>git log</c>", "t-err");
    line("fetching github.com/nicoogg …", "t-dim");
    const ev = await N().events;
    if (!ev.length) return line("no public activity right now (or GitHub rate limit). try later.", "t-warn");
    await stream(ev.slice(0, 10).map(e => { const [k, m] = N().describe(e); return `<span class="t-warn">${esc(String(e.id).slice(-7))}</span> ${esc(k)} → <a href="https://github.com/${esc(e.repo.name)}" target="_blank" rel="noopener">${esc(e.repo.name)}</a> · ${esc(m)} <span class="t-dim">(${N().ago(e.created_at)})</span>`; }), 40);
  }, "live GitHub activity (git log)");
  cmd("contact hire email", () => run("cat ~/contact.txt", true), "how to reach me");
  cmd("stack", () => run("cat ~/stack.txt", true), "tools I use");
  cmd("github gh", () => { window.open("https://github.com/nicoogg", "_blank", "noopener"); line("opening github.com/nicoogg ↗", "t-ok"); }, "open my GitHub");
  cmd("theme", args => {
    const t = (args[0] || "").toLowerCase(), ok = ["mono", "green", "amber"];
    if (!ok.includes(t)) return line(`usage: theme &lt;${ok.join("|")}&gt; · now: ${term.dataset.theme || "mono"}`);
    term.dataset.theme = t; localStorage.setItem("nicoogg-theme", t); line(`theme set to ${t}`, "t-ok");
  }, "terminal colors: mono | green | amber");
  /* ───────── FIREWALL: a typing minigame ───────── */
  // Attacks fly from the right toward the core. Type an attack's name to block it before it hits.
  const ATTACKS = ["xss", "sqli", "rce", "csrf", "ssrf", "phish", "worm", "trojan", "botnet", "exploit", "payload", "rootkit", "spoof",
    "ddos", "zeroday", "malware", "inject", "backdoor", "keylog", "ransom", "bruteforce", "overflow", "sniffer", "hijack", "spyware", "leak"];
  let game = null;
  const charW = () => { const m = document.createElement("span"); m.textContent = "MMMMMMMMMM"; m.style.cssText = "position:absolute;visibility:hidden;white-space:pre"; out.appendChild(m); const w = m.getBoundingClientRect().width / 10; m.remove(); return w || 7; };
  function startGame(args) {
    if (game) return;
    if (args[0] === "--scores" || args[0] === "scores") return line(`best score: <b>${+localStorage.getItem("nicoogg-fw-best") || 0}</b>`);
    const cols = Math.max(26, Math.min(66, Math.floor((body.clientWidth - 30) / charW()))), rows = 9;
    line("<b>FIREWALL</b> <span class='t-dim'>· corvex defense drill</span>");
    line("type an attack's name to block it before it hits the core <span class='t-ok'>[■]</span>. <span class='t-dim'>esc quits.</span>");
    const hud = line(""), field = line("", "g-field"), msg = line("", "t-dim");
    const now = performance.now();
    game = { cols, rows, hud, field, msg, threats: [], booms: [], score: 0, kills: 0, level: 1, hp: 5, combo: 0, best: +localStorage.getItem("nicoogg-fw-best") || 0,
      last: now, spawnAt: now + 600, drawn: 0, hurtUntil: 0 };
    input.value = ""; ghost.textContent = ""; input.focus({ preventScroll: true });
    term.classList.add("gaming");
    return new Promise(res => { game.done = res; requestAnimationFrame(gameTick); });
  }
  function spawn(now) {
    const g = game, used = new Set(g.threats.map(t => t.w)), free = ATTACKS.filter(w => !used.has(w) && w.length <= 4 + g.level * 2);
    const w = free[Math.floor(Math.random() * free.length)] || ATTACKS[0];
    const busy = new Set(g.threats.filter(t => t.x > g.cols - 16).map(t => t.y));
    const rowsFree = [...Array(g.rows).keys()].filter(r => !busy.has(r));
    if (!rowsFree.length) return;
    g.threats.push({ w, x: g.cols, y: rowsFree[Math.floor(Math.random() * rowsFree.length)], v: .9 + Math.random() * .3 });
    g.spawnAt = now + Math.max(520, 2100 - g.level * 170) * (.8 + Math.random() * .4);
  }
  function gameTick(now) {
    const g = game; if (!g) return;
    const dt = Math.min(.1, (now - g.last) / 1000); g.last = now;
    if (now >= g.spawnAt) spawn(now);
    const speed = 2.6 + g.level * .9;
    for (const t of g.threats) t.x -= speed * t.v * dt;
    for (const t of g.threats.filter(t => t.x <= 5)) {
      g.threats.splice(g.threats.indexOf(t), 1);
      g.hp--; g.combo = 0; g.hurtUntil = now + 350; g.booms.push({ x: 4, y: t.y, t: now, hit: true });
      term.classList.remove("hurt"); void term.offsetWidth; term.classList.add("hurt");
      N().pulse();
      if (g.hp <= 0) return endGame("breach");
    }
    g.booms = g.booms.filter(b => now - b.t < 380);
    if (now - g.drawn > 45) { drawGame(now); g.drawn = now; }
    requestAnimationFrame(gameTick);
  }
  function drawGame(now) {
    const g = game, typed = input.value.trim().toLowerCase(), mid = Math.floor(g.rows / 2);
    const grid = [...Array(g.rows)].map(() => Array(g.cols).fill(" "));
    const cls = [...Array(g.rows)].map(() => Array(g.cols).fill(""));
    // locked target: the closest attack that starts with what you typed
    const lock = typed ? g.threats.filter(t => t.w.startsWith(typed)).sort((a, b) => a.x - b.x)[0] : null;
    for (let y = 0; y < g.rows; y++) { grid[y][4] = now < g.hurtUntil ? "▓" : "│"; cls[y][4] = now < g.hurtUntil ? "g-hurt" : "g-wall"; }
    for (let x = 6; x < g.cols; x += 4) for (let y = 0; y < g.rows; y += 2) if (grid[y][x] === " ") { grid[y][x] = "·"; cls[y][x] = "g-dot"; }
    ["[", "■", "]"].forEach((c, i) => { grid[mid][i] = c; cls[mid][i] = "g-core"; });
    for (const t of g.threats) {
      const x0 = Math.round(t.x);
      [...("◂" + t.w)].forEach((c, i) => {
        const x = x0 + i; if (x < 5 || x >= g.cols) return;
        grid[t.y][x] = c;
        cls[t.y][x] = t === lock ? (i > 0 && i <= typed.length ? "g-hit" : "g-lock") : "g-threat";
      });
    }
    for (const b of g.booms) ["✶", "·", "✶"].forEach((c, i) => { const x = Math.round(b.x) + i - 1; if (x >= 5 && x < g.cols) { grid[b.y][x] = c; cls[b.y][x] = b.hit ? "g-hurt" : "g-boom"; } });
    g.field.innerHTML = grid.map((row, y) => {
      let html = "", cur = null, buf = "";
      row.forEach((c, x) => { const k = cls[y][x]; if (k !== cur) { if (buf) html += cur ? `<span class="${cur}">${esc(buf)}</span>` : esc(buf); buf = ""; cur = k; } buf += c; });
      if (buf) html += cur ? `<span class="${cur}">${esc(buf)}</span>` : esc(buf);
      return html;
    }).join("\n");
    const hp = "█".repeat(g.hp).padEnd(5, "░");
    g.hud.innerHTML = `score <b>${g.score}</b> · level <b>${g.level}</b> · combo <span class="t-warn">x${Math.max(1, g.combo)}</span> · core <span class="${g.hp <= 2 ? "t-err" : "t-ok"}">${hp}</span> · best ${Math.max(g.best, g.score)}`;
    body.scrollTop = body.scrollHeight;
  }
  function gameInput() {
    const g = game, v = input.value.trim().toLowerCase();
    if (!v) return;
    const t = g.threats.find(x => x.w === v);
    if (t) {
      g.threats.splice(g.threats.indexOf(t), 1);
      g.combo++; g.kills++;
      g.score += t.w.length * 10 * g.level * Math.max(1, Math.min(5, g.combo));
      g.booms.push({ x: t.x + 1, y: t.y, t: performance.now() });
      const lvl = 1 + Math.floor(g.kills / 7);
      if (lvl > g.level) { g.level = lvl; g.msg.innerHTML = `<span class="t-ok">level ${lvl} · attacks get faster</span>`; N().pulse(); }
      const proj = N().projects.filter(p => !p.ghost); N().ping(proj[g.kills % proj.length].id);
      input.value = "";
    } else if (!g.threats.some(x => x.w.startsWith(v))) {
      g.combo = 0; input.classList.remove("miss"); void input.offsetWidth; input.classList.add("miss");
    }
  }
  function endGame(reason) {
    const g = game; if (!g) return;
    game = null; term.classList.remove("gaming");
    drawGameFinal(g);
    const best = Math.max(g.best, g.score), rec = g.score > g.best && g.score > 0;
    localStorage.setItem("nicoogg-fw-best", best);
    g.msg.innerHTML = "";
    line(reason === "breach" ? "<span class='t-err'>CORE BREACHED.</span> corvex would have caught that one." : "<span class='t-dim'>drill aborted.</span>");
    line(`blocked <b>${g.kills}</b> attacks · score <b>${g.score}</b> · level ${g.level}${rec ? " · <span class='t-ok'>new best!</span>" : ` · best ${best}`}`);
    line("<c>firewall</c> to play again");
    input.value = ""; g.done();
  }
  function drawGameFinal(g) { g.field.classList.add("g-over"); }
  cmd("firewall play game defend", startGame, "minigame: type attacks to block them");

  cmd("matrix", () => { matrix(); line("wake up, neo…", "t-ok"); }, "follow the white rabbit");
  cmd("banner figlet", () => stream([
    "█▄ █ █ █▀▀ █▀█ █▀█ █▀▀ █▀▀",
    "█ ▀█ █ █▄▄ █▄█ █▄█ █▄█ █▄█"].map(l => `<span class="t-art">${l}</span>`), 60), "big letters");
  cmd("corvexai ai", async args => {
    const f = args[0] || "";
    if (f === "--bench" || f === "bench") {
      line("<b>corvexai</b> · measured by the Corvex team on cases it never saw in training", "");
      const rows = [["issues found on its own in the code", 66], ["issues found with the question sheet", 96], ["defenses recognised, exact line", 100], ["reported issues verified correctly", 83]];
      for (const [label, v] of rows) {
        const el = line("");
        for (let k = 0; k <= v; k += 4) { el.innerHTML = `  ${label.padEnd(38, ".")} <span class="t-ok">${"█".repeat(Math.round(k / 5)).padEnd(20, "░")}</span> ${String(Math.min(k, v)).padStart(3)}%`; await sleep(14); }
        el.innerHTML = `  ${label.padEnd(38, ".")} <span class="t-ok">${"█".repeat(Math.round(v / 5)).padEnd(20, "░")}</span> ${String(v).padStart(3)}%`;
      }
      return stream(["", "<span class='t-dim'>CORVUS, the assistant on corvexai: 37 of 39 security questions right, 18 of 20 never seen before.</span>",
        "<span class='t-dim'>source: <a href='https://corvexdevelops.github.io/corvexai.html' target='_blank' rel='noopener'>corvexdevelops.github.io/corvexai</a></span>"]);
    }
    if (f === "--oracle" || f === "oracle") {
      const steps = ["the right questions · a yes/no sheet for every function that handles requests", "candidates · suspicious points derived from the answers",
        "exact line · a made-up quote discards the candidate", "tries to disprove it · a second, independent check", "evidence · only what holds remains, with the fix"];
      line("<b>ORACLE</b> · the AI code audit. it doesn't even trust itself:");
      for (let i = 0; i < steps.length; i++) { await sleep(260); line(`  <span class="t-ok">0${i + 1}</span> ${steps[i]}`); }
      return;
    }
    N().ping("corvexai");
    await stream([
      "<b>corvexai</b>  <span class='t-dim'>[in development · ships with Corvex]</span>", "",
      "  job .......... cybersecurity: verifying issues, finding missing checks, recognising defenses",
      "  built by ..... the Corvex team, trained in-house on an analyst's real tasks",
      "  size ......... 4 billion parameters · 2.9 GB",
      "  memory ....... 3–4 GB, runs on a laptop too",
      "  runs on ...... your machine, only on 127.0.0.1",
      "  integrity .... SHA-256 fingerprint verified on start",
      "  third parties  none. no question ever leaves.",
      "  powers ....... CORVUS (the assistant) and ORACLE (the AI code audit)", "",
      "more: <c>corvexai --bench</c>  <c>corvexai --oracle</c>  <c>open corvexai</c>"], 22);
  }, "our own security AI model (--bench, --oracle)");
  cmd("top htop", async () => {
    const procs = [["corvex-agents", 28, 41], ["corvexai (4B)", 8, 57], ["wantdownload", 2, 12], ["gsloft-portal", 4, 9], ["portfolio-sh", 1, 3], ["coffee", 1, 99]];
    const head = line(""), rows = procs.map(() => line(""));
    const t0 = Date.now();
    line("<span class='t-dim'>live for 6s · press any key to keep typing</span>");
    for (let f = 0; f < 15 && Date.now() - t0 < 6200; f++) {
      const load = (1 + Math.random() * 1.6).toFixed(2);
      head.innerHTML = `<b>top</b> - ${new Date().toLocaleTimeString("en-GB")} up ${Math.floor((Date.now() - BORN) / 36e5)}h · load ${load} · tasks ${procs.length}`;
      procs.forEach(([n, th, base], i) => {
        const cpu = Math.max(0, Math.min(99, base + (Math.random() * 14 - 7))), bar = "█".repeat(Math.round(cpu / 10)).padEnd(10, "░");
        rows[i].innerHTML = `${String(1000 + i * 37).padStart(5)}  <span class="${cpu > 60 ? "t-warn" : "t-ok"}">${bar}</span> ${cpu.toFixed(1).padStart(5)}%  ${esc(n)} <span class="t-dim">${th}thr</span>`;
      });
      await sleep(400);
    }
  }, "live process monitor");
  cmd("tree", async () => {
    const outl = [".", "├── about.txt", "├── contact.txt", "├── stack.txt", "└── projects/"];
    FS["~/projects"].children.forEach((c, i, a) => outl.push(`    ${i === a.length - 1 ? "└──" : "├──"} <button class="t-cmd" data-cmd="cat projects/${c}">${c}</button>`));
    outl.push("", "1 directory, " + (3 + FS["~/projects"].children.length) + " files");
    await stream(outl, 25);
  }, "the whole file tree");
  cmd("man", args => {
    const c = C[(args[0] || "").toLowerCase()];
    if (!c) return line("usage: man &lt;command&gt;  — e.g. <c>man scan</c>", "t-err");
    const name = args[0].toLowerCase(), h = c.help || Object.entries(C).find(([, v]) => v.fn === c.fn && v.help)?.[1].help || "an easter egg. no manual for you.";
    stream([`<b>${esc(name.toUpperCase())}(1)</b>`, "", "NAME", `    ${esc(name)} — ${esc(h)}`, "", "SYNOPSIS", `    ${esc(name)} [args]`]);
  }, "manual for a command");
  cmd("uptime", () => { const up = Date.now() - BORN; line(`${new Date().toLocaleTimeString("en-GB")} up ${Math.floor(up / 864e5)} days, ${Math.floor(up / 36e5) % 24}:${String(Math.floor(up / 6e4) % 60).padStart(2, "0")}, 1 user (you)`); }, "how long this site has been up");
  cmd("whois", () => stream(["domain ...... nicoogg.github.io", "owner ....... nicoogg", "role ........ developer @ GS Loft", "location .... Verona, Italy", "status ...... <span class='t-ok'>online</span>"]), "who owns this host");
  cmd("date", () => line(new Date().toString()), "current date");
  cmd("echo", args => line(esc(args.join(" "))), "print text");
  cmd("history", () => stream(hist.map((h, i) => `  ${String(i + 1).padStart(3)}  ${esc(h)}`), 6), "past commands");
  cmd("clear cls", () => { out.innerHTML = ""; }, "clear the screen");
  cmd("sudo", args => line(args.join(" ").includes("rm") ? "nice try. this incident will be reported to corvex. 🛡" : `[sudo] password for ${USER}: ******* … just kidding, you're already root here.`, "t-warn"), null);
  cmd("rm", () => line("rm: permission denied (corvex blocked this)", "t-err"), null);
  cmd("vim vi nano emacs", () => line("you won't escape that easily. use <c>cat</c> instead.", "t-warn"), null);
  cmd("coffee", () => stream(["   ( (", "    ) )", "  ........", "  |      |]", "  \\      /", "   `----'", "brewing… ☕ productivity +35%"]), null);
  cmd("exit", () => { minimize(true); }, "minimize the terminal");

  /* ───────── running a command ───────── */
  const hist = JSON.parse(localStorage.getItem("nicoogg-hist") || "[]");
  let hi = hist.length;
  async function run(raw, silentEcho = false) {
    const text = raw.trim();
    if (!silentEcho) line(`${promptHTML()} <span class="t-in">${esc(text)}</span>`);
    if (!text) return;
    if (!silentEcho) { hist.push(text); if (hist.length > 60) hist.shift(); localStorage.setItem("nicoogg-hist", JSON.stringify(hist)); hi = hist.length; }
    const [name, ...args] = text.split(/\s+/);
    const c = C[name.toLowerCase()];
    if (!c) {
      const near = Object.keys(C).filter(k => k[0] === name[0]?.toLowerCase()).slice(0, 3);
      return line(`command not found: ${esc(name)}${near.length ? " — did you mean " + near.map(n => `<c>${n}</c>`).join(" ") + "?" : " — type <c>help</c>"}`, "t-err");
    }
    try { await c.fn(args); } catch (e) { line("error: " + esc(e.message), "t-err"); }
  }
  // commands run one after another, even when clicked fast
  const exec = (raw, silent) => (queue = queue.then(() => run(raw, silent)));
  async function typeAndRun(cmdText) {
    if (game) return;
    if (reduce) return exec(cmdText);
    await queue;
    input.value = "";
    for (const ch of cmdText) { input.value += ch; await sleep(38 + Math.random() * 40); }
    await sleep(150); input.value = ""; updateGhost();
    return exec(cmdText);
  }

  /* ───────── input: history, tab completion, ghost suggestion ───────── */
  function candidates(v) {
    const parts = v.split(/\s+/);
    if (parts.length <= 1) return Object.keys(C).filter(k => C[k].help && k.startsWith(parts[0]));
    const last = parts[parts.length - 1], base = parts.slice(0, -1).join(" ") + " ";
    if (parts[0] === "corvexai" || parts[0] === "ai") return ["--bench", "--oracle"].filter(t => t.startsWith(last)).map(t => base + t);
    if (["open", "ping"].includes(parts[0])) return N().projects.map(p => p.id).filter(id => id.startsWith(last)).map(id => base + id);
    if (parts[0] === "theme") return ["mono", "green", "amber"].filter(t => t.startsWith(last)).map(t => base + t);
    if (parts[0] === "git") return ["log"].filter(t => t.startsWith(last)).map(t => base + t);
    const slash = last.lastIndexOf("/"), dirPart = slash >= 0 ? last.slice(0, slash) : "", namePart = slash >= 0 ? last.slice(slash + 1) : last;
    const dir = FS[resolve(dirPart || ".")];
    if (!dir || dir.type !== "dir") return [];
    return dir.children.filter(n => n.startsWith(namePart) && (namePart.startsWith(".") || !n.startsWith(".")))
      .map(n => base + (dirPart ? dirPart + "/" : "") + n + (FS[resolve((dirPart ? dirPart + "/" : "") + n)].type === "dir" ? "/" : ""));
  }
  function updateGhost() {
    if (game) { ghost.textContent = ""; return; }
    const v = input.value, c = v ? candidates(v.endsWith(" ") ? v : v)[0] : "";
    ghost.textContent = c && c.startsWith(v) && c !== v ? v + c.slice(v.length) : "";
  }
  function insert(txt) {
    const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
    input.value = input.value.slice(0, a) + txt + input.value.slice(b);
    input.setSelectionRange(a + txt.length, a + txt.length);
    if (game) gameInput(); else updateGhost();
    caret();
  }
  const caret = () => input.parentNode.style.setProperty("--cx", input.selectionStart ?? input.value.length);
  input.addEventListener("input", () => { if (game) { gameInput(); caret(); return; } updateGhost(); caret(); });
  ["keyup", "click", "focus", "select"].forEach(ev => input.addEventListener(ev, caret));
  setInterval(caret, 120);
  input.addEventListener("keydown", e => {
    e.stopPropagation();  // keys typed here never move the map
    if (game) {
      if (e.key === "Escape") { e.preventDefault(); endGame("quit"); }
      else if (e.key === "Enter") { e.preventDefault(); if (input.value.trim().toLowerCase() === "quit") endGame("quit"); else { gameInput(); input.value = ""; } }
      else if (e.key === "Tab" || e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
      return;
    }
    if (e.key === "Enter") { const v = input.value; input.value = ""; ghost.textContent = ""; exec(v); }
    else if (e.key === "Tab") {
      e.preventDefault();
      const c = candidates(input.value);
      if (c.length === 1) input.value = c[0] + (c[0].endsWith("/") ? "" : " ");
      else if (c.length > 1) { line(`${promptHTML()} <span class="t-in">${esc(input.value)}</span>`); line(c.map(x => esc(x.split(/\s+/).pop())).join("   "), "t-dim"); const pre = c.reduce((a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(0, i); }); input.value = pre; }
      updateGhost();
    }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (hi > 0) input.value = hist[--hi]; updateGhost(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ""; updateGhost(); }
    else if (e.key === "ArrowRight" && ghost.textContent && input.selectionStart === input.value.length) { input.value = ghost.textContent; updateGhost(); }
    else if (e.key.toLowerCase() === "l" && e.ctrlKey) { e.preventDefault(); out.innerHTML = ""; }
    else if (e.key.toLowerCase() === "c" && e.ctrlKey && input.selectionStart === input.selectionEnd) { line(`${promptHTML()} <span class="t-in">${esc(input.value)}</span>^C`); input.value = ""; updateGhost(); }
    else if (e.key === "Escape") { input.blur(); }
  });
  out.addEventListener("click", e => { const b = e.target.closest(".t-cmd"); if (b) { e.stopPropagation(); typeAndRun(b.dataset.cmd); } });
  $("tChips").addEventListener("click", e => { const b = e.target.closest("[data-cmd]"); if (b) typeAndRun(b.dataset.cmd); });
  // on-screen keys for phones: keep the keyboard open (mousedown/pointerdown default prevented)
  const keybar = $("tKeys");
  keybar.addEventListener("pointerdown", e => { if (e.target.closest("button")) e.preventDefault(); });
  keybar.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    input.focus({ preventScroll: true });
    const k = b.dataset.k;
    if (k === "ctrl-c") input.dispatchEvent(new KeyboardEvent("keydown", { key: "c", ctrlKey: true, bubbles: true }));
    else if (k === "clear") { out.innerHTML = ""; }
    else if (k === "enter") input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    else if (k.length === 1) insert(k);
    else input.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
  });
  body.addEventListener("click", e => { if (!getSelection().toString() && !e.target.closest("a, button")) input.focus({ preventScroll: true }); });

  /* ───────── window: toggle, minimize, maximize, drag ───────── */
  function minimize(on) { term.classList.toggle("min", on); if (!on) input.focus({ preventScroll: true }); }
  $("tMin").onclick = e => { e.stopPropagation(); minimize(!term.classList.contains("min")); };
  $("tMax").onclick = e => { e.stopPropagation(); term.classList.toggle("max"); term.style.left = term.style.top = ""; body.scrollTop = body.scrollHeight; };
  $("tClose").onclick = e => { e.stopPropagation(); minimize(true); };
  $("termBtn").onclick = () => {
    if (term.classList.contains("docked")) { minimize(false); term.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    minimize(!term.classList.contains("min"));
  };
  term.querySelector(".t-bar").addEventListener("dblclick", () => $("tMax").click());
  term.querySelector(".t-bar").addEventListener("click", () => { if (term.classList.contains("min")) minimize(false); });
  addEventListener("keydown", e => {
    if (e.key === "`" || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
      if (e.target === input && e.key === "`") return;
      e.preventDefault(); minimize(!term.classList.contains("min")); return;
    }
    // typing anywhere on the page writes into the terminal
    if (e.target === input || term.classList.contains("min") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (e.key.length === 1 || ["Enter", "Backspace", "ArrowUp", "ArrowDown", "Tab"].includes(e.key)) {
      if (e.key === "Tab" && !document.activeElement.closest?.(".term")) return;  // keep Tab for page navigation
      input.focus({ preventScroll: true });
      if (e.key.length === 1) { e.preventDefault(); insert(e.key); }
      else if (e.key !== "Enter") input.dispatchEvent(new KeyboardEvent("keydown", { key: e.key, bubbles: true }));
    }
  });
  (() => {  // drag by the title bar
    const bar = term.querySelector(".t-bar");
    bar.addEventListener("pointerdown", e => {
      if (e.target.closest("button") || term.classList.contains("max") || N().stacked) return;
      const r = term.getBoundingClientRect(), pr = term.offsetParent.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
      bar.setPointerCapture(e.pointerId); term.classList.add("drag");
      const mv = ev => {
        term.style.left = Math.max(0, Math.min(pr.width - r.width, ev.clientX - pr.left - dx)) + "px";
        term.style.top = Math.max(0, Math.min(pr.height - 40, ev.clientY - pr.top - dy)) + "px";
        term.style.right = term.style.bottom = "auto";
      };
      bar.addEventListener("pointermove", mv);
      bar.addEventListener("pointerup", () => { bar.removeEventListener("pointermove", mv); term.classList.remove("drag"); }, { once: true });
    });
  })();

  /* ───────── matrix rain ───────── */
  function matrix() {
    if (reduce || document.querySelector(".matrix")) return;
    const c = document.createElement("canvas"); c.className = "matrix"; document.body.appendChild(c);
    const g = c.getContext("2d"), W = c.width = innerWidth, H = c.height = innerHeight, fs = 14, cols = Math.ceil(W / fs), drops = Array(cols).fill(0).map(() => Math.random() * -40);
    const glyphs = "01アイウエオカキクケコ#:/<>=+nicoogg", t0 = performance.now();
    g.font = `${fs}px "Geist Mono", monospace`;
    const step = now => {
      const life = (now - t0) / 6000;
      g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(0, 0, W, H);
      drops.forEach((y, i) => {
        const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
        g.fillStyle = Math.random() < .08 ? "#fff" : "#3ddc84"; g.fillText(ch, i * fs, y * fs);
        drops[i] = y * fs > H && Math.random() > .975 ? 0 : y + 1;
      });
      c.style.opacity = life > .8 ? String(Math.max(0, (1 - life) * 5)) : "1";
      if (life < 1) requestAnimationFrame(step); else c.remove();
    };
    requestAnimationFrame(step);
    c.onclick = () => c.remove();
  }

  const home = { parent: term.parentNode, next: term.nextSibling };
  function placeTerm() {
    const stacked = matchMedia("(max-width: 860px)").matches, intro = document.querySelector(".panel .intro");
    // phones: the shell sits right under the title, it is the first thing you use
    if (stacked && term.previousElementSibling !== intro) intro.after(term);
    else if (!stacked && term.parentNode !== home.parent) home.parent.insertBefore(term, home.next);
    term.classList.toggle("docked", stacked);
  }
  placeTerm(); addEventListener("resize", placeTerm);

  /* ───────── boot ───────── */
  term.dataset.theme = localStorage.getItem("nicoogg-theme") || "mono";
  renderPrompt();
  const start = async () => {
    await N().boot;
    const hash = decodeURIComponent((location.hash.match(/run=([^&]+)/) || [])[1] || "");
    await stream([
      "<span class='t-art'>nicoogg.os 2.0</span> <span class='t-dim'>· tty1 · " + new Date().toLocaleDateString("en-GB") + "</span>",
      "welcome, visitor. this portfolio is a shell: just start typing, or tap a command.",
      "<span class='t-dim'>start with</span> <c>help</c> <c>neofetch</c> <c>projects</c> <c>corvexai</c> <c>git log</c> <c>scan</c>", "<span class='t-dim'>bored? play</span> <c>firewall</c>", ""], 60);
    if (hash) { minimize(false); if (term.classList.contains("docked")) term.scrollIntoView({ behavior: "smooth", block: "center" }); await sleep(300); typeAndRun(hash); }
    else if (!N().stacked) input.focus({ preventScroll: true });
  };
  if (window.NICO) start(); else document.addEventListener("nico:ready", start, { once: true });
  addEventListener("hashchange", () => { const h = decodeURIComponent((location.hash.match(/run=([^&]+)/) || [])[1] || ""); if (h) { minimize(false); typeAndRun(h); } });
})();

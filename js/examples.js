// Trace browser. Demo buttons select a real trace (fetched verbatim from
// data/traces/*.json); the trajectory is rendered faithfully per framework, the
// decisive (golden) error is outlined in red, and its annotation shows on the right.
(function () {

  // ── demos: the only place to register a new example ──────────
  // agentAnswer / insight are editorial annotation; everything else comes from the trace.
  const DEMOS = [
    {
      id: "mmsearch_glasses",
      name: "Image Search",
      file: "data/traces/mmsearch_glasses.json",
      agentAnswer: "March 10, 2022",
      insight: "The photo clearly shows a pair of Gentle Monster glasses, and the agent reads that brand correctly at first. It then claims the glasses are a different product called Ray-Ban Meta and gives a launch date for them. Neither that product nor that date appears anywhere in what the agent actually saw, so it simply made them up."
    },
    {
      id: "simpleqa_election",
      name: "Web Search",
      file: "data/traces/simpleqa_election.json",
      agentAnswer: "8,452,190",
      insight: "The team is asked for the winning margin in the 2018 Turkish presidential election. The agent doing the web search makes up a results table whose vote totals appear on no real page, and the rest of the team trusts those numbers without checking. They subtract the invented figures and report the result, so one fabricated table quietly becomes the final answer."
    },
    {
      id: "lvbench_camel",
      name: "Video QA",
      file: "data/traces/lvbench_camel.json",
      agentAnswer: "D — Dog",
      insight: "The question asks which animal appears on stage in a long video. Looking at a few sampled frames, the agent sees a camel with its long neck and hump but calls it a dog puppet. That single misreading becomes the final answer, even though the camel is clearly visible in the frames it looked at."
    },
    {
      id: "macnet_triangle",
      name: "Code Generation",
      file: "data/traces/macnet_triangle.json",
      agentAnswer: "return (a * h) // 2  →  triangle_area(5, 3) == 7",
      insight: "One agent writes a correct function for the area of a triangle. A reviewing agent wrongly insists the division is a mistake and tells it to round the result down, and the next agent goes along with this and even edits the example so the test still passes. The team approves the broken version, all because one agent trusted another's confident but incorrect feedback."
    },
    {
      id: "mmsearch_car",
      name: "Visual Lookup",
      file: "data/traces/mmsearch_car.json",
      agentAnswer: "1,000 mm",
      insight: "The agent's early plan assumes the SUV is just an ordinary off-road vehicle, so it sets out to find the standard model's wading depth. It does identify the exact car and finds both figures, 1,000 mm for the standard version and 1,400 mm for the upgraded edition the question is actually about. Because its plan had already settled on the ordinary version, it answers 1,000 mm and misses the correct number it had already found."
    },
    {
      id: "mmsearch_pokemon",
      name: "Fact Lookup",
      file: "data/traces/mmsearch_pokemon.json",
      agentAnswer: "Late October 2025",
      insight: "The agent looks up when Pokémon Trading Card Game Pocket was released and correctly finds the official date, October 30, 2024. Instead of giving that date, it decides the word “arrive” must mean the game's first-anniversary update and answers “late October 2025.” It had the right answer in hand but ended up responding to a question the user never asked."
    }
  ];

  // ── taxonomy lookup (code → name, category → family) ─────────
  const CAT_FAMILY = { P: "Perception", R: "Reasoning", PL: "Planning", A: "Action", V: "Verification", C: "Coordination" };
  const MODE_NAME = {
    "P.1": "Visual misidentification", "P.2": "Spatial/grounding error", "P.3": "Visual output misinterpretation",
    "R.1": "Hallucination", "R.2": "Reasoning error", "R.3": "Numerical/calculation error", "R.4": "Task misunderstanding",
    "PL.1": "Ineffective planning", "PL.2": "Infeasible plan", "PL.3": "Goal drift",
    "A.1": "Wrong tool/action selection", "A.2": "Tool parameter/invocation error", "A.3": "Hallucinated tool/action",
    "A.4": "Output format/syntax error", "A.5": "Premature termination", "A.6": "Repetitive/looping behavior",
    "V.1": "Context/memory loss", "V.2": "Inadequate or incorrect verification", "V.3": "System/environment error",
    "C.1": "Delegation/orchestration error", "C.2": "Communication failure", "C.3": "Over-reliance on other agents"
  };
  const modeInfo = code => ({ name: MODE_NAME[code] || code, family: CAT_FAMILY[(code || "").split(".")[0]] || "" });

  // ── helpers ──────────────────────────────────────────────────
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const modLabel = m => ({ text: "Text", image: "Image", video: "Video" }[m] || m);

  // ── block renderers (verbatim content) ───────────────────────
  function blockHTML(b) {
    if (b.type === "code")
      return `<div class="ev-code"><span class="ev-code-tag">${esc(b.label || "code")}</span><pre>${esc(b.text)}</pre></div>`;
    if (b.type === "obs")
      return `<div class="ev-obs"><span class="ev-obs-tag">${esc(b.label || "observation")}</span><div class="ev-obs-body">${esc(b.text)}</div></div>`;
    if (b.type === "ledger")
      return `<div class="ev-ledger"><span class="ev-ledger-tag">progress ledger</span>${b.rows.map(r =>
        `<div class="ev-ledger-row"><span class="lk">${esc(r.k)}</span>
           <span class="lv ${r.bool === false ? "no" : r.bool === true ? "yes" : ""}">${esc(r.v)}</span>
           <span class="lr">${esc(r.reason)}</span></div>`).join("")}</div>`;
    if (b.type === "media") {
      const cls = b.kind === "film" ? "ev-film" : "ev-thumbs";
      return `<div class="${cls}">${b.items.map(m =>
        `<figure><img class="ev-zoomable" src="${esc(m.src)}" alt="${esc(m.cap || "")}" loading="lazy">${m.cap ? `<figcaption>${esc(m.cap)}</figcaption>` : ""}</figure>`).join("")}</div>`;
    }
    // text (default)
    const cls = b.muted ? "ev-text muted" : "ev-text";
    return `<div class="${cls}">${b.label ? `<span class="ev-text-tag">${esc(b.label)}</span>` : ""}${esc(b.text)}</div>`;
  }

  function stepHTML(s) {
    // primary demarcation: "Step N" for real steps, a word label for setup turns
    const primary = `<span class="ev-step-no${s.isStep ? "" : " setup"}">${esc(s.label || s.num || "")}</span>`;
    // the agent name leads for multi-agent traces; otherwise show the action kind
    let badge = "";
    if (s.actor) badge = `<span class="ev-actor">${esc(s.actor)}</span>`;
    else if (s.isStep) badge = `<span class="ev-kind k-${esc((s.kind || "step").toLowerCase())}">${esc(s.kindLabel || s.kind)}</span>`;
    const banner = s.decisive ? `<span class="ev-decisive-banner">⬤ Decisive error</span>` : "";
    return `<div class="ev-step${s.decisive ? " decisive" : ""}">
      <div class="ev-step-head">${primary}${badge}${banner}</div>
      ${s.blocks.map(blockHTML).join("")}
    </div>`;
  }

  // ── per-framework normalizers → {steps:[render-steps], decisiveStep} ─
  const seconds2clock = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  function normSmolagents(d) {
    const gt = d.ground_truth || {};
    const steps = [];
    for (const t of d.trajectory) {
      if (t.kind === "planning") {
        steps.push({ num: "plan", kind: "planning", kindLabel: "Planning",
          decisive: gt.step === 0,   // PL.* injections land on the plan (step 0)
          blocks: [{ type: "text", label: "Plan", text: t.plan }] });
      } else if (t.kind === "action") {
        const blocks = [];
        if (t.reasoning) blocks.push({ type: "text", label: "Reasoning", text: t.reasoning.trim() });
        if (t.code) blocks.push({ type: "code", label: "Code", text: t.code.trim() });
        if (t.observation) blocks.push({ type: "obs", label: "Observation", text: t.observation.trim() });
        if ((t.observation_images || []).length)
          blocks.push({ type: "media", kind: "thumbs", items: t.observation_images.map((im, i) => ({ src: im.path, cap: `result ${i + 1}` })) });
        steps.push({
          num: t.step_number, kind: t.is_final_answer ? "answer" : "action",
          kindLabel: t.is_final_answer ? "Final answer" : "Action",
          decisive: t.step_number === gt.step, blocks
        });
      }
    }
    return { steps, decisiveStep: gt.step === 0 ? "plan (step 0)" : gt.step };
  }

  // render an agent output that is either a fenced code block or prose
  function codeOrText(s) {
    s = (s == null ? "" : s).trim();
    const m = s.match(/^```(\w*)\s*\n([\s\S]*?)\n?```$/);
    return m ? { type: "code", label: m[1] || "code", text: m[2].trim() }
             : { type: "text", label: "Output", text: s };
  }

  function normMacnet(d) {
    const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    const steps = [];
    let n = 0;                                   // sequential step counter (agent turns)
    for (const t of d.trajectory) {
      if (t.kind === "user") {
        steps.push({ num: "task", kind: "user", kindLabel: "Task",
          blocks: [{ type: "text", text: (t.content || "").trim() }] });
      } else if (t.kind === "final_answer") {
        steps.push({ num: "final", kind: "answer", kindLabel: "Final answer",
          blocks: [codeOrText(t.content)] });
      } else {                                   // an agent turn (author/critic/rewriter/sink)
        const role = cap(t.role || t.agent_id || "agent");
        steps.push({ num: ++n, kind: "agent", kindLabel: role, actor: role,
          decisive: t.is_injected === true, blocks: [codeOrText(t.output)] });
      }
    }
    return { steps, decisiveStep: null };        // renumber() reports the decisive step's label
  }

  function normMagentic(d) {
    const gt = d.ground_truth || {};
    const steps = [];
    let n = 0;                                   // sequential step counter
    for (const t of d.trajectory) {
      if (t.kind !== "agent") continue;
      const coord = `${t.round}.${t.position}`;
      const blocks = [];
      if (t.output) blocks.push({ type: "text", label: "Output", text: t.output.trim() });
      for (const a of t.tool_actions || [])
        blocks.push({ type: "code", label: `tool · ${a.name || a.type}`, text: JSON.stringify(a.args, null, 1) });
      if (t.ledger) {
        const order = ["is_request_satisfied", "is_progress_being_made", "is_in_loop", "next_speaker", "instruction_or_question"];
        blocks.push({ type: "ledger", rows: order.filter(k => t.ledger[k]).map(k => ({
          k: k.replace(/_/g, " "),
          v: String(t.ledger[k].answer),
          bool: typeof t.ledger[k].answer === "boolean" ? t.ledger[k].answer : null,
          reason: t.ledger[k].reason
        })) });
      }
      steps.push({ num: ++n, kind: "agent", kindLabel: t.role, actor: t.role,
        decisive: coord === gt.step, blocks });
    }
    return { steps, decisiveStep: gt.step };
  }

  function normEva(d) {
    const gt = d.ground_truth || {};
    const steps = [];
    d.trajectory.forEach((t, idx) => {
      const blocks = [];
      let kind = t.kind, kindLabel = t.kind;
      if (t.kind === "system") { kindLabel = "System"; if (t.content) blocks.push({ type: "text", text: t.content.trim(), muted: true }); }
      else if (t.kind === "user") { kindLabel = "Question"; if (t.content) blocks.push({ type: "text", text: t.content.trim() }); }
      else if (t.kind === "assistant") {
        kindLabel = t.tool_calls && t.tool_calls.length ? "Assistant" : "Answer";
        kind = t.tool_calls && t.tool_calls.length ? "action" : "answer";
        if (t.content) blocks.push({ type: "text", label: "Response", text: t.content.trim() });
        for (const c of t.tool_calls || [])
          blocks.push({ type: "code", label: `tool · ${c.name}`, text: c.arguments });
      } else if (t.kind === "tool") {
        kind = "tool"; kindLabel = `Tool · ${t.tool_name || ""}`.trim();
        if (t.content) blocks.push({ type: "obs", label: "tool output", text: t.content.trim() });
        if ((t.frames || []).length)
          blocks.push({ type: "media", kind: "film", items: t.frames.map(f => ({ src: f.path, cap: seconds2clock(f.time_s) })) });
      }
      const decisive = t.injected === true || idx === gt.step;
      steps.push({ num: idx, kind, kindLabel, decisive, blocks });
    });
    return { steps, decisiveStep: gt.step };
  }

  function normalize(d) {
    let r;
    if (d.framework === "magentic-one") r = normMagentic(d);
    else if (d.framework === "eva") r = normEva(d);
    else if (d.framework === "macnet") r = normMacnet(d);
    else r = normSmolagents(d); // smolagents + anything planning/action-shaped
    return renumber(r);
  }

  // Label each rendered step uniformly: real agent steps become "Step 1, 2, …";
  // setup / planning turns get a word label. The decisive step's label is what
  // the Ground-Truth panel reports as the failure step.
  function renumber(r) {
    const SETUP = { system: "System", user: "Question" };
    let n = 0;
    for (const s of r.steps) {
      if (s.kind in SETUP) { s.label = s.kindLabel || SETUP[s.kind]; s.isStep = false; }
      else if (s.kind === "planning") { s.label = "Step 0"; s.isStep = true; }   // planning is a step too
      else { n += 1; s.label = "Step " + n; s.isStep = true; }
    }
    const dec = r.steps.find(s => s.decisive);
    return { steps: r.steps, decisiveStep: dec ? dec.label : (r.decisiveStep != null ? r.decisiveStep : "—") };
  }

  // ── ground-truth panel ───────────────────────────────────────
  function annotHTML(d, demo, norm) {
    const gt = d.ground_truth || {};
    const mi = modeInfo(gt.mode);
    const agentRow = gt.agent
      ? `<span class="ann-k">Failure agent</span><span class="ann-v">${esc(gt.agent)}</span>` : "";
    return `
      <div class="ann-title">Ground Truth</div>
      <div class="ann-grid">
        <span class="ann-k">Modality</span><span class="ann-v"><span class="badge mod-${d.modality}">${modLabel(d.modality)}</span></span>
        <span class="ann-k">Error mode</span><span class="ann-v"><span class="badge fam" data-fam="${mi.family}">${esc(mi.family)}</span> ${esc(mi.name)}</span>
        <span class="ann-k">Failure step</span><span class="ann-v"><span class="ann-step">${esc(norm.decisiveStep)}</span></span>
        ${agentRow}
      </div>
      ${demo.insight ? `<div class="ann-sep"></div><div class="ann-why"><span class="ann-why-tag">Explanation</span>${esc(demo.insight)}</div>` : ""}`;
  }

  // ── render a loaded demo ─────────────────────────────────────
  function renderDemo(demo) {
    const d = demo._data;
    const norm = normalize(d);
    const traceEl = document.getElementById("ex-trace");
    const annotEl = document.getElementById("ex-annot");

    const qimg = (d.task.images && d.task.images[0] && d.task.images[0].path)
      ? `<img class="ev-q-img ev-zoomable" src="${esc(d.task.images[0].path)}" alt="query image">` : "";
    let gold = (d.task && d.task.answer != null) ? d.task.answer : "—";
    if (d.task && d.task.options && d.task.options[gold] != null) gold = `${gold} — ${d.task.options[gold]}`;
    const head = `<div class="ev-q-bar">${qimg}<div class="ev-q-main">
        <div class="ev-q">${esc(d.task.query)}</div>
        <div class="ev-q-answer"><span class="ev-q-answer-tag">Answer</span><b>${esc(gold)}</b></div>
        <div class="ev-q-answer agent"><span class="ev-q-answer-tag">Agent's answer</span><b>${esc(demo.agentAnswer)}</b></div>
      </div></div>`;
    traceEl.innerHTML = head + `<div class="ev-steps">${norm.steps.map(stepHTML).join("")}</div>`;
    annotEl.innerHTML = annotHTML(d, demo, norm);

    // start each trace at the beginning (reader scrolls down to the decisive step)
    traceEl.scrollTop = 0;
  }

  let current = 0;
  function select(i) {
    current = i;
    document.querySelectorAll("#ex-tabs .ex-tab").forEach((b, j) => b.classList.toggle("active", i === j));
    renderDemo(DEMOS[i]);
  }

  // ── Overview / Data Viewer top-level switcher ────────────────
  function wireDsToggle() {
    const tabs = document.querySelectorAll(".ds-toggle .ds-tab");
    const panels = { overview: document.getElementById("ds-overview"), viewer: document.getElementById("ds-viewer") };
    if (!tabs.length) return;
    tabs.forEach(t => t.addEventListener("click", () => {
      const key = t.dataset.panel;
      tabs.forEach(x => { const on = x === t; x.classList.toggle("active", on); x.setAttribute("aria-selected", on); });
      Object.entries(panels).forEach(([k, el]) => { if (el) el.classList.toggle("hidden", k !== key); });
      // the trace window was laid out while hidden — re-render so scroll-to-decisive is correct
      if (key === "viewer") select(current);
    }));
  }

  // ── image zoom: hover to enlarge, click for full lightbox ────
  function setupZoom(traceEl) {
    // full-screen lightbox (click)
    const lb = document.createElement("div");
    lb.id = "ev-lightbox";
    lb.innerHTML = `<img alt="full image">`;
    document.body.appendChild(lb);
    const closeLB = () => lb.classList.remove("show");
    lb.addEventListener("click", closeLB);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeLB(); });

    // floating hover preview (non-interactive)
    const hp = document.createElement("div");
    hp.id = "ev-hover";
    hp.innerHTML = `<img alt="">`;
    document.body.appendChild(hp);
    const hpImg = hp.firstChild;
    const hideHover = () => hp.classList.remove("show");

    function showHover(img) {
      if (lb.classList.contains("show")) return;
      hpImg.src = img.src;
      hp.classList.add("show");
      requestAnimationFrame(() => {
        const r = img.getBoundingClientRect();
        const pw = hp.offsetWidth, ph = hp.offsetHeight, m = 14;
        let left = r.right + m;
        if (left + pw > window.innerWidth - 8) left = r.left - m - pw;     // flip to the left
        if (left < 8) left = Math.max(8, (window.innerWidth - pw) / 2);    // center fallback
        let top = Math.max(8, Math.min(r.top + r.height / 2 - ph / 2, window.innerHeight - ph - 8));
        hp.style.left = left + "px";
        hp.style.top = top + "px";
      });
    }

    traceEl.addEventListener("mouseover", e => { const i = e.target.closest("img.ev-zoomable"); if (i) showHover(i); });
    traceEl.addEventListener("mouseout",  e => { const i = e.target.closest("img.ev-zoomable"); if (i) hideHover(); });
    traceEl.addEventListener("scroll", hideHover, { passive: true });
    traceEl.addEventListener("click", e => {
      const i = e.target.closest("img.ev-zoomable");
      if (!i) return;
      hideHover();
      lb.firstChild.src = i.src;
      lb.classList.add("show");
    });
  }

  // ── boot: build buttons, fetch all traces, render first ──────
  async function init() {
    const tabs = document.getElementById("ex-tabs");
    const traceEl = document.getElementById("ex-trace");
    if (!tabs || !traceEl) return;
    setupZoom(traceEl);
    wireDsToggle();

    tabs.innerHTML = DEMOS.map((demo, i) =>
      `<button class="ex-tab${i === 0 ? " active" : ""}" data-i="${i}"><span class="ex-tab-n">Demo ${i + 1}:</span> ${esc(demo.name || "")}</button>`).join("");
    tabs.querySelectorAll(".ex-tab").forEach(b => b.addEventListener("click", () => select(+b.dataset.i)));

    traceEl.innerHTML = `<div class="ev-loading">Loading traces…</div>`;
    try {
      await Promise.all(DEMOS.map(async demo => { demo._data = await (await fetch(demo.file)).json(); }));
    } catch (e) {
      traceEl.innerHTML = `<div class="ev-loading">Could not load traces. Serve the site over HTTP (e.g. <code>python3 -m http.server</code>).</div>`;
      return;
    }
    select(0);
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();

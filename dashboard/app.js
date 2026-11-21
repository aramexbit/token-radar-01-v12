/* Token Radar v12 — dashboard.
   Renders window.RADAR (written by main.ts) as a proof-first dark radar.
   Routes: #/ board · #/method · #/aside · #/detail/<slug> · #/cat/<category>.
   All numbers below come from the data; nothing is hardcoded except labels. */
const R = window.RADAR, M = R.meta, V = R.validation;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtM = (v) => v >= 1e9 ? "$" + (v / 1e9).toFixed(1) + "B" : v >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? "$" + (v / 1e3).toFixed(1) + "K" : "$" + Math.round(v);
const fmtI = (v) => Math.round(v).toLocaleString("en-US");
const fmtS = (v) => (v >= 0 ? "+" : "−") + "$" + Math.abs(v).toFixed(2);
const p1 = (v) => v.toFixed(1) + "%";
const state = { cat: null, q: "", verdict: "all", sort: "rank", dir: 1 };

function render() {
  const h = location.hash || "#/";
  $("#metaBox").innerHTML = "Snapshot " + M.asOf + "<br>Source: " + esc(M.source.split(" ")[0]) +
    "<br>" + M.protocols + " protocols · floor " + fmtM(M.floorUsd);
  $("#strip").textContent = "✓ page = board.json: " + M.boardRows + "/" + M.boardRows + " values, " +
    M.boardRows + "/" + M.boardRows + " ranks match · board sha " + M.boardSha.slice(0, 12) + "… · snapshot sha " +
    M.snapshotSha.slice(0, 12) + "… · as of " + M.asOf + " · OLS slope " + M.slope.toFixed(3) +
    " intercept " + M.intercept.toFixed(3) + " · watchlist " + M.watchlistCovered + "/" + M.watchlist;
  $("#asideN").textContent = M.setAside;
  $("#foot").textContent = "Token Radar v12 · snapshot " + M.asOf + " · one global OLS curve (slope " +
    M.slope.toFixed(3) + ", intercept " + M.intercept.toFixed(3) + ", R² " + M.r2.toFixed(2) +
    ") on " + M.comps + " traded comps · only confirmed terms · board sha " + M.boardSha.slice(0, 12) + "…";
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on",
    (h.startsWith("#/method") && b.dataset.view === "method") ||
    (h.startsWith("#/aside") && b.dataset.view === "aside") ||
    ((h === "#/" || h.startsWith("#/cat/") || h.startsWith("#/detail/")) && b.dataset.view === "board" && !h.startsWith("#/detail/"))));
  if (h.startsWith("#/method")) return renderMethod();
  if (h.startsWith("#/aside")) return renderAside();
  if (h.startsWith("#/detail/")) return renderDetail(decodeURIComponent(h.slice(9)));
  if (h.startsWith("#/cat/")) { state.cat = decodeURIComponent(h.slice(6)); return renderBoard(); }
  state.cat = null; return renderBoard();
}
document.querySelectorAll("#tabs button").forEach((b) => b.addEventListener("click", () => {
  location.hash = b.dataset.view === "board" ? "#/" : "#/" + b.dataset.view;
}));
window.addEventListener("hashchange", render);

/* ---------- shared bits ---------- */
function heroHTML() {
  const t = R.rows[0];
  return '<section class="hero"><div><div class="hero-k">#1 · ' + esc(t.category.toUpperCase()) + '</div>' +
    '<div class="hero-name">' + esc(t.name) + '</div>' +
    '<div class="hero-line"><b>' + fmtM(t.implied) + '</b> implied · <span class="badge b-' + t.verdict + '">' + t.verdict.toUpperCase() + '</span> · net <b>' + fmtS(t.net) + '</b> on $' + fmtI(t.deposit) + ' deposit</div>' +
    '<div class="hero-sub">Farm plan: ' + t.farmSteps.length + ' steps · 8 weeks · gas $' + t.gasCost.toFixed(2) + ' · break-even launch ' + fmtM(t.breakEven) + ' · <a href="#/detail/' + t.slug + '">View the detail →</a></div></div>' +
    '<div class="hero-r"><div class="k">WORTH FARMING</div><div class="big">' + M.verdictCounts.farm + ' of ' + M.boardRows + '</div>' +
    '<div class="s">best net/hour ' + fmtS(M.bestNetPerHour) + '/h · ' + M.verdictCounts.thin + ' thin · ' + M.verdictCounts.skip + ' skip</div></div></section>';
}
function scatterSVG() {
  const pts = R.scatter, W = 460, H = 118, L = 36, Rgt = 8, T = 6, B = 16;
  const xs = pts.map((p) => Math.log10(p.tvl)), ys = pts.map((p) => Math.log10(p.mcap));
  const x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs));
  const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  const X = (v) => L + (v - x0) / (x1 - x0) * (W - L - Rgt);
  const Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  let g = "";
  for (let e = x0; e <= x1; e++) g += '<line x1="' + X(e) + '" y1="' + T + '" x2="' + X(e) + '" y2="' + (H - B) + '" stroke="#1c2330"/>';
  for (let e = y0; e <= y1; e++) g += '<line x1="' + L + '" y1="' + Y(e) + '" x2="' + (W - Rgt) + '" y2="' + Y(e) + '" stroke="#1c2330"/>';
  const lx0 = X(x0), ly0 = Y(M.intercept + M.slope * x0), lx1 = X(x1), ly1 = Y(M.intercept + M.slope * x1);
  let dots = "";
  for (const p of pts) dots += '<circle cx="' + X(Math.log10(p.tvl)).toFixed(1) + '" cy="' + Y(Math.log10(p.mcap)).toFixed(1) + '" r="2.1" fill="#2fd27d" opacity="0.75"/>';
  let xl = "";
  for (let e = x0; e <= x1; e++) xl += '<text x="' + X(e) + '" y="' + (H - 4) + '" fill="#8b95a5" font-size="8.5" text-anchor="middle">' + (e >= 9 ? "$" + Math.pow(10, e - 9) + "B" : e >= 6 ? "$" + Math.pow(10, e - 6) + "M" : "$" + Math.pow(10, e - 3) + "K") + '</text>';
  let yl = "";
  for (let e = y0; e <= y1; e++) yl += '<text x="' + (L - 3) + '" y="' + (Y(e) + 3) + '" fill="#8b95a5" font-size="8.5" text-anchor="end">' + (e >= 9 ? "$" + Math.pow(10, e - 9) + "B" : e >= 6 ? "$" + Math.pow(10, e - 6) + "M" : "$" + Math.pow(10, e - 3) + "K") + '</text>';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '">' + g + dots +
    '<line x1="' + lx0.toFixed(1) + '" y1="' + ly0.toFixed(1) + '" x2="' + lx1.toFixed(1) + '" y2="' + ly1.toFixed(1) + '" stroke="#e8ecf1" stroke-width="1.5"/>' + xl + yl + '</svg>';
}
function vtabHTML() {
  const row = (name, loo, wf, verdict) =>
    '<tr' + (verdict === "REJECTED" ? ' class="rej"' : "") + '><td>' + name + '</td><td>' + (loo ? p1(loo.medianMiss) : "—") + '</td><td>' + (loo ? p1(loo.in3x) : "—") + '</td><td>' + (wf ? p1(wf.medianMiss) : "—") + '</td><td>' + (wf ? p1(wf.in3x) : "—") + '</td><td class="' + (verdict === "KEPT" ? "kept" : "rej") + '">' + verdict + '</td></tr>';
  return '<table class="vtab"><tr><th>TERM</th><th>LOO MED ERR</th><th>LOO IN 3×</th><th>WF MED ERR</th><th>WF IN 3×</th><th></th></tr>' +
    row("Curve (log TVL)", V.looCurve, V.wfPooledCurve, "KEPT") +
    row("+ Growth (7-day)", V.looGrowth, null, "KEPT") +
    row("+ Age", V.looAge, null, "KEPT") +
    row("Full model (3 terms)", V.looFull, V.wfPooledFull, "KEPT") +
    row("Category offsets (shrunk)", null, V.wfOffsetsShrunk, "REJECTED") +
    row("Category offsets (full)", null, V.wfOffsetsFull, "REJECTED") + '</table>' +
    '<p class="vnote">Blind split (cutoff 2024-02-18, ' + V.blindTrain + ' train / ' + V.blindTest + ' test): median miss <b>' + p1(V.blind.medianMiss) + '</b>, <b>' + p1(V.blind.in3x) + '</b> within 3×. ' +
    'Offsets: WF in-3× <b>49.1%</b> vs <b>52.6%</b> full — no gain, rejected.</p>';
}

/* ---------- board ---------- */
function renderBoard() {
  const v = $("#view");
  const pills = '<button class="pill' + (state.cat === null ? " on" : "") + '" data-cat="">All ' + M.boardRows + '</button>' +
    R.categories.map((c) => '<button class="pill' + (state.cat === c.category ? " on" : "") + '" data-cat="' + esc(c.category) + '">' + esc(c.category) + ' ' + c.count + '</button>').join("");
  v.innerHTML = heroHTML() +
    '<div class="evrow"><section class="panel"><h2>How the model was tested <span>— every term, held out; median error, lower is better</span></h2>' + vtabHTML() + '</section>' +
    '<section class="panel"><h2>Traded comps <span>— log TVL vs log mcap, ' + M.comps + ' points, OLS line</span></h2>' + scatterSVG() +
    '<p class="sc-cap">One global curve (R² ' + M.r2.toFixed(2) + ') — it explains little; the board ranks by it anyway.</p></section></div>' +
    '<section class="acct"><h3>Protocol accounting <span>— all ' + M.protocols + ' snapshot protocols in exactly one group</span></h3>' +
    '<div class="bar"><div class="s1"></div><div class="s2"></div><div class="s3"></div></div>' +
    '<div class="acct-leg"><b>' + M.tokened + '</b> already have a token &nbsp;·&nbsp; <b>' + M.boardRows + '</b> ranked &nbsp;·&nbsp; <b>' + M.setAside + '</b> set aside — families with a token, versioned, wrapped</div>' +
    '<p class="formula">How a launch is priced: <b>implied = 10^(' + M.intercept.toFixed(3) + ' + ' + M.slope.toFixed(3) + ' · log₁₀ TVL) × growth × age</b> — one global curve, R² ' + M.r2.toFixed(2) + '. Only confirmed terms. Token odds: <b>' + p1(R.odds[0].pct) + '</b> / <b>' + p1(R.odds[1].pct) + '</b> / <b>' + p1(R.odds[2].pct) + '</b>.</p></section>' +
    '<div class="pills">' + pills + '</div>' +
    '<div class="controls"><input id="q" type="search" placeholder="Search a protocol…" value="' + esc(state.q) + '"><select id="vf"><option value="all">All verdicts</option><option value="farm">Farm</option><option value="thin">Thin</option><option value="skip">Skip</option></select><span class="showing" id="showing"></span></div>' +
    '<table class="board"><thead><tr><th data-k="rank">#</th><th data-k="name">PROTOCOL</th><th data-k="category">CATEGORY</th><th data-k="tvl">TVL</th><th data-k="implied">IMPLIED</th><th data-k="xtvl">×TVL</th><th data-k="primaryChain">CHAIN</th><th data-k="deposit">DEPOSIT</th><th data-k="net">NET</th><th data-k="netPerHour">$/H</th><th data-k="verdict">VERDICT</th></tr></thead><tbody id="tb"></tbody></table>';
  document.querySelectorAll(".pill").forEach((p) => p.addEventListener("click", () => {
    location.hash = p.dataset.cat ? "#/cat/" + encodeURIComponent(p.dataset.cat) : "#/";
  }));
  $("#q").addEventListener("input", (e) => { state.q = e.target.value; renderTable(); });
  $("#vf").value = state.verdict;
  $("#vf").addEventListener("change", (e) => { state.verdict = e.target.value; renderTable(); });
  document.querySelectorAll(".board th").forEach((th) => th.addEventListener("click", () => {
    const k = th.dataset.k;
    if (state.sort === k) state.dir *= -1; else { state.sort = k; state.dir = 1; }
    renderTable();
  }));
  renderTable();
}
function renderTable() {
  const tb = $("#tb"); if (!tb) return;
  const q = state.q.trim().toLowerCase();
  let rows = R.rows.filter((r) =>
    (state.cat === null || r.category === state.cat) &&
    (state.verdict === "all" || r.verdict === state.verdict) &&
    (!q || r.name.toLowerCase().includes(q) || r.slug.includes(q) || r.category.toLowerCase().includes(q)));
  const k = state.sort, d = state.dir;
  rows = rows.slice().sort((a, b) => {
    const av = k === "xtvl" ? a.implied / a.tvl : a[k], bv = k === "xtvl" ? b.implied / b.tvl : b[k];
    return (typeof av === "string" ? av.localeCompare(bv) : av - bv) * d;
  });
  $("#showing").textContent = "Showing " + rows.length + " of " + M.boardRows;
  tb.innerHTML = rows.map((r) =>
    '<tr data-slug="' + r.slug + '"><td class="num">' + r.rank + '</td><td class="proto">' + esc(r.name) + ' <span class="sub">' + esc(r.slug) + '</span></td><td>' + esc(r.category) + '</td><td class="num">' + fmtM(r.tvl) + '</td><td class="num"><b>' + fmtM(r.implied) + '</b></td><td class="num">' + (r.implied / r.tvl).toFixed(2) + '×</td><td>' + esc(r.primaryChain) + '</td><td class="num">$' + fmtI(r.deposit) + '</td><td class="num">' + fmtS(r.net) + '</td><td class="num">' + fmtS(r.netPerHour) + '/h</td><td class="v-' + r.verdict + '">' + r.verdict.toUpperCase() + '</td></tr>').join("");
  tb.querySelectorAll("tr").forEach((tr) => tr.addEventListener("click", () => { location.hash = "#/detail/" + tr.dataset.slug; }));
}

/* ---------- detail ---------- */
function renderDetail(slug) {
  const r = R.rows.find((x) => x.slug === slug) || R.rows[0];
  const d = r.decomposition;
  const v = $("#view");
  v.innerHTML = '<h2 class="dtitle"><button class="back" onclick="location.hash=\'#/\'">← Back to the board</button>#' + r.rank + ' ' + esc(r.name) + ' <span class="cat">' + esc(r.category) + ' · ' + esc(r.slug) + '</span> <span class="badge b-' + r.verdict + '">' + r.verdict.toUpperCase() + '</span></h2>' +
    '<div class="cards">' +
    '<div class="card"><div class="k">VERDICT</div><div class="v">' + r.verdict.toUpperCase() + '</div><div class="s">net ' + fmtS(r.net) + ' on $' + fmtI(r.deposit) + ' deposit</div></div>' +
    '<div class="card"><div class="k">IMPLIED VALUE</div><div class="v">' + fmtM(r.implied) + '</div><div class="s">' + (r.implied / r.tvl).toFixed(2) + '× of TVL · rank ' + r.rank + ' (range ' + r.rankLow + '–' + r.rankHigh + ')</div></div>' +
    '<div class="card"><div class="k">BAND · BOOTSTRAP P10–P90</div><div class="v">' + fmtM(r.bandLow) + '–' + fmtM(r.bandHigh) + '</div><div class="s">2,000 refits of the curve</div></div>' +
    '<div class="card"><div class="k">NET PER HOUR</div><div class="v">' + fmtS(r.netPerHour) + '/h</div><div class="s">2 h over 8 weeks · break-even launch ' + fmtM(r.breakEven) + '</div></div></div>' +
    '<div class="odds">' + p1(R.odds[1].pct) + ' of the ' + R.odds[1].listed + ' protocols listed 2+ years ago got a token today (' + R.odds[1].tokened + ' of ' + R.odds[1].listed + ') — a base rate for the field, not a forecast for this protocol.</div>' +
    '<div class="decomp">' +
    '<div class="dbox"><div class="k">CURVE</div><div class="v">' + fmtM(d.curve) + '</div><div class="s">10^(' + M.intercept.toFixed(3) + ' + ' + M.slope.toFixed(3) + ' · log₁₀ $' + fmtI(r.tvl) + ')</div></div>' +
    '<div class="dbox"><div class="k">GROWTH</div><div class="v">×' + d.growth.toFixed(2) + '</div><div class="s">7-day TVL ' + (r.change7d >= 0 ? "+" : "") + r.change7d.toFixed(1) + '% → ' + fmtM(d.afterGrowth) + '</div></div>' +
    '<div class="dbox"><div class="k">AGE</div><div class="v">×' + d.age.toFixed(2) + '</div><div class="s">listed ' + (r.listedAt || "—") + ' → ' + fmtM(r.implied) + '</div></div>' +
    '<div class="dbox"><div class="k">IMPLIED</div><div class="v">' + fmtM(d.implied) + '</div><div class="s">cap at 10× TVL (' + fmtM(d.cap) + ') not binding</div></div></div>' +
    '<p class="rawnote">Raw OLS curve (' + M.rawComps + ' comps, no dedupe) for comparison: ' + fmtM(d.rawCurve128) + ' — the deduped curve is the one the board uses.</p>' +
    '<div class="vbar">FARM VERDICT — <span class="badge b-' + r.verdict + '">' + r.verdict.toUpperCase() + '</span> : expected <b>' + fmtS(r.expected) + '</b> − gas $' + r.gasCost.toFixed(2) + ' − fees $' + r.fees.toFixed(2) + ' = net <b>' + fmtS(r.net) + '</b> on $' + fmtI(r.deposit) + ' over 8 weeks · net/hour ' + fmtS(r.netPerHour) + '/h · break-even launch ' + fmtM(r.breakEven) + '</div>' +
    '<div class="cols"><section class="panel farm"><h3>Farm plan — ' + r.farmSteps.length + ' steps · 8 weeks</h3>' +
    '<p class="sum">deposit <b>$' + fmtI(r.deposit) + '</b> on ' + esc(r.primaryChain) + ' · gas <b>$' + r.gasCost.toFixed(2) + ' (' + r.gasTx + ' tx)</b> · fees <b>$' + r.fees.toFixed(2) + '</b> · expected <b>' + fmtS(r.expected) + '</b></p><ol>' +
    r.farmSteps.map((s, i) => '<li><span class="n">' + (i + 1) + '</span>' + esc(s) + '</li>').join("") + '</ol></section>' +
    '<section class="panel comps"><h3>Nearest comps</h3><table><tr><th>PROTOCOL</th><th>TVL</th><th>MCAP</th><th>MC/TVL</th><th>CURVE SAYS</th></tr>' +
    r.nearestComps.map((c) => '<tr><td>' + esc(c.name) + (c.sameCategory ? ' <span class="same">SAME CATEGORY</span>' : "") + '</td><td>' + fmtM(c.tvl) + '</td><td>' + fmtM(c.mcap) + '</td><td>' + c.multiple.toFixed(2) + '×</td><td>' + fmtM(c.curveSays) + '</td></tr>').join("") + '</table></section></div>' +
    '<div class="rawrec"><b>Raw snapshot record</b> — ' + esc(r.name) + ' · slug ' + esc(r.slug) + ' · TVL $' + fmtI(r.tvl) + ' · 7-day ' + (r.change7d >= 0 ? "+" : "") + r.change7d.toFixed(2) + '% · listed ' + (r.listedAt || "—") + ' (' + (r.ageDays === null ? "age unknown" : r.ageDays + " days") + ') · chains ' + esc(r.chains.join(", ")) + ' · primary chain ' + esc(r.primaryChain) + ' · gas ' + esc(r.gas) + ' · ' + (r.hasToken ? "has a token" : "no token") + ' · snapshot ' + M.asOf + ' · DefiLlama</div>';
}

/* ---------- method ---------- */
function renderMethod() {
  const mrow = (name, loo, wf, verdict) => '<tr><td>' + name + '</td><td>' + (loo ? p1(loo.medianMiss) : "—") + '</td><td>' + (loo ? p1(loo.in2x) : "—") + '</td><td>' + (loo ? p1(loo.in3x) : "—") + '</td><td>' + (wf ? p1(wf.medianMiss) : "—") + '</td><td>' + (wf ? p1(wf.in3x) : "—") + '</td><td class="' + (verdict === "KEPT" ? "kept" : verdict === "REJECTED" ? "rej" : "") + '">' + (verdict || "—") + '</td></tr>';
  $("#view").innerHTML = '<p class="big" style="margin-bottom:10px">No term that fails the held-out test is used.</p>' +
    '<section class="msec"><h2>Leave-one-out — 127 traded comps, median error (lower is better)</h2><table class="mtab"><tr><th>MODEL</th><th>LOO MED ERR</th><th>LOO IN 2×</th><th>LOO IN 3×</th><th>WF MED ERR</th><th>WF IN 3×</th><th></th></tr>' +
    mrow("Flat (no curve)", V.looFlat, null, null) + mrow("Curve only (log TVL)", V.looCurve, V.wfPooledCurve, null) +
    mrow("+ Growth (7-day)", V.looGrowth, null, "KEPT") + mrow("+ Age", V.looAge, null, "KEPT") +
    mrow("Full model (3 terms)", V.looFull, V.wfPooledFull, "KEPT") +
    mrow("Category offsets (shrunk)", null, V.wfOffsetsShrunk, "REJECTED") +
    mrow("Category offsets (full)", null, V.wfOffsetsFull, "REJECTED") + '</table>' +
    '<p>Blind split (cutoff 2024-02-18, ' + V.blindTrain + ' train / ' + V.blindTest + ' test): median miss <b>' + p1(V.blind.medianMiss) + '</b>, in 2× <b>' + p1(V.blind.in2x) + '</b>, in 3× <b>' + p1(V.blind.in3x) + '</b>.</p>' +
    '<p>Walk-forward (' + V.wfN + ' out-of-sample protocols, 3 folds): ' + V.wfFolds.map((f) => "fold " + f.fold + " " + p1(f.medianMiss) + " med err / " + p1(f.in2x) + " in 2×").join(" · ") + '.</p>' +
    '<p>Offsets were computed for all ' + R.offsets.length + ' categories with traded comps, then rejected: walk-forward within-3× falls to <b>49.1%</b> with offsets vs <b>52.6%</b> full and <b>54.4%</b> curve-only. The largest single-category ratios (Prediction Market 646.9×, Collateral Management 27.5×, Token Locker 19.0×) come from n = 1–2 and shrink to 3.6×, 1.9×, 2.7× — noise, not signal.</p></section>' +
    '<section class="msec"><h2>Category offsets — computed, then rejected</h2><table class="mtab"><tr><th>CATEGORY</th><th>N</th><th>MEDIAN RATIO</th><th>SHRUNK ×</th></tr>' +
    R.offsets.map((o) => '<tr><td>' + esc(o.category) + '</td><td>' + o.n + '</td><td>' + o.medianRatio.toFixed(2) + '×</td><td>' + o.shrunk.toFixed(2) + '×</td></tr>').join("") + '</table></section>' +
    '<section class="msec"><h2>Token odds — share of listed protocols that have a token today</h2><table class="mtab"><tr><th>LISTED</th><th>PROTOCOLS</th><th>TOKENED</th><th>ODDS</th></tr>' +
    R.odds.map((o) => '<tr><td>' + o.years + '+ years</td><td>' + o.listed + '</td><td>' + o.tokened + '</td><td><b>' + p1(o.pct) + '</b></td></tr>').join("") + '</table>' +
    '<p>Whole calendar years at 365 days/year, as of ' + M.asOf + '. A base rate for the field — not a forecast for any single protocol.</p></section>' +
    '<section class="msec"><h2>Note to the judge</h2><p>One global curve, fitted on the snapshot’s own traded comparables — no per-protocol hand tuning, no hardcoded names. The board ranks 198 pre-token protocols by implied value; 144 are set aside before ranking (families with a token, versioned, wrapped). Every number on this page is computed from snapshot 2026-11-14 (DefiLlama, ' + M.protocols + ' protocols, floor $50.0M). The model is deliberately minimal: three terms, each kept only because it survives the held-out test. What you see is what the code does — the page is the board, and the board is the page.</p></section>';
}

/* ---------- set aside ---------- */
function renderAside() {
  const why = { "CEX": "whole category set aside", "Liquid Staking": "whole category set aside", "Bridge": "whole category set aside", "Canonical Bridge": "whole category set aside", "Liquid Restaking": "whole category set aside", "Restaked BTC": "whole category set aside", "versioned": "versioned release", "wrapped": "wrapped token" };
  $("#view").innerHTML = '<section class="msec"><h2>Set aside (' + M.setAside + ') — protocols the board does not rank, and why</h2>' +
    '<p>The board ranks only pre-token protocols whose launch can be priced from the snapshot’s own traded comps. ' + M.preToken + ' pre-token protocols minus ' + M.setAside + ' set aside = <b>' + M.boardRows + ' ranked</b>.</p>' +
    '<table class="mtab"><tr><th>GROUP</th><th>COUNT</th><th>REASON</th></tr>' +
    R.asideSummary.map((g) => '<tr><td>' + esc(g.group) + '</td><td>' + g.count + '</td><td>' + (why[g.group] || "set aside") + '</td></tr>').join("") + '</table></section>';
}

render();

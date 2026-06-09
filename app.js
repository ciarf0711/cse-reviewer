/* ============================================================
   CSE Reviewer 2026 — offline PWA quiz engine
   ============================================================ */

const SUBJECTS = [
  { id: "numerical",  name: "Numerical Ability",        emoji: "🔢", file: "data/numerical.json" },
  { id: "verbal",     name: "Verbal (Eng & Fil)",       emoji: "📖", file: "data/verbal.json" },
  { id: "analytical", name: "Analytical Ability",       emoji: "🧩", file: "data/analytical.json" },
  { id: "general",    name: "General Information",       emoji: "🇵🇭", file: "data/general.json" },
];

const LS = {
  best: (id) => `cse_best_${id}`,
  done: (id) => `cse_done_${id}`,    // count of questions ever answered (unique-ish)
  wrong: "cse_wrong_pool",           // saved wrong questions for review mode
};

const state = {
  bank: {},          // id -> array of questions (lazy loaded)
  quiz: null,        // active quiz session
};

const $ = (sel, el = document) => el.querySelector(sel);
const screen = () => document.getElementById("screen");

/* ---------- utilities ---------- */
function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function getInt(k, d = 0) { return parseInt(localStorage.getItem(k) || d, 10); }

async function loadBank(id) {
  if (state.bank[id]) return state.bank[id];
  const subj = SUBJECTS.find((s) => s.id === id);
  const res = await fetch(subj.file, { cache: "no-store" });
  const data = await res.json();
  state.bank[id] = data.questions || data;
  return state.bank[id];
}

/* ============================================================
   HOME
   ============================================================ */
function renderHome() {
  const cards = SUBJECTS.map((s) => {
    const best = getInt(LS.best(s.id), -1);
    const bestTxt = best >= 0 ? `Best: ${best}%` : "Not started";
    const pct = best >= 0 ? best : 0;
    return `
      <div class="card" data-subject="${s.id}">
        <div class="emoji">${s.emoji}</div>
        <div class="name">${s.name}</div>
        <div class="meta">${bestTxt}</div>
        <div class="bar"><span style="width:${pct}%"></span></div>
      </div>`;
  }).join("");

  const wrongCount = JSON.parse(localStorage.getItem(LS.wrong) || "[]").length;

  screen().innerHTML = `
    <div class="hero">
      <h1>CSE Reviewer 2026</h1>
      <p>Civil Service Exam · Professional Level</p>
      <div class="flag-strip"><i></i><i></i><i></i></div>
    </div>

    <div class="section-title">Choose a subject</div>
    <div class="grid">${cards}</div>

    <div class="section-title">Practice tools</div>
    <button class="btn btn-gold" id="mixedBtn">🎯 Mixed Mock Exam (all subjects)</button>
    <button class="btn btn-ghost btn-block" id="reviewBtn" ${wrongCount ? "" : "disabled"}>
      🔁 Review my wrong answers (${wrongCount})
    </button>

    <div class="footer-note">
      4,000-question bank · answers with worked solutions.<br/>
      Add to Home Screen for full-screen offline use.
    </div>
  `;

  screen().querySelectorAll(".card").forEach((c) =>
    c.addEventListener("click", () => renderSubjectSetup(c.dataset.subject))
  );
  $("#mixedBtn").addEventListener("click", () => renderSubjectSetup("__mixed__"));
  $("#reviewBtn").addEventListener("click", startReviewMode);
}

/* ============================================================
   SUBJECT SETUP (length + mode)
   ============================================================ */
const setup = { subject: null, length: 25, mode: "practice" };

function renderSubjectSetup(subjectId) {
  setup.subject = subjectId;
  const isMixed = subjectId === "__mixed__";
  const title = isMixed ? "Mixed Mock Exam" : SUBJECTS.find((s) => s.id === subjectId).name;
  const emoji = isMixed ? "🎯" : SUBJECTS.find((s) => s.id === subjectId).emoji;

  screen().innerHTML = `
    <div class="qbar"><button class="back" id="back">‹</button><div class="count">${emoji} ${title}</div></div>

    <div class="section-title">How many questions?</div>
    <div class="chips" id="lenChips">
      ${[10, 25, 50, 100].map((n) => `<div class="chip ${n === setup.length ? "active" : ""}" data-len="${n}">${n}</div>`).join("")}
    </div>

    <div class="section-title">Mode</div>
    <div class="chips" id="modeChips">
      <div class="chip ${setup.mode === "practice" ? "active" : ""}" data-mode="practice">📝 Practice (instant feedback)</div>
      <div class="chip ${setup.mode === "exam" ? "active" : ""}" data-mode="exam">⏱️ Timed Exam</div>
    </div>

    <div class="hint" id="modeHint"></div>
    <div class="spacer"></div>
    <button class="btn btn-primary" id="startBtn">Start ›</button>
  `;

  const hint = $("#modeHint");
  const setHint = () => hint.textContent = setup.mode === "exam"
    ? "Timed: ~50 sec/question, no feedback until the end. Mimics the real exam."
    : "Practice: see the correct answer + explanation right after each question.";
  setHint();

  $("#back").addEventListener("click", renderHome);
  $("#lenChips").querySelectorAll(".chip").forEach((ch) =>
    ch.addEventListener("click", () => {
      setup.length = parseInt(ch.dataset.len, 10);
      $("#lenChips").querySelectorAll(".chip").forEach((x) => x.classList.toggle("active", x === ch));
    })
  );
  $("#modeChips").querySelectorAll(".chip").forEach((ch) =>
    ch.addEventListener("click", () => {
      setup.mode = ch.dataset.mode;
      $("#modeChips").querySelectorAll(".chip").forEach((x) => x.classList.toggle("active", x === ch));
      setHint();
    })
  );
  $("#startBtn").addEventListener("click", startQuiz);
}

/* ============================================================
   QUIZ ENGINE
   ============================================================ */
async function startQuiz() {
  screen().innerHTML = `<div class="loading"><div class="spin"></div><div>Loading questions…</div></div>`;

  let pool = [];
  try {
    if (setup.subject === "__mixed__") {
      const banks = await Promise.all(SUBJECTS.map((s) => loadBank(s.id)));
      banks.forEach((b, i) => b.forEach((q) => pool.push({ ...q, _subj: SUBJECTS[i].name })));
    } else {
      const subj = SUBJECTS.find((s) => s.id === setup.subject);
      pool = (await loadBank(setup.subject)).map((q) => ({ ...q, _subj: subj.name }));
    }
  } catch (e) {
    screen().innerHTML = `<div class="loading">⚠️ Could not load questions.<br/>Make sure the data files exist.<br/><button class="btn btn-ghost" onclick="location.reload()">Reload</button></div>`;
    return;
  }

  const questions = shuffle(pool).slice(0, Math.min(setup.length, pool.length));
  state.quiz = {
    questions, idx: 0, answers: new Array(questions.length).fill(null),
    mode: setup.mode, subject: setup.subject,
    secLeft: setup.mode === "exam" ? questions.length * 50 : 0,
    timer: null, startedReview: false,
  };
  if (setup.mode === "exam") startTimer();
  renderQuestion();
}

function startTimer() {
  const q = state.quiz;
  q.timer = setInterval(() => {
    q.secLeft--;
    const t = $(".timer");
    if (t) {
      t.textContent = fmtTime(q.secLeft);
      t.classList.toggle("warn", q.secLeft <= 30);
    }
    if (q.secLeft <= 0) { clearInterval(q.timer); finishQuiz(); }
  }, 1000);
}
function fmtTime(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

function renderQuestion() {
  const q = state.quiz;
  const item = q.questions[q.idx];
  const chosen = q.answers[q.idx];
  const answered = chosen !== null;
  const pct = ((q.idx) / q.questions.length) * 100;

  const passage = item.passage ? `<div class="passage">${esc(item.passage)}</div>` : "";
  const tag = item._subj || item.topic || "";

  const opts = item.choices.map((c, i) => {
    let cls = "opt";
    if ((answered && q.mode === "practice")) {
      if (i === item.answer) cls += " correct";
      else if (i === chosen) cls += " wrong";
      cls += " disabled";
    } else if (answered && i === chosen) {
      cls += " correct"; // exam mode: just highlight selection
    }
    return `<div class="${cls}" data-i="${i}">
      <div class="key">${String.fromCharCode(65 + i)}</div>
      <div>${esc(c)}</div>
    </div>`;
  }).join("");

  const explainHtml = (q.mode === "practice" && answered)
    ? `<div class="explain show"><b>Answer: ${String.fromCharCode(65 + item.answer)}.</b> ${esc(item.explanation || "")}</div>`
    : `<div class="explain"></div>`;

  const timerHtml = q.mode === "exam"
    ? `<div class="timer ${q.secLeft <= 30 ? "warn" : ""}">${fmtTime(q.secLeft)}</div>` : "";

  const isLast = q.idx === q.questions.length - 1;
  const nextLabel = isLast ? "Finish ›" : "Next ›";
  const showNext = q.mode === "exam" || answered;

  screen().innerHTML = `
    <div class="qbar">
      <button class="back" id="back">‹</button>
      <div class="count">Q ${q.idx + 1} / ${q.questions.length}</div>
      ${timerHtml}
    </div>
    <div class="progress"><span style="width:${pct}%"></span></div>

    <div class="qcard">
      ${tag ? `<span class="qtag">${esc(tag)}</span>` : ""}
      ${passage}
      <div class="qtext">${esc(item.question)}</div>
      <div class="opts" id="opts">${opts}</div>
      ${explainHtml}
    </div>

    <div class="spacer"></div>
    <div class="row">
      ${q.idx > 0 ? `<button class="btn btn-ghost" id="prev">‹ Prev</button>` : ""}
      <button class="btn btn-primary" id="next" ${showNext ? "" : "disabled"}>${nextLabel}</button>
    </div>
  `;

  $("#back").addEventListener("click", confirmExit);
  $("#opts").querySelectorAll(".opt").forEach((o) =>
    o.addEventListener("click", () => selectAnswer(parseInt(o.dataset.i, 10)))
  );
  if ($("#prev")) $("#prev").addEventListener("click", () => { q.idx--; renderQuestion(); });
  $("#next").addEventListener("click", goNext);
}

function selectAnswer(i) {
  const q = state.quiz;
  if (q.mode === "practice" && q.answers[q.idx] !== null) return; // lock after answer
  q.answers[q.idx] = i;
  if (q.mode === "practice") {
    const item = q.questions[q.idx];
    if (i !== item.answer) saveWrong(item);
  }
  renderQuestion();
}

function goNext() {
  const q = state.quiz;
  if (q.idx === q.questions.length - 1) finishQuiz();
  else { q.idx++; renderQuestion(); }
}

function confirmExit() {
  if (confirm("Leave this quiz? Your progress in this session will be lost.")) {
    if (state.quiz?.timer) clearInterval(state.quiz.timer);
    state.quiz = null;
    renderHome();
  }
}

/* ---------- wrong-answer pool (for review mode) ---------- */
function saveWrong(item) {
  const pool = JSON.parse(localStorage.getItem(LS.wrong) || "[]");
  const key = item.question;
  if (!pool.some((p) => p.question === key)) {
    pool.push(item);
    if (pool.length > 500) pool.shift();
    localStorage.setItem(LS.wrong, JSON.stringify(pool));
  }
}
async function startReviewMode() {
  const pool = JSON.parse(localStorage.getItem(LS.wrong) || "[]");
  if (!pool.length) return;
  state.quiz = {
    questions: shuffle(pool).slice(0, 50), idx: 0,
    answers: [], mode: "practice", subject: "__review__", secLeft: 0, timer: null,
  };
  state.quiz.answers = new Array(state.quiz.questions.length).fill(null);
  renderQuestion();
}

/* ============================================================
   RESULTS
   ============================================================ */
function finishQuiz() {
  const q = state.quiz;
  if (q.timer) clearInterval(q.timer);

  let correct = 0;
  q.questions.forEach((item, i) => { if (q.answers[i] === item.answer) correct++; });
  const total = q.questions.length;
  const pct = Math.round((correct / total) * 100);

  // save best score per subject
  if (q.subject && q.subject !== "__review__" && q.subject !== "__mixed__") {
    if (pct > getInt(LS.best(q.subject), -1)) localStorage.setItem(LS.best(q.subject), pct);
  }

  const wrong = total - correct;
  const passing = pct >= 80; // CSE passing is 80%
  const ring = scoreRing(pct);

  screen().innerHTML = `
    <div class="hero" style="background:${passing ? "linear-gradient(135deg,#1c8a4d,#0f6b39)" : "linear-gradient(135deg,#0b3d91,#082c6b)"}">
      <h1>${passing ? "Passing! 🎉" : "Keep going 💪"}</h1>
      <p>${passing ? "You hit the 80% CSE passing mark." : "CSE passing mark is 80%. Review and retry."}</p>
      <div class="flag-strip"><i></i><i></i><i></i></div>
    </div>

    <div class="score-ring">${ring}<div class="num"><b>${pct}%</b><small>${correct}/${total}</small></div></div>

    <div class="stat-row">
      <div class="stat"><b style="color:var(--green)">${correct}</b><small>Correct</small></div>
      <div class="stat"><b style="color:var(--red)">${wrong}</b><small>Wrong</small></div>
      <div class="stat"><b>80%</b><small>To pass</small></div>
    </div>

    <button class="btn btn-primary btn-block" id="reviewAns">📋 Review answers & explanations</button>
    <button class="btn btn-gold btn-block" id="retry">↻ Retry</button>
    <button class="btn btn-ghost btn-block" id="home">⌂ Home</button>
  `;

  // record wrong answers from exam mode too
  q.questions.forEach((item, i) => { if (q.answers[i] !== item.answer) saveWrong(item); });

  $("#reviewAns").addEventListener("click", () => renderAnswerReview());
  $("#retry").addEventListener("click", startQuiz);
  $("#home").addEventListener("click", renderHome);
}

function scoreRing(pct) {
  const r = 70, c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  const color = pct >= 80 ? "#1c8a4d" : pct >= 50 ? "#fcd116" : "#ce1126";
  return `<svg width="160" height="160" viewBox="0 0 160 160">
    <circle cx="80" cy="80" r="${r}" fill="none" stroke="#e3e7ef" stroke-width="14"/>
    <circle cx="80" cy="80" r="${r}" fill="none" stroke="${color}" stroke-width="14"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
  </svg>`;
}

function renderAnswerReview() {
  const q = state.quiz;
  const items = q.questions.map((item, i) => {
    const chosen = q.answers[i];
    const ok = chosen === item.answer;
    const opts = item.choices.map((c, j) => {
      let cls = "opt disabled";
      if (j === item.answer) cls += " correct";
      else if (j === chosen) cls += " wrong";
      return `<div class="${cls}"><div class="key">${String.fromCharCode(65 + j)}</div><div>${esc(c)}</div></div>`;
    }).join("");
    return `
      <div class="qcard" style="margin-bottom:14px">
        <span class="qtag">${ok ? "✓ Correct" : "✗ Review"} · Q${i + 1}</span>
        ${item.passage ? `<div class="passage">${esc(item.passage)}</div>` : ""}
        <div class="qtext" style="font-size:16px">${esc(item.question)}</div>
        <div class="opts">${opts}</div>
        <div class="explain show"><b>Answer: ${String.fromCharCode(65 + item.answer)}.</b> ${esc(item.explanation || "")}</div>
      </div>`;
  }).join("");

  screen().innerHTML = `
    <div class="qbar"><button class="back" id="back">‹</button><div class="count">Answer Review</div></div>
    ${items}
    <button class="btn btn-primary btn-block" id="home">⌂ Home</button>
  `;
  $("#back").addEventListener("click", finishQuiz);
  $("#home").addEventListener("click", renderHome);
  window.scrollTo(0, 0);
}

/* ============================================================
   BOOT
   ============================================================ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
renderHome();

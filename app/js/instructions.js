/* Instructions page logic */
const year = TJ.qs('year');
const paper = TJ.qs('paper');
if (!year || !paper) { location.href = 'index.html'; }

async function init() {
  const data = await TJ.loadPaper(year, paper);
  document.getElementById('page-title').textContent =
    `WBJEE ${year} — Paper ${paper}: ${data.paper_title}`;
  document.getElementById('paper-name').textContent =
    `Paper ${paper} · ${data.paper_title}`;
  document.getElementById('paper-tag').textContent =
    `WBJEE ${year} Instructions`;

  const tbl = document.getElementById('cat-table');
  let html = '';
  if (paper == '1') {
    html += `
      <thead><tr><th>Category</th><th>Questions</th><th>Type</th><th>Marks (Correct)</th><th>Negative</th></tr></thead>
      <tbody>
        <tr><td>Category 1</td><td>Q1 – Q50 (50 Qs)</td><td>Single correct MCQ</td><td>+1</td><td>−¼</td></tr>
        <tr><td>Category 2</td><td>Q51 – Q65 (15 Qs)</td><td>Single correct MCQ</td><td>+2</td><td>−½</td></tr>
        <tr><td>Category 3</td><td>Q66 – Q75 (10 Qs)</td><td>One or more correct</td><td>+2 (partial allowed)</td><td>No negative</td></tr>
      </tbody>`;
  } else {
    html += `
      <thead><tr><th>Subject</th><th>Category</th><th>Questions</th><th>Marks (Correct)</th><th>Negative</th></tr></thead>
      <tbody>
        <tr><td rowspan="3">Physics</td><td>Category 1</td><td>Q1 – Q30 (30 Qs)</td><td>+1</td><td>−¼</td></tr>
        <tr><td>Category 2</td><td>Q31 – Q35 (5 Qs)</td><td>+2</td><td>−½</td></tr>
        <tr><td>Category 3</td><td>Q36 – Q40 (5 Qs)</td><td>+2 (partial)</td><td>No negative</td></tr>
        <tr><td rowspan="3">Chemistry</td><td>Category 1</td><td>Q41 – Q70 (30 Qs)</td><td>+1</td><td>−¼</td></tr>
        <tr><td>Category 2</td><td>Q71 – Q75 (5 Qs)</td><td>+2</td><td>−½</td></tr>
        <tr><td>Category 3</td><td>Q76 – Q80 (5 Qs)</td><td>+2 (partial)</td><td>No negative</td></tr>
      </tbody>`;
  }
  tbl.innerHTML = html;

  const agree = document.getElementById('agree');
  const startBtn = document.getElementById('start-btn');
  agree.addEventListener('change', () => { startBtn.disabled = !agree.checked; });

  startBtn.addEventListener('click', () => {
    // Initialize the active attempt
    const now = Date.now();
    const durationMs = (data.duration_minutes || 120) * 60 * 1000;
    const existing = TJ.load(TJ.activeKey(year, paper));
    if (!existing) {
      TJ.save(TJ.activeKey(year, paper), {
        attempt_id: 'att_' + now,
        year, paper: Number(paper),
        started_at: now,
        ends_at: now + durationMs,
        responses: {},
        statuses: {},      // per-q status: not-visited | not-answered | answered | marked | marked-answered
        current_q: 1,
        submitted: false
      });
    }
    location.href = `test.html?year=${year}&paper=${paper}`;
  });
}
init().catch(err => {
  document.body.innerHTML = `<div class="full-screen-center">
    <h2>Could not load test data.</h2>
    <p class="muted">${err.message}</p>
    <a href="index.html" class="btn-primary">Back home</a></div>`;
});

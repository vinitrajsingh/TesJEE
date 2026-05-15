/* Results screen */
(function () {
  const year = TJ.qs('year');
  const paper = TJ.qs('paper');
  if (!year || !paper) { location.href = 'index.html'; return; }

  const root = document.getElementById('results-root');

  function renderHeader(title, sub) {
    return `<div class="results-header">
      <h1>${title}</h1>
      <div class="sub">${sub}</div>
    </div>`;
  }

  function tile(num, label, cls) {
    return `<div class="score-tile">
      <div class="num ${cls||''}">${num}</div>
      <div class="label">${label}</div>
    </div>`;
  }

  function catBreakdown(byCat, isCombined) {
    let rows = '';
    [1, 2, 3].forEach(c => {
      const x = byCat[c];
      if (!x || x.q === 0) return;
      rows += `<tr>
        <td>Category ${c}</td>
        <td>${x.q}</td>
        <td>${x.att}</td>
        <td class="pos">${x.cor}</td>
        <td class="neg">${x.wr}</td>
        <td>${x.par}</td>
        <td><b>${TJ.fmtNum(x.m)}</b> / ${x.max}</td>
      </tr>`;
    });
    return `<table class="breakdown-table">
      <thead><tr><th>Category</th><th>Total</th><th>Attempted</th><th>Correct</th><th>Wrong</th><th>Partial</th><th>Marks</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function subjectBreakdown(bySub) {
    let rows = '';
    Object.keys(bySub).forEach(name => {
      const x = bySub[name];
      rows += `<tr>
        <td class="left">${name}</td>
        <td>${x.q}</td>
        <td>${x.att}</td>
        <td class="pos">${x.cor}</td>
        <td class="neg">${x.wr}</td>
        <td>${x.par}</td>
        <td><b>${TJ.fmtNum(x.m)}</b> / ${x.max}</td>
      </tr>`;
    });
    return `<table class="breakdown-table">
      <thead><tr><th>Subject</th><th>Total</th><th>Attempted</th><th>Correct</th><th>Wrong</th><th>Partial</th><th>Marks</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function qbqGrid(perQ) {
    let cells = '';
    perQ.forEach(r => {
      const cls = r.status;
      cells += `<button class="qbq-cell ${cls}" data-id="${r.id}" title="Q${r.number} · ${r.status} · ${TJ.fmtNum(r.marks)} marks">${r.number}</button>`;
    });
    return `<div class="qbq-grid">${cells}</div>
      <div class="muted" style="font-size:12px;margin-top:8px;">
        <span style="color:#2e7d32">■</span> Correct
        <span style="margin-left:14px;color:#c62828">■</span> Wrong
        <span style="margin-left:14px;color:#f57c00">■</span> Partial
        <span style="margin-left:14px;color:#5b6573">■</span> Unattempted
      </div>
      <div class="qbq-detail" id="qbq-detail"></div>
    `;
  }

  function bindQbq(allPerQ, allQuestions) {
    document.querySelectorAll('.qbq-cell').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const r = allPerQ.find(x => x.id === id);
        const q = allQuestions.find(x => x.id === id);
        if (!r || !q) return;
        const detail = document.getElementById('qbq-detail');
        let badge = '';
        if (r.status === 'correct') badge = '<span style="color:#2e7d32;font-weight:700">CORRECT</span>';
        else if (r.status === 'wrong') badge = '<span style="color:#c62828;font-weight:700">WRONG</span>';
        else if (r.status === 'partial') badge = '<span style="color:#f57c00;font-weight:700">PARTIAL</span>';
        else badge = '<span style="color:#5b6573;font-weight:700">UNATTEMPTED</span>';

        detail.innerHTML = `
          <h4>Question ${q.number} · ${q.subject} · Category ${q.category} &nbsp; ${badge}
            &nbsp; <span class="muted" style="font-weight:400;">Marks: ${TJ.fmtNum(r.marks)} / ${q.marks_correct}</span></h4>
          <div class="img-wrap"><img src="${q.image}" alt="Question ${q.number}" /></div>
          <div class="ans-row">
            <div><b>Your answer:</b> ${r.selected.length ? r.selected.join(', ') : '—'}</div>
            <div><b>Correct answer:</b> ${q.correct.join(', ')}</div>
          </div>`;
        detail.classList.add('show');
        detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
    });
  }

  async function renderPaperResult(paperNum) {
    const result = TJ.load(TJ.resultKey(year, paperNum));
    const data = await TJ.loadPaper(year, paperNum);
    if (!result) {
      root.innerHTML = `<div class="full-screen-center">
        <h2>No result for Paper ${paperNum}.</h2>
        <a href="index.html" class="btn-primary">Back home</a></div>`;
      return;
    }

    const otherPaper = paperNum == 1 ? 2 : 1;
    const otherDone = !!TJ.load(TJ.resultKey(year, otherPaper));

    let warnHtml = '';
    if (paperNum == 1 && !otherDone) {
      warnHtml = `<div class="notice-warn">You haven't attempted Paper 2 yet. For a realistic exam comparison, complete Paper 2 — your final score is out of 200.</div>`;
    } else if (paperNum == 2 && !otherDone) {
      warnHtml = `<div class="notice-warn">You haven't attempted Paper 1 yet.</div>`;
    }

    const header = renderHeader(
      `WBJEE ${year} — Paper ${paperNum} Result`,
      `${result.paper_title} · ${result.total_questions} questions · ${result.max_marks} marks · Duration ${Math.round(result.duration_ms/60000)} min`
    );

    const tiles = `
      <div class="score-tiles">
        ${tile(`${TJ.fmtNum(result.total_marks)}/${result.max_marks}`, 'Score', 'pos')}
        ${tile(result.correct, 'Correct', 'pos')}
        ${tile(result.wrong, 'Wrong', 'neg')}
        ${tile(result.partial, 'Partial')}
        ${tile(result.unattempted, 'Unattempted')}
        ${tile(TJ.fmtNum(result.accuracy) + '%', 'Accuracy')}
      </div>`;

    const catSection = `<h3 class="section-heading">Category-wise breakdown</h3>${catBreakdown(result.by_category)}`;
    const subSection = paperNum == 2
      ? `<h3 class="section-heading">Subject-wise breakdown</h3>${subjectBreakdown(result.by_subject)}`
      : '';
    const qbqSection = `<h3 class="section-heading">Question-by-Question Analysis</h3>
      <p class="muted" style="font-size:12.5px;">Click any question to see the question, your answer and the correct answer.</p>
      ${qbqGrid(result.per_question)}`;

    let cta = '';
    if (paperNum == 1 && !otherDone) {
      cta = `<div style="margin-top:24px;display:flex;gap:10px;">
        <button class="btn-primary" onclick="location.href='instructions.html?year=${year}&paper=2'">Continue to Paper 2</button>
        <button class="btn-secondary" onclick="location.href='index.html'">Back home</button>
      </div>`;
    } else if (otherDone) {
      cta = `<div style="margin-top:24px;display:flex;gap:10px;">
        <button class="btn-primary" onclick="location.href='results.html?year=${year}&paper=combined'">View Combined Result</button>
        <button class="btn-secondary" onclick="location.href='index.html'">Back home</button>
      </div>`;
    } else {
      cta = `<div style="margin-top:24px;"><button class="btn-secondary" onclick="location.href='index.html'">Back home</button></div>`;
    }

    root.innerHTML = `
      ${header}
      <div class="results-body">
        ${warnHtml}
        ${tiles}
        ${catSection}
        ${subSection}
        ${qbqSection}
        ${cta}
      </div>`;

    bindQbq(result.per_question, data.questions);
  }

  async function renderCombined() {
    const r1 = TJ.load(TJ.resultKey(year, 1));
    const r2 = TJ.load(TJ.resultKey(year, 2));
    if (!r1 || !r2) {
      root.innerHTML = `<div class="full-screen-center">
        <h2>Both papers required.</h2>
        <p class="muted">Combined result is only available after both papers are submitted.</p>
        <a href="index.html" class="btn-primary">Back home</a></div>`;
      return;
    }
    const data1 = await TJ.loadPaper(year, 1);
    const data2 = await TJ.loadPaper(year, 2);
    const allQs = [...data1.questions, ...data2.questions];
    const allPerQ = [...r1.per_question, ...r2.per_question];

    const totalScore = r1.total_marks + r2.total_marks;
    const totalMax = r1.max_marks + r2.max_marks;
    const correct = r1.correct + r2.correct;
    const wrong = r1.wrong + r2.wrong;
    const partial = r1.partial + r2.partial;
    const unatt = r1.unattempted + r2.unattempted;
    const attempted = (r1.attempted + r2.attempted);
    const accuracy = attempted === 0 ? 0 :
                     (((r1.correct + r2.correct + r1.partial + r2.partial) / attempted) * 100);

    // Merge category breakdown
    function mergeCat(c1, c2) {
      const merged = { 1:{q:0,att:0,cor:0,wr:0,par:0,m:0,max:0},
                       2:{q:0,att:0,cor:0,wr:0,par:0,m:0,max:0},
                       3:{q:0,att:0,cor:0,wr:0,par:0,m:0,max:0} };
      [1,2,3].forEach(k => {
        ['q','att','cor','wr','par','m','max'].forEach(f => {
          merged[k][f] = (c1[k]?.[f] || 0) + (c2[k]?.[f] || 0);
        });
      });
      return merged;
    }
    function mergeSub(s1, s2) {
      const out = {};
      [s1, s2].forEach(s => {
        Object.keys(s).forEach(name => {
          if (!out[name]) out[name] = {q:0,att:0,cor:0,wr:0,par:0,m:0,max:0};
          ['q','att','cor','wr','par','m','max'].forEach(f => {
            out[name][f] += s[name][f] || 0;
          });
        });
      });
      return out;
    }
    const combinedCat = mergeCat(r1.by_category, r2.by_category);
    const combinedSub = mergeSub(r1.by_subject, r2.by_subject);

    // Rank band (rough heuristic)
    let band = 'No estimate';
    const pct = totalScore / totalMax * 100;
    if (pct >= 75) band = 'Excellent (likely top GMR ranks)';
    else if (pct >= 60) band = 'Strong (top 5%)';
    else if (pct >= 45) band = 'Good (above average)';
    else if (pct >= 30) band = 'Average — needs improvement';
    else band = 'Below average — review fundamentals';

    const header = renderHeader(
      `WBJEE ${year} — Final Combined Result`,
      `Paper 1 (Maths) + Paper 2 (Physics & Chemistry) · 200 marks total`
    );

    const tiles = `
      <div class="score-tiles">
        ${tile(`${TJ.fmtNum(totalScore)}/200`, 'Total Score', 'pos')}
        ${tile(`${TJ.fmtNum(r1.total_marks)}/100`, 'Paper 1 (Maths)')}
        ${tile(`${TJ.fmtNum(r2.total_marks)}/100`, 'Paper 2 (Phy+Chem)')}
        ${tile(correct, 'Correct', 'pos')}
        ${tile(wrong, 'Wrong', 'neg')}
        ${tile(partial, 'Partial')}
        ${tile(unatt, 'Unattempted')}
        ${tile(TJ.fmtNum(accuracy) + '%', 'Accuracy')}
      </div>
      <div class="notice-info"><b>Performance band:</b> ${band}</div>
    `;

    const root_html = `
      ${header}
      <div class="results-body">
        ${tiles}
        <h3 class="section-heading">Subject-wise performance</h3>
        ${subjectBreakdown(combinedSub)}
        <h3 class="section-heading">Category-wise performance</h3>
        ${catBreakdown(combinedCat)}
        <h3 class="section-heading">Paper-wise summary</h3>
        <table class="breakdown-table">
          <thead><tr><th>Paper</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Partial</th><th>Unatt.</th><th>Accuracy</th></tr></thead>
          <tbody>
            <tr><td class="left">Paper 1 — Mathematics</td><td><b>${TJ.fmtNum(r1.total_marks)}</b>/${r1.max_marks}</td><td class="pos">${r1.correct}</td><td class="neg">${r1.wrong}</td><td>${r1.partial}</td><td>${r1.unattempted}</td><td>${TJ.fmtNum(r1.accuracy)}%</td></tr>
            <tr><td class="left">Paper 2 — Physics &amp; Chemistry</td><td><b>${TJ.fmtNum(r2.total_marks)}</b>/${r2.max_marks}</td><td class="pos">${r2.correct}</td><td class="neg">${r2.wrong}</td><td>${r2.partial}</td><td>${r2.unattempted}</td><td>${TJ.fmtNum(r2.accuracy)}%</td></tr>
          </tbody>
        </table>
        <h3 class="section-heading">Question-by-Question Analysis (all 155 Qs)</h3>
        <p class="muted" style="font-size:12.5px;">Click any question to see the question, your answer and the correct answer.</p>
        ${qbqGrid(allPerQ)}
        <div style="margin-top:24px;display:flex;gap:10px;">
          <button class="btn-secondary" onclick="location.href='index.html'">Back home</button>
          <button class="btn-secondary" onclick="location.href='results.html?year=${year}&paper=1'">Paper 1 detail</button>
          <button class="btn-secondary" onclick="location.href='results.html?year=${year}&paper=2'">Paper 2 detail</button>
        </div>
      </div>`;

    root.innerHTML = root_html;
    bindQbq(allPerQ, allQs);
  }

  if (paper === 'combined') renderCombined();
  else renderPaperResult(paper);
})();

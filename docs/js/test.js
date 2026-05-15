/* Test engine - main exam screen */
(function () {
  const year = TJ.qs('year');
  const paper = TJ.qs('paper');
  if (!year || !paper) { location.href = 'index.html'; return; }

  let paperData = null;
  let attempt = null;
  let timerHandle = null;

  async function init() {
    paperData = await TJ.loadPaper(year, paper);
    attempt = TJ.load(TJ.activeKey(year, paper));
    if (!attempt) {
      // No active attempt -> back to instructions
      location.href = `instructions.html?year=${year}&paper=${paper}`;
      return;
    }
    if (attempt.submitted) {
      location.href = `results.html?year=${year}&paper=${paper}`;
      return;
    }

    // Initialize statuses for any new questions (defensive)
    paperData.questions.forEach(q => {
      if (!attempt.statuses[q.id]) attempt.statuses[q.id] = 'not-visited';
    });

    document.getElementById('paper-tag').textContent = `WBJEE ${year} · Paper ${paper}`;
    document.getElementById('paper-name').textContent = paperData.paper_title;

    buildPalette();
    bindActions();
    startTimer();
    // Mark current question as visited (becomes 'not-answered' if it was untouched)
    setCurrent(attempt.current_q);
  }

  function paletteSections() {
    // Group by subject for paper 2; single section for paper 1
    if (paper == '1') {
      return [{ title: 'Mathematics', qs: paperData.questions }];
    }
    const phys = paperData.questions.filter(q => q.subject === 'Physics');
    const chem = paperData.questions.filter(q => q.subject === 'Chemistry');
    return [
      { title: 'Physics (Q1–40)', qs: phys },
      { title: 'Chemistry (Q41–80)', qs: chem }
    ];
  }

  function buildPalette() {
    const root = document.getElementById('palette-sections');
    root.innerHTML = '';
    paletteSections().forEach(section => {
      const wrap = document.createElement('div');
      wrap.innerHTML = `<h4>${section.title}</h4>`;
      const grid = document.createElement('div');
      grid.className = 'palette-grid';
      section.qs.forEach(q => {
        const btn = document.createElement('button');
        btn.dataset.qid = q.id;
        btn.textContent = q.number;
        btn.onclick = () => { setCurrent(q.number); };
        grid.appendChild(btn);
      });
      wrap.appendChild(grid);
      root.appendChild(wrap);
    });
    refreshPaletteStates();
  }

  function refreshPaletteStates() {
    document.querySelectorAll('.palette-grid button').forEach(btn => {
      const qid = btn.dataset.qid;
      btn.className = '';
      const st = attempt.statuses[qid] || 'not-visited';
      if (st === 'answered') btn.classList.add('answered');
      else if (st === 'not-answered') btn.classList.add('not-answered');
      else if (st === 'marked') btn.classList.add('marked');
      else if (st === 'marked-answered') btn.classList.add('marked-answered');
      const q = paperData.questions.find(x => x.id === qid);
      if (q && q.number === attempt.current_q) btn.classList.add('current');
    });
  }

  function setCurrent(number) {
    attempt.current_q = number;
    // Set visited
    const q = paperData.questions.find(x => x.number === number);
    if (q && attempt.statuses[q.id] === 'not-visited') {
      attempt.statuses[q.id] = 'not-answered';
    }
    persist();
    renderCurrent();
    refreshPaletteStates();
  }

  function renderCurrent() {
    const q = paperData.questions.find(x => x.number === attempt.current_q);
    if (!q) return;
    document.getElementById('q-num').textContent = `Question ${q.number}`;
    document.getElementById('q-sub').textContent = q.subject;
    const catEl = document.getElementById('q-cat');
    catEl.textContent = `Category ${q.category}`;
    catEl.classList.toggle('cat3', q.category === 3);

    let marking = '';
    if (q.category === 1) marking = '+1 / −¼';
    else if (q.category === 2) marking = '+2 / −½';
    else marking = '+2 (partial) / No negative';
    document.getElementById('q-marking').textContent = marking;

    document.getElementById('q-image').src = q.image;
    document.getElementById('q-image').alt = `Question ${q.number}`;

    document.getElementById('multi-note').classList.toggle('hidden', q.category !== 3);

    // Options
    const list = document.getElementById('options-list');
    list.innerHTML = '';
    const sel = attempt.responses[q.id] || [];
    q.options.forEach(opt => {
      const row = document.createElement('label');
      row.className = 'option-row';
      const input = document.createElement('input');
      input.type = q.multi_correct ? 'checkbox' : 'radio';
      input.name = 'opt_' + q.id;
      input.value = opt;
      input.checked = sel.includes(opt);
      input.addEventListener('change', () => onOptionChange(q, opt, input.checked));
      const labelSpan = document.createElement('span');
      labelSpan.className = 'label';
      labelSpan.textContent = '(' + opt + ')';
      row.appendChild(input);
      row.appendChild(labelSpan);
      list.appendChild(row);
      if (input.checked) row.classList.add('selected');
    });

    document.getElementById('btn-prev').disabled = q.number === 1;
    document.getElementById('btn-save-next').textContent =
      (q.number === paperData.questions.length) ? 'Save' : 'Save & Next';
  }

  function onOptionChange(q, opt, isChecked) {
    let sel = attempt.responses[q.id] || [];
    if (q.multi_correct) {
      if (isChecked) { if (!sel.includes(opt)) sel.push(opt); }
      else sel = sel.filter(x => x !== opt);
    } else {
      sel = isChecked ? [opt] : [];
    }
    attempt.responses[q.id] = sel;
    // Update selected style
    document.querySelectorAll('.option-row').forEach(row => {
      const input = row.querySelector('input');
      row.classList.toggle('selected', input.checked);
    });
    persist();
    // Note: status update happens on Save / Mark / Clear, not on raw select
  }

  function gotoNextOrLast(curNumber) {
    if (curNumber < paperData.questions.length) {
      setCurrent(curNumber + 1);
    } else {
      // last question — just stay; user can submit
      refreshPaletteStates();
    }
  }

  function bindActions() {
    document.getElementById('btn-save-next').onclick = () => {
      const q = paperData.questions.find(x => x.number === attempt.current_q);
      const sel = attempt.responses[q.id] || [];
      // If user previously marked-for-review and now has answer => marked-answered
      const wasMarked = attempt.statuses[q.id] === 'marked' || attempt.statuses[q.id] === 'marked-answered';
      if (sel.length > 0) {
        attempt.statuses[q.id] = wasMarked ? 'marked-answered' : 'answered';
      } else {
        attempt.statuses[q.id] = wasMarked ? 'marked' : 'not-answered';
      }
      persist();
      gotoNextOrLast(q.number);
    };

    document.getElementById('btn-prev').onclick = () => {
      if (attempt.current_q > 1) setCurrent(attempt.current_q - 1);
    };

    document.getElementById('btn-mark').onclick = () => {
      const q = paperData.questions.find(x => x.number === attempt.current_q);
      const sel = attempt.responses[q.id] || [];
      attempt.statuses[q.id] = sel.length > 0 ? 'marked-answered' : 'marked';
      persist();
      gotoNextOrLast(q.number);
    };

    document.getElementById('btn-clear').onclick = () => {
      const q = paperData.questions.find(x => x.number === attempt.current_q);
      attempt.responses[q.id] = [];
      // Keep marked-state if marked; else not-answered
      const wasMarked = attempt.statuses[q.id] === 'marked' || attempt.statuses[q.id] === 'marked-answered';
      attempt.statuses[q.id] = wasMarked ? 'marked' : 'not-answered';
      persist();
      renderCurrent();
      refreshPaletteStates();
    };

    document.getElementById('btn-submit').onclick = openSubmitModal;
    document.getElementById('submit-cancel').onclick = closeSubmitModal;
    document.getElementById('submit-confirm').onclick = doSubmit;

    document.getElementById('post-view').onclick = () => {
      location.href = `results.html?year=${year}&paper=${paper}`;
    };
    document.getElementById('post-continue').onclick = () => {
      // start P2 instructions
      location.href = `instructions.html?year=${year}&paper=2`;
    };

    document.getElementById('timeup-ok').onclick = doSubmit;
  }

  function openSubmitModal() {
    const summary = paperData.questions.reduce((acc, q) => {
      const st = attempt.statuses[q.id] || 'not-visited';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {});
    const total = paperData.questions.length;
    const answered = (summary['answered'] || 0) + (summary['marked-answered'] || 0);
    const notAnswered = (summary['not-answered'] || 0);
    const notVisited = (summary['not-visited'] || 0);
    const marked = (summary['marked'] || 0);

    document.getElementById('submit-summary').innerHTML = `
      <p>Are you sure you want to submit?</p>
      <table class="cat-table">
        <tr><th>Total</th><td>${total}</td></tr>
        <tr><th>Answered</th><td style="color:#2e7d32;font-weight:600">${answered}</td></tr>
        <tr><th>Not Answered</th><td style="color:#c62828;font-weight:600">${notAnswered}</td></tr>
        <tr><th>Marked for Review (only)</th><td style="color:#6a1b9a;font-weight:600">${marked}</td></tr>
        <tr><th>Not Visited</th><td>${notVisited}</td></tr>
      </table>
      <p class="muted" style="margin-top:10px;">Once submitted, you cannot change your responses for this paper.</p>
    `;
    document.getElementById('submit-modal').classList.remove('hidden');
  }
  function closeSubmitModal() {
    document.getElementById('submit-modal').classList.add('hidden');
  }

  function doSubmit() {
    closeSubmitModal();
    document.getElementById('timeup-modal').classList.add('hidden');
    if (timerHandle) clearInterval(timerHandle);

    attempt.submitted = true;
    attempt.submitted_at = Date.now();
    persist();

    // Score now & store
    const result = Scoring.scorePaper(paperData, attempt.responses);
    result.submitted_at = attempt.submitted_at;
    result.started_at = attempt.started_at;
    result.duration_ms = attempt.submitted_at - attempt.started_at;
    TJ.save(TJ.resultKey(year, paper), result);

    // Clear the active attempt — paper is submitted
    TJ.remove(TJ.activeKey(year, paper));

    TJ.pushHistory({
      year, paper: Number(paper),
      submitted_at: attempt.submitted_at,
      score: result.total_marks
    });

    // Post-submit flow
    if (paper == '1') {
      const p2Result = TJ.load(TJ.resultKey(year, 2));
      if (p2Result) {
        // Both done -> go to combined
        location.href = `results.html?year=${year}&paper=combined`;
      } else {
        document.getElementById('post-submit-modal').classList.remove('hidden');
      }
    } else {
      // Paper 2 done — check P1
      const p1Result = TJ.load(TJ.resultKey(year, 1));
      if (p1Result) {
        location.href = `results.html?year=${year}&paper=combined`;
      } else {
        location.href = `results.html?year=${year}&paper=2`;
      }
    }
  }

  function persist() {
    TJ.save(TJ.activeKey(year, paper), attempt);
  }

  function startTimer() {
    const el = document.getElementById('timer');
    function tick() {
      const remaining = attempt.ends_at - Date.now();
      el.textContent = TJ.fmtTime(remaining);
      el.classList.toggle('warn', remaining < 10 * 60 * 1000 && remaining > 0);
      if (remaining <= 0) {
        clearInterval(timerHandle);
        document.getElementById('timeup-modal').classList.remove('hidden');
        // Auto-submit after a short delay if user doesn't click OK
        setTimeout(doSubmit, 2500);
      }
    }
    tick();
    timerHandle = setInterval(tick, 500);
  }

  // Periodic resave (defense against tab-close mid-action)
  setInterval(() => { if (attempt && !attempt.submitted) persist(); }, 5000);

  // Prevent accidental close while in-progress
  window.addEventListener('beforeunload', (e) => {
    if (attempt && !attempt.submitted) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  init().catch(err => {
    document.body.innerHTML = `<div class="full-screen-center">
      <h2>Test could not be loaded.</h2>
      <p class="muted">${err.message}</p>
      <a class="btn-primary" href="index.html">Back home</a></div>`;
  });
})();

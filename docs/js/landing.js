/* Landing page logic */
const AVAILABLE_YEARS = [2024];

function renderYears() {
  const grid = document.getElementById('year-grid');
  grid.innerHTML = '';
  AVAILABLE_YEARS.forEach(year => {
    const s = TJ.getYearStatus(year);
    const card = document.createElement('div');
    card.className = 'year-card';

    let statusLabel = '';
    let statusClass = '';
    if (s.status === 'done') {
      statusLabel = 'Both papers attempted'; statusClass = 'done';
    } else if (s.status === 'progress') {
      const parts = [];
      if (s.p1Result) parts.push('Paper 1 done');
      else if (s.p1Active) parts.push('Paper 1 in progress');
      if (s.p2Result) parts.push('Paper 2 done');
      else if (s.p2Active) parts.push('Paper 2 in progress');
      statusLabel = parts.join(' • ');
      statusClass = 'progress';
    } else {
      statusLabel = 'Not attempted';
      statusClass = 'fresh';
    }

    card.innerHTML = `
      <div class="year-num">WBJEE ${year}</div>
      <div class="meta">Maths · Physics · Chemistry</div>
      <div class="status ${statusClass}">${statusLabel}</div>
      <div class="actions"></div>
    `;
    const actions = card.querySelector('.actions');

    // Paper 1 button
    const p1btn = document.createElement('button');
    if (s.p1Result && !s.p1Active) {
      p1btn.textContent = 'Paper 1 — Done';
      p1btn.disabled = true;
      p1btn.style.opacity = '0.6';
    } else if (s.p1Active) {
      p1btn.textContent = 'Resume Paper 1';
      p1btn.onclick = () => location.href = `test.html?year=${year}&paper=1`;
    } else {
      p1btn.textContent = 'Start Paper 1 (Maths)';
      p1btn.onclick = () => location.href = `instructions.html?year=${year}&paper=1`;
    }
    actions.appendChild(p1btn);

    // Paper 2 button — only enabled if Paper 1 done, or always allow but recommend P1 first
    const p2btn = document.createElement('button');
    p2btn.className = 'secondary';
    if (s.p2Result && !s.p2Active) {
      p2btn.textContent = 'Paper 2 — Done';
      p2btn.disabled = true;
      p2btn.style.opacity = '0.6';
    } else if (s.p2Active) {
      p2btn.textContent = 'Resume Paper 2';
      p2btn.onclick = () => location.href = `test.html?year=${year}&paper=2`;
    } else {
      p2btn.textContent = 'Start Paper 2 (Phy + Chem)';
      p2btn.onclick = () => {
        if (!s.p1Result) {
          if (!confirm('Recommended: complete Paper 1 first.\n\nContinue to Paper 2 anyway?')) return;
        }
        location.href = `instructions.html?year=${year}&paper=2`;
      };
    }
    actions.appendChild(p2btn);

    // View final results
    if (s.p1Result && s.p2Result) {
      const r = document.createElement('button');
      r.className = 'secondary';
      r.textContent = 'View Final Result';
      r.onclick = () => location.href = `results.html?year=${year}&paper=combined`;
      actions.appendChild(r);
    } else if (s.p1Result) {
      const r = document.createElement('button');
      r.className = 'secondary';
      r.textContent = 'P1 Result';
      r.onclick = () => location.href = `results.html?year=${year}&paper=1`;
      actions.appendChild(r);
    }

    // Reset
    if (s.status !== 'fresh') {
      const reset = document.createElement('button');
      reset.className = 'danger';
      reset.textContent = 'Reset & Re-attempt';
      reset.onclick = () => {
        if (confirm(`Reset all data for WBJEE ${year}? This deletes both papers' attempts and results.`)) {
          TJ.clearYear(year);
          renderYears();
        }
      };
      actions.appendChild(reset);
    }

    grid.appendChild(card);
  });
}

renderYears();

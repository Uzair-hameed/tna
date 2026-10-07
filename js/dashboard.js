/* ============================================================
   DASHBOARD.JS — KPIs + Charts
   ============================================================ */

let chartInstances = { gaps: null, radar: null, pie: null, teachers: null };

/* ---------- Main render ---------- */
function renderDashboard() {
  renderKPIs();
  renderPriorities();
  renderGapChart();
  renderRadarChart();
  renderPieChart();
  renderTeachersChart();
}

/* ---------- KPI cards ---------- */
function renderKPIs() {
  const teachers = getAllTeachers();
  const total = teachers.length;

  // Avg self-rating (TNA)
  const selfVals = teachers.map(t => t.tna ? t.tna.average : null).filter(v => v != null);
  const avgSelf = selfVals.length ? selfVals.reduce((a,b)=>a+b,0)/selfVals.length : 0;

  // Avg test score (/40)
  const testVals = teachers.map(t => t.test ? t.test.total : null).filter(v => v != null);
  const avgTest = testVals.length ? testVals.reduce((a,b)=>a+b,0)/testVals.length : 0;

  // Avg observation %
  const obsVals = teachers.map(t => t.observation ? t.observation.percentage : null).filter(v => v != null);
  const avgObs = obsVals.length ? obsVals.reduce((a,b)=>a+b,0)/obsVals.length : 0;

  document.getElementById('kpi-total').textContent = total;
  document.getElementById('kpi-self').textContent = avgSelf.toFixed(2) + ' / 5';
  document.getElementById('kpi-test').textContent = avgTest.toFixed(1) + ' / 40';
  document.getElementById('kpi-obs').textContent = avgObs.toFixed(1) + '%';
}

/* ---------- Top 3 priorities ---------- */
function renderPriorities() {
  const list = document.getElementById('priority-list');
  const top3 = getTopPriorities(3);

  if (!top3.length) {
    list.innerHTML = '<li>No data yet — add teacher records first.</li>';
    return;
  }

  list.innerHTML = top3.map((d, i) => {
    const score = d.current != null ? d.current.toFixed(2) : '—';
    const priority = priorityFromScore(d.current);
    const color = priority.code === 'H' ? '#ef4444' :
                  priority.code === 'M' ? '#f59e0b' : '#10b981';
    return `<li>
      <strong>${d.label}</strong>
      <span style="color:#6b7280; margin-left:8px;">
        — current: ${score} / 4
        <span style="background:${color}; color:white; padding:2px 8px; border-radius:8px; font-size:11px; margin-left:6px;">
          ${priority.label}
        </span>
      </span>
    </li>`;
  }).join('');
}

/* ---------- Chart 1: Gap bar ---------- */
function renderGapChart() {
  const ctx = document.getElementById('chart-gaps');
  if (!ctx) return;
  if (chartInstances.gaps) chartInstances.gaps.destroy();

  const avgs = computeGroupDomainAverages();
  const labels = TNA_DOMAINS.map(d => d.label);
  const values = TNA_DOMAINS.map(d => avgs[d.key] != null ? (4 - avgs[d.key]).toFixed(2) : 0);
  const colors = TNA_DOMAINS.map(d => {
    const c = avgs[d.key];
    if (c == null) return '#e5e7eb';
    if (c < 2.5) return '#ef4444';
    if (c < 3.5) return '#f59e0b';
    return '#10b981';
  });

  // sort ascending by value (biggest gap on top)
  const combined = labels.map((l, i) => ({ l, v: parseFloat(values[i]), c: colors[i] }));
  combined.sort((a, b) => b.v - a.v);

  chartInstances.gaps = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: combined.map(x => x.l),
      datasets: [{
        label: 'Gap from Expected (4.0)',
        data: combined.map(x => x.v),
        backgroundColor: combined.map(x => x.c),
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => 'Gap: ' + ctx.parsed.x.toFixed(2) + ' points'
          }
        }
      },
      scales: {
        x: { beginAtZero: true, max: 4, title: { display: true, text: 'Gap (bigger = more training needed)' } }
      }
    }
  });
}

/* ---------- Chart 2: Radar — 3 sources ---------- */
function renderRadarChart() {
  const ctx = document.getElementById('chart-radar');
  if (!ctx) return;
  if (chartInstances.radar) chartInstances.radar.destroy();

  const teachers = getAllTeachers();
  const domainKeys = TNA_DOMAINS.map(d => d.key);
  const labels = TNA_DOMAINS.map(d => d.label);

  // For each source, average across teachers
  const selfArr = [], testArr = [], obsArr = [];

  domainKeys.forEach(key => {
    const selfVals = [], testVals = [], obsVals = [];

    teachers.forEach(t => {
      const scores = computeDomainScores(t);
      const v = scores[key];
      if (v == null) return;
      if (t.tna) selfVals.push(v);
      if (t.test) testVals.push(v);
      if (t.observation) obsVals.push(v);
    });

    const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
    selfArr.push(avg(selfVals));
    testArr.push(avg(testVals));
    obsArr.push(avg(obsVals));
  });

  chartInstances.radar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Self-Rating', data: selfArr, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.15)', pointBackgroundColor: '#3b82f6' },
        { label: 'Test',        data: testArr, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)', pointBackgroundColor: '#f59e0b' },
        { label: 'Observation', data: obsArr,  borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', pointBackgroundColor: '#10b981' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true, max: 4,
          ticks: { stepSize: 1 }
        }
      },
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

/* ---------- Chart 3: Pie (priority distribution) ---------- */
function renderPieChart() {
  const ctx = document.getElementById('chart-pie');
  if (!ctx) return;
  if (chartInstances.pie) chartInstances.pie.destroy();

  const avgs = computeGroupDomainAverages();
  let high = 0, medium = 0, low = 0, none = 0;
  TNA_DOMAINS.forEach(d => {
    const c = avgs[d.key];
    if (c == null) none++;
    else if (c < 2.5) high++;
    else if (c < 3.5) medium++;
    else low++;
  });

  chartInstances.pie = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['High Priority', 'Medium Priority', 'Low Priority', 'No Data'],
      datasets: [{
        data: [high, medium, low, none],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#e5e7eb'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

/* ---------- Chart 4: Per-teacher bar ---------- */
function renderTeachersChart() {
  const ctx = document.getElementById('chart-teachers');
  if (!ctx) return;
  if (chartInstances.teachers) chartInstances.teachers.destroy();

  const teachers = getAllTeachers();
  if (!teachers.length) {
    chartInstances.teachers = new Chart(ctx, {
      type: 'bar',
      data: { labels: ['No data'], datasets: [{ data: [0], backgroundColor: '#e5e7eb' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
    });
    return;
  }

  const labels = teachers.map(t => t.name);
  const values = teachers.map(t => t.observation ? t.observation.percentage : 0);
  const colors = values.map(p =>
    p >= 90 ? '#10b981' :
    p >= 75 ? '#3b82f6' :
    p >= 60 ? '#f59e0b' : '#ef4444'
  );

  chartInstances.teachers = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Observation %',
        data: values,
        backgroundColor: colors,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => ctx.parsed.y.toFixed(1) + '%' }
        }
      },
      scales: {
        y: { beginAtZero: true, max: 100, title: { display: true, text: 'Observation %' } }
      }
    }
  });
}

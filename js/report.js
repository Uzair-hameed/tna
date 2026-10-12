/* ============================================================
   REPORT.JS — English Version
   Records table, individual reports, group reports,
   PDF export, Word (.docx) export with charts
   ============================================================ */

/* ============ RECORDS TABLE ============ */

function renderRecordsTable() {
  const tbody = document.getElementById('records-body');
  if (!tbody) return;

  const search = (document.getElementById('records-search').value || '').toLowerCase();
  const all = getAllTeachers();
  const teachers = search ? all.filter(t => t.name.toLowerCase().includes(search)) : all;

  if (!teachers.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-msg">${all.length ? 'No teachers match your search.' : 'No records yet. Add a teacher via the Observation, Test, or TNA tabs.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = teachers.map(t => {
    const obsPct = t.observation ? t.observation.percentage : null;
    const rating = obsPct != null ? getRatingLabel(obsPct) : { label: '—', className: '' };

    const scores = computeDomainScores(t);
    const lowest = TNA_DOMAINS
      .map(d => ({ label: d.label, v: scores[d.key] }))
      .filter(d => d.v != null)
      .sort((a, b) => a.v - b.v)[0];
    const prio = lowest ? priorityFromScore(lowest.v) : { code: '—', label: '—', className: '' };

    const selfTxt = t.tna ? t.tna.average.toFixed(2) : '—';
    const testTxt = t.test ? t.test.total + ' / 40' : '—';
    const obsTxt = obsPct != null ? obsPct.toFixed(1) + '%' : '—';

    const att = getAttachmentForTeacher(t.name);
    const reflTxt = att
      ? `<span class="rating-badge exemplary" title="${escapeHtml(att.filename)}">✓ PDF</span>`
      : '<span style="color:#9ca3af;font-size:11px;">—</span>';

    return `
      <tr>
        <td><strong>${escapeHtml(t.name)}</strong>${t.grade ? '<br><span style="color:#9ca3af;font-size:11px;">Grade ' + escapeHtml(t.grade) + '</span>' : ''}</td>
        <td>${escapeHtml(t.gradeBand || t.grade || '—')}</td>
        <td>${selfTxt}</td>
        <td>${testTxt}</td>
        <td>${obsTxt}</td>
        <td><span class="rating-badge ${rating.className}">${rating.label}</span></td>
        <td><span class="rating-badge ${prio.className}">${prio.label}</span></td>
        <td style="text-align:center;">${reflTxt}</td>
        <td>
          <button class="btn btn-secondary btn-small" onclick="editTeacherRecord('${t.id}')">Edit</button>
          <button class="btn btn-danger btn-small" onclick="deleteTeacherRecord('${t.id}')">Del</button>
        </td>
      </tr>`;
  }).join('');
}

function editTeacherRecord(id) {
  const t = getAllTeachers().find(x => x.id === id);
  if (!t) return;
  loadObservationForTeacher(t);
  loadTestForTeacher(t);
  loadTNAForTeacher(t);
  document.querySelector('.tab-btn[data-tab="observation"]').click();
  alert('Loaded ' + t.name + ' into the editor. Update any tab and re-save.');
}

function deleteTeacherRecord(id) {
  if (!confirm('Delete this teacher record permanently?')) return;
  deleteTeacher(id);
  renderRecordsTable();
  renderDashboard();
  populateReportTeacherDropdown();
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

/* ============ CSV EXPORT ============ */
function exportRecordsCSV() {
  const teachers = getAllTeachers();
  if (!teachers.length) { alert('No records to export.'); return; }

  const headers = [
    'Name', 'Grade', 'Section', 'Grade Band', 'Observer', 'Date',
    'TNA Avg', 'TNA Converted', 'Test Total', 'Test %',
    'Obs Total', 'Obs Max', 'Obs %', 'Self-Reflection',
    ...TNA_DOMAINS.map(d => d.label + ' (1-4)')
  ];

  const rows = teachers.map(t => {
    const scores = computeDomainScores(t);
    const att = getAttachmentForTeacher(t.name);
    return [
      t.name || '',
      t.grade || '',
      t.section || '',
      t.gradeBand || '',
      t.observer || '',
      t.observationDate || t.testDate || t.tnaDate || '',
      t.tna ? t.tna.average : '',
      t.tna ? t.tna.converted : '',
      t.test ? t.test.total : '',
      t.test ? t.test.percentage : '',
      t.observation ? t.observation.totalPoints : '',
      t.observation ? t.observation.maxPoints : '',
      t.observation ? t.observation.percentage : '',
      att ? att.filename : '',
      ...TNA_DOMAINS.map(d => scores[d.key] != null ? scores[d.key].toFixed(2) : '')
    ];
  });

  const csv = [headers, ...rows]
    .map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','))
    .join('\n');

  downloadText(csv, 'english-teacher-records-' + new Date().toISOString().slice(0,10) + '.csv', 'text/csv');
}

/* ============ REPORT PREVIEW ============ */

let lastReportHTML = '';

function generateReport() {
  const type = document.getElementById('report-type').value;
  const preview = document.getElementById('report-preview');

  let html = '';
  if (type === 'individual') {
    const tid = document.getElementById('report-teacher').value;
    const t = getAllTeachers().find(x => x.id === tid);
    if (!t) { alert('Please select a teacher.'); return; }
    html = buildIndividualReport(t);
  } else {
    html = buildGroupReport();
  }
  preview.innerHTML = html;
  lastReportHTML = html;
}

/* ============================================================
   AUTO-GENERATOR: PART B (Strengths + Growth + Evidence)
   ============================================================ */
function generatePartB(t) {
  const obs = t.observation;
  if (!obs || !obs.domainScores) {
    return '<p class="empty-msg">No observation data available for feedback generation.</p>';
  }

  const ranked = OBSERVATION_DOMAINS.map(d => {
    const val = obs.domainScores['d' + d.id] || 0;
    const pct = (val / d.max) * 100;
    return { id: d.id, name: d.name, val, max: d.max, pct };
  }).sort((a, b) => b.pct - a.pct);

  const top3 = ranked.slice(0, 3);
  const bottom2 = ranked.slice(-2).reverse();

  const strengthsHTML = top3.map((d) => {
    const evidenceText = getEvidenceForDomain(t, d.id);
    return `<li>
      <strong>${d.name}</strong> — score: ${d.val}/${d.max} (${d.pct.toFixed(0)}%)
      <br><em>Evidence:</em> ${evidenceText}
    </li>`;
  }).join('');

  const growthHTML = bottom2.map((d) => {
    const evidenceText = getGrowthEvidenceForDomain(t, d.id);
    return `<li>
      <strong>${d.name}</strong> — score: ${d.val}/${d.max} (${d.pct.toFixed(0)}%)
      <br><em>Focus for improvement:</em> ${evidenceText}
    </li>`;
  }).join('');

  const allIndicators = [];
  OBSERVATION_DOMAINS.forEach(d => {
    d.indicators.forEach(ind => {
      const score = obs.scores ? obs.scores[ind.code] : null;
      if (score != null) allIndicators.push({ code: ind.code, text: ind.text, score });
    });
  });

  const scored4 = allIndicators.filter(x => x.score === '4').map(x => x.code);
  const scored1_2 = allIndicators.filter(x => x.score === '1' || x.score === '2').map(x => x.code);

  let evidenceParagraph = '';
  if (scored4.length) {
    evidenceParagraph += `Demonstrated <strong>Exemplary (4)</strong> performance on ${scored4.length} indicator(s): ${scored4.slice(0, 8).join(', ')}${scored4.length > 8 ? '...' : ''}. `;
  }
  if (scored1_2.length) {
    evidenceParagraph += `Scored <strong>Ineffective/Developing (1–2)</strong> on ${scored1_2.length} indicator(s): ${scored1_2.slice(0, 8).join(', ')}${scored1_2.length > 8 ? '...' : ''}.`;
  }
  if (!evidenceParagraph) {
    evidenceParagraph = 'Observation completed; scoring shows moderate performance across most indicators.';
  }

  return `
    <h2>Part B: Observer Feedback (Auto-Generated)</h2>

    <h3>✅ Strengths (with evidence)</h3>
    <ol>${strengthsHTML}</ol>

    <h3>⚠️ Areas for Growth (Priority — max 2)</h3>
    <ol>${growthHTML}</ol>

    <h3>📌 Specific Evidence Observed</h3>
    <p>${evidenceParagraph}</p>
  `;
}

function getEvidenceForDomain(t, domainId) {
  const domain = OBSERVATION_DOMAINS.find(d => d.id === domainId);
  if (!domain || !t.observation || !t.observation.scores) return 'Observed strong delivery.';

  const scores = t.observation.scores;
  const high = domain.indicators.filter(ind => scores[ind.code] === '4');
  if (high.length) {
    return `Scored 4 on ${high.length} indicator(s) — e.g., "${high[0].text}"`;
  }
  const medium = domain.indicators.filter(ind => scores[ind.code] === '3');
  if (medium.length) {
    return `Consistently scored 3 — solid performance on "${medium[0].text}"`;
  }
  return 'Showed competent performance across indicators.';
}

function getGrowthEvidenceForDomain(t, domainId) {
  const domain = OBSERVATION_DOMAINS.find(d => d.id === domainId);
  if (!domain || !t.observation || !t.observation.scores) return 'Targeted support recommended.';

  const scores = t.observation.scores;
  const low = domain.indicators.filter(ind => scores[ind.code] === '1' || scores[ind.code] === '2');
  if (low.length) {
    return `Scored ${scores[low[0].code]} on "${low[0].text}" — needs strengthening.`;
  }
  return 'Continue building on current practice.';
}

/* ============================================================
   AUTO-GENERATOR: PART C (3-Step Action Plan)
   ============================================================ */
function generatePartC(t) {
  const obs = t.observation;
  if (!obs || !obs.domainScores) {
    return '<p class="empty-msg">No observation data available for action plan generation.</p>';
  }

  const ranked = OBSERVATION_DOMAINS.map(d => {
    const val = obs.domainScores['d' + d.id] || 0;
    const pct = (val / d.max) * 100;
    return { id: d.id, name: d.name, val, max: d.max, pct };
  }).sort((a, b) => a.pct - b.pct);

  const weakest = ranked[0];
  const secondWeakest = ranked[1];

  return `
    <h2>Part C: Action Plan (Auto-Generated)</h2>
    <table>
      <thead>
        <tr><th>#</th><th>Action Step</th><th>Support Needed</th><th>Timeline</th><th>Follow-up Date</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>Attend targeted workshop on <strong>${weakest.name}</strong> (currently ${weakest.pct.toFixed(0)}%)</td>
          <td>Master trainer + resource pack on ${weakest.name.toLowerCase()}</td>
          <td>Within 4 weeks</td>
          <td>${futureDate(28)}</td>
        </tr>
        <tr>
          <td>2</td>
          <td>Peer observation of a teacher strong in <strong>${weakest.name}</strong> and <strong>${secondWeakest.name}</strong></td>
          <td>Coordinator to schedule + release time</td>
          <td>Within 6 weeks</td>
          <td>${futureDate(42)}</td>
        </tr>
        <tr>
          <td>3</td>
          <td>Follow-up observation focused on <strong>${weakest.name}</strong>; measure progress</td>
          <td>Observer time + updated rubric</td>
          <td>Within 10 weeks</td>
          <td>${futureDate(70)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString('en-GB');
}

/* ============================================================
   INDIVIDUAL REPORT
   ============================================================ */
function buildIndividualReport(t) {
  const scores = computeDomainScores(t);
  const today = new Date().toLocaleDateString('en-GB');

  const obs = t.observation;
  const test = t.test;
  const tna = t.tna;

  const obsPct = obs ? obs.percentage : null;
  const rating = obsPct != null ? getRatingLabel(obsPct) : { label: '—', className: '' };

  const att = getAttachmentForTeacher(t.name);
  let reflSection = '';
  if (att) {
    reflSection = `
      <h2>📎 Part A: Teacher Self-Reflection</h2>
      <p><strong>Attached:</strong> ${escapeHtml(att.filename)}</p>
      <p style="color:#6b7280; font-size:12px;">
        Uploaded on ${new Date(att.uploadedAt).toLocaleDateString('en-GB')}.
        The full PDF is available in the Attachments tab.
      </p>
    `;
  } else {
    reflSection = `
      <h2>📎 Part A: Teacher Self-Reflection</h2>
      <p style="color:#6b7280; font-style:italic;">
        Not yet uploaded. Upload via the "Self-Reflections" tab.
      </p>
    `;
  }

  const domainRows = TNA_DOMAINS.map(d => {
    const v = scores[d.key];
    const p = priorityFromScore(v);
    const vTxt = v != null ? v.toFixed(2) + ' / 4' : '—';
    return `<tr>
      <td>${d.label}</td>
      <td>${vTxt}</td>
      <td><span class="rating-badge ${p.className}">${p.label}</span></td>
    </tr>`;
  }).join('');

  let obsBreakdown = '';
  if (obs && obs.domainScores) {
    const rows = OBSERVATION_DOMAINS.map(d => {
      const val = obs.domainScores['d' + d.id] || 0;
      const pct = ((val / d.max) * 100).toFixed(1);
      return `<tr>
        <td>D${d.id}. ${d.name}</td>
        <td>${val} / ${d.max}</td>
        <td>${pct}%</td>
      </tr>`;
    }).join('');
    obsBreakdown = `<h2>Classroom Observation Breakdown</h2>
      <table>
        <thead><tr><th>Domain</th><th>Score</th><th>%</th></tr></thead>
        <tbody>${rows}
          <tr style="font-weight:700; background:#eff6ff;">
            <td>TOTAL</td>
            <td>${obs.totalPoints} / ${obs.maxPoints}</td>
            <td>${obs.percentage.toFixed(1)}%</td>
          </tr>
        </tbody>
      </table>`;
  }

  let testBreakdown = '';
  if (test) {
    testBreakdown = `<h2>Teacher Test Breakdown</h2>
      <table>
        <thead><tr><th>Part</th><th>Score</th><th>Max</th></tr></thead>
        <tbody>
          <tr><td>Part A — Subject Knowledge</td><td>${test.partA}</td><td>20</td></tr>
          <tr><td>Part B — Pedagogical Knowledge</td><td>${test.partB}</td><td>20</td></tr>
          <tr style="font-weight:700; background:#eff6ff;">
            <td>TOTAL</td><td>${test.total}</td><td>40</td>
          </tr>
        </tbody>
      </table>`;
  }

  return `
    <h1>Individual Teacher Report — English</h1>
    <div class="report-meta">
      <div><span>Teacher:</span> <strong>${escapeHtml(t.name)}</strong></div>
      <div><span>Grade:</span> <strong>${escapeHtml(t.grade || t.gradeBand || '—')}</strong></div>
      <div><span>Section:</span> <strong>${escapeHtml(t.section || '—')}</strong></div>
      <div><span>Students:</span> <strong>${escapeHtml(t.students || '—')}</strong></div>
      <div><span>Observer:</span> <strong>${escapeHtml(t.observer || '—')}</strong></div>
      <div><span>Date:</span> <strong>${escapeHtml(t.observationDate || today)}</strong></div>
    </div>

    <h2>Summary Scores</h2>
    <table>
      <thead><tr><th>Source</th><th>Score</th><th>Percentage</th></tr></thead>
      <tbody>
        <tr>
          <td>TNA Self-Assessment</td>
          <td>${tna ? tna.average.toFixed(2) + ' / 5' : '—'}</td>
          <td>${tna ? ((tna.average / 5) * 100).toFixed(1) + '%' : '—'}</td>
        </tr>
        <tr>
          <td>Teacher Test</td>
          <td>${test ? test.total + ' / 40' : '—'}</td>
          <td>${test ? test.percentage.toFixed(1) + '%' : '—'}</td>
        </tr>
        <tr>
          <td>Classroom Observation</td>
          <td>${obs ? obs.totalPoints + ' / ' + obs.maxPoints : '—'}</td>
          <td>${obs ? obs.percentage.toFixed(1) + '%' : '—'}</td>
        </tr>
        <tr style="font-weight:700; background:#eff6ff;">
          <td>Overall Rating</td>
          <td colspan="2">${rating.label}</td>
        </tr>
      </tbody>
    </table>

    ${obsBreakdown}
    ${testBreakdown}

    <h2>Domain-Level Analysis (1–4 scale)</h2>
    <table>
      <thead><tr><th>Domain</th><th>Current</th><th>Priority</th></tr></thead>
      <tbody>${domainRows}</tbody>
    </table>

    ${reflSection}
    ${generatePartB(t)}
    ${generatePartC(t)}

    <p style="margin-top:30px; color:#6b7280; font-size:12px; text-align:center;">
      Report generated on ${today} · Confidential
    </p>
  `;
}

/* ============================================================
   GROUP REPORT
   ============================================================ */
function buildGroupReport() {
  const teachers = getAllTeachers();
  if (!teachers.length) return '<p class="empty-msg">No teacher records available.</p>';

  const today = new Date().toLocaleDateString('en-GB');
  const avgs = computeGroupDomainAverages();
  const top5 = getTopPriorities(5);

  const sorted = TNA_DOMAINS
    .map(d => ({ label: d.label, v: avgs[d.key] }))
    .filter(d => d.v != null)
    .sort((a, b) => b.v - a.v);

  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const teacherRows = teachers.map(t => {
    const obs = t.observation;
    const obsPct = obs ? obs.percentage.toFixed(1) + '%' : '—';
    const rating = obs ? getRatingLabel(obs.percentage).label : '—';
    const tnaAvg = t.tna ? t.tna.average.toFixed(2) : '—';
    const testTotal = t.test ? t.test.total + '/40' : '—';
    const att = getAttachmentForTeacher(t.name);
    const refl = att ? '✓' : '—';
    return `<tr>
      <td>${escapeHtml(t.name)}</td>
      <td>${escapeHtml(t.gradeBand || t.grade || '—')}</td>
      <td>${tnaAvg}</td>
      <td>${testTotal}</td>
      <td>${obsPct}</td>
      <td>${rating}</td>
      <td style="text-align:center;">${refl}</td>
    </tr>`;
  }).join('');

  const domainRows = TNA_DOMAINS.map(d => {
    const v = avgs[d.key];
    const gap = v != null ? (4 - v).toFixed(2) : '—';
    const p = priorityFromScore(v);
    return `<tr>
      <td>${d.label}</td>
      <td>${v != null ? v.toFixed(2) : '—'}</td>
      <td>${gap}</td>
      <td><span class="rating-badge ${p.className}">${p.label}</span></td>
    </tr>`;
  }).join('');

  const selfAvg = teachers.map(t => t.tna ? t.tna.average : null).filter(v => v != null);
  const testAvg = teachers.map(t => t.test ? t.test.total : null).filter(v => v != null);
  const obsAvg = teachers.map(t => t.observation ? t.observation.percentage : null).filter(v => v != null);
  const mean = arr => arr.length ? (arr.reduce((a,b)=>a+b,0) / arr.length) : 0;

  const attCount = teachers.filter(t => getAttachmentForTeacher(t.name)).length;

  return `
    <h1>Group Summary Report — English Teacher Training Needs Analysis</h1>
    <div class="report-meta">
      <div><span>Total Teachers:</span> <strong>${teachers.length}</strong></div>
      <div><span>Report Date:</span> <strong>${today}</strong></div>
      <div><span>Grade Bands:</span> <strong>1–5 & 6–8</strong></div>
      <div><span>Subject:</span> <strong>English</strong></div>
      <div><span>Self-Reflections Attached:</span> <strong>${attCount} / ${teachers.length}</strong></div>
    </div>

    <h2>Group Averages</h2>
    <table>
      <thead><tr><th>Source</th><th>Average</th><th>Count</th></tr></thead>
      <tbody>
        <tr><td>TNA Self-Rating</td><td>${mean(selfAvg).toFixed(2)} / 5</td><td>${selfAvg.length}</td></tr>
        <tr><td>Teacher Test</td><td>${mean(testAvg).toFixed(1)} / 40</td><td>${testAvg.length}</td></tr>
        <tr><td>Classroom Observation</td><td>${mean(obsAvg).toFixed(1)}%</td><td>${obsAvg.length}</td></tr>
      </tbody>
    </table>

    <h2>Domain Gap Analysis (Expected: 4.00)</h2>
    <table>
      <thead><tr><th>Domain</th><th>Current Avg</th><th>Gap</th><th>Priority</th></tr></thead>
      <tbody>${domainRows}</tbody>
    </table>

    <h2>🎯 Top 5 Priority Training Areas</h2>
    <ol>
      ${top5.map(d => `<li><strong>${d.label}</strong> — current: ${d.current.toFixed(2)} / 4 (${priorityFromScore(d.current).label} priority)</li>`).join('')}
    </ol>

    <h2>Recommended Training Modalities</h2>
    <ul>
      <li><strong>Workshop</strong> — for the highest-priority domain, delivered by master trainer</li>
      <li><strong>Demonstration lesson</strong> — model exemplary English teaching in real classroom</li>
      <li><strong>Peer observation</strong> — pair weaker teachers with stronger peers</li>
      <li><strong>Micro-teaching</strong> — practice specific skills in safe setting</li>
      <li><strong>Resource provision</strong> — supply materials, charts, flashcards where missing</li>
      <li><strong>Coaching / Mentoring</strong> — one-to-one support for weakest areas</li>
      <li><strong>Professional Learning Community (PLC)</strong> — collaborative ongoing learning</li>
    </ul>

    <h2>Key Findings</h2>
    <h3>✅ Group Strengths</h3>
    <p>${strongest ? 'The group performs best in <strong>' + strongest.label + '</strong> (avg: ' + strongest.v.toFixed(2) + ' / 4). This is a solid foundation to build on.' : '—'}</p>

    <h3>⚠️ Urgent Training Needs</h3>
    <p>${weakest ? 'The most critical gap is in <strong>' + weakest.label + '</strong> (avg: ' + weakest.v.toFixed(2) + ' / 4). Immediate intervention recommended.' : '—'}</p>

    <h2>Per-Teacher Summary</h2>
    <table>
      <thead>
        <tr>
          <th>Teacher</th><th>Grade Band</th><th>TNA Avg</th>
          <th>Test</th><th>Observation %</th><th>Rating</th><th>Self-Refl.</th>
        </tr>
      </thead>
      <tbody>${teacherRows}</tbody>
    </table>

    <h2>Action Plan (Group-Level)</h2>
    <table>
      <thead><tr><th>#</th><th>Action</th><th>Responsible</th><th>Timeline</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>Conduct workshop on ${top5[0] ? top5[0].label : 'priority area'}</td><td>Master Trainer</td><td>Month 1</td></tr>
        <tr><td>2</td><td>Conduct workshop on ${top5[1] ? top5[1].label : 'priority area'}</td><td>Master Trainer</td><td>Month 1</td></tr>
        <tr><td>3</td><td>Arrange peer observation cycle for English teaching</td><td>Coordinator</td><td>Month 2</td></tr>
        <tr><td>4</td><td>Provide resource kits to all English teachers</td><td>Admin</td><td>Month 2</td></tr>
        <tr><td>5</td><td>Second round of classroom observations</td><td>Observers</td><td>Month 3</td></tr>
        <tr><td>6</td><td>Review progress & plan next cycle</td><td>Head of English</td><td>Month 4</td></tr>
      </tbody>
    </table>

    <p style="margin-top:30px; color:#6b7280; font-size:12px; text-align:center;">
      Report generated on ${today} · Confidential
    </p>
  `;
}

/* ============ PDF DOWNLOAD ============ */
function downloadReportPDF() {
  if (!lastReportHTML) { alert('Generate a report first.'); return; }
  window.print();
}

/* ============ UTILITY ============ */
function downloadText(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ============ DROPDOWN POPULATE ============ */
function populateReportTeacherDropdown() {
  const sel = document.getElementById('report-teacher');
  if (!sel) return;
  const teachers = getAllTeachers();
  sel.innerHTML = '<option value="">-- Select Teacher --</option>' +
    teachers.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
}

/* ============================================================
   WORD (.docx) EXPORT — Complete report with tables + charts
   ============================================================ */

async function downloadReportDOCX() {
  if (!lastReportHTML) {
    alert('Generate a report first.');
    return;
  }

  if (typeof window.docx === 'undefined') {
    alert('Word library not loaded. Please refresh the page (Ctrl+Shift+R).');
    return;
  }

  const btn = document.getElementById('btn-download-docx');
  const originalText = btn ? btn.textContent : '';
  if (btn) { btn.textContent = '⏳ Generating...'; btn.disabled = true; }

  try {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
            WidthType, BorderStyle, AlignmentType, ImageRun,
            ShadingType } = window.docx;

    const type = document.getElementById('report-type').value;
    const children = [];

    /* ============ TITLE ============ */
    const reportTitle = type === 'individual'
      ? 'Individual Teacher Report — English'
      : 'Group Summary Report — English';

    children.push(new Paragraph({
      children: [new TextRun({ text: reportTitle, bold: true, size: 36, color: '1e40af' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    }));

    children.push(new Paragraph({
      children: [new TextRun({ text: 'Generated on ' + new Date().toLocaleDateString('en-GB'), size: 20, italics: true, color: '6b7280' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }));

    /* ============ PARSE THE HTML REPORT ============ */
    const parser = new DOMParser();
    const doc = parser.parseFromString(lastReportHTML, 'text/html');

    const elements = doc.body.children;
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const tag = el.tagName.toLowerCase();

      if (tag === 'h1') {
        children.push(new Paragraph({
          children: [new TextRun({ text: el.textContent, bold: true, size: 32, color: '1e40af' })],
          spacing: { before: 300, after: 200 },
          border: { bottom: { color: '1e40af', size: 12, style: BorderStyle.SINGLE, space: 6 } }
        }));
      }
      else if (tag === 'h2') {
        children.push(new Paragraph({
          children: [new TextRun({ text: el.textContent, bold: true, size: 26, color: '1e40af' })],
          spacing: { before: 300, after: 150 }
        }));
      }
      else if (tag === 'h3') {
        children.push(new Paragraph({
          children: [new TextRun({ text: el.textContent, bold: true, size: 22, color: '374151' })],
          spacing: { before: 200, after: 100 }
        }));
      }
      else if (tag === 'p') {
        const txt = el.textContent.trim();
        if (txt) {
          children.push(new Paragraph({
            children: [new TextRun({ text: txt, size: 22 })],
            spacing: { after: 150 }
          }));
        }
      }
      else if (tag === 'ul' || tag === 'ol') {
        const items = el.querySelectorAll('li');
        items.forEach((li, idx) => {
          const prefix = tag === 'ol' ? (idx + 1) + '. ' : '• ';
          children.push(new Paragraph({
            children: [new TextRun({ text: prefix + li.textContent.trim(), size: 22 })],
            spacing: { after: 80 },
            indent: { left: 400 }
          }));
        });
      }
      else if (tag === 'table') {
        const rows = el.querySelectorAll('tr');
        const tableRows = [];

        rows.forEach((tr, rowIdx) => {
          const cells = tr.querySelectorAll('th, td');
          const tableCells = [];

          cells.forEach(cell => {
            const isHeader = cell.tagName.toLowerCase() === 'th' || rowIdx === 0;
            const cellText = cell.textContent.trim();

            tableCells.push(new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: cellText,
                  bold: isHeader,
                  size: 20,
                  color: isHeader ? 'FFFFFF' : '1f2937'
                })],
                spacing: { before: 60, after: 60 }
              })],
              shading: isHeader ? {
                type: ShadingType.CLEAR,
                fill: '1e40af'
              } : (rowIdx % 2 === 0 ? {
                type: ShadingType.CLEAR,
                fill: 'f9fafb'
              } : undefined),
              width: { size: 100 / cells.length, type: WidthType.PERCENTAGE }
            }));
          });

          tableRows.push(new TableRow({ children: tableCells }));
        });

        children.push(new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'e5e7eb' },
            insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'e5e7eb' }
          }
        }));

        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      }
    }

    /* ============ CAPTURE CHARTS AS IMAGES ============ */
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Charts & Visualizations', bold: true, size: 28, color: '1e40af' })],
      spacing: { before: 400, after: 200 },
      pageBreakBefore: true
    }));

    const chartIds = ['chart-gaps', 'chart-radar', 'chart-pie', 'chart-teachers'];
    const chartTitles = {
      'chart-gaps': 'Domain Gaps (Training Needs)',
      'chart-radar': 'Three-Source Comparison',
      'chart-pie': 'Priority Distribution',
      'chart-teachers': 'Per-Teacher Observation %'
    };

    for (const chartId of chartIds) {
      const canvas = document.getElementById(chartId);
      if (!canvas || canvas.width === 0) continue;

      try {
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        children.push(new Paragraph({
          children: [new TextRun({ text: chartTitles[chartId], bold: true, size: 22, color: '374151' })],
          spacing: { before: 300, after: 150 }
        }));

        children.push(new Paragraph({
          children: [new ImageRun({
            data: bytes,
            transformation: { width: 600, height: 340 }
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }));
      } catch (e) {
        console.warn('Chart capture failed for', chartId, e);
      }
    }

    /* ============ BUILD & DOWNLOAD ============ */
    const docFile = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 }
          }
        },
        children: children
      }]
    });

    const blob = await Packer.toBlob(docFile);
    const teacherName = type === 'individual'
      ? (document.getElementById('report-teacher').selectedOptions[0].textContent || 'Report')
      : 'Group_Summary';
    const filename = teacherName.replace(/[^a-zA-Z0-9]/g, '_') + '_' + new Date().toISOString().slice(0,10) + '.docx';
    downloadBlob(blob, filename);

  } catch (err) {
    console.error('DOCX generation failed:', err);
    alert('❌ Failed to generate Word file: ' + err.message);
  } finally {
    if (btn) { btn.textContent = originalText; btn.disabled = false; }
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

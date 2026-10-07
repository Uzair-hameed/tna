/* ============================================================
   TNA.JS — Self-assessment + Gap Analysis
   ============================================================ */

const TNA_SECTIONS = ['a', 'b', 'c', 'd', 'e', 'f'];

function updateTNASummary() {
  const vals = TNA_SECTIONS.map(s => num('tna-' + s)).filter(v => v > 0);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const converted = (avg / 5) * 4;   // convert 1-5 to 1-4 scale

  document.getElementById('tna-avg').textContent = avg.toFixed(2);
  document.getElementById('tna-converted').textContent = converted.toFixed(2);
}

function saveTNA() {
  const name = document.getElementById('tna-teacher').value.trim();
  if (!name) { alert('Please enter the teacher name.'); return; }

  const sections = {};
  TNA_SECTIONS.forEach(s => sections[s] = num('tna-' + s));

  const vals = Object.values(sections).filter(v => v > 0);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

  upsertTeacher({
    name: name,
    employeeId: document.getElementById('tna-empid').value.trim(),
    gradeBand: document.getElementById('tna-band').value,
    tnaDate: document.getElementById('tna-date').value,
    tna: {
      sections: sections,
      average: parseFloat(avg.toFixed(2)),
      converted: parseFloat(((avg / 5) * 4).toFixed(2))
    }
  });

  setStatus('TNA saved for ' + name);
  alert('✅ TNA self-assessment saved for ' + name);
}

function clearTNAForm() {
  if (!confirm('Clear all TNA inputs?')) return;
  ['tna-teacher','tna-empid','tna-date','tna-a','tna-b','tna-c','tna-d','tna-e','tna-f']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('tna-band').value = '1-5';
  updateTNASummary();
}

function loadTNAForTeacher(teacher) {
  if (!teacher || !teacher.tna) return;
  const t = teacher.tna;
  document.getElementById('tna-teacher').value = teacher.name || '';
  document.getElementById('tna-empid').value = teacher.employeeId || '';
  document.getElementById('tna-band').value = teacher.gradeBand || '1-5';
  document.getElementById('tna-date').value = teacher.tnaDate || '';
  TNA_SECTIONS.forEach(s => {
    document.getElementById('tna-' + s).value = t.sections[s] || '';
  });
  updateTNASummary();
}

/* ============================================================
   GAP ANALYSIS ENGINE (used by Dashboard & Reports)
   ============================================================ */

const TNA_DOMAINS = [
  { key: 'subjectKnowledge',  label: 'Subject Knowledge' },
  { key: 'phonics',           label: 'Phonics (Gr 1–5)' },
  { key: 'readingStrategies', label: 'Reading Strategies (Gr 6–8)' },
  { key: 'grammarTeaching',   label: 'Grammar Teaching' },
  { key: 'lsrw',              label: 'LSRW Integration' },
  { key: 'assessment',        label: 'Assessment Literacy' },
  { key: 'differentiation',   label: 'Differentiation' },
  { key: 'classroomMgmt',     label: 'Classroom Management' },
  { key: 'materials',         label: 'Materials & Resources' },
  { key: 'fluency',           label: 'Teacher English Fluency' }
];

/* Domain extraction: for a given teacher record, get current average (1-4 scale) */
function computeDomainScores(teacher) {
  const out = {};
  const obs = teacher.observation ? teacher.observation.domainScores : null;
  const test = teacher.test || null;
  const tna = teacher.tna || null;

  // Helper: convert raw /max to /4
  const norm = (val, max) => (max > 0 && val != null) ? (val / max) * 4 : null;
  const avg = (arr) => {
    const v = arr.filter(x => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  // 1. Subject Knowledge — TNA.A, Test Part A, Obs Domain 2
  out.subjectKnowledge = avg([
    tna ? tna.sections.a : null,
    test ? norm(test.partA, 20) : null,
    obs ? norm(obs.d2, obs.d2_max) : null
  ]);

  // 2. Phonics — TNA.A (partial) + TNA.B, only Gr 1-5
  if (teacher.gradeBand === '1-5') {
    out.phonics = avg([
      tna ? tna.sections.b : null,
      obs ? norm(obs.d5, obs.d5_max) : null
    ]);
  } else out.phonics = null;

  // 3. Reading Strategies — TNA.A (partial) + Test A3, only Gr 6-8
  if (teacher.gradeBand === '6-8') {
    out.readingStrategies = avg([
      tna ? tna.sections.a : null,
      test ? norm(test.subs ? test.subs.a3 : null, 5) : null,
      obs ? norm(obs.d6, obs.d6_max) : null
    ]);
  } else out.readingStrategies = null;

  // 4. Grammar Teaching — Test A1 + Obs D3
  out.grammarTeaching = avg([
    test ? norm(test.subs ? test.subs.a1 : null, 5) : null,
    obs ? norm(obs.d3, obs.d3_max) : null
  ]);

  // 5. LSRW Integration — TNA.B + Obs D6
  out.lsrw = avg([
    tna ? tna.sections.b : null,
    obs ? norm(obs.d6, obs.d6_max) : null
  ]);

  // 6. Assessment Literacy — TNA.C + Test B + Obs D7
  out.assessment = avg([
    tna ? tna.sections.c : null,
    test ? norm(test.partB, 20) : null,
    obs ? norm(obs.d7, obs.d7_max) : null
  ]);

  // 7. Differentiation — TNA.B + Obs D8
  out.differentiation = avg([
    tna ? tna.sections.b : null,
    obs ? norm(obs.d8, obs.d8_max) : null
  ]);

  // 8. Classroom Management — TNA.D + Obs D9
  out.classroomMgmt = avg([
    tna ? tna.sections.d : null,
    obs ? norm(obs.d9, obs.d9_max) : null
  ]);

  // 9. Materials & Resources — TNA.E + Obs D11
  out.materials = avg([
    tna ? tna.sections.e : null,
    obs ? norm(obs.d11, obs.d11_max) : null
  ]);

  // 10. Teacher English Fluency — TNA.F + Obs D12
  out.fluency = avg([
    tna ? tna.sections.f : null,
    obs ? norm(obs.d12, obs.d12_max) : null
  ]);

  return out;
}

/* Priority from current score (1-4 scale) */
function priorityFromScore(score) {
  if (score == null) return { code: '—', label: 'No Data', className: '' };
  if (score < 2.5) return { code: 'H', label: 'High',   className: 'ineffective' };
  if (score < 3.5) return { code: 'M', label: 'Medium', className: 'developing' };
  return { code: 'L', label: 'Low', className: 'exemplary' };
}

/* Group-wide domain averages across all teachers */
function computeGroupDomainAverages() {
  const teachers = getAllTeachers();
  const totals = {}, counts = {};

  TNA_DOMAINS.forEach(d => { totals[d.key] = 0; counts[d.key] = 0; });

  teachers.forEach(t => {
    const scores = computeDomainScores(t);
    TNA_DOMAINS.forEach(d => {
      if (scores[d.key] != null) {
        totals[d.key] += scores[d.key];
        counts[d.key]++;
      }
    });
  });

  const result = {};
  TNA_DOMAINS.forEach(d => {
    result[d.key] = counts[d.key] ? totals[d.key] / counts[d.key] : null;
  });
  return result;
}

/* Top N priority domains (smallest current score = highest need) */
function getTopPriorities(n) {
  n = n || 5;
  const avgs = computeGroupDomainAverages();
  const list = TNA_DOMAINS
    .map(d => ({ ...d, current: avgs[d.key] }))
    .filter(d => d.current != null)
    .sort((a, b) => a.current - b.current);
  return list.slice(0, n);
}

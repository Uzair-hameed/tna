/* ============================================================
   TEST.JS — Teacher Test scoring
   ============================================================ */

function updateTestSummary() {
  const a1 = num('test-a1'), a2 = num('test-a2'), a3 = num('test-a3'), a4 = num('test-a4');
  const b1 = num('test-b1'), b2 = num('test-b2');

  const partA = a1 + a2 + a3 + a4;
  const partB = b1 + b2;
  const total = partA + partB;
  const pct = (total / 40) * 100;

  document.getElementById('test-partA').textContent = partA;
  document.getElementById('test-partB').textContent = partB;
  document.getElementById('test-total').textContent = total;
  document.getElementById('test-percent').textContent = pct.toFixed(1) + '%';

  const rating = getRatingLabel(pct);
  const badge = document.getElementById('test-rating');
  badge.textContent = rating.label;
  badge.className = 'rating-badge ' + rating.className;
}

function saveTest() {
  const name = document.getElementById('test-teacher').value.trim();
  if (!name) { alert('Please enter the teacher name.'); return; }

  const a1 = num('test-a1'), a2 = num('test-a2'), a3 = num('test-a3'), a4 = num('test-a4');
  const b1 = num('test-b1'), b2 = num('test-b2');
  const partA = a1 + a2 + a3 + a4;
  const partB = b1 + b2;

  upsertTeacher({
    name: name,
    gradeBand: document.getElementById('test-band').value,
    testDate: document.getElementById('test-date').value,
    test: {
      partA: partA,
      partB: partB,
      total: partA + partB,
      max: 40,
      percentage: parseFloat((((partA + partB) / 40) * 100).toFixed(2)),
      subs: { a1, a2, a3, a4, b1, b2 }
    }
  });

  setStatus('Test saved for ' + name);
  alert('✅ Test saved for ' + name);
}

function clearTestForm() {
  if (!confirm('Clear all test inputs?')) return;
  ['test-teacher','test-a1','test-a2','test-a3','test-a4','test-b1','test-b2','test-date']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('test-band').value = '1-5';
  updateTestSummary();
}

function loadTestForTeacher(teacher) {
  if (!teacher || !teacher.test) return;
  const t = teacher.test;
  document.getElementById('test-teacher').value = teacher.name || '';
  document.getElementById('test-band').value = teacher.gradeBand || '1-5';
  document.getElementById('test-date').value = teacher.testDate || '';
  if (t.subs) {
    document.getElementById('test-a1').value = t.subs.a1 || '';
    document.getElementById('test-a2').value = t.subs.a2 || '';
    document.getElementById('test-a3').value = t.subs.a3 || '';
    document.getElementById('test-a4').value = t.subs.a4 || '';
    document.getElementById('test-b1').value = t.subs.b1 || '';
    document.getElementById('test-b2').value = t.subs.b2 || '';
  }
  updateTestSummary();
}

function num(id) {
  const el = document.getElementById(id);
  if (!el || el.value === '') return 0;
  const n = parseFloat(el.value);
  return isNaN(n) ? 0 : n;
}

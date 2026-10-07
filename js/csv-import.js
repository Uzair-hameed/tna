/* ============================================================
   CSV-IMPORT.JS — Import Google Form responses as TNA records
   ============================================================
   
   Expected Google Form CSV structure (columns auto-detected):
   Timestamp | Email | Teacher Name | Employee ID | Grade Band | School | Date 
   | A1 | A2 | ... | A8 | B1 | B2 | ... | B10 | C1 | ... | F5 | G1 | G2 | ...
   
   The parser looks for cells whose header STARTS with A1, A2, etc.
   Works with both coded headers (A1) and full-text headers.
   ============================================================ */

/* Section configuration — total 36 rating questions */
const TNA_SECTIONS_SPEC = {
  a: { questions: 8,  label: 'Subject Knowledge' },
  b: { questions: 10, label: 'Pedagogical Skills' },
  c: { questions: 6,  label: 'Assessment Skills' },
  d: { questions: 6,  label: 'Classroom Management' },
  e: { questions: 5,  label: 'Materials & Resources' },
  f: { questions: 5,  label: 'Professional Dispositions' }
};

/* ---------- Main entry: user clicked the import button ---------- */
function triggerTNAImport() {
  document.getElementById('file-tna-csv').click();
}

/* ---------- File selected → parse and import ---------- */
function handleTNAFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const rows = parseCSV(e.target.result);
      if (rows.length < 2) {
        alert('CSV is empty or has no data rows.');
        return;
      }

      const result = importTNARows(rows);

      if (result.imported === 0) {
        alert(
          '⚠️ Import finished but no records were saved.\n\n' +
          'Reason: ' + result.reason + '\n\n' +
          'Make sure your CSV has these column headers:\n' +
          '  • Teacher Name (or "Name")\n' +
          '  • Employee ID (or "ID")\n' +
          '  • Grade Band (or "Grade")\n' +
          '  • Questions labeled A1-A8, B1-B10, C1-C6, D1-D6, E1-E5, F1-F5'
        );
        return;
      }

      let msg = `✅ Imported ${result.imported} teacher record(s).`;
      if (result.skipped > 0) msg += `\n⚠️ Skipped ${result.skipped} row(s) with missing data.`;
      if (result.updated > 0) msg += `\n🔄 Updated ${result.updated} existing record(s).`;
      alert(msg);

      // Refresh everything
      renderRecordsTable();
      renderDashboard();
      populateReportTeacherDropdown();

    } catch (err) {
      alert('❌ Failed to parse CSV: ' + err.message);
      console.error(err);
    }

    event.target.value = '';
  };
  reader.readAsText(file);
}

/* ---------- Parse raw CSV text into a 2D array ---------- */
function parseCSV(text) {
  const rows = [];
  let current = [];
  let cell = '';
  let inQuotes = false;

  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { current.push(cell); cell = ''; }
      else if (ch === '\n') { current.push(cell); rows.push(current); current = []; cell = ''; }
      else if (ch === '\r') { /* skip */ }
      else cell += ch;
    }
  }
  if (cell || current.length) { current.push(cell); rows.push(current); }
  return rows.filter(r => r.some(c => (c || '').trim() !== ''));
}

/* ---------- Import all rows into storage ---------- */
function importTNARows(rows) {
  const headers = rows[0].map(h => (h || '').trim());
  const columnMap = detectColumns(headers);

  if (!columnMap.hasAnySection) {
    return { imported: 0, skipped: 0, updated: 0, reason: 'Could not detect any A1-F5 columns.' };
  }
  if (columnMap.nameCol === -1) {
    return { imported: 0, skipped: 0, updated: 0, reason: 'Could not find a "Teacher Name" column.' };
  }

  let imported = 0, updated = 0, skipped = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const record = buildTNARecord(row, columnMap);

    if (!record.name) { skipped++; continue; }

    const existing = getTeacherByName(record.name);
    if (existing) {
      upsertTeacher({ ...record, id: existing.id });
      updated++;
    } else {
      upsertTeacher(record);
    }
    imported++;
  }

  return { imported, updated, skipped, reason: '' };
}

/* ---------- Detect which columns hold name / id / band / A1..F5 ---------- */
function detectColumns(headers) {
  const map = {
    nameCol: -1,
    idCol: -1,
    bandCol: -1,
    schoolCol: -1,
    dateCol: -1,
    sectionCols: { a: [], b: [], c: [], d: [], e: [], f: [] },
    openEndedCols: [],
    hasAnySection: false
  };

  headers.forEach((h, idx) => {
    const lower = h.toLowerCase();

    const sectionMatch = h.match(/^\s*([A-Fa-f])\s*0*(\d{1,2})\b/);
    if (sectionMatch) {
      const letter = sectionMatch[1].toLowerCase();
      const num = parseInt(sectionMatch[2], 10);
      const spec = TNA_SECTIONS_SPEC[letter];
      if (spec && num >= 1 && num <= spec.questions) {
        map.sectionCols[letter].push(idx);
        map.hasAnySection = true;
        return;
      }
    }

    if (map.nameCol === -1 && (
      lower.includes('teacher name') ||
      lower === 'name' ||
      lower.includes('name of teacher') ||
      lower.includes('full name')
    )) {
      map.nameCol = idx;
      return;
    }

    if (map.idCol === -1 && (
      lower.includes('employee id') ||
      lower.includes('emp id') ||
      lower.includes('teacher id') ||
      lower === 'id' ||
      lower.includes('staff id')
    )) {
      map.idCol = idx;
      return;
    }

    if (map.bandCol === -1 && (
      lower.includes('grade band') ||
      (lower.includes('grade') && !lower.includes('grade level of student'))
    )) {
      map.bandCol = idx;
      return;
    }

    if (map.schoolCol === -1 && lower.includes('school')) {
      map.schoolCol = idx;
      return;
    }

    if (map.dateCol === -1 && (lower.includes('date') || lower.includes('timestamp'))) {
      map.dateCol = idx;
      return;
    }

    if (
      lower.includes('challenge') ||
      lower.includes('training') ||
      lower.includes('support') ||
      (lower.includes('resource') && lower.includes('lack')) ||
      lower.includes('hardest') ||
      lower.includes('difficult') ||
      lower.includes('comment')
    ) {
      map.openEndedCols.push(idx);
    }
  });

  return map;
}

/* ---------- Build a teacher record from a CSV row ---------- */
function buildTNARecord(row, map) {
  const getCell = (idx) => idx >= 0 ? (row[idx] || '').trim() : '';

  const name = getCell(map.nameCol);
  const employeeId = getCell(map.idCol);
  const bandRaw = getCell(map.bandCol);
  const school = getCell(map.schoolCol);
  const dateRaw = getCell(map.dateCol);

  let gradeBand = '1-5';
  if (/6\s*[-–]\s*8/.test(bandRaw)) gradeBand = '6-8';
  else if (/1\s*[-–]\s*5/.test(bandRaw)) gradeBand = '1-5';

  const sections = {};
  const rawScores = {};

  ['a','b','c','d','e','f'].forEach(letter => {
    const cols = map.sectionCols[letter] || [];
    const nums = [];
    rawScores[letter] = [];

    cols.forEach(colIdx => {
      const v = parseFloat((row[colIdx] || '').trim());
      if (!isNaN(v) && v >= 1 && v <= 5) {
        nums.push(v);
        rawScores[letter].push(v);
      } else {
        rawScores[letter].push(null);
      }
    });

    sections[letter] = nums.length
      ? parseFloat((nums.reduce((a,b)=>a+b,0) / nums.length).toFixed(2))
      : 0;
  });

  const validSectionAvgs = Object.values(sections).filter(v => v > 0);
  const overall = validSectionAvgs.length
    ? validSectionAvgs.reduce((a,b)=>a+b,0) / validSectionAvgs.length
    : 0;

  const openEnded = map.openEndedCols.map(idx => ({
    question: '',
    answer: (row[idx] || '').trim()
  })).filter(x => x.answer);

  return {
    name,
    employeeId,
    school,
    gradeBand,
    tnaDate: dateRaw ? normalizeDate(dateRaw) : new Date().toISOString().slice(0,10),
    tna: {
      sections,
      rawScores,
      average: parseFloat(overall.toFixed(2)),
      converted: parseFloat(((overall / 5) * 4).toFixed(2)),
      openEnded
    }
  };
}

/* ---------- Convert Google Form date strings to yyyy-mm-dd ---------- */
function normalizeDate(str) {
  if (!str) return new Date().toISOString().slice(0,10);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0,10);
  const m = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    const [, a, b, y] = m;
    return `${y}-${a.padStart(2,'0')}-${b.padStart(2,'0')}`;
  }
  const d = new Date(str);
  if (!isNaN(d)) return d.toISOString().slice(0,10);
  return new Date().toISOString().slice(0,10);
}

/* ---------- Wire up on load ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-import-tna-csv');
  const file = document.getElementById('file-tna-csv');
  if (btn && file) {
    btn.addEventListener('click', triggerTNAImport);
    file.addEventListener('change', handleTNAFileSelect);
  }
});

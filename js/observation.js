/* ============================================================
   OBSERVATION.JS — 13 domains, 64 indicators, live scoring
   ============================================================ */

const OBSERVATION_DOMAINS = [
  {
    id: 1, name: 'Lesson Planning & Preparation', max: 20,
    indicators: [
      { code: '1.1', text: 'Objectives are clear, specific, measurable.' },
      { code: '1.2', text: 'Objectives align with curriculum.' },
      { code: '1.3', text: 'Logical sequence (warm-up → present → practice → wrap).' },
      { code: '1.4', text: 'Lesson plan available and followed.' },
      { code: '1.5', text: 'Materials prepared and ready.' }
    ]
  },
  {
    id: 2, name: 'Subject Knowledge & Command', max: 20,
    indicators: [
      { code: '2.1', text: 'English accurate (grammar, pronunciation, vocab).' },
      { code: '2.2', text: 'Concepts explained clearly with correct examples.' },
      { code: '2.3', text: 'Answers student questions accurately.' },
      { code: '2.4', text: 'Connects content to real life / prior knowledge.' },
      { code: '2.5', text: 'Demonstrates confidence in subject.' }
    ]
  },
  {
    id: 3, name: 'Instructional Delivery', max: 24,
    indicators: [
      { code: '3.1', text: 'Models skill before asking students to do it.' },
      { code: '3.2', text: 'Instructions clear and checked for understanding.' },
      { code: '3.3', text: 'Pacing appropriate.' },
      { code: '3.4', text: 'Varied techniques used.' },
      { code: '3.5', text: 'Age-appropriate methods for grade band.' },
      { code: '3.6', text: 'Board / visual work clear and organized.' }
    ]
  },
  {
    id: 4, name: 'Student Engagement & Participation', max: 24,
    indicators: [
      { code: '4.1', text: 'Students on-task during lesson.' },
      { code: '4.2', text: 'Students participate actively.' },
      { code: '4.3', text: 'Teacher involves all students, not just a few.' },
      { code: '4.4', text: 'Students ask questions / seek clarification.' },
      { code: '4.5', text: 'Activities motivating and interesting.' },
      { code: '4.6', text: 'Student talk time adequate.' }
    ]
  },
  {
    id: 5, name: 'Teaching Methods & Strategies', max: 24,
    indicators: [
      { code: '5.1', text: 'Methods appropriate for topic.' },
      { code: '5.2', text: 'Gr 1–5: Phonics, rhymes, songs, TPR used.' },
      { code: '5.3', text: 'Gr 6–8: Discussions, role plays, group work used.' },
      { code: '5.4', text: 'Pair / group work used effectively.' },
      { code: '5.5', text: 'Questioning (literal, inferential, evaluative).' },
      { code: '5.6', text: 'Technology / AV aids used where available.' }
    ]
  },
  {
    id: 6, name: 'Four Skills Integration (LSRW)', max: 20,
    indicators: [
      { code: '6.1', text: 'Listening: students listen to teacher / audio / peers.' },
      { code: '6.2', text: 'Speaking: students get opportunities to speak.' },
      { code: '6.3', text: 'Reading: reading activity included.' },
      { code: '6.4', text: 'Writing: writing task included.' },
      { code: '6.5', text: 'Skills integrated meaningfully.' }
    ]
  },
  {
    id: 7, name: 'Assessment & Feedback', max: 24,
    indicators: [
      { code: '7.1', text: 'Checks understanding during lesson.' },
      { code: '7.2', text: 'Uses oral / written questioning to assess.' },
      { code: '7.3', text: 'Provides immediate, constructive feedback.' },
      { code: '7.4', text: 'Corrects errors appropriately.' },
      { code: '7.5', text: 'Assessment aligned with objectives.' },
      { code: '7.6', text: 'Clear homework / assignment linked to lesson.' }
    ]
  },
  {
    id: 8, name: 'Differentiation & Inclusion', max: 20,
    indicators: [
      { code: '8.1', text: 'Addresses different proficiency levels.' },
      { code: '8.2', text: 'Extra support to weak students.' },
      { code: '8.3', text: 'Extension work for advanced students.' },
      { code: '8.4', text: 'Multiple modes (visual, auditory, kinesthetic).' },
      { code: '8.5', text: 'Inclusive (gender, ability, background).' }
    ]
  },
  {
    id: 9, name: 'Classroom Management', max: 20,
    indicators: [
      { code: '9.1', text: 'Routines established.' },
      { code: '9.2', text: 'Discipline maintained positively.' },
      { code: '9.3', text: 'Time managed effectively.' },
      { code: '9.4', text: 'Transitions smooth.' },
      { code: '9.5', text: 'Seating supports learning.' }
    ]
  },
  {
    id: 10, name: 'Learning Environment', max: 16,
    indicators: [
      { code: '10.1', text: 'Print-rich (word walls, charts, student work).' },
      { code: '10.2', text: 'Welcoming and supportive.' },
      { code: '10.3', text: 'English visible in classroom.' },
      { code: '10.4', text: 'Resources accessible to students.' }
    ]
  },
  {
    id: 11, name: 'Use of Resources & Materials', max: 16,
    indicators: [
      { code: '11.1', text: 'Textbook used effectively.' },
      { code: '11.2', text: 'Supplementary materials used.' },
      { code: '11.3', text: 'Materials appropriate for grade level.' },
      { code: '11.4', text: 'Teacher creates / adapts materials.' }
    ]
  },
  {
    id: 12, name: 'Teacher Language & Communication', max: 20,
    indicators: [
      { code: '12.1', text: 'English as primary language of instruction.' },
      { code: '12.2', text: 'English fluent and accurate.' },
      { code: '12.3', text: 'L1 used judiciously.' },
      { code: '12.4', text: 'Tone encouraging and respectful.' },
      { code: '12.5', text: 'Voice audible and clear.' }
    ]
  },
  {
    id: 13, name: 'Student Learning Outcomes', max: 16,
    indicators: [
      { code: '13.1', text: 'Students demonstrate understanding.' },
      { code: '13.2', text: 'Students apply the skill taught.' },
      { code: '13.3', text: 'Oral / written responses show learning.' },
      { code: '13.4', text: 'Objectives achieved by most students.' }
    ]
  }
];

const OBSERVATION_TOTAL_MAX = 264;

/* ---------- Live Score State ---------- */
let observationScores = {}; // { '1.1': 3, '1.2': 'NA', ... }

/* ---------- Build the Form UI ---------- */
function renderObservationForm() {
  const container = document.getElementById('observation-domains');
  if (!container) return;
  container.innerHTML = '';

  OBSERVATION_DOMAINS.forEach(domain => {
    const block = document.createElement('div');
    block.className = 'domain-block';

    let rowsHTML = '';
    domain.indicators.forEach(ind => {
      rowsHTML += `
        <div class="indicator-row" data-code="${ind.code}">
          <div class="indicator-num">${ind.code}</div>
          <div class="indicator-text">${ind.text}</div>
          <div class="score-buttons">
            <button class="score-btn" data-score="1">1</button>
            <button class="score-btn" data-score="2">2</button>
            <button class="score-btn" data-score="3">3</button>
            <button class="score-btn" data-score="4">4</button>
            <button class="score-btn na-btn" data-score="NA">NA</button>
          </div>
          <div class="indicator-points" data-points="${ind.code}">0</div>
        </div>`;
    });

    block.innerHTML = `
      <div class="domain-header">
        <span>Domain ${domain.id}: ${domain.name}</span>
        <span class="domain-max">Max: ${domain.max}</span>
      </div>
      ${rowsHTML}
      <div class="domain-footer">
        <span>Domain Score:</span>
        <span data-domain-score="${domain.id}">0 / ${domain.max}</span>
      </div>
    `;
    container.appendChild(block);
  });

  attachScoreHandlers();
  updateObservationSummary();
}

/* ---------- Score Button Clicks ---------- */
function attachScoreHandlers() {
  document.querySelectorAll('.indicator-row').forEach(row => {
    const code = row.dataset.code;
    row.querySelectorAll('.score-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const score = btn.dataset.score;
        // toggle off if clicking same
        if (observationScores[code] == score) {
          delete observationScores[code];
        } else {
          observationScores[code] = score;
        }
        refreshRowUI(code);
        updateObservationSummary();
      });
    });
  });
}

function refreshRowUI(code) {
  const row = document.querySelector(`.indicator-row[data-code="${code}"]`);
  if (!row) return;
  const val = observationScores[code];

  row.querySelectorAll('.score-btn').forEach(btn => {
    btn.classList.remove('selected-1','selected-2','selected-3','selected-4','selected-NA');
    if (btn.dataset.score == val) {
      btn.classList.add('selected-' + val);
    }
  });

  const points = (val === undefined || val === 'NA') ? 0 : parseInt(val);
  row.querySelector('.indicator-points').textContent = points;
}

/* ---------- Live Total Calculation ---------- */
function updateObservationSummary() {
  let totalPoints = 0;

  OBSERVATION_DOMAINS.forEach(domain => {
    let domainPoints = 0;
    domain.indicators.forEach(ind => {
      const v = observationScores[ind.code];
      if (v !== undefined && v !== 'NA') domainPoints += parseInt(v);
    });
    const domainEl = document.querySelector(`[data-domain-score="${domain.id}"]`);
    if (domainEl) domainEl.textContent = domainPoints + ' / ' + domain.max;
    totalPoints += domainPoints;
  });

  const pct = (totalPoints / OBSERVATION_TOTAL_MAX) * 100;
  const settings = getSettings();
  const rating = getRatingLabel(pct, settings);

  document.getElementById('obs-total').textContent = totalPoints;
  document.getElementById('obs-percent').textContent = pct.toFixed(1) + '%';

  const badge = document.getElementById('obs-rating');
  badge.textContent = rating.label;
  badge.className = 'rating-badge ' + rating.className;
}

function getRatingLabel(pct, settings) {
  const s = settings || getSettings();
  if (pct >= s.exemplary) return { label: 'Exemplary', className: 'exemplary' };
  if (pct >= s.proficient) return { label: 'Proficient', className: 'proficient' };
  if (pct >= s.developing) return { label: 'Developing', className: 'developing' };
  return { label: 'Ineffective', className: 'ineffective' };
}

/* ---------- Save Observation ---------- */
function saveObservation() {
  const name = document.getElementById('obs-teacher').value.trim();
  if (!name) { alert('Please enter the teacher name.'); return; }

  const totalPoints = Object.values(observationScores)
    .filter(v => v !== 'NA')
    .reduce((a, b) => a + parseInt(b), 0);

  const domainScores = {};
  OBSERVATION_DOMAINS.forEach(d => {
    let pts = 0;
    d.indicators.forEach(ind => {
      const v = observationScores[ind.code];
      if (v !== undefined && v !== 'NA') pts += parseInt(v);
    });
    domainScores['d' + d.id] = pts;
    domainScores['d' + d.id + '_max'] = d.max;
  });

  upsertTeacher({
    name: name,
    grade: document.getElementById('obs-grade').value.trim(),
    section: document.getElementById('obs-section').value.trim(),
    students: document.getElementById('obs-students').value.trim(),
    topic: document.getElementById('obs-topic').value.trim(),
    observer: document.getElementById('obs-observer').value.trim(),
    observationDate: document.getElementById('obs-date').value,
    timeIn: document.getElementById('obs-timein').value,
    timeOut: document.getElementById('obs-timeout').value,
    observation: {
      scores: { ...observationScores },
      domainScores: domainScores,
      totalPoints: totalPoints,
      maxPoints: OBSERVATION_TOTAL_MAX,
      percentage: parseFloat(((totalPoints / OBSERVATION_TOTAL_MAX) * 100).toFixed(2))
    }
  });

  setStatus('Observation saved for ' + name);
  alert('✅ Observation saved for ' + name);
}

/* ---------- Clear Form ---------- */
function clearObservationForm() {
  if (!confirm('Clear all observation inputs?')) return;
  observationScores = {};
  document.querySelectorAll('.indicator-row').forEach(row => {
    row.querySelectorAll('.score-btn').forEach(b => 
      b.classList.remove('selected-1','selected-2','selected-3','selected-4','selected-NA'));
    row.querySelector('.indicator-points').textContent = '0';
  });
  ['obs-teacher','obs-grade','obs-section','obs-students','obs-topic','obs-observer',
   'obs-date','obs-timein','obs-timeout'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  updateObservationSummary();
}

/* ---------- Load Existing for Editing ---------- */
function loadObservationForTeacher(teacher) {
  if (!teacher || !teacher.observation) return;
  observationScores = { ...teacher.observation.scores };
  document.getElementById('obs-teacher').value = teacher.name || '';
  document.getElementById('obs-grade').value = teacher.grade || '';
  document.getElementById('obs-section').value = teacher.section || '';
  document.getElementById('obs-students').value = teacher.students || '';
  document.getElementById('obs-topic').value = teacher.topic || '';
  document.getElementById('obs-observer').value = teacher.observer || '';
  document.getElementById('obs-date').value = teacher.observationDate || '';
  document.getElementById('obs-timein').value = teacher.timeIn || '';
  document.getElementById('obs-timeout').value = teacher.timeOut || '';

  Object.keys(observationScores).forEach(code => refreshRowUI(code));
  updateObservationSummary();
}

/* ---------- Helper ---------- */
function setStatus(msg) {
  const badge = document.getElementById('save-status');
  if (badge) {
    badge.textContent = msg;
    setTimeout(updateBackupStatus, 2000);
  }
}

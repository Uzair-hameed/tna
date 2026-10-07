/* ============================================================
   APP.JS — Main controller: tabs, events, initialization
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Tab Switching ---------- */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      const target = document.getElementById('tab-' + tab);
      if (target) target.classList.add('active');

      // Refresh data when entering relevant tabs
      if (tab === 'dashboard') renderDashboard();
      if (tab === 'records') renderRecordsTable();
      if (tab === 'reports') populateReportTeacherDropdown();
    });
  });

  /* ---------- Initialize Observation Form ---------- */
  if (typeof renderObservationForm === 'function') {
    renderObservationForm();
    updateObservationSummary();
  }

  /* ---------- Observation Events ---------- */
  const btnSaveObs = document.getElementById('btn-save-obs');
  if (btnSaveObs) btnSaveObs.addEventListener('click', saveObservation);

  const btnClearObs = document.getElementById('btn-clear-obs');
  if (btnClearObs) btnClearObs.addEventListener('click', clearObservationForm);

  /* ---------- Test Events ---------- */
  ['test-a1','test-a2','test-a3','test-a4','test-b1','test-b2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateTestSummary);
  });

  const btnSaveTest = document.getElementById('btn-save-test');
  if (btnSaveTest) btnSaveTest.addEventListener('click', saveTest);

  const btnClearTest = document.getElementById('btn-clear-test');
  if (btnClearTest) btnClearTest.addEventListener('click', clearTestForm);

  /* ---------- TNA Events ---------- */
  ['tna-a','tna-b','tna-c','tna-d','tna-e','tna-f'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateTNASummary);
  });

  const btnSaveTna = document.getElementById('btn-save-tna');
  if (btnSaveTna) btnSaveTna.addEventListener('click', saveTNA);

  const btnClearTna = document.getElementById('btn-clear-tna');
  if (btnClearTna) btnClearTna.addEventListener('click', clearTNAForm);

  /* ---------- Records Events ---------- */
  const searchBox = document.getElementById('records-search');
  if (searchBox) searchBox.addEventListener('input', renderRecordsTable);

  const btnCSV = document.getElementById('btn-export-csv');
  if (btnCSV) btnCSV.addEventListener('click', exportRecordsCSV);

  const btnImport = document.getElementById('btn-import-json');
  const fileImport = document.getElementById('file-import');
  if (btnImport && fileImport) {
    btnImport.addEventListener('click', () => fileImport.click());
    fileImport.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      importBackup(file, (success, result) => {
        if (success) {
          alert('✅ Imported ' + result + ' teacher records.');
          renderRecordsTable();
          renderDashboard();
          populateReportTeacherDropdown();
        } else {
          alert('❌ Import failed: ' + result);
        }
        fileImport.value = '';
      });
    });
  }

  /* ---------- CSV Import Events ---------- */
  const btnImportCSV = document.getElementById('btn-import-tna-csv');
  const fileCSV = document.getElementById('file-tna-csv');
  if (btnImportCSV && fileCSV) {
    btnImportCSV.addEventListener('click', triggerTNAImport);
    fileCSV.addEventListener('change', handleTNAFileSelect);
  }

  /* ---------- Attachments Events ---------- */
  const btnFolder = document.getElementById('btn-upload-folder');
  const fileFolder = document.getElementById('file-folder');
  if (btnFolder && fileFolder) {
    btnFolder.addEventListener('click', triggerFolderUpload);
    fileFolder.addEventListener('change', (e) => processUploadedFiles(e.target.files));
  }

  const btnFiles = document.getElementById('btn-upload-files');
  const fileMulti = document.getElementById('file-multiple');
  if (btnFiles && fileMulti) {
    btnFiles.addEventListener('click', triggerFileUpload);
    fileMulti.addEventListener('change', (e) => processUploadedFiles(e.target.files));
  }

  /* ---------- Reports Events ---------- */
  const reportType = document.getElementById('report-type');
  if (reportType) {
    reportType.addEventListener('change', () => {
      const label = document.getElementById('report-teacher-label');
      if (label) label.style.display = reportType.value === 'individual' ? 'flex' : 'none';
    });
  }

  const btnGen = document.getElementById('btn-generate-report');
  if (btnGen) btnGen.addEventListener('click', generateReport);

  const btnPDF = document.getElementById('btn-download-pdf');
  if (btnPDF) btnPDF.addEventListener('click', downloadReportPDF);

  /* ---------- Header Backup ---------- */
  const btnBackup = document.getElementById('btn-backup');
  if (btnBackup) btnBackup.addEventListener('click', exportBackup);

  /* ---------- Settings Events ---------- */
  const btnBackup2 = document.getElementById('btn-backup2');
  if (btnBackup2) btnBackup2.addEventListener('click', exportBackup);

  const btnRestore = document.getElementById('btn-restore');
  if (btnRestore) {
    btnRestore.addEventListener('click', () => {
      const fileInput = document.getElementById('file-import');
      if (fileInput) fileInput.click();
    });
  }

  const btnWipe = document.getElementById('btn-wipe');
  if (btnWipe) {
    btnWipe.addEventListener('click', () => {
      if (wipeAllData()) {
        alert('✅ All data wiped.');
        renderRecordsTable();
        renderDashboard();
        populateReportTeacherDropdown();
        updateBackupStatus();
      }
    });
  }

  // Load saved settings into form
  const s = getSettings();
  const setEx = document.getElementById('set-exemplary');
  const setPr = document.getElementById('set-proficient');
  const setDe = document.getElementById('set-developing');
  if (setEx) setEx.value = s.exemplary;
  if (setPr) setPr.value = s.proficient;
  if (setDe) setDe.value = s.developing;

  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      saveSettings({
        ...getSettings(),
        exemplary: parseInt(setEx.value) || 90,
        proficient: parseInt(setPr.value) || 75,
        developing: parseInt(setDe.value) || 60
      });
      alert('✅ Settings saved.');
      updateObservationSummary();
      updateTestSummary();
    });
  }

  /* ---------- Initial Render ---------- */
  updateTestSummary();
  updateTNASummary();
  renderRecordsTable();
  populateReportTeacherDropdown();
  renderDashboard();
  renderAttachmentsTable();
  updateStorageBar();
  updateBackupStatus();

  /* ---------- Auto-backup warning ---------- */
  setInterval(() => {
    const last = localStorage.getItem('tts_backup_time');
    const teachers = getAllTeachers();
    if (teachers.length >= 5 && !last) {
      const badge = document.getElementById('save-status');
      if (badge && !badge.textContent.includes('⚠️')) {
        badge.textContent = '⚠️ Please backup your data';
        badge.style.background = 'rgba(239,68,68,0.4)';
      }
    }
  }, 60000);
});

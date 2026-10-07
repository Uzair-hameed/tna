/* ============================================================
   STORAGE.JS — localStorage wrapper for all data
   ============================================================ */

const STORAGE_KEYS = {
  TEACHERS: 'tts_teachers',        // combined teacher records
  SETTINGS: 'tts_settings',
  BACKUP_TIME: 'tts_backup_time'
};

/* ---------- Settings ---------- */
function getSettings() {
  const defaults = {
    exemplary: 90,
    proficient: 75,
    developing: 60,
    lastBackup: null
  };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}') };
  } catch { return defaults; }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

/* ---------- Teachers (Master Data) ---------- */
function getAllTeachers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
  } catch { return []; }
}

function saveAllTeachers(list) {
  localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(list));
  updateBackupStatus();
}

function getTeacherByName(name) {
  if (!name) return null;
  const norm = name.trim().toLowerCase();
  return getAllTeachers().find(t => t.name.trim().toLowerCase() === norm) || null;
}

function upsertTeacher(data) {
  const list = getAllTeachers();
  const norm = data.name.trim().toLowerCase();
  const idx = list.findIndex(t => t.name.trim().toLowerCase() === norm);
  const now = new Date().toISOString();

  if (idx >= 0) {
    list[idx] = { ...list[idx], ...data, updatedAt: now };
  } else {
    list.push({
      id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      createdAt: now,
      updatedAt: now,
      ...data
    });
  }
  saveAllTeachers(list);
  return getAllTeachers();
}

function deleteTeacher(id) {
  const list = getAllTeachers().filter(t => t.id !== id);
  saveAllTeachers(list);
}

/* ---------- Backup / Restore ---------- */
function exportBackup() {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    teachers: getAllTeachers()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'TTS-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  localStorage.setItem(STORAGE_KEYS.BACKUP_TIME, new Date().toISOString());
  updateBackupStatus();
}

function importBackup(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.teachers) throw new Error('Invalid backup file');
      if (!confirm(`This will REPLACE all current data with ${data.teachers.length} teacher records. Continue?`)) return;
      saveAllTeachers(data.teachers);
      if (data.settings) saveSettings(data.settings);
      callback(true, data.teachers.length);
    } catch (err) {
      callback(false, err.message);
    }
  };
  reader.readAsText(file);
}

function wipeAllData() {
  if (!confirm('⚠️ This will DELETE ALL teacher records permanently. Are you sure?')) return false;
  if (!confirm('⚠️ Really sure? This cannot be undone.')) return false;
  localStorage.removeItem(STORAGE_KEYS.TEACHERS);
  return true;
}

/* ---------- Status Indicator ---------- */
function updateBackupStatus() {
  const badge = document.getElementById('save-status');
  if (!badge) return;
  const teachers = getAllTeachers();
  const last = localStorage.getItem(STORAGE_KEYS.BACKUP_TIME);
  if (!last) {
    badge.textContent = teachers.length + ' records · No backup yet';
    badge.style.background = teachers.length > 5 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.2)';
    return;
  }
  const hoursAgo = (Date.now() - new Date(last).getTime()) / 3600000;
  badge.textContent = teachers.length + ' records · Backup ' + 
    (hoursAgo < 1 ? 'just now' : hoursAgo < 24 ? Math.round(hoursAgo) + 'h ago' : Math.round(hoursAgo/24) + 'd ago');
  badge.style.background = hoursAgo > 24 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)';
}

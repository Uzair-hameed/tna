/* ============================================================
   STORAGE.JS — localStorage wrapper
   ============================================================ */

const STORAGE_KEYS = {
  TEACHERS: 'tts_teachers',
  ATTACHMENTS: 'tts_attachments',   // { teacherNameLower: { name, filename, size, dataUrl, uploadedAt } }
  SETTINGS: 'tts_settings',
  BACKUP_TIME: 'tts_backup_time'
};

/* ---------- Settings ---------- */
function getSettings() {
  const defaults = { exemplary: 90, proficient: 75, developing: 60 };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}') };
  } catch { return defaults; }
}
function saveSettings(s) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(s));
}

/* ---------- Teachers ---------- */
function getAllTeachers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]'); }
  catch { return []; }
}
function saveAllTeachers(list) {
  localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(list));
  updateBackupStatus();
  updateStorageBar();
}
function getTeacherByName(name) {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  return getAllTeachers().find(t => t.name.trim().toLowerCase() === n) || null;
}
function upsertTeacher(data) {
  const list = getAllTeachers();
  const n = data.name.trim().toLowerCase();
  const idx = list.findIndex(t => t.name.trim().toLowerCase() === n);
  const now = new Date().toISOString();
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...data, updatedAt: now };
  } else {
    list.push({
      id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      createdAt: now, updatedAt: now, ...data
    });
  }
  saveAllTeachers(list);
  return getAllTeachers();
}
function deleteTeacher(id) {
  const list = getAllTeachers().filter(t => t.id !== id);
  saveAllTeachers(list);
}

/* ---------- Attachments ---------- */
function getAllAttachments() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTACHMENTS) || '{}'); }
  catch { return {}; }
}
function saveAllAttachments(obj) {
  try {
    localStorage.setItem(STORAGE_KEYS.ATTACHMENTS, JSON.stringify(obj));
    updateStorageBar();
    return true;
  } catch (e) {
    alert('❌ Storage full. Delete some attachments or backup + clear.');
    return false;
  }
}
function getAttachmentForTeacher(name) {
  if (!name) return null;
  const map = getAllAttachments();
  return map[name.trim().toLowerCase()] || null;
}
function setAttachment(teacherName, attachment) {
  const map = getAllAttachments();
  const key = teacherName.trim().toLowerCase();
  if (attachment === null) delete map[key];
  else map[key] = attachment;
  return saveAllAttachments(map);
}

/* ---------- Storage calculation ---------- */
function calculateStorageUsage() {
  let total = 0;
  for (const k in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, k)) {
      total += (localStorage[k] || '').length + k.length;
    }
  }
  return total * 2; // UTF-16 chars → bytes
}
function updateStorageBar() {
  const used = calculateStorageUsage();
  const usedMB = used / (1024 * 1024);
  const pct = Math.min(100, (usedMB / 5) * 100);

  const usedEl = document.getElementById('storage-used');
  const fillEl = document.getElementById('storage-fill');
  if (usedEl) usedEl.textContent = usedMB.toFixed(2);
  if (fillEl) {
    fillEl.style.width = pct + '%';
    fillEl.className = 'storage-fill' +
      (pct > 90 ? ' danger' : pct > 70 ? ' warn' : '');
  }
}

/* ---------- Backup ---------- */
function exportBackup() {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    teachers: getAllTeachers(),
    attachments: getAllAttachments()
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
      if (!data.teachers) throw new Error('Invalid backup');
      if (!confirm(`⚠️ This will REPLACE all data.\n\nNew: ${data.teachers.length} teachers\nCurrent: ${getAllTeachers().length} teachers\n\nContinue?`)) return;
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(data.teachers));
      if (data.attachments) localStorage.setItem(STORAGE_KEYS.ATTACHMENTS, JSON.stringify(data.attachments));
      if (data.settings) saveSettings(data.settings);
      callback(true, data.teachers.length);
    } catch (err) { callback(false, err.message); }
  };
  reader.readAsText(file);
}

function wipeAllData() {
  if (!confirm('⚠️ DELETE ALL DATA permanently?\n\nThis cannot be undone.')) return false;
  if (!confirm('⚠️ Really sure? All teachers + attachments will be gone.')) return false;
  localStorage.removeItem(STORAGE_KEYS.TEACHERS);
  localStorage.removeItem(STORAGE_KEYS.ATTACHMENTS);
  return true;
}

/* ---------- Status ---------- */
function updateBackupStatus() {
  const badge = document.getElementById('save-status');
  if (!badge) return;
  const n = getAllTeachers().length;
  const last = localStorage.getItem(STORAGE_KEYS.BACKUP_TIME);
  if (!last) {
    badge.textContent = n + ' records · No backup yet';
    badge.style.background = n > 5 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.2)';
    return;
  }
  const hoursAgo = (Date.now() - new Date(last).getTime()) / 3600000;
  badge.textContent = n + ' records · Backup ' +
    (hoursAgo < 1 ? 'just now' : hoursAgo < 24 ? Math.round(hoursAgo) + 'h ago' : Math.round(hoursAgo / 24) + 'd ago');
  badge.style.background = hoursAgo > 24 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)';
}

function setStatus(msg) {
  const badge = document.getElementById('save-status');
  if (badge) {
    badge.textContent = msg;
    setTimeout(updateBackupStatus, 2000);
  }
}

/* ============================================================
   ATTACHMENTS.JS — Upload self-reflection PDFs by folder
   ============================================================ */

const MAX_FILE_SIZE = 500 * 1024;      // 500 KB
const HARD_LIMIT = 2 * 1024 * 1024;    // 2 MB absolute max

/* ---------- Upload triggers ---------- */
function triggerFolderUpload() {
  document.getElementById('file-folder').click();
}
function triggerFileUpload() {
  document.getElementById('file-multiple').click();
}

/* ---------- Process selected files ---------- */
async function processUploadedFiles(files) {
  const statusEl = document.getElementById('upload-status');
  if (!files || !files.length) return;

  let saved = 0, skipped = 0, unmatched = 0, tooBig = 0;
  const unmatchedList = [];

  statusEl.textContent = 'Processing ' + files.length + ' file(s)...';

  for (const file of files) {
    if (!/\.(pdf|jpg|jpeg|png)$/i.test(file.name)) { skipped++; continue; }
    if (file.size > HARD_LIMIT) { tooBig++; continue; }
    if (file.size > MAX_FILE_SIZE) {
      if (!confirm(`⚠️ ${file.name} is ${(file.size/1024).toFixed(0)} KB (>500 KB).\n\nThis may fill storage quickly. Continue?`)) {
        skipped++; continue;
      }
    }

    const parsed = parseFilename(file.name);
    if (!parsed) { unmatched++; unmatchedList.push(file.name); continue; }

    // Find matching teacher by name (case-insensitive)
    const teachers = getAllTeachers();
    const teacher = teachers.find(t => t.name.trim().toLowerCase() === parsed.name.toLowerCase());

    if (!teacher) { unmatched++; unmatchedList.push(file.name); continue; }

    // Convert to base64
    try {
      const dataUrl = await readFileAsDataURL(file);
      const success = setAttachment(teacher.name, {
        filename: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        dataUrl: dataUrl,
        teacherId: teacher.id
      });
      if (success) saved++; else skipped++;
    } catch (e) {
      skipped++;
    }
  }

  let msg = `✅ Saved: ${saved}`;
  if (skipped) msg += ` · Skipped: ${skipped}`;
  if (tooBig) msg += ` · Too big: ${tooBig}`;
  if (unmatched) msg += ` · Unmatched: ${unmatched}`;
  statusEl.textContent = msg;

  if (unmatchedList.length) {
    alert(
      `⚠️ ${unmatchedList.length} file(s) could not be matched:\n\n` +
      unmatchedList.slice(0, 10).join('\n') +
      (unmatchedList.length > 10 ? '\n...' : '') +
      '\n\nFilename format required: "Teacher Name_YYYY-MM-DD.pdf"'
    );
  }

  renderAttachmentsTable();
  renderRecordsTable();
  updateStorageBar();
}

/* ---------- Filename parser ---------- */
function parseFilename(filename) {
  // Strip extension
  const base = filename.replace(/\.[^.]+$/, '');
  // Try "Name_YYYY-MM-DD" pattern
  const m = base.match(/^(.+?)[_\-\s](\d{4}[-_]\d{1,2}[-_]\d{1,2})/);
  if (m) {
    return { name: m[1].trim(), date: m[2].replace(/_/g, '-') };
  }
  // Fallback: just the name (any text before extension)
  const nameOnly = base.trim();
  if (nameOnly.length > 1) return { name: nameOnly, date: null };
  return null;
}

/* ---------- File → base64 ---------- */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------- Render attachments table ---------- */
function renderAttachmentsTable() {
  const tbody = document.getElementById('attachments-body');
  if (!tbody) return;

  const map = getAllAttachments();
  const keys = Object.keys(map);

  if (!keys.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">No self-reflections uploaded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = keys.map(key => {
    const a = map[key];
    const teacher = getAllTeachers().find(t => t.name.trim().toLowerCase() === key);
    const name = teacher ? teacher.name : key;
    const sizeKb = (a.size / 1024).toFixed(0);
    const date = a.uploadedAt ? new Date(a.uploadedAt).toLocaleDateString() : '—';

    return `
      <tr>
        <td><strong>${escapeHtml(name)}</strong></td>
        <td>${escapeHtml(a.filename)}</td>
        <td>${sizeKb} KB</td>
        <td>${date}</td>
        <td>
          <button class="btn btn-secondary btn-small" onclick="previewAttachment('${escapeAttr(key)}')">View</button>
          <button class="btn btn-danger btn-small" onclick="deleteAttachment('${escapeAttr(key)}')">Del</button>
        </td>
      </tr>
    `;
  }).join('');
}

function previewAttachment(key) {
  const map = getAllAttachments();
  const a = map[key];
  if (!a) return;
  const w = window.open();
  w.document.write(`<title>${a.filename}</title><iframe src="${a.dataUrl}" style="width:100%;height:100vh;border:0;"></iframe>`);
}

function deleteAttachment(key) {
  if (!confirm('Delete this self-reflection?')) return;
  const map = getAllAttachments();
  delete map[key];
  saveAllAttachments(map);
  renderAttachmentsTable();
  renderRecordsTable();
}

function escapeAttr(s) {
  return String(s).replace(/'/g, "\\'").replace(/\\/g, '\\\\');
}

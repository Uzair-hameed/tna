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

/* Initial render */
renderAttachmentsTable();
updateStorageBar();

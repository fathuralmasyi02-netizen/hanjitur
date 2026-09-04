/**
 * HANJITUR ORGANIZER - MOBILE WEDDING PLANNER
 * Core Application Logic, Draggable Blossom Menu & Google Spreadsheet Sync
 */

// ============================================================================
// 1. CONSTANTS & CONFIGURATION
// ============================================================================
const AUTH_CONFIG = {
  EMAIL: 'hanjitur@gmail.com',
  PASS: 'hanjitur354'
};

const STORAGE_KEYS = {
  IS_LOGGED_IN: 'hanjitur_logged_in',
  SCRIPT_URL: 'hanjitur_appscript_url',
  DATA_STORE: 'hanjitur_wedding_data',
  BLOSSOM_POS: 'hanjitur_blossom_pos',
  SYNC_QUEUE: 'hanjitur_sync_queue'
};

// Pembangkit ID Unik Bebas Tabrakan Antar Banyak Perangkat
function generateUniqueId(prefix) {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${ts}-${rand}`;
}

// Google Apps Script Live Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxK3dYY4Xzxoc5b9FRX6SYUOi15_KtPbSx3HK8h6tYOEWWX-Kde2uRAMg8hYPlBIAGF9g/exec';

// Initial Data Structure (Clean state, synced from Spreadsheet)
const DEFAULT_WEDDING_DATA = {
  Master: {
    HariH: '2026-12-24T08:00',
    KategoriMaster: ['H-6 Bulan', 'H-3 Bulan', 'H-1 Bulan', 'H-1 Minggu', 'Hari H', 'Pasca Acara'],
    KategoriVendor: ['Venue & Gedung', 'Catering', 'Dekorasi', 'Fotografi & Video', 'MUA & Busana', 'Entertainment', 'Souvenir & Undangan', 'Lain-lain'],
    KategoriTamu: ['Keluarga Inti', 'Keluarga Besar', 'Sahabat', 'Rekan Kerja', 'VIP', 'Tetangga', 'Lain-lain']
  },
  Dompet: [],
  Transaksi_Keuangan: [],
  Anggaran: [],
  Knowledge: [],
  Isian_Knowledge: [],
  Timeline: [],
  Rundown_Hari_H: [],
  Vendor: [],
  Files: [],
  Tamu_Undangan: []
};

// App Global State
let weddingData = {};
let countdownInterval = null;

// ============================================================================
// 2. APP INITIALIZATION & AUTH
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadStoredData();
  checkAuth();
  initLucide();
  startCountdownTimer();
  renderAllViews();
  initBlossomMenu();
  initAutoSync();
});

function initLucide() {
  try {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    } else if (typeof window !== 'undefined' && window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
  } catch (e) {}
}

function checkAuth() {
  const isLoggedIn = localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
  const loginScreen = document.getElementById('loginScreen');
  if (isLoggedIn === 'true') {
    loginScreen.classList.add('hidden');
  } else {
    loginScreen.classList.remove('hidden');
  }
}

function handleLogin(e = null) {
  const btn = getFormSubmitButton(e, 'loginScreen') || document.querySelector('#loginForm button[type="submit"]');
  const orig = setButtonLoading(btn, 'Memverifikasi...');

  const emailInput = document.getElementById('loginEmail').value.trim();
  const passInput = document.getElementById('loginPassword').value.trim();

  setTimeout(() => {
    if (emailInput === AUTH_CONFIG.EMAIL && passInput === AUTH_CONFIG.PASS) {
      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
      document.getElementById('loginScreen').classList.add('hidden');
      showToast('Selamat Datang di Hanjitur Organizer! 🌿', 'success');
      renderAllViews();
    } else {
      showToast('Email atau password salah! Silakan coba lagi.', 'error');
    }
    resetButtonLoading(btn, orig);
  }, 350);
}


function togglePasswordVisibility() {
  const passInput = document.getElementById('loginPassword');
  const icon = document.getElementById('togglePasswordIcon');
  if (!passInput || !icon) return;

  if (passInput.type === 'password') {
    passInput.type = 'text';
    icon.setAttribute('data-lucide', 'eye-off');
  } else {
    passInput.type = 'password';
    icon.setAttribute('data-lucide', 'eye');
  }
  initLucide();
}

function handleLogout() {
  if (confirm('Apakah Anda yakin ingin keluar dari akun?')) {
    localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
    closeModal('modalSettings');
    document.getElementById('loginScreen').classList.remove('hidden');
    showToast('Anda telah keluar dari aplikasi', 'info');
  }
}

// ============================================================================
// 3. BLOSSOM FLOATING RADIAL MENU (Pojok Kanan Bawah & Mekar Sempurna)
// ============================================================================
let isBlossomOpen = false;

function getAppBounds() {
  const shell = document.getElementById('appShell');
  const viewW = window.innerWidth || document.documentElement.clientWidth || 390;
  const viewH = window.innerHeight || document.documentElement.clientHeight || 844;

  let left = 0;
  let right = viewW;

  if (shell) {
    const rect = shell.getBoundingClientRect();
    if (rect.width > 0 && rect.width < viewW) {
      left = Math.max(0, Math.round(rect.left));
      right = Math.min(viewW, Math.round(rect.right));
    }
  }

  const width = Math.max(300, right - left);

  return {
    left: left,
    right: right,
    width: width,
    top: 0,
    bottom: viewH,
    height: viewH
  };
}

function handleBlossomClick(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  toggleBlossomMenu();
}

function initBlossomMenu() {
  const wrapper = document.getElementById('blossomMenuWrapper');
  if (!wrapper) return;

  // Bersihkan inline koordinat lama agar style.css bottom-right mengontrol sepenuhnya
  wrapper.style.left = '';
  wrapper.style.top = '';
  wrapper.style.bottom = '';
  wrapper.style.right = '';
  wrapper.style.transform = 'translate(0px, 0px)';

  // Hapus cache posisi drag lawas
  try {
    localStorage.removeItem(STORAGE_KEYS.BLOSSOM_POS);
  } catch (e) {}

  window.addEventListener('resize', () => {
    if (isBlossomOpen) {
      shiftBlossomToCenter();
    }
  });
}

function shiftBlossomToCenter() {
  const wrapper = document.getElementById('blossomMenuWrapper');
  const trigger = document.getElementById('blossomTrigger');
  if (!wrapper || !trigger) return;

  const bounds = getAppBounds();

  // Reset transform sementara untuk mengukur titik awal native pojok kanan bawah
  wrapper.style.transition = 'none';
  wrapper.style.transform = 'translate(0px, 0px)';
  const rect = trigger.getBoundingClientRect();

  // Titik tengah frame aplikasi
  const targetX = bounds.left + bounds.width / 2;
  const targetY = Math.max(220, bounds.bottom - 220);

  const currentX = rect.left + rect.width / 2;
  const currentY = rect.top + rect.height / 2;

  const shiftX = Math.round(targetX - currentX);
  const shiftY = Math.round(targetY - currentY);

  void wrapper.offsetWidth; // Trigger browser reflow
  wrapper.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
  wrapper.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
}

function toggleBlossomMenu(open) {
  isBlossomOpen = open !== undefined ? open : !isBlossomOpen;
  const wrapper = document.getElementById('blossomMenuWrapper');
  const trigger = document.getElementById('blossomTrigger');
  const backdrop = document.getElementById('blossomBackdrop');
  if (!wrapper || !trigger || !backdrop) return;

  if (isBlossomOpen) {
    // Saat mekar: bergeser anggun dari pojok kanan bawah ke tengah frame aplikasi
    shiftBlossomToCenter();

    wrapper.classList.add('open');
    trigger.classList.add('active');
    backdrop.classList.add('active');
  } else {
    // Saat menutup: meluncur kembali diam di posisi paten di pojok kanan bawah
    wrapper.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
    wrapper.style.transform = 'translate(0px, 0px)';

    wrapper.classList.remove('open');
    trigger.classList.remove('active');
    backdrop.classList.remove('active');
  }
  initLucide();
}

function onBlossomNavigate(tabName) {
  switchTab(tabName);
  toggleBlossomMenu(false);
}

// ============================================================================
// 4. DATA PERSISTENCE & GOOGLE APPS SCRIPT SYNC
// ============================================================================
function loadStoredData() {
  localStorage.setItem(STORAGE_KEYS.SCRIPT_URL, SCRIPT_URL);

  const resetFlag = localStorage.getItem('hanjitur_reset_v4');
  if (!resetFlag) {
    // Reset cache dummy lama agar bersih dan sinkron dengan Spreadsheet asli
    localStorage.removeItem(STORAGE_KEYS.DATA_STORE);
    localStorage.setItem('hanjitur_reset_v4', 'true');
    weddingData = JSON.parse(JSON.stringify(DEFAULT_WEDDING_DATA));
    saveDataLocally();
  } else {
    const saved = localStorage.getItem(STORAGE_KEYS.DATA_STORE);
    if (saved) {
      try {
        weddingData = JSON.parse(saved);
        if (!weddingData.Master) weddingData.Master = DEFAULT_WEDDING_DATA.Master;
        if (!weddingData.Master.KategoriMaster) weddingData.Master.KategoriMaster = DEFAULT_WEDDING_DATA.Master.KategoriMaster;
        if (!weddingData.Master.KategoriVendor) weddingData.Master.KategoriVendor = DEFAULT_WEDDING_DATA.Master.KategoriVendor;
        if (!weddingData.Master.KategoriTamu) weddingData.Master.KategoriTamu = DEFAULT_WEDDING_DATA.Master.KategoriTamu;
        if (!weddingData.Dompet) weddingData.Dompet = [];
        if (!weddingData.Transaksi_Keuangan) weddingData.Transaksi_Keuangan = [];
        if (!weddingData.Anggaran) weddingData.Anggaran = [];
        if (!weddingData.Knowledge) weddingData.Knowledge = [];
        if (!weddingData.Isian_Knowledge) weddingData.Isian_Knowledge = [];
        if (!weddingData.Timeline) weddingData.Timeline = [];
        if (!weddingData.Rundown_Hari_H) weddingData.Rundown_Hari_H = [];
        if (!weddingData.Vendor) weddingData.Vendor = [];
        if (!weddingData.Files) weddingData.Files = [];
        if (!weddingData.Tamu_Undangan) weddingData.Tamu_Undangan = [];
      } catch (e) {
        weddingData = JSON.parse(JSON.stringify(DEFAULT_WEDDING_DATA));
      }
    } else {
      weddingData = JSON.parse(JSON.stringify(DEFAULT_WEDDING_DATA));
      saveDataLocally();
    }
  }

  updateSyncIndicator(true);

  if (weddingData.Master && weddingData.Master.HariH) {
    const dateInput = document.getElementById('settingWeddingDate');
    if (dateInput) dateInput.value = weddingData.Master.HariH;
  }

  // Sinkronisasi otomatis data live dari Spreadsheet saat startup
  syncFromSpreadsheet(true);
}

function saveDataLocally() {
  localStorage.setItem(STORAGE_KEYS.DATA_STORE, JSON.stringify(weddingData));
}

function updateSyncIndicator(isConnected) {
  const reloadBtn = document.getElementById('syncReloadBtn');
  if (!reloadBtn) return;
  if (isConnected) {
    reloadBtn.title = 'Segarkan Data dari Spreadsheet (Terhubung)';
    reloadBtn.style.color = 'var(--primary)';
  } else {
    reloadBtn.title = 'Koneksi Terputus (Mode Offline)';
    reloadBtn.style.color = '#E11D48';
  }
}

// ----------------------------------------------------------------------------
// HELPER FEEDBACK STATUS TOMBOL (LOADING, DISABLE, PROCESSED)
// ----------------------------------------------------------------------------
function getFormSubmitButton(e, modalId = null) {
  if (e) {
    if (e.submitter) return e.submitter;
    if (e.target && e.target.querySelector) {
      const b = e.target.querySelector('button[type="submit"]');
      if (b) return b;
    }
    if (e.currentTarget && e.currentTarget.querySelector) {
      const b = e.currentTarget.querySelector('button[type="submit"]');
      if (b) return b;
    }
    if (e.target && e.target.tagName === 'BUTTON') return e.target;
  }
  if (modalId) {
    const m = document.getElementById(modalId);
    if (m) {
      const b = m.querySelector('button[type="submit"]') || m.querySelector('.btn-primary');
      if (b) return b;
    }
  }
  return null;
}

function getActionButton(e, modalId = null, selector = 'button.danger') {
  if (e) {
    const btn = (e.target && e.target.closest) ? e.target.closest('button') : null;
    if (btn) return btn;
  }
  if (modalId) {
    const m = document.getElementById(modalId);
    if (m) {
      const b = m.querySelector(selector);
      if (b) return b;
    }
  }
  return null;
}

function setButtonLoading(btn, loadingText = 'Menyimpan...') {
  if (!btn) return null;
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add('btn-loading');
  btn.innerHTML = `<i data-lucide="loader-2" class="spin-loader" style="width: 16px; height: 16px;"></i> <span>${loadingText}</span>`;
  initLucide();
  return originalHtml;
}

function resetButtonLoading(btn, originalHtml) {
  if (!btn || !originalHtml) return;
  btn.disabled = false;
  btn.classList.remove('btn-loading');
  btn.classList.remove('btn-danger-loading');
  btn.innerHTML = originalHtml;
  initLucide();
}

// ----------------------------------------------------------------------------
// ANTREAN MUTASI PERSISTEN (MUTATION QUEUE ANTI-TIMPA MULTI-DEVICE)
// ----------------------------------------------------------------------------
function getSyncQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveSyncQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
  } catch (e) {}
}

let isProcessingQueue = false;

async function processSyncQueue() {
  if (isProcessingQueue) return;
  const queue = getSyncQueue();
  if (!queue || queue.length === 0) return;

  isProcessingQueue = true;

  while (queue.length > 0) {
    const item = queue[0];
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: item.action, sheet: item.sheet, data: item.data })
      });
      // Sukses terkirim: hapus item terdepan dari antrean
      queue.shift();
      saveSyncQueue(queue);
    } catch (err) {
      console.warn('Antrean sinkronisasi tertunda karena koneksi:', err);
      break;
    }
  }

  isProcessingQueue = false;
}

async function pushToSpreadsheet(action, sheetName, rowData) {
  const queue = getSyncQueue();
  const queueItem = {
    qid: generateUniqueId('Q'),
    action,
    sheet: sheetName,
    data: rowData,
    timestamp: Date.now()
  };
  queue.push(queueItem);
  saveSyncQueue(queue);

  // Segera proses antrean mutasi
  processSyncQueue();
}

let isSyncing = false;
let lastSyncAttempt = 0;

async function syncFromSpreadsheet(silent = false) {
  if (isSyncing) return;
  isSyncing = true;
  lastSyncAttempt = Date.now();

  const reloadBtn = document.getElementById('syncReloadBtn');
  if (reloadBtn) reloadBtn.classList.add('is-syncing');

  if (!silent) showToast('Menghubungkan ke Google Spreadsheet...', 'info');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14000);

  try {
    // Cache-busting URL parameter agar server Google Apps Script selalu mengirim data live Spreadsheet
    const fetchUrl = `${SCRIPT_URL}?_t=${Date.now()}`;
    const res = await fetch(fetchUrl, { 
      cache: 'no-store',
      signal: controller.signal 
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error('Gagal mengambil data dari Google Sheets');
    const remoteData = await res.json();
    
    if (remoteData && remoteData.status === 'success') {
      const live = remoteData.data || {};

      // PENTING: Pertahankan data lokal yang masih ada di antrean kirim agar tidak tertimpa!
      const pendingQueue = getSyncQueue();
      if (pendingQueue && pendingQueue.length > 0) {
        pendingQueue.forEach(item => {
          if (item.action === 'append_row' && item.sheet && item.data) {
            const sheetKey = item.sheet.replace(/[\s&/]/g, '_');
            const targetList = live[sheetKey] || live[item.sheet];
            if (Array.isArray(targetList)) {
              const idKey = Object.keys(item.data).find(k => k.startsWith('ID_'));
              if (idKey && !targetList.some(r => r[idKey] === item.data[idKey])) {
                targetList.push(item.data);
              }
            }
          }
        });
      }

      // Cek apakah data benar-benar berubah sebelum re-render
      const newStr = JSON.stringify(live);
      const oldStr = localStorage.getItem(STORAGE_KEYS.DATA_STORE);
      const hasChanged = newStr !== oldStr;

      weddingData = live;
      if (!weddingData.Rundown_Hari_H) weddingData.Rundown_Hari_H = [];
      if (!weddingData.Master) weddingData.Master = {};
      
      // Jika di sheet Master belum terisi kategori, sediakan default agar bisa dikelola
      if (!weddingData.Master.KategoriMaster || weddingData.Master.KategoriMaster.length === 0) {
        weddingData.Master.KategoriMaster = DEFAULT_WEDDING_DATA.Master.KategoriMaster;
      }
      if (!weddingData.Master.KategoriVendor || weddingData.Master.KategoriVendor.length === 0) {
        weddingData.Master.KategoriVendor = DEFAULT_WEDDING_DATA.Master.KategoriVendor;
      }
      if (!weddingData.Master.KategoriTamu || weddingData.Master.KategoriTamu.length === 0) {
        weddingData.Master.KategoriTamu = DEFAULT_WEDDING_DATA.Master.KategoriTamu;
      }

      if (!weddingData.Dompet) weddingData.Dompet = [];
      if (!weddingData.Transaksi_Keuangan) weddingData.Transaksi_Keuangan = [];
      if (!weddingData.Anggaran) weddingData.Anggaran = [];
      if (!weddingData.Knowledge) weddingData.Knowledge = [];
      if (!weddingData.Isian_Knowledge) weddingData.Isian_Knowledge = [];
      if (!weddingData.Timeline) weddingData.Timeline = [];
      if (!weddingData.Vendor) weddingData.Vendor = [];
      if (!weddingData.Files) weddingData.Files = [];
      if (!weddingData.Tamu_Undangan) weddingData.Tamu_Undangan = [];

      saveDataLocally();

      // Selalu render ulang seluruh tampilan begitu data dari Spreadsheet selesai dimuat,
      // agar data langsung nampak seketika di semua menu tanpa perlu search atau reload manual
      renderAllViews();
      renderMasterCategoryList();

      updateSyncIndicator(true);
      if (!silent) {
        showToast('Data berhasil disegarkan! 🌿', 'success');
        closeModal('modalSettings');
      }
    } else {
      throw new Error(remoteData.message || 'Format data sheet tidak valid');
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Sync warning:', err);
    if (!silent) showToast('Gagal sinkron: Periksa koneksi internet Anda', 'error');
  } finally {
    isSyncing = false;
    if (reloadBtn) reloadBtn.classList.remove('is-syncing');
  }

  // Coba proses sisa antrean bila ada
  processSyncQueue();
}

function triggerQuickSync() {
  syncFromSpreadsheet(false);
}

// Auto-Sync santai & cerdas: cek saat pengguna kembali ke tab, dengan batas jeda minimal 30 detik
function initAutoSync() {
  function triggerFocusSync() {
    const now = Date.now();
    if (now - lastSyncAttempt > 30000 && !isSyncing) {
      syncFromSpreadsheet(true);
    }
  }

  window.addEventListener('focus', triggerFocusSync);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerFocusSync();
    }
  });

  // Polling latar belakang santai setiap 60 detik (tidak memberatkan kuota/server)
  setInterval(() => {
    if (document.visibilityState === 'visible' && !isSyncing) {
      const now = Date.now();
      if (now - lastSyncAttempt > 50000) {
        syncFromSpreadsheet(true);
      }
    }
  }, 60000);
}

function saveWeddingDateSetting(e = null) {
  const btn = getFormSubmitButton(e, 'modalSettings') || document.querySelector('#modalSettings .btn-primary');
  const orig = setButtonLoading(btn, 'Menyimpan...');

  const dateVal = document.getElementById('settingWeddingDate').value;
  if (dateVal) {
    weddingData.Master = weddingData.Master || {};
    weddingData.Master.HariH = dateVal;
    saveDataLocally();
    startCountdownTimer();
    pushToSpreadsheet('update_master', 'Master', weddingData.Master);

    setTimeout(() => {
      resetButtonLoading(btn, orig);
      showToast('Tanggal Hari H berhasil disimpan & disinkronkan! 🌿', 'success');
    }, 350);
  } else {
    resetButtonLoading(btn, orig);
  }
}

// ----------------------------------------------------------------------------
// PENGELOLA KATEGORI MASTER (Sheet Master: Timeline, Vendor, Tamu)
// ----------------------------------------------------------------------------
let currentMasterTab = 'timeline'; // 'timeline' | 'vendor' | 'tamu'
let editingMasterIndex = null;

function switchMasterCategoryTab(tab) {
  currentMasterTab = tab;
  const btnTL = document.getElementById('btnMasterTabTimeline');
  const btnVD = document.getElementById('btnMasterTabVendor');
  const btnTM = document.getElementById('btnMasterTabTamu');

  if (btnTL) btnTL.classList.toggle('active', tab === 'timeline');
  if (btnVD) btnVD.classList.toggle('active', tab === 'vendor');
  if (btnTM) btnTM.classList.toggle('active', tab === 'tamu');

  renderMasterCategoryList();
}

function getMasterCategoryArray() {
  weddingData.Master = weddingData.Master || {};
  if (currentMasterTab === 'timeline') {
    if (!Array.isArray(weddingData.Master.KategoriMaster)) weddingData.Master.KategoriMaster = [];
    return weddingData.Master.KategoriMaster;
  } else if (currentMasterTab === 'vendor') {
    if (!Array.isArray(weddingData.Master.KategoriVendor)) weddingData.Master.KategoriVendor = [];
    return weddingData.Master.KategoriVendor;
  } else {
    if (!Array.isArray(weddingData.Master.KategoriTamu)) weddingData.Master.KategoriTamu = [];
    return weddingData.Master.KategoriTamu;
  }
}

function renderMasterCategoryList() {
  const container = document.getElementById('masterCategoryListContainer');
  if (!container) return;
  container.innerHTML = '';

  const list = getMasterCategoryArray();

  if (list.length === 0) {
    let tabName = currentMasterTab === 'timeline' ? 'Timeline' : currentMasterTab === 'vendor' ? 'Vendor' : 'Tamu';
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 16px 8px; font-size: 12px; background: rgba(255, 255, 255, 0.6); border-radius: var(--radius-sm);">
        Belum ada kategori ${tabName}. Klik <b>+ Tambah</b> di atas untuk menambahkan.
      </div>
    `;
    return;
  }

  list.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'master-cat-row';
    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 11px; color: var(--text-muted); font-weight: 700;">${index + 1}.</span>
        <span>${item}</span>
      </div>
      <div class="master-cat-actions">
        <button type="button" class="btn-isian-action" onclick="openEditMasterCategoryModal(${index})" title="Edit Kategori">
          <i data-lucide="edit-2" style="width: 13px; height: 13px;"></i>
        </button>
        <button type="button" class="btn-isian-action delete" onclick="deleteMasterCategory(${index}, event)" title="Hapus Kategori">
          <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  });

  initLucide();
}

function openAddMasterCategoryModal() {
  editingMasterIndex = null;
  let tabName = currentMasterTab === 'timeline' ? 'Timeline' : currentMasterTab === 'vendor' ? 'Vendor' : 'Tamu';
  document.getElementById('modalMasterCatTitle').innerText = `Tambah Kategori ${tabName}`;
  document.getElementById('modalMasterCatLabel').innerText = `Nama Kategori ${tabName}`;
  const input = document.getElementById('masterCategoryInput');
  if (input) input.value = '';
  openModal('modalMasterCategory');
}

function openEditMasterCategoryModal(index) {
  editingMasterIndex = index;
  const list = getMasterCategoryArray();
  let tabName = currentMasterTab === 'timeline' ? 'Timeline' : currentMasterTab === 'vendor' ? 'Vendor' : 'Tamu';
  document.getElementById('modalMasterCatTitle').innerText = `Edit Kategori ${tabName}`;
  document.getElementById('modalMasterCatLabel').innerText = `Nama Kategori ${tabName}`;
  const input = document.getElementById('masterCategoryInput');
  if (input) input.value = list[index] || '';
  openModal('modalMasterCategory');
}

function submitMasterCategoryForm(e = null) {
  const btn = getFormSubmitButton(e, 'modalMasterCategory');
  const input = document.getElementById('masterCategoryInput');
  const val = input ? input.value.trim() : '';
  if (!val) {
    showToast('Nama kategori tidak boleh kosong!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Kategori...');
  const list = getMasterCategoryArray();

  if (editingMasterIndex !== null && editingMasterIndex >= 0) {
    list[editingMasterIndex] = val;
    showToast('Kategori master berhasil diperbarui! ✨', 'success');
  } else {
    if (list.includes(val)) {
      resetButtonLoading(btn, orig);
      showToast('Kategori ini sudah ada!', 'info');
      return;
    }
    list.push(val);
    showToast('Kategori master berhasil ditambahkan! ✨', 'success');
  }

  saveDataLocally();
  renderMasterCategoryList();
  refreshAllCategoryDropdowns();
  pushToSpreadsheet('update_master', 'Master', weddingData.Master);

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalMasterCategory');
  }, 350);
}

function deleteMasterCategory(index, e = null) {
  const list = getMasterCategoryArray();
  const name = list[index];
  if (!name) return;

  if (confirm(`Apakah Anda yakin ingin menghapus kategori "${name}" dari data Master?`)) {
    const btn = getActionButton(e, null, 'button');
    const orig = setButtonLoading(btn, '...');
    if (btn) btn.classList.add('btn-danger-loading');

    list.splice(index, 1);
    saveDataLocally();
    renderMasterCategoryList();
    refreshAllCategoryDropdowns();
    pushToSpreadsheet('update_master', 'Master', weddingData.Master);

    setTimeout(() => {
      showToast(`Kategori "${name}" berhasil dihapus! 🗑️`, 'info');
    }, 250);
  }
}

function refreshAllCategoryDropdowns() {
  populateTimelineCategories('tlKategori');
  populateVendorCategories('vendorKategori');
  populateTamuCategories('tamuKategori');
  renderTimeline();
  renderVendor();
  renderTamu();
}

// ============================================================================
// 5. COUNTDOWN TIMER (Sheet 'Master')
// ============================================================================
function startCountdownTimer() {
  if (countdownInterval) clearInterval(countdownInterval);

  const targetDateStr = (weddingData.Master && weddingData.Master.HariH) ? weddingData.Master.HariH : '2026-12-24T08:00';
  const targetDate = new Date(targetDateStr).getTime();

  const dateObj = new Date(targetDateStr);
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDisplay = isNaN(dateObj.getTime()) ? '24 Desember 2026' : dateObj.toLocaleDateString('id-ID', options);
  
  const displayEl = document.getElementById('weddingDateDisplay');
  if (displayEl) displayEl.innerText = formattedDisplay;

  function update() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) {
      document.getElementById('timerDays').innerText = '00';
      document.getElementById('timerHours').innerText = '00';
      document.getElementById('timerMinutes').innerText = '00';
      document.getElementById('timerSeconds').innerText = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('timerDays').innerText = days < 10 ? '0' + days : days;
    document.getElementById('timerHours').innerText = hours < 10 ? '0' + hours : hours;
    document.getElementById('timerMinutes').innerText = minutes < 10 ? '0' + minutes : minutes;
    document.getElementById('timerSeconds').innerText = seconds < 10 ? '0' + seconds : seconds;
  }

  update();
  countdownInterval = setInterval(update, 1000);
}

// ============================================================================
// 6. VIEW RENDERING ENGINE
// ============================================================================
function renderAllViews() {
  renderDashboard();
  renderKeuangan();
  renderTimeline();
  renderRundown();
  renderVendor();
  renderTamu();
  renderKnowledgeAndFiles();
  populateWalletSelectOptions();
  initLucide();
}

function formatRupiah(amount) {
  const num = Number(amount) || 0;
  return 'Rp ' + num.toLocaleString('id-ID');
}

// ----------------------------------------------------------------------------
// A. Render Dashboard
// ----------------------------------------------------------------------------
function renderDashboard() {
  const dompetList = weddingData.Dompet || [];
  const totalSaldo = dompetList.reduce((acc, curr) => acc + (Number(curr.Saldo) || 0), 0);
  document.getElementById('dashTotalSaldo').innerText = formatRupiah(totalSaldo);
  document.getElementById('dashWalletCount').innerText = `${dompetList.length} Rekening Aktif`;

  const anggaranList = weddingData.Anggaran || [];
  const totalBiayaRiil = anggaranList.reduce((acc, curr) => acc + (Number(curr.Biaya_Riil) || Number(curr.Estimasi) || 0), 0);
  const totalTerbayar = anggaranList.reduce((acc, curr) => acc + (Number(curr.Jumlah_Dibayar) || 0), 0);
  const totalSisa = Math.max(0, totalBiayaRiil - totalTerbayar);
  const pctTerbayar = totalBiayaRiil > 0 ? Math.round((totalTerbayar / totalBiayaRiil) * 100) : 0;
  
  document.getElementById('dashSisaAnggaran').innerText = formatRupiah(totalSisa);
  document.getElementById('dashProgressAnggaran').innerText = `${pctTerbayar}% Terbayar`;

  // Tamu & Total Pax
  const tamuList = weddingData.Tamu_Undangan || [];
  const tamuHadir = tamuList.filter(t => (t.Status || '').toLowerCase().includes('hadir')).length;
  const totalPax = tamuList.reduce((acc, curr) => acc + (Number(curr.Jumlah_Pax) || 1), 0);
  document.getElementById('dashTamuHadir').innerText = tamuHadir;
  document.getElementById('dashTotalTamu').innerText = `${tamuList.length} Tamu • ${totalPax} Pax`;

  // Timeline
  const timelineList = weddingData.Timeline || [];
  const doneTimeline = timelineList.filter(t => (t.Status || '').toLowerCase() === 'selesai').length;
  const pctTimeline = timelineList.length > 0 ? Math.round((doneTimeline / timelineList.length) * 100) : 0;
  document.getElementById('dashTimelineDone').innerText = `${pctTimeline}%`;
  document.getElementById('dashTimelineCount').innerText = `${doneTimeline} dari ${timelineList.length} Selesai`;

  // Upcoming Timeline in Dashboard (Semua data dalam scroll frame, layout 2 baris)
  const upcomingContainer = document.getElementById('dashUpcomingTimelineList');
  upcomingContainer.innerHTML = '';
  const upcomingItems = (weddingData.Timeline || [])
    .slice()
    .sort((a, b) => {
      const timeA = a.Deadline ? new Date(a.Deadline).getTime() : Infinity;
      const timeB = b.Deadline ? new Date(b.Deadline).getTime() : Infinity;
      return timeA - timeB;
    });

  if (upcomingItems.length === 0) {
    upcomingContainer.innerHTML = `<div style="text-align: center; font-size: 12px; color: var(--text-muted); padding: 16px;">Belum ada agenda terdaftar</div>`;
  } else {
    upcomingItems.forEach(item => {
      const isDone = (item.Status || '').toLowerCase() === 'selesai';
      const card = document.createElement('div');
      card.className = `glass-card-sm timeline-card ${isDone ? 'done' : 'pending'}`;
      card.onclick = () => openTimelineDetailModal(item.ID_Timeline);
      card.innerHTML = `
        <div class="timeline-row-top">
          <span class="timeline-title" style="font-weight: 700; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0;">${item.Nama_Item}</span>
          <div class="timeline-deadline-badge" style="flex-shrink: 0;">
            <i data-lucide="calendar" style="width: 11px; height: 11px;"></i>
            <span>${item.Deadline || '-'}</span>
          </div>
        </div>
        <div class="timeline-row-bottom">
          <span class="timeline-cat-pill">${item.Kategori || 'Persiapan'}</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="timeline-status-pill ${isDone ? 'done' : 'pending'}">${isDone ? 'Selesai' : 'Belum Selesai'}</span>
            <button type="button" class="btn-toggle-status ${isDone ? 'done' : ''}" 
              onclick="event.stopPropagation(); toggleTimelineStatus('${item.ID_Timeline}')" 
              title="${isDone ? 'Tandai Belum Selesai' : 'Tandai Selesai'}">
              <i data-lucide="${isDone ? 'check' : 'circle'}" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        </div>
      `;
      upcomingContainer.appendChild(card);
    });
  }

  // Recent Transactions in Dashboard (Semua transaksi dalam scroll frame, layout 2 baris)
  const recentTxContainer = document.getElementById('dashRecentTxList');
  recentTxContainer.innerHTML = '';
  const txList = weddingData.Transaksi_Keuangan || [];
  const allTx = txList.slice().reverse();
  if (allTx.length === 0) {
    recentTxContainer.innerHTML = `<div style="text-align: center; font-size: 12px; color: var(--text-muted); padding: 16px;">Belum ada transaksi</div>`;
  } else {
    allTx.forEach(tx => {
      const isKeluar = (tx.Jenis || 'Keluar') === 'Keluar';
      const card = document.createElement('div');
      card.className = 'glass-card-sm tx-card';
      card.innerHTML = `
        <div class="tx-icon-col ${isKeluar ? 'keluar' : 'masuk'}">
          <i data-lucide="${isKeluar ? 'arrow-up-right' : 'arrow-down-left'}" style="width: 18px; height: 18px;"></i>
        </div>
        <div class="tx-details">
          <div class="tx-item-name">${tx.Rincian_Item || tx.Kategori}</div>
          <div class="tx-meta">
            <span>${tx.Dompet}</span> &bull; <span>${tx.Tanggal_Waktu || '-'}</span>
          </div>
        </div>
        <div class="tx-amount-col">
          <div class="tx-amount ${isKeluar ? 'keluar' : 'masuk'}">${isKeluar ? '-' : '+'} ${formatRupiah(tx.Nominal)}</div>
          <span class="tx-status-badge">${tx.Status || 'Berhasil'}</span>
        </div>
      `;
      recentTxContainer.appendChild(card);
    });
  }
}

// ----------------------------------------------------------------------------
// B. Render Keuangan & Anggaran
// ----------------------------------------------------------------------------
let isWalletAccordionOpen = true;
let currentTxTypeFilter = 'all';
let currentTxDateFilter = '';
let currentTxSearchQuery = '';
let currentTxWalletFilter = '';
let budgetCategoryState = {};
let selectedWalletId = null;

function toggleWalletAccordion() {
  isWalletAccordionOpen = !isWalletAccordionOpen;
  const body = document.getElementById('walletAccordionBody');
  const arrow = document.getElementById('walletAccordionArrow');
  if (body) body.style.display = isWalletAccordionOpen ? 'flex' : 'none';
  if (arrow) arrow.classList.toggle('rotated', isWalletAccordionOpen);
}

function setTxFilter(type, btn) {
  currentTxTypeFilter = type;
  document.querySelectorAll('.tx-filter-icons .icon-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTransactionsList();
}

function toggleTxDateFilter() {
  const row = document.getElementById('txDateFilterRow');
  if (row) {
    row.style.display = row.style.display === 'none' ? 'flex' : 'none';
  }
}

function clearTxDateFilter() {
  const input = document.getElementById('txDateInput');
  if (input) input.value = '';
  currentTxDateFilter = '';
  renderTransactionsList();
}

function filterTransactions() {
  const searchInput = document.getElementById('txSearchInput');
  const dateInput = document.getElementById('txDateInput');
  currentTxSearchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
  currentTxDateFilter = dateInput ? dateInput.value : '';
  renderTransactionsList();
}

function clearTxWalletFilter() {
  currentTxWalletFilter = '';
  const chipContainer = document.getElementById('txWalletFilterChipContainer');
  if (chipContainer) chipContainer.style.display = 'none';
  renderTransactionsList();
}

function openWalletActionPopup(walletId) {
  selectedWalletId = walletId;
  const wallet = (weddingData.Dompet || []).find(w => w.ID_Dompet === walletId);
  if (!wallet) return;

  const nameEl = document.getElementById('dompetActionName');
  const balEl = document.getElementById('dompetActionBalance');
  if (nameEl) nameEl.innerText = wallet.Nama_Dompet;
  if (balEl) balEl.innerText = formatRupiah(wallet.Saldo);
  openModal('modalDompetAction');
}

function viewWalletTransactions() {
  const wallet = (weddingData.Dompet || []).find(w => w.ID_Dompet === selectedWalletId);
  if (!wallet) return;

  currentTxWalletFilter = wallet.Nama_Dompet;
  const chipContainer = document.getElementById('txWalletFilterChipContainer');
  const chipText = document.getElementById('txWalletFilterChipText');
  if (chipContainer && chipText) {
    chipContainer.style.display = 'block';
    chipText.innerText = `Dompet: ${wallet.Nama_Dompet}`;
  }
  closeModal('modalDompetAction');
  renderTransactionsList();

  const txFrame = document.getElementById('txScrollFrame');
  if (txFrame) {
    txFrame.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function openEditWalletModal() {
  closeModal('modalDompetAction');
  const wallet = (weddingData.Dompet || []).find(w => w.ID_Dompet === selectedWalletId);
  if (!wallet) return;

  document.getElementById('editDompetNama').value = wallet.Nama_Dompet;
  document.getElementById('editDompetSaldo').value = wallet.Saldo;
  openModal('modalEditDompet');
}

function submitEditDompet(e = null) {
  const btn = getFormSubmitButton(e, 'modalEditDompet');
  const wallet = (weddingData.Dompet || []).find(w => w.ID_Dompet === selectedWalletId);
  if (!wallet) return;

  const newName = document.getElementById('editDompetNama').value.trim();
  const newSaldo = Number(document.getElementById('editDompetSaldo').value) || 0;

  if (!newName) {
    showToast('Nama dompet tidak boleh kosong!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Perubahan...');

  const oldName = wallet.Nama_Dompet;
  wallet.Nama_Dompet = newName;
  wallet.Saldo = newSaldo;

  if (oldName !== newName && weddingData.Transaksi_Keuangan) {
    weddingData.Transaksi_Keuangan.forEach(tx => {
      if (tx.Dompet === oldName) tx.Dompet = newName;
    });
  }

  if (currentTxWalletFilter === oldName) {
    currentTxWalletFilter = newName;
    const chipText = document.getElementById('txWalletFilterChipText');
    if (chipText) chipText.innerText = `Dompet: ${newName}`;
  }

  saveDataLocally();
  renderAllViews();
  pushToSpreadsheet('update_wallet', 'Dompet', wallet);

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalEditDompet');
    showToast('Dompet berhasil diperbarui! 💳', 'success');
  }, 350);
}

function deleteWallet(e = null) {
  const wallet = (weddingData.Dompet || []).find(w => w.ID_Dompet === selectedWalletId);
  if (!wallet) return;

  if (confirm(`Apakah Anda yakin ingin menghapus dompet "${wallet.Nama_Dompet}"?`)) {
    const btn = getActionButton(e, 'modalDompetAction', 'button.danger');
    const orig = setButtonLoading(btn, 'Menghapus Dompet...');
    if (btn) btn.classList.add('btn-danger-loading');

    weddingData.Dompet = (weddingData.Dompet || []).filter(w => w.ID_Dompet !== selectedWalletId);
    if (currentTxWalletFilter === wallet.Nama_Dompet) {
      clearTxWalletFilter();
    }
    saveDataLocally();
    renderAllViews();
    pushToSpreadsheet('delete_row', 'Dompet', { ID: selectedWalletId });

    setTimeout(() => {
      resetButtonLoading(btn, orig);
      closeModal('modalDompetAction');
      showToast('Dompet berhasil dihapus! 🗑️', 'info');
    }, 350);
  }
}

function renderTransactionsList() {
  const txHistoryListEl = document.getElementById('txHistoryList');
  if (!txHistoryListEl) return;
  txHistoryListEl.innerHTML = '';
  const txList = weddingData.Transaksi_Keuangan || [];

  const searchInput = document.getElementById('txSearchInput');
  currentTxSearchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

  let filtered = txList.slice().reverse();

  if (currentTxTypeFilter === 'masuk') {
    filtered = filtered.filter(tx => (tx.Jenis || '') === 'Masuk');
  } else if (currentTxTypeFilter === 'keluar') {
    filtered = filtered.filter(tx => (tx.Jenis || 'Keluar') === 'Keluar');
  }

  if (currentTxWalletFilter) {
    filtered = filtered.filter(tx => (tx.Dompet || '') === currentTxWalletFilter);
  }

  if (currentTxDateFilter) {
    filtered = filtered.filter(tx => (tx.Tanggal_Waktu || '').startsWith(currentTxDateFilter));
  }

  if (currentTxSearchQuery) {
    filtered = filtered.filter(tx => 
      (tx.Rincian_Item || '').toLowerCase().includes(currentTxSearchQuery) ||
      (tx.Kategori || '').toLowerCase().includes(currentTxSearchQuery) ||
      (tx.Dompet || '').toLowerCase().includes(currentTxSearchQuery)
    );
  }

  if (filtered.length === 0) {
    txHistoryListEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px;">Tidak ada transaksi ditemukan.</div>`;
    return;
  }

  filtered.forEach(tx => {
    const isKeluar = (tx.Jenis || 'Keluar') === 'Keluar';
    const card = document.createElement('div');
    card.className = 'glass-card-sm tx-card';
    card.innerHTML = `
      <div class="tx-icon-col ${isKeluar ? 'keluar' : 'masuk'}">
        <i data-lucide="${isKeluar ? 'arrow-up-right' : 'arrow-down-left'}" style="width: 18px; height: 18px;"></i>
      </div>
      <div class="tx-details">
        <div class="tx-item-name">${tx.Rincian_Item || tx.Kategori}</div>
        <div class="tx-meta">
          <span>${tx.Dompet}</span> &bull; <span>${tx.Tanggal_Waktu || '-'}</span>
        </div>
      </div>
      <div class="tx-amount-col">
        <div class="tx-amount ${isKeluar ? 'keluar' : 'masuk'}">${isKeluar ? '-' : '+'} ${formatRupiah(tx.Nominal)}</div>
        <span class="tx-status-badge">${tx.Status || 'Berhasil'}</span>
      </div>
    `;
    txHistoryListEl.appendChild(card);
  });
  initLucide();
}

let currentAnggaranSearch = '';

function filterAnggaranSearch() {
  const searchInput = document.getElementById('anggaranSearchInput');
  currentAnggaranSearch = searchInput ? searchInput.value.toLowerCase().trim() : '';
  renderKeuangan();
}

function toggleBudgetCategory(catName) {
  if (budgetCategoryState[catName] === undefined) {
    budgetCategoryState[catName] = true;
  }
  budgetCategoryState[catName] = !budgetCategoryState[catName];
  const catKey = catName.replace(/[\s&/]/g, '_');
  const body = document.getElementById(`budget-cat-body-${catKey}`);
  const arrow = document.getElementById(`budget-cat-arrow-${catKey}`);
  if (body) {
    body.style.display = budgetCategoryState[catName] ? 'flex' : 'none';
  }
  if (arrow) {
    arrow.classList.toggle('rotated', budgetCategoryState[catName]);
  }
}

function renderKeuangan() {
  // 1. Wallets
  const walletListEl = document.getElementById('walletList');
  if (walletListEl) {
    walletListEl.innerHTML = '';
    const dompetList = weddingData.Dompet || [];
    const totalSaldo = dompetList.reduce((acc, curr) => acc + (Number(curr.Saldo) || 0), 0);
    const totalBadge = document.getElementById('walletTotalSummary');
    if (totalBadge) totalBadge.innerText = formatRupiah(totalSaldo);

    dompetList.forEach(w => {
      const card = document.createElement('div');
      card.className = 'wallet-item-compact';
      card.style.cursor = 'pointer';
      card.title = 'Klik untuk kelola dompet';
      card.onclick = () => openWalletActionPopup(w.ID_Dompet);
      card.innerHTML = `
        <div class="w-name" style="display: flex; align-items: center; gap: 6px;">
          <span>${w.Nama_Dompet}</span>
          <i data-lucide="more-horizontal" style="width: 14px; height: 14px; color: var(--text-light);"></i>
        </div>
        <div class="w-amount">${formatRupiah(w.Saldo)}</div>
      `;
      walletListEl.appendChild(card);
    });
  }

  // 2. Transactions
  renderTransactionsList();

  // 3. Anggaran Categorized Accordion
  const budgetCategorizedListEl = document.getElementById('budgetCategorizedList');
  if (budgetCategorizedListEl) {
    budgetCategorizedListEl.innerHTML = '';
    const anggaranList = weddingData.Anggaran || [];

    const searchInput = document.getElementById('anggaranSearchInput');
    currentAnggaranSearch = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let totalEst = 0, totalRiil = 0, totalBayar = 0, totalSisa = 0;

    anggaranList.forEach(item => {
      const est = Number(item.Estimasi) || 0;
      const riil = Number(item.Biaya_Riil) || est;
      const bayar = Number(item.Jumlah_Dibayar) || 0;
      const sisa = Math.max(0, riil - bayar);

      totalEst += est;
      totalRiil += riil;
      totalBayar += bayar;
      totalSisa += sisa;
    });

    const pctAll = totalRiil > 0 ? Math.round((totalBayar / totalRiil) * 100) : 0;
    const estEl = document.getElementById('anggaranTotalEstimasi');
    const bayarEl = document.getElementById('anggaranTotalTerbayar');
    const sisaEl = document.getElementById('anggaranTotalSisa');
    const pctTextEl = document.getElementById('anggaranPercentText');
    const progBarEl = document.getElementById('anggaranProgressBar');

    if (estEl) estEl.innerText = formatRupiah(totalEst);
    if (bayarEl) bayarEl.innerText = formatRupiah(totalBayar);
    if (sisaEl) sisaEl.innerText = formatRupiah(totalSisa);
    if (pctTextEl) pctTextEl.innerText = `${pctAll}%`;
    if (progBarEl) progBarEl.style.width = `${pctAll}%`;

    // Filter items berdasarkan pencarian
    let filteredAnggaran = anggaranList.slice();
    if (currentAnggaranSearch) {
      filteredAnggaran = filteredAnggaran.filter(item => 
        (item.Item || '').toLowerCase().includes(currentAnggaranSearch) ||
        (item.Kategori_Anggaran || '').toLowerCase().includes(currentAnggaranSearch) ||
        (item.Jatuh_Tempo || '').toLowerCase().includes(currentAnggaranSearch)
      );
    }

    if (filteredAnggaran.length === 0) {
      budgetCategorizedListEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px; font-size: 13px;">${currentAnggaranSearch ? 'Tidak ada pos anggaran yang cocok dengan pencarian.' : 'Belum ada pos anggaran terdaftar.'}</div>`;
    } else {
      const grouped = {};
      filteredAnggaran.forEach(item => {
        const est = Number(item.Estimasi) || 0;
        const riil = Number(item.Biaya_Riil) || est;
        const bayar = Number(item.Jumlah_Dibayar) || 0;
        const sisa = Math.max(0, riil - bayar);

        const cat = item.Kategori_Anggaran || 'Lain-lain';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ ...item, est, riil, bayar, sisa });
      });

      Object.keys(grouped).forEach(cat => {
        const items = grouped[cat];
        const catKey = cat.replace(/[\s&/]/g, '_');
        // Default terbuka (true) agar pos anggaran langsung nampak seketika
        if (budgetCategoryState[cat] === undefined) {
          budgetCategoryState[cat] = true;
        }
        const isOpen = currentAnggaranSearch ? true : (budgetCategoryState[cat] !== false);

        const catSubtotalRiil = items.reduce((a, b) => a + b.riil, 0);
        const catSubtotalBayar = items.reduce((a, b) => a + b.bayar, 0);
        const catPct = catSubtotalRiil > 0 ? Math.round((catSubtotalBayar / catSubtotalRiil) * 100) : 0;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'budget-cat-group';
        groupDiv.innerHTML = `
          <div class="budget-cat-header" onclick="toggleBudgetCategory('${cat}')">
            <div class="budget-cat-title-wrap">
              <span class="budget-cat-name">${cat}</span>
              <span class="budget-cat-count">${items.length} Item</span>
            </div>
            <div class="budget-cat-right">
              <span class="budget-cat-pct-badge">${catPct}%</span>
              <div class="accordion-arrow ${isOpen ? 'rotated' : ''}" id="budget-cat-arrow-${catKey}">
                <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
              </div>
            </div>
          </div>
          <div class="budget-cat-items-list" id="budget-cat-body-${catKey}" style="display: ${isOpen ? 'flex' : 'none'};">
            ${items.map(item => {
              const pct = item.riil > 0 ? Math.min(100, Math.round((item.bayar / item.riil) * 100)) : 0;
              return `
                <div class="glass-card budget-card" onclick="openAnggaranDetail('${item.ID_Anggaran}')" title="Klik untuk lihat rincian pos anggaran">
                  <div class="budget-top">
                    <div>
                      <div class="budget-category">${item.Kategori_Anggaran || 'Pos Biaya'}</div>
                      <div class="budget-item-name">${item.Item}</div>
                    </div>
                    <div style="text-align: right;">
                      <div class="budget-due">
                        <i data-lucide="calendar" style="width: 11px; height: 11px; display: inline;"></i> ${item.Jatuh_Tempo || '-'}
                      </div>
                      <div style="font-size: 10.5px; color: var(--primary); margin-top: 3px; font-weight: 700; display: flex; align-items: center; justify-content: flex-end; gap: 2px;">
                        <span>Detail</span>
                        <i data-lucide="chevron-right" style="width: 13px; height: 13px;"></i>
                      </div>
                    </div>
                  </div>
                  <div class="budget-metrics">
                    <div>
                      <div class="metric-label">Estimasi</div>
                      <div class="metric-val">${formatRupiah(item.est)}</div>
                    </div>
                    <div>
                      <div class="metric-label">Terbayar</div>
                      <div class="metric-val" style="color: var(--success);">${formatRupiah(item.bayar)}</div>
                    </div>
                    <div>
                      <div class="metric-label">Sisa</div>
                      <div class="metric-val" style="color: var(--danger);">${formatRupiah(item.sisa)}</div>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; color: var(--text-muted);">
                    <span>Progres Pembayaran</span>
                    <span style="font-weight: 700; color: var(--primary);">${pct}%</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
        budgetCategorizedListEl.appendChild(groupDiv);
      });
    }
  }
  initLucide();
}

// ----------------------------------------------------------------------------
// INTERAKTIF POS ANGGARAN (Detail Popup, Edit & Hapus)
// ----------------------------------------------------------------------------
let selectedAnggaranId = null;

function openAnggaranDetail(id) {
  selectedAnggaranId = id;
  const item = (weddingData.Anggaran || []).find(a => a.ID_Anggaran === id);
  if (!item) return;

  const est = Number(item.Estimasi) || 0;
  const riil = Number(item.Biaya_Riil) || est;
  const bayar = Number(item.Jumlah_Dibayar) || 0;
  const sisa = Math.max(0, riil - bayar);
  const pct = riil > 0 ? Math.min(100, Math.round((bayar / riil) * 100)) : 0;

  document.getElementById('anggaranDetailCategory').innerText = item.Kategori_Anggaran || 'Pos Biaya';
  document.getElementById('anggaranDetailItem').innerText = item.Item || 'Pos Anggaran';
  document.getElementById('anggaranDetailEstimasi').innerText = formatRupiah(est);
  document.getElementById('anggaranDetailBiayaRiil').innerText = formatRupiah(riil);
  document.getElementById('anggaranDetailTerbayar').innerText = formatRupiah(bayar);
  document.getElementById('anggaranDetailSisa').innerText = formatRupiah(sisa);
  document.getElementById('anggaranDetailPct').innerText = `${pct}%`;
  document.getElementById('anggaranDetailProgressBar').style.width = `${pct}%`;
  document.getElementById('anggaranDetailJatuhTempo').innerText = item.Jatuh_Tempo || '-';

  const statusBadge = document.getElementById('anggaranDetailStatusBadge');
  if (statusBadge) {
    if (sisa === 0 && bayar > 0) {
      statusBadge.innerText = 'Lunas';
      statusBadge.style = 'background: var(--success-bg); color: var(--success);';
    } else if (bayar > 0) {
      statusBadge.innerText = 'DP / Sebagian';
      statusBadge.style = 'background: rgba(82, 128, 105, 0.15); color: var(--primary);';
    } else {
      statusBadge.innerText = 'Belum Bayar';
      statusBadge.style = 'background: var(--danger-bg); color: var(--danger);';
    }
  }

  const catatanWrap = document.getElementById('anggaranDetailCatatanWrap');
  const catatanEl = document.getElementById('anggaranDetailCatatan');
  if (item.Catatan && item.Catatan.trim() && item.Catatan !== '-') {
    catatanEl.innerText = item.Catatan;
    catatanWrap.style.display = 'flex';
  } else {
    catatanWrap.style.display = 'none';
  }

  openModal('modalAnggaranDetail');
}

function openEditAnggaranModal() {
  closeModal('modalAnggaranDetail');
  const item = (weddingData.Anggaran || []).find(a => a.ID_Anggaran === selectedAnggaranId);
  if (!item) return;

  const est = Number(item.Estimasi) || 0;
  const riil = Number(item.Biaya_Riil) || est;
  const bayar = Number(item.Jumlah_Dibayar) || 0;

  // Populate category options
  const catSelect = document.getElementById('editAnggaranKategori');
  if (catSelect) {
    const masterCats = (weddingData.Master && Array.isArray(weddingData.Master.KategoriVendor)) ? weddingData.Master.KategoriVendor : [];
    const existingCats = (weddingData.Anggaran || []).map(a => a.Kategori_Anggaran).filter(Boolean);
    const defaultCats = ['Venue', 'Catering', 'Dekorasi', 'MUA & Busana', 'Dokumentasi', 'Undangan & Souvenir', 'Entertainment', 'Lain-lain'];
    const allCats = Array.from(new Set([...defaultCats, ...masterCats, ...existingCats]));
    catSelect.innerHTML = allCats.map(c => `<option value="${c}">${c}</option>`).join('');
    catSelect.value = item.Kategori_Anggaran || 'Lain-lain';
  }

  document.getElementById('editAnggaranItem').value = item.Item || '';
  document.getElementById('editAnggaranEstimasi').value = est;
  document.getElementById('editAnggaranBiayaRiil').value = riil;
  document.getElementById('editAnggaranJumlahBayar').value = bayar;
  document.getElementById('editAnggaranJatuhTempo').value = item.Jatuh_Tempo !== '-' ? (item.Jatuh_Tempo || '') : '';
  document.getElementById('editAnggaranCatatan').value = (item.Catatan && item.Catatan !== '-') ? item.Catatan : '';

  openModal('modalEditAnggaran');
}

function submitEditAnggaran(e = null) {
  const btn = getFormSubmitButton(e, 'modalEditAnggaran');
  const item = (weddingData.Anggaran || []).find(a => a.ID_Anggaran === selectedAnggaranId);
  if (!item) return;

  const kategori = document.getElementById('editAnggaranKategori').value;
  const itemName = document.getElementById('editAnggaranItem').value.trim();
  const est = Number(document.getElementById('editAnggaranEstimasi').value) || 0;
  const riil = Number(document.getElementById('editAnggaranBiayaRiil').value) || est;
  const bayar = Number(document.getElementById('editAnggaranJumlahBayar').value) || 0;
  const tempo = document.getElementById('editAnggaranJatuhTempo').value;
  const catatan = document.getElementById('editAnggaranCatatan').value.trim();

  if (!itemName || est <= 0) {
    showToast('Harap masukkan nama item dan estimasi biaya yang valid!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Perubahan...');
  const sisa = Math.max(0, riil - bayar);

  item.Kategori_Anggaran = kategori;
  item.Item = itemName;
  item.Estimasi = est;
  item.Biaya_Riil = riil;
  item.Jumlah_Dibayar = bayar;
  item.Sisa_Pembayaran = sisa;
  item.Jatuh_Tempo = tempo || '-';
  item.Catatan = catatan || '-';

  saveDataLocally();
  renderAllViews();
  pushToSpreadsheet('update_anggaran', 'Anggaran', item);

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalEditAnggaran');
    showToast(`Pos anggaran "${itemName}" berhasil diperbarui! 💰`, 'success');
  }, 350);
}

function deleteAnggaranItem(e = null) {
  const item = (weddingData.Anggaran || []).find(a => a.ID_Anggaran === selectedAnggaranId);
  if (!item) return;

  if (confirm(`Apakah Anda yakin ingin menghapus pos anggaran "${item.Item}"?`)) {
    const btn = getActionButton(e, 'modalAnggaranDetail', 'button');
    const orig = setButtonLoading(btn, 'Menghapus...');
    if (btn) btn.classList.add('btn-danger-loading');

    weddingData.Anggaran = (weddingData.Anggaran || []).filter(a => a.ID_Anggaran !== selectedAnggaranId);
    saveDataLocally();
    renderAllViews();
    pushToSpreadsheet('delete_row', 'Anggaran', { ID: selectedAnggaranId });

    setTimeout(() => {
      resetButtonLoading(btn, orig);
      closeModal('modalAnggaranDetail');
      showToast(`Pos anggaran "${item.Item}" berhasil dihapus! 🗑️`, 'info');
    }, 350);
  }
}

// ----------------------------------------------------------------------------
// C. Render Timeline
// ----------------------------------------------------------------------------
let currentTimelineFilter = 'all'; // 'all', 'pending', 'done'
let currentTimelineDateFilter = '';
let currentTimelineSearch = '';
let selectedTimelineId = null;

function setTimelineFilter(filter, btn) {
  currentTimelineFilter = filter;
  const icons = document.querySelectorAll('#tab-timeline .icon-filter-btn');
  icons.forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTimeline();
}

function toggleTimelineDateFilter() {
  const row = document.getElementById('tlDateFilterRow');
  if (row) {
    row.style.display = row.style.display === 'none' ? 'flex' : 'none';
  }
}

function clearTimelineDateFilter() {
  const input = document.getElementById('tlDateInput');
  if (input) input.value = '';
  currentTimelineDateFilter = '';
  renderTimeline();
}

function filterTimelineSearch() {
  const searchInput = document.getElementById('tlSearchInput');
  const dateInput = document.getElementById('tlDateInput');
  currentTimelineSearch = searchInput ? searchInput.value.toLowerCase().trim() : '';
  currentTimelineDateFilter = dateInput ? dateInput.value : '';
  renderTimeline();
}

function populateTimelineCategories(selectId, selectedVal) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;
  const masterCats = (weddingData.Master && Array.isArray(weddingData.Master.KategoriMaster) && weddingData.Master.KategoriMaster.length > 0)
    ? weddingData.Master.KategoriMaster
    : ['H-6 Bulan', 'H-3 Bulan', 'H-1 Bulan', 'H-1 Minggu', 'Hari H', 'Pasca Acara'];
  
  selectEl.innerHTML = masterCats.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  if (selectedVal) {
    selectEl.value = selectedVal;
  }
}

function renderTimeline() {
  const timelineListEl = document.getElementById('timelineList');
  if (!timelineListEl) return;
  timelineListEl.innerHTML = '';
  let items = (weddingData.Timeline || []).slice();

  const searchInput = document.getElementById('tlSearchInput');
  const dateInput = document.getElementById('tlDateInput');
  currentTimelineSearch = searchInput ? searchInput.value.toLowerCase().trim() : '';
  currentTimelineDateFilter = dateInput ? dateInput.value : '';

  // Sort by nearest upcoming deadline
  items.sort((a, b) => {
    const timeA = a.Deadline ? new Date(a.Deadline).getTime() : Infinity;
    const timeB = b.Deadline ? new Date(b.Deadline).getTime() : Infinity;
    return timeA - timeB;
  });

  if (currentTimelineFilter === 'pending') {
    items = items.filter(t => (t.Status || '').toLowerCase() !== 'selesai');
  } else if (currentTimelineFilter === 'done') {
    items = items.filter(t => (t.Status || '').toLowerCase() === 'selesai');
  }

  if (currentTimelineDateFilter) {
    items = items.filter(t => (t.Deadline || '') === currentTimelineDateFilter);
  }

  if (currentTimelineSearch) {
    items = items.filter(t => 
      (t.Nama_Item || '').toLowerCase().includes(currentTimelineSearch) ||
      (t.Kategori || '').toLowerCase().includes(currentTimelineSearch) ||
      (t.Catatan || '').toLowerCase().includes(currentTimelineSearch)
    );
  }

  if (items.length === 0) {
    timelineListEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px; font-size: 13px;">Tidak ada agenda dalam filter ini.</div>`;
    return;
  }

  items.forEach(item => {
    const isDone = (item.Status || '').toLowerCase() === 'selesai';
    const card = document.createElement('div');
    card.className = `glass-card timeline-card ${isDone ? 'done' : 'pending'}`;
    card.onclick = () => openTimelineDetailModal(item.ID_Timeline);
    card.innerHTML = `
      <div class="timeline-row-top">
        <span class="timeline-title" style="font-weight: 700; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0;">${item.Nama_Item}</span>
        <div class="timeline-deadline-badge" style="flex-shrink: 0;">
          <i data-lucide="calendar" style="width: 11px; height: 11px;"></i>
          <span>${item.Deadline || '-'}</span>
        </div>
      </div>
      <div class="timeline-row-bottom">
        <span class="timeline-cat-pill">${item.Kategori || 'Persiapan'}</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="timeline-status-pill ${isDone ? 'done' : 'pending'}">${isDone ? 'Selesai' : 'Belum Selesai'}</span>
          <button type="button" class="btn-toggle-status ${isDone ? 'done' : ''}" 
            onclick="event.stopPropagation(); toggleTimelineStatus('${item.ID_Timeline}')" 
            title="${isDone ? 'Tandai Belum Selesai' : 'Tandai Selesai'}">
            <i data-lucide="${isDone ? 'check' : 'circle'}" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </div>
    `;
    timelineListEl.appendChild(card);
  });
  initLucide();
}

function toggleTimelineStatus(id) {
  const item = (weddingData.Timeline || []).find(t => t.ID_Timeline === id);
  if (item) {
    const isDone = (item.Status || '').toLowerCase() === 'selesai';
    item.Status = isDone ? 'Belum' : 'Selesai';
    saveDataLocally();
    renderTimeline();
    renderDashboard();
    initLucide();
    showToast(`Status agenda: ${item.Status} 🌿`, 'info');
    pushToSpreadsheet('update_status', 'Timeline', { ID: id, Status: item.Status });
  }
}

function openTimelineDetailModal(id) {
  selectedTimelineId = id;
  const item = (weddingData.Timeline || []).find(t => t.ID_Timeline === id);
  if (!item) return;

  const isDone = (item.Status || '').toLowerCase() === 'selesai';
  document.getElementById('tlDetailCategory').innerText = item.Kategori || 'Persiapan';
  document.getElementById('tlDetailTitle').innerText = item.Nama_Item;
  document.getElementById('tlDetailDeadline').innerText = item.Deadline || '-';
  document.getElementById('tlDetailCatatan').innerText = item.Catatan || 'Tidak ada catatan khusus.';
  
  const statusEl = document.getElementById('tlDetailStatus');
  statusEl.innerText = isDone ? 'Selesai' : 'Belum Selesai';
  statusEl.className = `timeline-status-pill ${isDone ? 'done' : 'pending'}`;

  const toggleBtn = document.getElementById('btnTlDetailToggleText');
  if (toggleBtn) {
    toggleBtn.innerText = isDone ? 'Tandai Belum Selesai' : 'Tandai Selesai';
  }

  openModal('modalTimelineDetail');
}

function toggleDetailTimelineStatus() {
  if (!selectedTimelineId) return;
  toggleTimelineStatus(selectedTimelineId);
  closeModal('modalTimelineDetail');
}

function openEditTimelineModal() {
  closeModal('modalTimelineDetail');
  const item = (weddingData.Timeline || []).find(t => t.ID_Timeline === selectedTimelineId);
  if (!item) return;

  populateTimelineCategories('editTlKategori', item.Kategori);
  document.getElementById('editTlItem').value = item.Nama_Item || '';
  document.getElementById('editTlDeadline').value = item.Deadline || '';
  document.getElementById('editTlCatatan').value = item.Catatan || '';
  openModal('modalTimelineEdit');
}

function submitEditTimeline(e = null) {
  const btn = getFormSubmitButton(e, 'modalTimelineEdit');
  const item = (weddingData.Timeline || []).find(t => t.ID_Timeline === selectedTimelineId);
  if (!item) return;

  const kategori = document.getElementById('editTlKategori').value;
  const itemName = document.getElementById('editTlItem').value.trim();
  const deadline = document.getElementById('editTlDeadline').value;
  const catatan = document.getElementById('editTlCatatan').value.trim();

  if (!itemName || !deadline) {
    showToast('Harap lengkapi nama agenda dan deadline!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Perubahan...');

  item.Kategori = kategori;
  item.Nama_Item = itemName;
  item.Deadline = deadline;
  item.Catatan = catatan;

  saveDataLocally();
  renderTimeline();
  renderDashboard();
  pushToSpreadsheet('update_timeline', 'Timeline', item);

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalTimelineEdit');
    showToast('Agenda timeline berhasil diperbarui! 🗓️', 'success');
  }, 350);
}

function deleteTimelineItem(e = null) {
  const item = (weddingData.Timeline || []).find(t => t.ID_Timeline === selectedTimelineId);
  if (!item) return;

  if (confirm(`Apakah Anda yakin ingin menghapus agenda "${item.Nama_Item}"?`)) {
    const btn = getActionButton(e, 'modalTimelineDetail', 'button.danger');
    const orig = setButtonLoading(btn, 'Menghapus...');
    if (btn) btn.classList.add('btn-danger-loading');

    weddingData.Timeline = (weddingData.Timeline || []).filter(t => t.ID_Timeline !== selectedTimelineId);
    saveDataLocally();
    renderTimeline();
    renderDashboard();
    pushToSpreadsheet('delete_row', 'Timeline', { ID: selectedTimelineId });

    setTimeout(() => {
      resetButtonLoading(btn, orig);
      closeModal('modalTimelineDetail');
      showToast('Agenda berhasil dihapus! 🗑️', 'info');
    }, 350);
  }
}

// ----------------------------------------------------------------------------
// D. Render Rundown Hari H (Sheet Baru)
// ----------------------------------------------------------------------------
let currentRundownSearch = '';

function filterRundownSearch() {
  const searchInput = document.getElementById('rdSearchInput');
  currentRundownSearch = searchInput ? searchInput.value.toLowerCase().trim() : '';
  renderRundown();
}

function renderRundown() {
  const rundownListEl = document.getElementById('rundownList');
  if (!rundownListEl) return;
  rundownListEl.innerHTML = '';
  const rundowns = weddingData.Rundown_Hari_H || [];

  const searchInput = document.getElementById('rdSearchInput');
  currentRundownSearch = searchInput ? searchInput.value.toLowerCase().trim() : '';

  // Filter berdasarkan pencarian kegiatan, PIC, lokasi, atau catatan
  let filteredRundowns = rundowns.slice();
  if (currentRundownSearch) {
    filteredRundowns = filteredRundowns.filter(r => 
      (r.Kegiatan || '').toLowerCase().includes(currentRundownSearch) ||
      (r.PIC || '').toLowerCase().includes(currentRundownSearch) ||
      (r.Lokasi || '').toLowerCase().includes(currentRundownSearch) ||
      (r.Catatan || '').toLowerCase().includes(currentRundownSearch)
    );
  }

  if (filteredRundowns.length === 0) {
    rundownListEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px; font-size: 13px;">${currentRundownSearch ? 'Tidak ada kegiatan rundown yang cocok dengan pencarian.' : 'Belum ada susunan acara Hari H.'}</div>`;
    return;
  }

  // Sort by start time if possible
  const sortedRundowns = filteredRundowns.sort((a, b) => (a.Waktu_Mulai || '').localeCompare(b.Waktu_Mulai || ''));

  sortedRundowns.forEach(r => {
    const card = document.createElement('div');
    card.className = 'glass-card rundown-card';
    card.style.cursor = 'pointer';
    card.onclick = () => openRundownDetailModal(r.ID_Rundown);
    card.innerHTML = `
      <div class="rundown-time-badge">
        <i data-lucide="clock" style="width: 12px; height: 12px;"></i>
        <span>${r.Waktu_Mulai || '00:00'} - ${r.Waktu_Selesai || '00:00'} WIB</span>
      </div>
      <div class="rundown-activity">${r.Kegiatan}</div>
      <div class="rundown-meta-row">
        <div class="rundown-meta-item">
          <i data-lucide="user" style="width: 13px; height: 13px; color: var(--primary);"></i>
          <span><b>PIC:</b> ${r.PIC || '-'}</span>
        </div>
        <div class="rundown-meta-item">
          <i data-lucide="map-pin" style="width: 13px; height: 13px; color: var(--primary);"></i>
          <span><b>Lokasi:</b> ${r.Lokasi || '-'}</span>
        </div>
      </div>
      ${r.Catatan ? `
        <div style="font-size: 11px; color: var(--text-light); margin-top: 6px; font-style: italic; background: rgba(82, 128, 105, 0.06); padding: 6px 10px; border-radius: 8px;">
          Catatan: ${r.Catatan}
        </div>
      ` : ''}
    `;
    rundownListEl.appendChild(card);
  });
  initLucide();
}

let selectedRundownId = null;

function openRundownDetailModal(id) {
  selectedRundownId = id;
  const item = (weddingData.Rundown_Hari_H || []).find(r => r.ID_Rundown === id);
  if (!item) return;

  const timeStr = `${item.Waktu_Mulai || '00:00'} - ${item.Waktu_Selesai || '00:00'} WIB`;
  const timeEl = document.getElementById('rdDetailTime');
  if (timeEl) timeEl.innerText = timeStr;

  const titleEl = document.getElementById('rdDetailKegiatan');
  if (titleEl) titleEl.innerText = item.Kegiatan;

  const picEl = document.getElementById('rdDetailPIC');
  if (picEl) picEl.innerText = item.PIC || '-';

  const locEl = document.getElementById('rdDetailLokasi');
  if (locEl) locEl.innerText = item.Lokasi || '-';

  const notesEl = document.getElementById('rdDetailCatatan');
  if (notesEl) notesEl.innerText = item.Catatan || 'Tidak ada catatan khusus.';

  openModal('modalRundownDetail');
}

function openEditRundownModal() {
  closeModal('modalRundownDetail');
  const item = (weddingData.Rundown_Hari_H || []).find(r => r.ID_Rundown === selectedRundownId);
  if (!item) return;

  document.getElementById('editRdStart').value = item.Waktu_Mulai || '';
  document.getElementById('editRdEnd').value = item.Waktu_Selesai || '';
  document.getElementById('editRdKegiatan').value = item.Kegiatan || '';
  document.getElementById('editRdPIC').value = item.PIC || '';
  document.getElementById('editRdLokasi').value = item.Lokasi || '';
  document.getElementById('editRdCatatan').value = item.Catatan || '';

  openModal('modalRundownEdit');
}

function submitEditRundown(e = null) {
  const btn = getFormSubmitButton(e, 'modalRundownEdit');
  const item = (weddingData.Rundown_Hari_H || []).find(r => r.ID_Rundown === selectedRundownId);
  if (!item) return;

  const mulai = document.getElementById('editRdStart').value;
  const selesai = document.getElementById('editRdEnd').value;
  const kegiatan = document.getElementById('editRdKegiatan').value.trim();
  const pic = document.getElementById('editRdPIC').value.trim();
  const lokasi = document.getElementById('editRdLokasi').value.trim();
  const catatan = document.getElementById('editRdCatatan').value.trim();

  if (!kegiatan || !mulai || !selesai) {
    showToast('Harap lengkapi nama kegiatan dan waktu acara!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Perubahan...');

  item.Waktu_Mulai = mulai;
  item.Waktu_Selesai = selesai;
  item.Kegiatan = kegiatan;
  item.PIC = pic;
  item.Lokasi = lokasi;
  item.Catatan = catatan;

  saveDataLocally();
  renderRundown();
  pushToSpreadsheet('update_rundown', 'Rundown Hari H', item);

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalRundownEdit');
    showToast('Rundown acara berhasil diperbarui! ⏱️', 'success');
  }, 350);
}

function deleteRundownItem(e = null) {
  const item = (weddingData.Rundown_Hari_H || []).find(r => r.ID_Rundown === selectedRundownId);
  if (!item) return;

  if (confirm(`Apakah Anda yakin ingin menghapus susunan acara "${item.Kegiatan}"?`)) {
    const btn = getActionButton(e, 'modalRundownDetail', 'button.danger');
    const orig = setButtonLoading(btn, 'Menghapus...');
    if (btn) btn.classList.add('btn-danger-loading');

    weddingData.Rundown_Hari_H = (weddingData.Rundown_Hari_H || []).filter(r => r.ID_Rundown !== selectedRundownId);
    saveDataLocally();
    renderRundown();
    pushToSpreadsheet('delete_row', 'Rundown Hari H', { ID: selectedRundownId });

    setTimeout(() => {
      resetButtonLoading(btn, orig);
      closeModal('modalRundownDetail');
      showToast('Susunan acara berhasil dihapus! 🗑️', 'info');
    }, 350);
  }
}

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// E. Render Vendor & Product (Grouped by Category & Enhanced Modal)
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// E. Render Vendor & Product (Grouped by Category, Status Filter, Search, Master Sync)
// ----------------------------------------------------------------------------
let vendorCategoryState = {};
let selectedVendorId = null;
let currentVendorStatusFilter = 'all'; // 'all', 'deal', 'lunas', 'riset', 'nego'
let currentVendorSearch = '';

function setVendorStatusFilter(filter, btn) {
  currentVendorStatusFilter = filter;
  const icons = document.querySelectorAll('#tab-vendor .icon-filter-btn');
  icons.forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderVendor();
}

function filterVendorSearch() {
  const searchInput = document.getElementById('vdSearchInput');
  currentVendorSearch = searchInput ? searchInput.value.toLowerCase().trim() : '';
  renderVendor();
}

function toggleVendorCategory(cat) {
  if (vendorCategoryState[cat] === undefined) {
    vendorCategoryState[cat] = true;
  }
  vendorCategoryState[cat] = !vendorCategoryState[cat];
  const catKey = cat.replace(/[\s&/]/g, '_');
  const body = document.getElementById(`vendor-cat-body-${catKey}`);
  const arrow = document.getElementById(`vendor-cat-arrow-${catKey}`);
  if (body && arrow) {
    const isOpen = vendorCategoryState[cat];
    body.style.display = isOpen ? 'flex' : 'none';
    arrow.classList.toggle('rotated', isOpen);
  }
}

function populateVendorCategories(selectId, selectedVal) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;
  const vendorCats = (weddingData.Master && Array.isArray(weddingData.Master.KategoriVendor) && weddingData.Master.KategoriVendor.length > 0)
    ? weddingData.Master.KategoriVendor
    : ['Dekorasi', 'Catering', 'Venue', 'MUA & Busana', 'Dokumentasi', 'Musik & Entertainment', 'MC & WO', 'Souvenir & Undangan', 'Lain-lain'];
  
  selectEl.innerHTML = vendorCats.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  if (selectedVal) {
    selectEl.value = selectedVal;
  }
}

function getVendorStatusBadgeStyle(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('lunas')) {
    return 'background: var(--success-bg); color: var(--success);';
  } else if (s.includes('deal') || s.includes('dp')) {
    return 'background: rgba(82, 128, 105, 0.15); color: var(--primary);';
  } else if (s.includes('nego')) {
    return 'background: rgba(230, 160, 50, 0.15); color: #A6680A;';
  } else if (s.includes('batal')) {
    return 'background: var(--danger-bg); color: var(--danger);';
  } else {
    return 'background: rgba(70, 130, 180, 0.15); color: #2E6B9E;';
  }
}

function renderVendor() {
  const vendorListEl = document.getElementById('vendorList');
  if (!vendorListEl) return;
  vendorListEl.innerHTML = '';
  const vendors = weddingData.Vendor || [];

  const searchInput = document.getElementById('vdSearchInput');
  currentVendorSearch = searchInput ? searchInput.value.toLowerCase().trim() : '';

  if (vendors.length === 0) {
    vendorListEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px; font-size: 13px;">Belum ada vendor & product terdaftar.</div>`;
    return;
  }

  // Filter vendors based on Status and Search query
  let filteredVendors = vendors.slice();

  if (currentVendorStatusFilter !== 'all') {
    filteredVendors = filteredVendors.filter(v => {
      const s = (v.Status || '').toLowerCase();
      if (currentVendorStatusFilter === 'deal') return s.includes('deal') || s.includes('dp');
      if (currentVendorStatusFilter === 'lunas') return s.includes('lunas');
      if (currentVendorStatusFilter === 'riset') return s.includes('survey') || s.includes('riset');
      if (currentVendorStatusFilter === 'nego') return s.includes('nego');
      return true;
    });
  }

  if (currentVendorSearch) {
    filteredVendors = filteredVendors.filter(v => 
      (v.Nama_Vendor || '').toLowerCase().includes(currentVendorSearch) ||
      (v.Kategori_Vendor || '').toLowerCase().includes(currentVendorSearch) ||
      (v.Keterangan || '').toLowerCase().includes(currentVendorSearch)
    );
  }

  if (filteredVendors.length === 0) {
    vendorListEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px; font-size: 13px;">Tidak ada vendor atau produk dalam filter/pencarian ini.</div>`;
    return;
  }

  // Group by category
  const grouped = {};
  filteredVendors.forEach(v => {
    const cat = v.Kategori_Vendor || 'Lain-lain';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(v);
  });

  const isFiltering = !!currentVendorSearch || currentVendorStatusFilter !== 'all';

  Object.keys(grouped).forEach(cat => {
    const items = grouped[cat];
    const catKey = cat.replace(/[\s&/]/g, '_');
    
    // Default terbuka (true) agar seluruh vendor langsung nampak
    if (vendorCategoryState[cat] === undefined) {
      vendorCategoryState[cat] = true;
    }
    const isOpen = isFiltering ? true : (vendorCategoryState[cat] !== false);

    const groupDiv = document.createElement('div');
    groupDiv.className = 'vendor-cat-group';
    groupDiv.innerHTML = `
      <div class="vendor-cat-header" onclick="toggleVendorCategory('${cat}')">
        <div class="vendor-cat-title-wrap">
          <span class="vendor-cat-name">${cat}</span>
          <span class="vendor-cat-count">${items.length} Item</span>
        </div>
        <div class="accordion-arrow ${isOpen ? 'rotated' : ''}" id="vendor-cat-arrow-${catKey}">
          <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
        </div>
      </div>
      <div class="vendor-cat-items-list" id="vendor-cat-body-${catKey}" style="display: ${isOpen ? 'flex' : 'none'};">
        ${items.map(v => {
          let cleanPhone = (v.Nomor || '').replace(/[^0-9]/g, '');
          if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);

          const totalBiaya = Number(v.Total_Biaya) || 0;
          const nominalDP = Number(v.Nominal_DP) || 0;
          const badgeStyle = getVendorStatusBadgeStyle(v.Status);

          return `
            <div class="glass-card vendor-card" onclick="openVendorDetailModal('${v.ID_Vendor}')">
              <div class="vendor-header">
                <div>
                  <div class="vendor-name">${v.Nama_Vendor}</div>
                  <div style="font-size: 12.5px; font-weight: 700; color: var(--primary); margin-top: 2px;">
                    Total Biaya: ${formatRupiah(totalBiaya)}
                  </div>
                </div>
                <span class="tx-status-badge" style="${badgeStyle}">${v.Status || 'Deal (DP)'}</span>
              </div>

              ${nominalDP > 0 ? `
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">
                  Min. DP: <span style="font-weight: 700; color: var(--success);">${formatRupiah(nominalDP)}</span>
                </div>
              ` : ''}

              <div class="vendor-desc">${v.Keterangan || 'Tidak ada keterangan tambahan.'}</div>

              <div class="vendor-actions">
                ${cleanPhone ? `
                  <a href="https://wa.me/${cleanPhone}" target="_blank" class="btn-pill-action wa" onclick="event.stopPropagation();">
                    <i data-lucide="message-circle" style="width: 14px; height: 14px;"></i> WhatsApp
                  </a>
                ` : ''}
                ${v.Link ? `
                  <a href="${v.Link}" target="_blank" class="btn-pill-action" onclick="event.stopPropagation();">
                    <i data-lucide="external-link" style="width: 14px; height: 14px;"></i> Link
                  </a>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    vendorListEl.appendChild(groupDiv);
  });
  initLucide();
}

function openVendorDetailModal(id) {
  selectedVendorId = id;
  const item = (weddingData.Vendor || []).find(v => v.ID_Vendor === id);
  if (!item) return;

  const totalBiaya = Number(item.Total_Biaya) || 0;
  const nominalDP = Number(item.Nominal_DP) || 0;

  document.getElementById('vdDetailName').innerText = item.Nama_Vendor;
  document.getElementById('vdDetailCategory').innerText = item.Kategori_Vendor || 'Vendor & Product';
  
  const statusEl = document.getElementById('vdDetailStatus');
  statusEl.innerText = item.Status || 'Deal (DP)';
  statusEl.style = getVendorStatusBadgeStyle(item.Status);

  const statusSelect = document.getElementById('vdDetailStatusSelect');
  if (statusSelect) {
    statusSelect.value = item.Status || 'Deal (DP)';
  }

  document.getElementById('vdDetailTotal').innerText = formatRupiah(totalBiaya);
  document.getElementById('vdDetailDP').innerText = formatRupiah(nominalDP);
  document.getElementById('vdDetailKeterangan').innerText = item.Keterangan || 'Tidak ada keterangan khusus.';

  // Links
  const waBtn = document.getElementById('vdDetailWA');
  let cleanPhone = (item.Nomor || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
  if (cleanPhone) {
    waBtn.href = `https://wa.me/${cleanPhone}`;
    waBtn.style.display = 'inline-flex';
  } else {
    waBtn.style.display = 'none';
  }

  const portBtn = document.getElementById('vdDetailLink');
  if (item.Link) {
    portBtn.href = item.Link;
    portBtn.style.display = 'inline-flex';
  } else {
    portBtn.style.display = 'none';
  }

  openModal('modalVendorDetail');
}

function quickChangeVendorStatus(newStatus) {
  const item = (weddingData.Vendor || []).find(v => v.ID_Vendor === selectedVendorId);
  if (!item) return;

  item.Status = newStatus;
  saveDataLocally();
  renderVendor();
  
  const statusEl = document.getElementById('vdDetailStatus');
  if (statusEl) {
    statusEl.innerText = newStatus;
    statusEl.style = getVendorStatusBadgeStyle(newStatus);
  }

  showToast(`Status vendor diubah menjadi: ${newStatus} 🌿`, 'info');
  pushToSpreadsheet('update_vendor', 'Vendor', item);
}

function openEditVendorModal() {
  closeModal('modalVendorDetail');
  const item = (weddingData.Vendor || []).find(v => v.ID_Vendor === selectedVendorId);
  if (!item) return;

  populateVendorCategories('editVdKategori', item.Kategori_Vendor);
  document.getElementById('editVdNama').value = item.Nama_Vendor || '';
  document.getElementById('editVdTotalBiaya').value = item.Total_Biaya || 0;
  document.getElementById('editVdNominalDP').value = item.Nominal_DP || 0;
  document.getElementById('editVdNomor').value = item.Nomor || '';
  document.getElementById('editVdLink').value = item.Link || '';
  document.getElementById('editVdStatus').value = item.Status || 'Deal (DP)';
  document.getElementById('editVdKeterangan').value = item.Keterangan || '';

  openModal('modalVendorEdit');
}

function submitEditVendor(e = null) {
  const btn = getFormSubmitButton(e, 'modalVendorEdit');
  const item = (weddingData.Vendor || []).find(v => v.ID_Vendor === selectedVendorId);
  if (!item) return;

  const nama = document.getElementById('editVdNama').value.trim();
  const kategori = document.getElementById('editVdKategori').value;
  const total = Number(document.getElementById('editVdTotalBiaya').value) || 0;
  const dp = Number(document.getElementById('editVdNominalDP').value) || 0;
  const nomor = document.getElementById('editVdNomor').value.trim();
  const link = document.getElementById('editVdLink').value.trim();
  const status = document.getElementById('editVdStatus').value;
  const keterangan = document.getElementById('editVdKeterangan').value.trim();

  if (!nama) {
    showToast('Nama vendor tidak boleh kosong!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Perubahan...');

  item.Nama_Vendor = nama;
  item.Kategori_Vendor = kategori;
  item.Total_Biaya = total;
  item.Nominal_DP = dp;
  item.Nomor = nomor;
  item.Link = link;
  item.Status = status;
  item.Keterangan = keterangan;

  saveDataLocally();
  renderVendor();
  pushToSpreadsheet('update_vendor', 'Vendor', item);

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalVendorEdit');
    showToast('Data vendor & produk berhasil diperbarui! ✨', 'success');
  }, 350);
}

function deleteVendorItem(e = null) {
  const item = (weddingData.Vendor || []).find(v => v.ID_Vendor === selectedVendorId);
  if (!item) return;

  if (confirm(`Apakah Anda yakin ingin menghapus vendor "${item.Nama_Vendor}"?`)) {
    const btn = getActionButton(e, 'modalVendorDetail', 'button.danger');
    const orig = setButtonLoading(btn, 'Menghapus...');
    if (btn) btn.classList.add('btn-danger-loading');

    weddingData.Vendor = (weddingData.Vendor || []).filter(v => v.ID_Vendor !== selectedVendorId);
    saveDataLocally();
    renderVendor();
    pushToSpreadsheet('delete_row', 'Vendor', { ID: selectedVendorId });

    setTimeout(() => {
      resetButtonLoading(btn, orig);
      closeModal('modalVendorDetail');
      showToast('Vendor berhasil dihapus! 🗑️', 'info');
    }, 350);
  }
}

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// F. Render Tamu Undangan (Enhanced: 1-Baris, Filter Kategori, Detail, Edit, Pax Names)
// ----------------------------------------------------------------------------
let currentTamuCategoryFilter = 'all';
let currentTamuSearch = '';
let selectedTamuId = null;

function populateTamuCategories(selectId, selectedVal) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;
  const cats = (weddingData.Master && Array.isArray(weddingData.Master.KategoriTamu) && weddingData.Master.KategoriTamu.length > 0)
    ? weddingData.Master.KategoriTamu
    : ['Keluarga', 'Sahabat', 'Rekan Kerja', 'VIP', 'Tetangga', 'Lain-lain'];

  selectEl.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
  if (selectedVal) selectEl.value = selectedVal;
}

function toggleTamuCategoryDropdown(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('tamuCatDropdown');
  if (!dropdown) return;
  
  const isShown = dropdown.style.display === 'flex';
  if (isShown) {
    dropdown.style.display = 'none';
    return;
  }

  // Populate categories
  const guests = weddingData.Tamu_Undangan || [];
  const masterCats = (weddingData.Master && Array.isArray(weddingData.Master.KategoriTamu)) ? weddingData.Master.KategoriTamu : [];
  const uniqueCats = Array.from(new Set(['all', ...masterCats, ...guests.map(g => g.Kategori_Tamu || 'Umum')])).filter(Boolean);

  dropdown.innerHTML = uniqueCats.map(cat => {
    const label = cat === 'all' ? '✨ Semua Kategori' : cat;
    const isActive = currentTamuCategoryFilter === cat;
    return `
      <div class="tamu-cat-item ${isActive ? 'active' : ''}" onclick="selectTamuCategory('${cat}')">
        <span>${label}</span>
        ${isActive ? '<i data-lucide="check" style="width: 14px; height: 14px;"></i>' : ''}
      </div>
    `;
  }).join('');

  dropdown.style.display = 'flex';
  initLucide();
}

function selectTamuCategory(cat) {
  currentTamuCategoryFilter = cat;
  const dropdown = document.getElementById('tamuCatDropdown');
  if (dropdown) dropdown.style.display = 'none';

  const btn = document.getElementById('btnFilterTamuCat');
  if (btn) {
    btn.classList.toggle('active', cat !== 'all');
  }

  renderTamu();
}

// Close category dropdown if clicked outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('tamuCatDropdown');
  const btn = document.getElementById('btnFilterTamuCat');
  if (dropdown && dropdown.style.display === 'flex') {
    if (!dropdown.contains(e.target) && (!btn || !btn.contains(e.target))) {
      dropdown.style.display = 'none';
    }
  }
});

function renderTamuPaxNamesInput(paxCount, containerId, existingNames = '') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const count = parseInt(paxCount) || 1;

  if (count <= 1) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  let namesArray = [];
  if (Array.isArray(existingNames)) {
    namesArray = existingNames;
  } else if (typeof existingNames === 'string' && existingNames.trim()) {
    namesArray = existingNames.split(',').map(s => s.trim());
  }

  let html = `<div style="font-size: 11px; font-weight: 700; color: var(--text-dark); margin-bottom: 6px;">Daftar Nama Pendamping (Pax 2 - ${count}):</div>`;
  for (let i = 2; i <= count; i++) {
    const val = namesArray[i - 2] || '';
    html += `
      <div style="margin-bottom: 6px;">
        <input type="text" class="input-glass" style="font-size: 12px; padding: 6px 10px;" placeholder="Nama Tamu Pax ${i}" value="${val}" data-pax-index="${i}">
      </div>
    `;
  }
  container.innerHTML = html;
  container.style.display = 'block';
}

function getTamuStatusBadgeStyle(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('hadir') && !s.includes('tidak')) {
    return 'background: var(--success-bg); color: var(--success);';
  } else if (s.includes('tidak')) {
    return 'background: var(--danger-bg); color: var(--danger);';
  } else if (s.includes('terkirim') || s.includes('tunggu')) {
    return 'background: rgba(230, 160, 50, 0.15); color: #A6680A;';
  } else {
    return 'background: rgba(82, 128, 105, 0.1); color: var(--text-muted);';
  }
}

function renderTamu() {
  const guestListEl = document.getElementById('guestList');
  if (!guestListEl) return;
  guestListEl.innerHTML = '';
  const guests = weddingData.Tamu_Undangan || [];

  const input = document.getElementById('searchTamuInput');
  currentTamuSearch = input ? input.value.toLowerCase().trim() : '';

  let total = guests.length;
  let totalPax = 0;
  let hadir = 0, pending = 0, batal = 0;

  guests.forEach(g => {
    const pax = Number(g.Jumlah_Pax) || 1;
    totalPax += pax;

    const st = (g.Status || '').toLowerCase();
    if (st.includes('hadir') && !st.includes('tidak')) hadir++;
    else if (st.includes('tidak')) batal++;
    else pending++;
  });

  const elTotal = document.getElementById('tamuStatTotal');
  const elTotalPax = document.getElementById('tamuStatTotalPax');
  const elHadir = document.getElementById('tamuStatHadir');
  const elPending = document.getElementById('tamuStatPending');

  if (elTotal) elTotal.innerText = total;
  if (elTotalPax) elTotalPax.innerText = totalPax;
  if (elHadir) elHadir.innerText = hadir;
  if (elPending) elPending.innerText = pending;

  // Filter guests
  let filteredGuests = guests.slice();

  if (currentTamuCategoryFilter !== 'all') {
    filteredGuests = filteredGuests.filter(g => (g.Kategori_Tamu || 'Umum') === currentTamuCategoryFilter);
  }

  if (currentTamuSearch) {
    filteredGuests = filteredGuests.filter(g => {
      const q = currentTamuSearch;
      const n = (g.Nama_Tamu || '').toLowerCase();
      const k = (g.Kategori_Tamu || '').toLowerCase();
      const dn = (g.Daftar_Nama || '').toLowerCase();
      return n.includes(q) || k.includes(q) || dn.includes(q);
    });
  }

  if (filteredGuests.length === 0) {
    guestListEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px; font-size: 13px;">Tidak ada tamu undangan dalam filter ini.</div>`;
    return;
  }

  filteredGuests.forEach(g => {
    let cleanPhone = (g.Nomor_WhatsApp || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);

    const weddingDateText = document.getElementById('weddingDateDisplay') ? document.getElementById('weddingDateDisplay').innerText : '24 Desember 2026';
    const waText = encodeURIComponent(
      `Assalamualaikum Wr. Wb / Salam Sejahtera,\n\n` +
      `Kepada Yth. *${g.Nama_Tamu}*,\n\n` +
      `Dengan penuh rasa syukur dan kebahagiaan, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu pada hari pernikahan kami:\n\n` +
      `🌿 *Pernikahan Hanjitur*\n` +
      `🗓 Tanggal: *${weddingDateText}*\n` +
      `⏰ Waktu: 08.00 WIB s.d Selesai\n` +
      `📍 Tempat: Graha Sakinah Ballroom\n\n` +
      `Kehadiran dan doa restu Anda merupakan kehormatan serta kebahagiaan terbesar bagi kami sekeluarga.\n\n` +
      `Terima kasih dan salam hangat,\n*Hanjitur & Pasangan*`
    );

    const waLink = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${waText}`;
    const statusStyle = getTamuStatusBadgeStyle(g.Status);
    const pax = Number(g.Jumlah_Pax) || 1;

    // Simple 1-row item without showing phone number, and WA button as icon only
    const row = document.createElement('div');
    row.className = 'glass-card guest-row-simple';
    row.onclick = () => openTamuDetailModal(g.ID_Tamu);

    row.innerHTML = `
      <div class="guest-row-left">
        <div class="guest-name">${g.Nama_Tamu}</div>
        <div class="guest-row-badges">
          <span class="guest-cat-badge">${g.Kategori_Tamu || 'Umum'}</span>
          <span class="guest-pax-badge">${pax} Pax</span>
          <span class="tx-status-badge" style="${statusStyle}">${g.Status || 'Belum Diundang'}</span>
        </div>
      </div>
      <div class="guest-row-right">
        <a href="${waLink}" target="_blank" class="btn-wa-icon" title="Kirim Undangan WhatsApp" onclick="event.stopPropagation();">
          <i data-lucide="message-circle" style="width: 18px; height: 18px;"></i>
        </a>
      </div>
    `;
    guestListEl.appendChild(row);
  });
  initLucide();
}

function filterGuests() {
  const input = document.getElementById('searchTamuInput');
  currentTamuSearch = input ? input.value.toLowerCase().trim() : '';
  renderTamu();
}

function openTamuDetailModal(id) {
  selectedTamuId = id;
  const g = (weddingData.Tamu_Undangan || []).find(t => t.ID_Tamu === id);
  if (!g) return;

  const pax = Number(g.Jumlah_Pax) || 1;
  document.getElementById('tmDetailName').innerText = g.Nama_Tamu;
  document.getElementById('tmDetailCategory').innerText = g.Kategori_Tamu || 'Umum';
  document.getElementById('tmDetailPax').innerText = `${pax} Pax`;

  const statusBadge = document.getElementById('tmDetailStatusBadge');
  statusBadge.innerText = g.Status || 'Belum Diundang';
  statusBadge.style = getTamuStatusBadgeStyle(g.Status);

  const statusSelect = document.getElementById('tmDetailStatusSelect');
  if (statusSelect) {
    statusSelect.value = g.Status || 'Belum Diundang';
  }

  // WA info
  const waDisplay = document.getElementById('tmDetailWA');
  const waBtn = document.getElementById('tmDetailWABtn');
  let cleanPhone = (g.Nomor_WhatsApp || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);

  if (g.Nomor_WhatsApp) {
    waDisplay.innerText = g.Nomor_WhatsApp;
    const weddingDateText = document.getElementById('weddingDateDisplay') ? document.getElementById('weddingDateDisplay').innerText : '24 Desember 2026';
    const waText = encodeURIComponent(
      `Assalamualaikum Wr. Wb / Salam Sejahtera,\n\nKepada Yth. *${g.Nama_Tamu}*,\n\nDengan penuh rasa syukur dan kebahagiaan, kami mengundang Bapak/Ibu/Saudara/i untuk hadir pada hari pernikahan kami:\n\n🌿 *Pernikahan Hanjitur*\n🗓 Tanggal: *${weddingDateText}*\n⏰ Waktu: 08.00 WIB s.d Selesai\n📍 Tempat: Graha Sakinah Ballroom\n\nTerima kasih dan salam hangat,\n*Hanjitur & Pasangan*`
    );
    waBtn.href = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${waText}`;
    waBtn.style.display = 'inline-flex';
  } else {
    waDisplay.innerText = '-';
    waBtn.style.display = 'none';
  }

  // Daftar Nama-nama jika lebih dari 1 pax
  const namesBox = document.getElementById('tmDetailNamesBox');
  const namesList = document.getElementById('tmDetailNamesList');

  if (pax > 1) {
    let names = [];
    if (g.Daftar_Nama) {
      if (Array.isArray(g.Daftar_Nama)) names = g.Daftar_Nama;
      else names = g.Daftar_Nama.split(',').map(s => s.trim());
    }

    let namesHtml = `<div>1. <b>${g.Nama_Tamu}</b> (Tamu Utama)</div>`;
    for (let i = 2; i <= pax; i++) {
      const companionName = names[i - 2] || `Pendamping ${i}`;
      namesHtml += `<div>${i}. <b>${companionName}</b></div>`;
    }
    namesList.innerHTML = namesHtml;
    namesBox.style.display = 'block';
  } else {
    namesList.innerHTML = `<div>1. <b>${g.Nama_Tamu}</b></div>`;
    namesBox.style.display = 'block';
  }

  openModal('modalTamuDetail');
}

function quickChangeTamuStatus(newStatus) {
  const g = (weddingData.Tamu_Undangan || []).find(t => t.ID_Tamu === selectedTamuId);
  if (!g) return;

  g.Status = newStatus;
  saveDataLocally();
  renderTamu();

  const statusBadge = document.getElementById('tmDetailStatusBadge');
  if (statusBadge) {
    statusBadge.innerText = newStatus;
    statusBadge.style = getTamuStatusBadgeStyle(newStatus);
  }

  showToast(`Status RSVP ${g.Nama_Tamu} diubah menjadi: ${newStatus} 💌`, 'info');
  pushToSpreadsheet('update_tamu', 'Tamu Undangan', g);
}

function openEditTamuModal() {
  closeModal('modalTamuDetail');
  const g = (weddingData.Tamu_Undangan || []).find(t => t.ID_Tamu === selectedTamuId);
  if (!g) return;

  populateTamuCategories('editTmKategori', g.Kategori_Tamu);
  document.getElementById('editTmNama').value = g.Nama_Tamu || '';
  document.getElementById('editTmPax').value = g.Jumlah_Pax || 1;
  document.getElementById('editTmNomorWA').value = g.Nomor_WhatsApp || '';
  document.getElementById('editTmStatus').value = g.Status || 'Belum Diundang';

  renderTamuPaxNamesInput(g.Jumlah_Pax || 1, 'editTmPaxNamesContainer', g.Daftar_Nama || '');

  openModal('modalTamuEdit');
}

function submitEditTamu(e = null) {
  const btn = getFormSubmitButton(e, 'modalTamuEdit');
  const g = (weddingData.Tamu_Undangan || []).find(t => t.ID_Tamu === selectedTamuId);
  if (!g) return;

  const nama = document.getElementById('editTmNama').value.trim();
  const kategori = document.getElementById('editTmKategori').value;
  const pax = Number(document.getElementById('editTmPax').value) || 1;
  const nomor = document.getElementById('editTmNomorWA').value.trim();
  const status = document.getElementById('editTmStatus').value;

  if (!nama || !nomor) {
    showToast('Nama dan nomor WhatsApp tidak boleh kosong!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Perubahan...');

  // Collect pax names if pax > 1
  let paxNames = [];
  if (pax > 1) {
    const inputs = document.querySelectorAll('#editTmPaxNamesContainer input');
    inputs.forEach(inp => {
      if (inp.value.trim()) paxNames.push(inp.value.trim());
    });
  }

  g.Nama_Tamu = nama;
  g.Kategori_Tamu = kategori;
  g.Jumlah_Pax = pax;
  g.Nomor_WhatsApp = nomor;
  g.Status = status;
  g.Daftar_Nama = paxNames.length > 0 ? paxNames.join(', ') : '';

  saveDataLocally();
  renderTamu();
  pushToSpreadsheet('update_tamu', 'Tamu Undangan', g);

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalTamuEdit');
    showToast('Data tamu undangan berhasil diperbarui! ✨', 'success');
  }, 350);
}

function deleteTamuItem(e = null) {
  const g = (weddingData.Tamu_Undangan || []).find(t => t.ID_Tamu === selectedTamuId);
  if (!g) return;

  if (confirm(`Apakah Anda yakin ingin menghapus data tamu "${g.Nama_Tamu}"?`)) {
    const btn = getActionButton(e, 'modalTamuDetail', 'button.danger');
    const orig = setButtonLoading(btn, 'Menghapus...');
    if (btn) btn.classList.add('btn-danger-loading');

    weddingData.Tamu_Undangan = (weddingData.Tamu_Undangan || []).filter(t => t.ID_Tamu !== selectedTamuId);
    saveDataLocally();
    renderTamu();
    pushToSpreadsheet('delete_row', 'Tamu Undangan', { ID: selectedTamuId });

    setTimeout(() => {
      resetButtonLoading(btn, orig);
      closeModal('modalTamuDetail');
      showToast('Tamu berhasil dihapus! 🗑️', 'info');
    }, 350);
  }
}

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// G. Render Knowledge & Files (Categorized Accordion, Search & Interactive Details)
// ----------------------------------------------------------------------------
let knowledgeCategoryState = {};
let selectedKnowledgeId = null;
let currentKnowledgeSearch = '';

let selectedFileId = null;
let currentFilesSearch = '';

function toggleKnowledgeCategory(cat) {
  if (knowledgeCategoryState[cat] === undefined) {
    knowledgeCategoryState[cat] = true;
  }
  knowledgeCategoryState[cat] = !knowledgeCategoryState[cat];
  const catKey = cat.replace(/[\s&/]/g, '_');
  const body = document.getElementById(`kn-cat-body-${catKey}`);
  const arrow = document.getElementById(`kn-cat-arrow-${catKey}`);
  if (body && arrow) {
    const isOpen = knowledgeCategoryState[cat];
    body.style.display = isOpen ? 'flex' : 'none';
    arrow.classList.toggle('rotated', isOpen);
  }
}

function filterKnowledge() {
  const input = document.getElementById('searchKnowledgeInput');
  currentKnowledgeSearch = input ? input.value.toLowerCase().trim() : '';
  renderKnowledgeAndFiles();
}

function filterFiles() {
  const input = document.getElementById('searchFilesInput');
  currentFilesSearch = input ? input.value.toLowerCase().trim() : '';
  renderKnowledgeAndFiles();
}

function renderKnowledgeAndFiles() {
  const searchKnInput = document.getElementById('searchKnowledgeInput');
  currentKnowledgeSearch = searchKnInput ? searchKnInput.value.toLowerCase().trim() : '';

  const searchFilesInput = document.getElementById('searchFilesInput');
  currentFilesSearch = searchFilesInput ? searchFilesInput.value.toLowerCase().trim() : '';

  const knowledgeListEl = document.getElementById('knowledgeList');
  if (knowledgeListEl) {
    knowledgeListEl.innerHTML = '';
    let knowledges = (weddingData.Knowledge || []).slice();

    if (currentKnowledgeSearch) {
      knowledges = knowledges.filter(k => {
        const q = currentKnowledgeSearch;
        const j = (k.Judul || '').toLowerCase();
        const cat = (k.Jenis || '').toLowerCase();
        const c = (k.Catatan || '').toLowerCase();
        return j.includes(q) || cat.includes(q) || c.includes(q);
      });
    }

    if (knowledges.length === 0) {
      knowledgeListEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px; font-size: 13px;">${currentKnowledgeSearch ? 'Tidak ada target yang cocok dengan pencarian.' : 'Belum ada target knowledge terdaftar.'}</div>`;
    } else {
      // Group by category/jenis
      const grouped = {};
      knowledges.forEach(k => {
        const cat = k.Jenis || 'Lain-lain';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(k);
      });

      Object.keys(grouped).forEach(cat => {
        const items = grouped[cat];
        const catKey = cat.replace(/[\s&/]/g, '_');

        // Default terbuka (true) agar target progres langsung nampak seketika
        if (knowledgeCategoryState[cat] === undefined) {
          knowledgeCategoryState[cat] = true;
        }
        const isOpen = currentKnowledgeSearch ? true : (knowledgeCategoryState[cat] !== false);

        const groupDiv = document.createElement('div');
        groupDiv.className = 'knowledge-cat-group';
        groupDiv.innerHTML = `
          <div class="knowledge-cat-header" onclick="toggleKnowledgeCategory('${cat}')">
            <div class="vendor-cat-title-wrap">
              <span class="vendor-cat-name">${cat}</span>
              <span class="vendor-cat-count">${items.length} Target</span>
            </div>
            <div class="accordion-arrow ${isOpen ? 'rotated' : ''}" id="kn-cat-arrow-${catKey}">
              <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
          <div class="knowledge-cat-items-list" id="kn-cat-body-${catKey}" style="display: ${isOpen ? 'flex' : 'none'}; flex-direction: column; gap: 8px; margin-top: 8px;">
            ${items.map(k => {
              const targetVal = Number(k.Target) || 100;
              const currentVal = Number(k.Progres_Saat_Ini) || 0;
              const pct = Math.min(100, Math.round((currentVal / targetVal) * 100)) || k.Persentase || 0;

              let statusColor = 'var(--text-muted)';
              if ((k.Status || '').toLowerCase().includes('selesai')) statusColor = 'var(--success)';
              else if ((k.Status || '').toLowerCase().includes('progress')) statusColor = 'var(--primary)';

              const isianList = (weddingData.Isian_Knowledge || []).filter(item => item.ID_Knowledge === k.ID_Knowledge);
              const countIsian = isianList.length;

              return `
                <div class="glass-card knowledge-card" onclick="openKnowledgeDetailModal('${k.ID_Knowledge}')">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <h4 style="font-size: 13.5px; font-weight: 700; color: var(--text-dark); line-height: 1.35;">${k.Judul}</h4>
                    <span class="tx-status-badge" style="color: ${statusColor};">${k.Status || 'On Progress'}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px;">
                    <span>Capaian: <b>${k.Progres_Saat_Ini}</b> dari ${k.Target} ${k.Satuan_Target}</span>
                    <span style="font-weight: 700; color: var(--primary);">${pct}%</span>
                  </div>
                  <div class="progress-bar-bg" style="margin-bottom: 6px;">
                    <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                  </div>
                  ${k.Catatan ? `<p style="font-size: 11px; color: var(--text-light); font-style: italic; margin-top: 2px; margin-bottom: 6px;">${k.Catatan}</p>` : ''}
                  <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(82, 128, 105, 0.15); display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 10.5px; color: var(--text-muted);">
                      ${countIsian > 0 ? `${countIsian} Catatan Rincian` : 'Belum ada isian'}
                    </span>
                    <button type="button" class="btn-pill-action" style="font-size: 11px; padding: 3px 9px; display: inline-flex; align-items: center; gap: 4px;" onclick="event.stopPropagation(); openIsianKnowledgeView('${k.ID_Knowledge}')" title="Buka Halaman Isian Knowledge">
                      <i data-lucide="book-open" style="width: 12px; height: 12px;"></i> Buka Isian
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
        knowledgeListEl.appendChild(groupDiv);
      });
    }
  }

  // Files List
  const filesListEl = document.getElementById('filesList');
  if (filesListEl) {
    filesListEl.innerHTML = '';
    let files = (weddingData.Files || []).slice();

    if (currentFilesSearch) {
      files = files.filter(f => {
        const q = currentFilesSearch;
        const n = (f.Nama_File || '').toLowerCase();
        const j = (f.Jenis_File || '').toLowerCase();
        const k = (f.Keterangan || '').toLowerCase();
        return n.includes(q) || j.includes(q) || k.includes(q);
      });
    }

    if (files.length === 0) {
      filesListEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px; font-size: 13px;">${currentFilesSearch ? 'Tidak ada berkas yang cocok dengan pencarian.' : 'Belum ada dokumen atau berkas tersimpan.'}</div>`;
    } else {
      files.forEach(f => {
        const card = document.createElement('div');
        card.className = 'glass-card file-row';
        card.style.cursor = 'pointer';
        card.onclick = () => openFileDetailModal(f.ID_File);

        card.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
            <div class="stat-icon green" style="margin: 0; flex-shrink: 0;">
              <i data-lucide="file-text" style="width: 16px; height: 16px;"></i>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.Nama_File}</div>
              <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.Jenis_File} &bull; ${f.Keterangan || 'Tidak ada keterangan'}</div>
            </div>
          </div>
          <a href="${f.Link}" target="_blank" class="btn-pill-action" style="flex: 0; white-space: nowrap; margin-left: 8px;" onclick="event.stopPropagation();">
            <i data-lucide="external-link" style="width: 12px; height: 12px;"></i> Buka
          </a>
        `;
        filesListEl.appendChild(card);
      });
    }
  }
  initLucide();
}

function openKnowledgeDetailModal(id) {
  selectedKnowledgeId = id;
  const k = (weddingData.Knowledge || []).find(item => item.ID_Knowledge === id);
  if (!k) return;

  const targetVal = Number(k.Target) || 100;
  const currentVal = Number(k.Progres_Saat_Ini) || 0;
  const pct = Math.min(100, Math.round((currentVal / targetVal) * 100)) || k.Persentase || 0;

  document.getElementById('knDetailJudul').innerText = k.Judul;
  document.getElementById('knDetailCategory').innerText = k.Jenis || 'Umum';
  
  const statusEl = document.getElementById('knDetailStatus');
  statusEl.innerText = k.Status || 'On Progress';
  if ((k.Status || '').toLowerCase().includes('selesai')) {
    statusEl.style = 'background: var(--success-bg); color: var(--success);';
  } else if ((k.Status || '').toLowerCase().includes('progress')) {
    statusEl.style = 'background: rgba(82, 128, 105, 0.15); color: var(--primary);';
  } else {
    statusEl.style = 'background: rgba(82, 128, 105, 0.1); color: var(--text-muted);';
  }

  document.getElementById('knDetailProgressVal').innerText = currentVal;
  document.getElementById('knDetailTargetVal').innerText = targetVal;
  document.getElementById('knDetailSatuanVal').innerText = k.Satuan_Target || '';
  document.getElementById('knDetailPctVal').innerText = `${pct}%`;
  document.getElementById('knDetailProgressBar').style.width = `${pct}%`;

  document.getElementById('knQuickProgressInput').value = currentVal;
  document.getElementById('knQuickProgressInput').max = targetVal;

  document.getElementById('knDetailMulai').innerText = k.Tanggal_Mulai || '-';
  document.getElementById('knDetailUpdate').innerText = k.Update_Terakhir || '-';
  document.getElementById('knDetailCatatan').innerText = k.Catatan || 'Tidak ada catatan tambahan.';

  openModal('modalKnowledgeDetail');
}

function quickUpdateKnowledgeProgress() {
  const k = (weddingData.Knowledge || []).find(item => item.ID_Knowledge === selectedKnowledgeId);
  if (!k) return;

  const newVal = Number(document.getElementById('knQuickProgressInput').value) || 0;
  k.Progres_Saat_Ini = newVal;
  const targetVal = Number(k.Target) || 100;
  const pct = Math.min(100, Math.round((newVal / targetVal) * 100));
  k.Persentase = pct;

  if (pct >= 100) {
    k.Status = 'Selesai';
  } else if (newVal > 0) {
    k.Status = 'On Progress';
  }

  const now = new Date();
  k.Update_Terakhir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  saveDataLocally();
  renderKnowledgeAndFiles();
  openKnowledgeDetailModal(selectedKnowledgeId);
  showToast('Capaian progres berhasil diperbarui! ✨', 'success');
  pushToSpreadsheet('update_knowledge', 'Knowledge', k);
}

function openEditKnowledgeModal() {
  closeModal('modalKnowledgeDetail');
  const k = (weddingData.Knowledge || []).find(item => item.ID_Knowledge === selectedKnowledgeId);
  if (!k) return;

  document.getElementById('editKnKategori').value = k.Jenis || '';
  document.getElementById('editKnJudul').value = k.Judul || '';
  document.getElementById('editKnTarget').value = k.Target || 100;
  document.getElementById('editKnSatuan').value = k.Satuan_Target || '%';
  document.getElementById('editKnProgres').value = k.Progres_Saat_Ini || 0;
  document.getElementById('editKnStatus').value = k.Status || 'On Progress';
  document.getElementById('editKnTanggalMulai').value = k.Tanggal_Mulai || '';
  document.getElementById('editKnCatatan').value = k.Catatan || '';

  openModal('modalKnowledgeEdit');
}

function submitEditKnowledge(e = null) {
  const btn = getFormSubmitButton(e, 'modalKnowledgeEdit');
  const k = (weddingData.Knowledge || []).find(item => item.ID_Knowledge === selectedKnowledgeId);
  if (!k) return;

  const jenis = document.getElementById('editKnKategori').value.trim();
  const judul = document.getElementById('editKnJudul').value.trim();
  const target = Number(document.getElementById('editKnTarget').value) || 100;
  const satuan = document.getElementById('editKnSatuan').value.trim();
  const progres = Number(document.getElementById('editKnProgres').value) || 0;
  const status = document.getElementById('editKnStatus').value;
  const mulai = document.getElementById('editKnTanggalMulai').value;
  const catatan = document.getElementById('editKnCatatan').value.trim();

  if (!judul || !jenis) {
    showToast('Harap lengkapi kategori dan nama target!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Perubahan...');

  const pct = Math.min(100, Math.round((progres / target) * 100));
  const now = new Date();
  const updateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  k.Jenis = jenis;
  k.Judul = judul;
  k.Target = target;
  k.Satuan_Target = satuan;
  k.Progres_Saat_Ini = progres;
  k.Persentase = pct;
  k.Status = status;
  k.Tanggal_Mulai = mulai;
  k.Catatan = catatan;
  k.Update_Terakhir = updateStr;

  saveDataLocally();
  renderKnowledgeAndFiles();
  pushToSpreadsheet('update_knowledge', 'Knowledge', k);

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalKnowledgeEdit');
    showToast('Target knowledge berhasil diperbarui! ✨', 'success');
  }, 350);
}

function deleteKnowledgeItem(e = null) {
  const k = (weddingData.Knowledge || []).find(item => item.ID_Knowledge === selectedKnowledgeId);
  if (!k) return;

  if (confirm(`Apakah Anda yakin ingin menghapus target "${k.Judul}"?`)) {
    const btn = getActionButton(e, 'modalKnowledgeDetail', 'button.danger');
    const orig = setButtonLoading(btn, 'Menghapus...');
    if (btn) btn.classList.add('btn-danger-loading');

    weddingData.Knowledge = (weddingData.Knowledge || []).filter(item => item.ID_Knowledge !== selectedKnowledgeId);
    saveDataLocally();
    renderKnowledgeAndFiles();
    pushToSpreadsheet('delete_row', 'Knowledge', { ID: selectedKnowledgeId });

    setTimeout(() => {
      resetButtonLoading(btn, orig);
      closeModal('modalKnowledgeDetail');
      showToast('Target knowledge berhasil dihapus! 🗑️', 'info');
    }, 350);
  }
}

function submitKnowledge(e = null) {
  const btn = getFormSubmitButton(e, 'modalKnowledge');
  const jenis = document.getElementById('knKategori').value.trim();
  const judul = document.getElementById('knJudul').value.trim();
  const target = Number(document.getElementById('knTarget').value) || 100;
  const satuan = document.getElementById('knSatuan').value.trim();
  const progres = Number(document.getElementById('knProgres').value) || 0;
  const status = document.getElementById('knStatus').value;
  const mulai = document.getElementById('knTanggalMulai').value;
  const catatan = document.getElementById('knCatatan').value.trim();

  if (!judul || !jenis) {
    showToast('Harap lengkapi kategori dan nama target!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Target...');

  const pct = Math.min(100, Math.round((progres / target) * 100));
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const newKnowledge = {
    ID_Knowledge: generateUniqueId('K'),
    Jenis: jenis,
    Judul: judul,
    Target: target,
    Satuan_Target: satuan,
    Progres_Saat_Ini: progres,
    Persentase: pct,
    Tanggal_Mulai: mulai || dateStr,
    Status: status,
    Catatan: catatan,
    Update_Terakhir: dateStr
  };

  weddingData.Knowledge = weddingData.Knowledge || [];
  weddingData.Knowledge.push(newKnowledge);

  saveDataLocally();
  renderKnowledgeAndFiles();
  pushToSpreadsheet('append_row', 'Knowledge', newKnowledge);

  document.getElementById('knKategori').value = '';
  document.getElementById('knJudul').value = '';
  document.getElementById('knTarget').value = '100';
  document.getElementById('knSatuan').value = '%';
  document.getElementById('knProgres').value = '0';
  document.getElementById('knCatatan').value = '';

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalKnowledge');
    showToast('Target knowledge berhasil ditambahkan! 📚', 'success');
  }, 350);
}

// ----------------------------------------------------------------------------
// HANDLERS FOR DOKUMEN & FILES (Detail, Edit, Delete, Submit)
// ----------------------------------------------------------------------------
function openFileDetailModal(id) {
  selectedFileId = id;
  const f = (weddingData.Files || []).find(item => item.ID_File === id);
  if (!f) return;

  document.getElementById('flDetailJenis').innerText = f.Jenis_File || 'Dokumen';
  document.getElementById('flDetailNama').innerText = f.Nama_File || 'Berkas';
  
  const linkTextEl = document.getElementById('flDetailLinkText');
  const openBtn = document.getElementById('flDetailOpenBtn');
  if (f.Link) {
    linkTextEl.innerText = f.Link;
    openBtn.href = f.Link;
    openBtn.style.display = 'inline-flex';
  } else {
    linkTextEl.innerText = 'Tidak ada tautan URL';
    openBtn.style.display = 'none';
  }

  document.getElementById('flDetailKeterangan').innerText = f.Keterangan || 'Tidak ada keterangan tambahan.';

  openModal('modalFileDetail');
}

function openEditFileModal() {
  closeModal('modalFileDetail');
  const f = (weddingData.Files || []).find(item => item.ID_File === selectedFileId);
  if (!f) return;

  document.getElementById('editFlNama').value = f.Nama_File || '';
  document.getElementById('editFlJenis').value = f.Jenis_File || 'PDF';
  document.getElementById('editFlLink').value = f.Link || '';
  document.getElementById('editFlKeterangan').value = f.Keterangan || '';

  openModal('modalFileEdit');
}

function submitEditFile(e = null) {
  const btn = getFormSubmitButton(e, 'modalFileEdit');
  const f = (weddingData.Files || []).find(item => item.ID_File === selectedFileId);
  if (!f) return;

  const nama = document.getElementById('editFlNama').value.trim();
  const jenis = document.getElementById('editFlJenis').value;
  const link = document.getElementById('editFlLink').value.trim();
  const ket = document.getElementById('editFlKeterangan').value.trim();

  if (!nama || !link) {
    showToast('Nama berkas dan tautan tidak boleh kosong!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Perubahan...');

  f.Nama_File = nama;
  f.Jenis_File = jenis;
  f.Link = link;
  f.Keterangan = ket;

  saveDataLocally();
  renderKnowledgeAndFiles();
  pushToSpreadsheet('update_file', 'Files', f);

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalFileEdit');
    showToast('Dokumen/berkas berhasil diperbarui! ✨', 'success');
  }, 350);
}

function deleteFileItem(e = null) {
  const f = (weddingData.Files || []).find(item => item.ID_File === selectedFileId);
  if (!f) return;

  if (confirm(`Apakah Anda yakin ingin menghapus berkas "${f.Nama_File}"?`)) {
    const btn = getActionButton(e, 'modalFileDetail', 'button.danger');
    const orig = setButtonLoading(btn, 'Menghapus...');
    if (btn) btn.classList.add('btn-danger-loading');

    weddingData.Files = (weddingData.Files || []).filter(item => item.ID_File !== selectedFileId);
    saveDataLocally();
    renderKnowledgeAndFiles();
    pushToSpreadsheet('delete_row', 'Files', { ID: selectedFileId });

    setTimeout(() => {
      resetButtonLoading(btn, orig);
      closeModal('modalFileDetail');
      showToast('Dokumen/berkas berhasil dihapus! 🗑️', 'info');
    }, 350);
  }
}

function submitFile(e = null) {
  const btn = getFormSubmitButton(e, 'modalFile');
  const nama = document.getElementById('flNama').value.trim();
  const jenis = document.getElementById('flJenis').value;
  const link = document.getElementById('flLink').value.trim();
  const ket = document.getElementById('flKeterangan').value.trim();

  if (!nama || !link) {
    showToast('Harap lengkapi nama berkas dan tautan URL!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Berkas...');

  const newFile = {
    ID_File: generateUniqueId('F'),
    Nama_File: nama,
    Jenis_File: jenis,
    Link: link,
    Keterangan: ket
  };

  weddingData.Files = weddingData.Files || [];
  weddingData.Files.push(newFile);

  saveDataLocally();
  renderKnowledgeAndFiles();
  pushToSpreadsheet('append_row', 'Files', newFile);

  document.getElementById('flNama').value = '';
  document.getElementById('flLink').value = '';
  document.getElementById('flKeterangan').value = '';

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalFile');
    showToast('Dokumen/berkas baru berhasil disimpan! 📁', 'success');
  }, 350);
}

// ----------------------------------------------------------------------------
// HANDLERS FOR ISIAN KNOWLEDGE (Halaman Khusus, Tambah, Edit, Hapus, Filter)
// ----------------------------------------------------------------------------
let activeIsianKnowledgeId = null;
let currentIsianSearchQuery = '';
let selectedIsianLogId = null;
let isianCategoryState = {};

function openIsianKnowledgeView(idKnowledge) {
  activeIsianKnowledgeId = idKnowledge;
  currentIsianSearchQuery = '';
  const searchInput = document.getElementById('searchIsianInput');
  if (searchInput) searchInput.value = '';

  document.getElementById('subpane-knowledge').style.display = 'none';
  document.getElementById('subpane-files').style.display = 'none';
  document.getElementById('subpane-isian-knowledge').style.display = 'block';

  const subtabsNav = document.querySelector('#tab-knowledge .subtabs-nav');
  if (subtabsNav) subtabsNav.style.display = 'none';

  renderIsianKnowledge();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeIsianKnowledgeView() {
  document.getElementById('subpane-isian-knowledge').style.display = 'none';
  document.getElementById('subpane-knowledge').style.display = 'block';
  document.getElementById('subpane-files').style.display = 'none';

  const subtabsNav = document.querySelector('#tab-knowledge .subtabs-nav');
  if (subtabsNav) subtabsNav.style.display = 'flex';

  renderKnowledgeAndFiles();
  initLucide();
}

function renderIsianKnowledge() {
  const k = (weddingData.Knowledge || []).find(item => item.ID_Knowledge === activeIsianKnowledgeId);
  if (!k) return;

  const searchInput = document.getElementById('searchIsianInput');
  currentIsianSearchQuery = searchInput ? searchInput.value.trim() : '';

  const targetVal = Number(k.Target) || 100;
  const currentVal = Number(k.Progres_Saat_Ini) || 0;
  const pct = Math.min(100, Math.round((currentVal / targetVal) * 100)) || k.Persentase || 0;

  const parentTitle = document.getElementById('isianKnParentTitle');
  const parentCat = document.getElementById('isianKnParentCategory');
  const parentStatus = document.getElementById('isianKnParentStatus');
  const parentProgress = document.getElementById('isianKnParentProgress');

  if (parentTitle) parentTitle.innerText = k.Judul;
  if (parentCat) parentCat.innerText = k.Jenis || 'Umum';
  if (parentStatus) {
    parentStatus.innerText = k.Status || 'On Progress';
    if ((k.Status || '').toLowerCase().includes('selesai')) {
      parentStatus.style = 'background: var(--success-bg); color: var(--success);';
    } else if ((k.Status || '').toLowerCase().includes('progress')) {
      parentStatus.style = 'background: rgba(82, 128, 105, 0.15); color: var(--primary);';
    } else {
      parentStatus.style = 'background: rgba(82, 128, 105, 0.1); color: var(--text-muted);';
    }
  }
  if (parentProgress) parentProgress.innerText = `Capaian: ${currentVal} dari ${targetVal} ${k.Satuan_Target} (${pct}%) • Diperbarui: ${k.Update_Terakhir || '-'}`;

  const container = document.getElementById('isianKnowledgeList');
  if (!container) return;
  container.innerHTML = '';

  let isianList = (weddingData.Isian_Knowledge || []).filter(item => item.ID_Knowledge === activeIsianKnowledgeId);

  if (currentIsianSearchQuery) {
    const q = currentIsianSearchQuery.toLowerCase();
    isianList = isianList.filter(item => 
      (item.Judul_Isian || '').toLowerCase().includes(q) ||
      (item.Bagian || '').toLowerCase().includes(q) ||
      (item.Isian || '').toLowerCase().includes(q) ||
      (item.Jenis_Isian || '').toLowerCase().includes(q)
    );
  }

  if (isianList.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 32px 16px; background: rgba(255, 255, 255, 0.7); border-radius: var(--radius-sm);">
        <i data-lucide="file-text" style="width: 32px; height: 32px; color: var(--text-light); margin-bottom: 8px;"></i>
        <p style="font-size: 13px; font-weight: 600; color: var(--text-dark); margin-bottom: 4px;">
          ${currentIsianSearchQuery ? 'Tidak ada isian yang cocok dengan pencarian' : 'Belum ada isian untuk target ini'}
        </p>
        <p style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 12px;">
          Tambahkan rincian berkas, catatan, alamat, PIC, atau panduan terkait target ini.
        </p>
        <button type="button" class="btn-pill-action" onclick="openTambahIsianModal()" style="display: inline-flex; align-items: center; gap: 4px;">
          <i data-lucide="plus" style="width: 14px; height: 14px;"></i> Tambah Isian Pertama
        </button>
      </div>
    `;
    initLucide();
    return;
  }

  // Group by Kategori Bagian
  const grouped = {};
  isianList.forEach(item => {
    const bagian = item.Bagian || 'Umum';
    if (!grouped[bagian]) grouped[bagian] = [];
    grouped[bagian].push(item);
  });

  Object.keys(grouped).forEach(bagian => {
    const items = grouped[bagian];
    const catKey = bagian.replace(/[\s&/]/g, '_');
    const isOpen = currentIsianSearchQuery ? true : (isianCategoryState[catKey] !== false);

    const groupDiv = document.createElement('div');
    groupDiv.className = 'isian-cat-group';
    groupDiv.innerHTML = `
      <div class="isian-cat-header" onclick="toggleIsianCategory('${catKey}')">
        <div class="isian-cat-header-left">
          <i data-lucide="folder" style="width: 15px; height: 15px; color: var(--primary);"></i>
          <span class="isian-cat-title">${bagian}</span>
          <span class="isian-cat-count">${items.length} Rincian</span>
        </div>
        <div class="accordion-arrow ${isOpen ? 'rotated' : ''}" id="isian-arrow-${catKey}">
          <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
        </div>
      </div>
      <div class="isian-cat-body" id="isian-body-${catKey}" style="display: ${isOpen ? 'flex' : 'none'};">
        ${items.map(item => {
          let contentHtml = '';
          const jenis = item.Jenis_Isian || 'Paragraf Panjang';
          if (jenis === 'Kata Singkat') {
            contentHtml = `<div class="isian-content-short">${item.Isian || '-'}</div>`;
          } else if (jenis === 'Daftar Poin') {
            const lines = (item.Isian || '').split('\n').filter(l => l.trim() !== '');
            contentHtml = `<ul class="isian-content-list">${lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
          } else if (jenis === 'Tautan URL') {
            contentHtml = `<a href="${item.Isian}" target="_blank" class="isian-content-link" onclick="event.stopPropagation();"><i data-lucide="external-link" style="width: 12px; height: 12px;"></i> Buka Tautan</a>`;
          } else {
            contentHtml = `<div class="isian-content-paragraph">${item.Isian || '-'}</div>`;
          }

          return `
            <div class="isian-item-card">
              <div class="isian-item-top">
                <div>
                  <div class="isian-item-title">${item.Judul_Isian || 'Catatan'}</div>
                  <div style="font-size: 10px; color: var(--text-muted); margin-top: 1px;">
                    <span>${item.Tanggal_Waktu || '-'}</span> &bull; 
                    <span style="color: var(--primary); font-weight: 600;">${item.Jenis_Isian || 'Catatan'}</span>
                  </div>
                </div>
                <div class="isian-item-actions">
                  <button type="button" class="btn-isian-action" onclick="openEditIsianModal('${item.ID_Log}')" title="Edit Isian">
                    <i data-lucide="edit-2" style="width: 13px; height: 13px;"></i>
                  </button>
                  <button type="button" class="btn-isian-action delete" onclick="deleteIsianItem('${item.ID_Log}', event)" title="Hapus Isian">
                    <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                  </button>
                </div>
              </div>
              <div class="isian-item-body">
                ${contentHtml}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    container.appendChild(groupDiv);
  });

  initLucide();
}

function toggleIsianCategory(catKey) {
  if (isianCategoryState[catKey] === undefined) {
    isianCategoryState[catKey] = true;
  }
  isianCategoryState[catKey] = !isianCategoryState[catKey];
  const body = document.getElementById(`isian-body-${catKey}`);
  const arrow = document.getElementById(`isian-arrow-${catKey}`);
  if (body) body.style.display = isianCategoryState[catKey] ? 'flex' : 'none';
  if (arrow) arrow.classList.toggle('rotated', isianCategoryState[catKey]);
}

function filterIsianKnowledge() {
  const searchInput = document.getElementById('searchIsianInput');
  currentIsianSearchQuery = searchInput ? searchInput.value.trim() : '';
  renderIsianKnowledge();
}

function onIsianJenisChange(jenis, wrapperId, inputId) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;

  let placeholder = 'Tuliskan rincian isian di sini...';
  let isTextarea = true;

  if (jenis === 'Kata Singkat') {
    placeholder = 'Misal: Rp 600.000 / 08123456789 / Lengkap / Gedung A';
    isTextarea = false;
  } else if (jenis === 'Daftar Poin') {
    placeholder = 'Tuliskan tiap poin di baris baru...&#10;1. KTP & KK&#10;2. Pas Foto 2x3&#10;3. Surat Sehat';
    isTextarea = true;
  } else if (jenis === 'Tautan URL') {
    placeholder = 'https://...';
    isTextarea = false;
  } else {
    placeholder = 'Tuliskan penjelasan lengkap / paragraf panjang di sini...';
    isTextarea = true;
  }

  const currentVal = document.getElementById(inputId) ? document.getElementById(inputId).value : '';
  
  if (isTextarea) {
    wrapper.innerHTML = `
      <label class="form-label">Isi Catatan / Keterangan</label>
      <textarea id="${inputId}" class="input-glass" rows="4" placeholder="${placeholder}" required style="resize: vertical; font-family: inherit;">${currentVal}</textarea>
    `;
  } else {
    const inputType = jenis === 'Tautan URL' ? 'url' : 'text';
    wrapper.innerHTML = `
      <label class="form-label">Isi Catatan / Nilai</label>
      <input type="${inputType}" id="${inputId}" class="input-glass" placeholder="${placeholder}" value="${currentVal}" required>
    `;
  }
}

function populateIsianBagianDatalist() {
  const datalist = document.getElementById('isianBagianDatalist');
  if (!datalist) return;
  const isianList = (weddingData.Isian_Knowledge || []).filter(item => item.ID_Knowledge === activeIsianKnowledgeId);
  const bagians = Array.from(new Set(isianList.map(item => item.Bagian).filter(Boolean)));
  datalist.innerHTML = bagians.map(b => `<option value="${b}">`).join('');
}

function openTambahIsianModal() {
  populateIsianBagianDatalist();
  document.getElementById('isianBagian').value = '';
  document.getElementById('isianJudul').value = '';
  document.getElementById('isianJenis').value = 'Paragraf Panjang';
  onIsianJenisChange('Paragraf Panjang', 'isianKontenWrapper', 'isianKonten');
  openModal('modalTambahIsian');
}

function submitTambahIsian(e = null) {
  const btn = getFormSubmitButton(e, 'modalTambahIsian');
  const bagian = document.getElementById('isianBagian').value.trim() || 'Umum';
  const judul = document.getElementById('isianJudul').value.trim();
  const jenis = document.getElementById('isianJenis').value;
  const kontenEl = document.getElementById('isianKonten');
  const konten = kontenEl ? kontenEl.value.trim() : '';

  if (!judul || !konten) {
    showToast('Harap lengkapi judul dan isi catatan!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Isian...');

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const newIsian = {
    ID_Log: generateUniqueId('L'),
    ID_Knowledge: activeIsianKnowledgeId,
    Tanggal_Waktu: dateStr,
    Bagian: bagian,
    Judul_Isian: judul,
    Jenis_Isian: jenis,
    Isian: konten
  };

  weddingData.Isian_Knowledge = weddingData.Isian_Knowledge || [];
  weddingData.Isian_Knowledge.push(newIsian);

  const k = (weddingData.Knowledge || []).find(item => item.ID_Knowledge === activeIsianKnowledgeId);
  if (k) {
    k.Update_Terakhir = dayStr;
  }

  saveDataLocally();
  renderIsianKnowledge();
  renderKnowledgeAndFiles();
  pushToSpreadsheet('append_row', 'Isian Knowledge', newIsian);

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalTambahIsian');
    showToast('Isian knowledge berhasil ditambahkan! ✨', 'success');
  }, 350);
}

function openEditIsianModal(idLog) {
  selectedIsianLogId = idLog;
  populateIsianBagianDatalist();
  const item = (weddingData.Isian_Knowledge || []).find(i => i.ID_Log === idLog);
  if (!item) return;

  document.getElementById('editIsianBagian').value = item.Bagian || '';
  document.getElementById('editIsianJudul').value = item.Judul_Isian || '';
  document.getElementById('editIsianJenis').value = item.Jenis_Isian || 'Paragraf Panjang';
  
  onIsianJenisChange(item.Jenis_Isian || 'Paragraf Panjang', 'editIsianKontenWrapper', 'editIsianKonten');
  const kontenEl = document.getElementById('editIsianKonten');
  if (kontenEl) kontenEl.value = item.Isian || '';

  openModal('modalEditIsian');
}

function submitEditIsian(e = null) {
  const btn = getFormSubmitButton(e, 'modalEditIsian');
  const item = (weddingData.Isian_Knowledge || []).find(i => i.ID_Log === selectedIsianLogId);
  if (!item) return;

  const bagian = document.getElementById('editIsianBagian').value.trim() || 'Umum';
  const judul = document.getElementById('editIsianJudul').value.trim();
  const jenis = document.getElementById('editIsianJenis').value;
  const kontenEl = document.getElementById('editIsianKonten');
  const konten = kontenEl ? kontenEl.value.trim() : '';

  if (!judul || !konten) {
    showToast('Harap lengkapi judul dan isi catatan!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Perubahan...');

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  item.Bagian = bagian;
  item.Judul_Isian = judul;
  item.Jenis_Isian = jenis;
  item.Isian = konten;
  item.Tanggal_Waktu = dateStr;

  const k = (weddingData.Knowledge || []).find(k => k.ID_Knowledge === activeIsianKnowledgeId);
  if (k) {
    k.Update_Terakhir = dayStr;
  }

  saveDataLocally();
  renderIsianKnowledge();
  pushToSpreadsheet('update_isian_knowledge', 'Isian Knowledge', item);

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalEditIsian');
    showToast('Isian knowledge berhasil diperbarui! ✨', 'success');
  }, 350);
}

function deleteIsianItem(idLog, e = null) {
  const item = (weddingData.Isian_Knowledge || []).find(i => i.ID_Log === idLog);
  if (!item) return;

  if (confirm(`Apakah Anda yakin ingin menghapus isian "${item.Judul_Isian}"?`)) {
    const btn = (e && e.target) ? e.target.closest('button') : null;
    let orig = null;
    if (btn) {
      orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="spin-loader" style="width: 13px; height: 13px;"></i>`;
      initLucide();
    }

    weddingData.Isian_Knowledge = (weddingData.Isian_Knowledge || []).filter(i => i.ID_Log !== idLog);
    saveDataLocally();
    renderIsianKnowledge();
    renderKnowledgeAndFiles();
    pushToSpreadsheet('delete_row', 'Isian Knowledge', { ID: idLog });

    setTimeout(() => {
      if (btn && orig) {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
      showToast('Isian knowledge berhasil dihapus! 🗑️', 'info');
    }, 350);
  }
}

function populateWalletSelectOptions() {
  const select = document.getElementById('txWallet');
  if (!select) return;
  select.innerHTML = '';
  const dompetList = weddingData.Dompet || [];
  dompetList.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.Nama_Dompet;
    opt.innerText = `${w.Nama_Dompet} (${formatRupiah(w.Saldo)})`;
    select.appendChild(opt);
  });
}

// ============================================================================
// 7. TAB & MODAL NAVIGATION CONTROLLERS
// ============================================================================
function switchTab(tabName) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  const targetPane = document.getElementById(`tab-${tabName}`);
  if (targetPane) targetPane.classList.add('active');

  // Trigger render spesifik seketika agar data dari Spreadsheet langsung nampak
  if (tabName === 'dashboard') renderDashboard();
  else if (tabName === 'keuangan') renderKeuangan();
  else if (tabName === 'timeline') renderTimeline();
  else if (tabName === 'rundown') renderRundown();
  else if (tabName === 'vendor') renderVendor();
  else if (tabName === 'tamu') renderTamu();
  else if (tabName === 'knowledge') renderKnowledgeAndFiles();

  window.scrollTo({ top: 0, behavior: 'smooth' });
  initLucide();
}

function switchKeuanganSubtab(subtab) {
  const isTx = subtab === 'transaksi';
  document.getElementById('subpane-transaksi').style.display = isTx ? 'block' : 'none';
  document.getElementById('subpane-anggaran').style.display = isTx ? 'none' : 'block';

  const btns = document.querySelectorAll('#tab-keuangan .subtab-btn');
  if (btns.length >= 2) {
    btns[0].classList.toggle('active', isTx);
    btns[1].classList.toggle('active', !isTx);
  }
  renderKeuangan();
  initLucide();
}

function switchKnowledgeSubtab(subtab) {
  const isKnowledge = subtab === 'knowledge';
  document.getElementById('subpane-knowledge').style.display = isKnowledge ? 'block' : 'none';
  document.getElementById('subpane-files').style.display = isKnowledge ? 'none' : 'block';

  const btns = document.querySelectorAll('#tab-knowledge .subtab-btn');
  if (btns.length >= 2) {
    btns[0].classList.toggle('active', isKnowledge);
    btns[1].classList.toggle('active', !isKnowledge);
  }
  renderKnowledgeAndFiles();
  initLucide();
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    if (id === 'modalTransaksi') {
      populateTxForm();
    }
    if (id === 'modalTimeline') {
      populateTimelineCategories('tlKategori');
    }
    if (id === 'modalVendor') {
      populateVendorCategories('vendorKategori');
    }
    if (id === 'modalTamu') {
      populateTamuCategories('tamuKategori');
      const waInput = document.getElementById('tamuNomorWA');
      if (waInput && (!waInput.value || waInput.value === '08123456789')) {
        waInput.value = '628';
      }
      renderTamuPaxNamesInput(1, 'tamuPaxNamesContainer');
    }
    if (id === 'modalKnowledge') {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const dateInp = document.getElementById('knTanggalMulai');
      if (dateInp && !dateInp.value) dateInp.value = dateStr;
    }
    modal.classList.add('active');
    initLucide();
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
  }
}

function openSettingsModal() {
  if (weddingData.Master && weddingData.Master.HariH) {
    const dateInput = document.getElementById('settingWeddingDate');
    if (dateInput) dateInput.value = weddingData.Master.HariH;
  }
  renderMasterCategoryList();
  openModal('modalSettings');
}

document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
});

// ----------------------------------------------------------------------------
// Dynamic Form Modal Transaksi (Terhubung dengan Anggaran & Dompet)
// ----------------------------------------------------------------------------
function populateTxForm() {
  const walletSelect = document.getElementById('txWallet');
  if (walletSelect) {
    const wallets = weddingData.Dompet || [];
    walletSelect.innerHTML = wallets.map(w => `<option value="${w.Nama_Dompet}">${w.Nama_Dompet} (${formatRupiah(w.Saldo)})</option>`).join('');
    if (currentTxWalletFilter) {
      walletSelect.value = currentTxWalletFilter;
    }
  }

  const catSelect = document.getElementById('txCategory');
  if (catSelect) {
    const anggaranList = weddingData.Anggaran || [];
    let categories = [...new Set(anggaranList.map(a => a.Kategori_Anggaran || 'Lain-lain'))];
    if (categories.length === 0) categories = ['Catering', 'Dekorasi', 'Venue', 'MUA & Busana', 'Dokumentasi', 'Lain-lain'];
    catSelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  onTxCategoryChange();
  onTxTypeChange();
}

function onTxTypeChange() {
  const typeEl = document.getElementById('txType');
  if (!typeEl) return;
  const type = typeEl.value;
  const pengeluaranGroup = document.getElementById('txPengeluaranGroup');
  const pemasukanGroup = document.getElementById('txPemasukanGroup');
  if (type === 'Masuk') {
    if (pengeluaranGroup) pengeluaranGroup.style.display = 'none';
    if (pemasukanGroup) pemasukanGroup.style.display = 'block';
  } else {
    if (pengeluaranGroup) pengeluaranGroup.style.display = 'block';
    if (pemasukanGroup) pemasukanGroup.style.display = 'none';
  }
}

function onTxCategoryChange() {
  const catSelect = document.getElementById('txCategory');
  const itemSelect = document.getElementById('txItemNameSelect');
  if (!catSelect || !itemSelect) return;

  const selectedCat = catSelect.value;
  const anggaranList = weddingData.Anggaran || [];
  const itemsInCat = anggaranList.filter(a => (a.Kategori_Anggaran || 'Lain-lain') === selectedCat);

  let optionsHtml = itemsInCat.map(a => {
    const sisa = a.Sisa_Pembayaran !== undefined ? Number(a.Sisa_Pembayaran) : Math.max(0, (Number(a.Biaya_Riil) || Number(a.Estimasi) || 0) - (Number(a.Jumlah_Dibayar) || 0));
    return `<option value="${a.Item}">${a.Item} (Sisa: ${formatRupiah(sisa)})</option>`;
  }).join('');

  optionsHtml += `<option value="__custom__">+ Item Kustom / Lainnya...</option>`;
  itemSelect.innerHTML = optionsHtml;
  onTxItemSelectChange();
}

function onTxItemSelectChange() {
  const itemSelect = document.getElementById('txItemNameSelect');
  const customContainer = document.getElementById('txCustomItemContainer');
  if (itemSelect && customContainer) {
    customContainer.style.display = itemSelect.value === '__custom__' ? 'block' : 'none';
  }
}

// ============================================================================
// 8. FORM SUBMISSIONS
// ============================================================================

// Submit Transaksi Baru
function submitTransaksi(e = null) {
  const btn = getFormSubmitButton(e, 'modalTransaksi');
  const type = document.getElementById('txType').value;
  const walletName = document.getElementById('txWallet').value;
  const amount = Number(document.getElementById('txAmount').value);

  if (!walletName || !amount || amount <= 0) {
    showToast('Harap pilih dompet dan masukkan nominal yang valid!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Transaksi...');

  let category = '';
  let itemName = '';

  if (type === 'Keluar') {
    category = document.getElementById('txCategory').value;
    const itemSelect = document.getElementById('txItemNameSelect');
    if (itemSelect && itemSelect.value === '__custom__') {
      itemName = (document.getElementById('txItemNameCustom').value || '').trim();
      if (!itemName) itemName = 'Pengeluaran ' + category;
    } else if (itemSelect) {
      itemName = itemSelect.value;
    }

    // Connect with Anggaran: automatically update Jumlah_Dibayar and Sisa_Pembayaran
    const budgetItem = (weddingData.Anggaran || []).find(b => b.Item === itemName);
    if (budgetItem) {
      budgetItem.Jumlah_Dibayar = (Number(budgetItem.Jumlah_Dibayar) || 0) + amount;
      const riil = Number(budgetItem.Biaya_Riil) || Number(budgetItem.Estimasi) || 0;
      budgetItem.Sisa_Pembayaran = Math.max(0, riil - budgetItem.Jumlah_Dibayar);
    }
  } else {
    category = 'Pemasukan';
    itemName = (document.getElementById('txKeteranganPemasukan').value || '').trim() || 'Pemasukan Kas';
  }

  const wallet = (weddingData.Dompet || []).find(w => w.Nama_Dompet === walletName);
  const currentSaldo = wallet ? Number(wallet.Saldo) : 0;
  const newSaldo = type === 'Keluar' ? currentSaldo - amount : currentSaldo + amount;

  if (wallet) {
    wallet.Saldo = newSaldo;
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newTx = {
    ID_Transaksi: generateUniqueId('TX'),
    Tanggal_Waktu: dateStr,
    Dompet: walletName,
    Kategori: category,
    Rincian_Item: itemName,
    Nominal: amount,
    Saldo_Sebelum: currentSaldo,
    Saldo_Sesudah: newSaldo,
    Status: 'Berhasil',
    Jenis: type
  };

  weddingData.Transaksi_Keuangan = weddingData.Transaksi_Keuangan || [];
  weddingData.Transaksi_Keuangan.push(newTx);

  saveDataLocally();
  renderAllViews();
  pushToSpreadsheet('append_row', 'Transaksi Keuangan', newTx);

  document.getElementById('txAmount').value = '';
  const customInput = document.getElementById('txItemNameCustom');
  if (customInput) customInput.value = '';
  const ketInput = document.getElementById('txKeteranganPemasukan');
  if (ketInput) ketInput.value = '';

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalTransaksi');
    showToast('Transaksi berhasil dicatat! 🌿', 'success');
  }, 350);
}

// Submit Tamu Baru (dengan Jumlah Pax & Daftar Nama)
function submitTamu(e = null) {
  const btn = getFormSubmitButton(e, 'modalTamu');
  const nama = document.getElementById('tamuNama').value.trim();
  const kategori = document.getElementById('tamuKategori').value;
  const pax = Number(document.getElementById('tamuPax').value) || 1;
  let nomor = document.getElementById('tamuNomorWA').value.trim();
  const status = document.getElementById('tamuStatus').value;

  if (!nama || !nomor) {
    showToast('Harap lengkapi nama dan nomor WhatsApp tamu!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Tamu...');

  // Normalize WhatsApp number if starts with 0
  if (nomor.startsWith('0')) {
    nomor = '62' + nomor.slice(1);
  }

  // Collect additional pax names if pax > 1
  let paxNames = [];
  if (pax > 1) {
    const inputs = document.querySelectorAll('#tamuPaxNamesContainer input');
    inputs.forEach(inp => {
      if (inp.value.trim()) paxNames.push(inp.value.trim());
    });
  }

  const newGuest = {
    ID_Tamu: generateUniqueId('G'),
    Nama_Tamu: nama,
    Kategori_Tamu: kategori,
    Jumlah_Pax: pax,
    Nomor_WhatsApp: nomor,
    Status: status,
    Daftar_Nama: paxNames.length > 0 ? paxNames.join(', ') : ''
  };

  weddingData.Tamu_Undangan = weddingData.Tamu_Undangan || [];
  weddingData.Tamu_Undangan.push(newGuest);

  saveDataLocally();
  renderAllViews();
  pushToSpreadsheet('append_row', 'Tamu Undangan', newGuest);

  document.getElementById('tamuNama').value = '';
  document.getElementById('tamuNomorWA').value = '';
  document.getElementById('tamuPax').value = '1';
  document.getElementById('tamuPaxNamesContainer').innerHTML = '';
  document.getElementById('tamuPaxNamesContainer').style.display = 'none';

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalTamu');
    showToast('Tamu berhasil ditambahkan! 💌', 'success');
  }, 350);
}

// Submit Timeline Baru
function submitTimeline(e = null) {
  const btn = getFormSubmitButton(e, 'modalTimeline');
  const kategori = document.getElementById('tlKategori').value;
  const item = document.getElementById('tlItem').value.trim();
  const deadline = document.getElementById('tlDeadline').value;
  const catatan = document.getElementById('tlCatatan').value.trim();

  if (!item || !deadline) {
    showToast('Harap lengkapi nama agenda dan deadline!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Agenda...');

  const newTimeline = {
    ID_Timeline: generateUniqueId('TL'),
    Kategori: kategori,
    Nama_Item: item,
    Deadline: deadline,
    Status: 'Belum',
    Catatan: catatan
  };

  weddingData.Timeline = weddingData.Timeline || [];
  weddingData.Timeline.push(newTimeline);

  saveDataLocally();
  renderAllViews();
  pushToSpreadsheet('append_row', 'Timeline', newTimeline);

  document.getElementById('tlItem').value = '';
  document.getElementById('tlDeadline').value = '';
  document.getElementById('tlCatatan').value = '';

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalTimeline');
    showToast('Agenda timeline berhasil ditambahkan! 🗓', 'success');
  }, 350);
}

// Submit Rundown Hari H Baru
function submitRundown(e = null) {
  const btn = getFormSubmitButton(e, 'modalRundown');
  const start = document.getElementById('rdStart').value;
  const end = document.getElementById('rdEnd').value;
  const kegiatan = document.getElementById('rdKegiatan').value.trim();
  const pic = document.getElementById('rdPIC').value.trim();
  const lokasi = document.getElementById('rdLokasi').value.trim();
  const catatan = document.getElementById('rdCatatan').value.trim();

  if (!start || !end || !kegiatan || !pic) {
    showToast('Harap lengkapi waktu, kegiatan, dan penanggung jawab!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Rundown...');

  const newRundown = {
    ID_Rundown: generateUniqueId('RD'),
    Waktu_Mulai: start,
    Waktu_Selesai: end,
    Kegiatan: kegiatan,
    PIC: pic,
    Lokasi: lokasi,
    Catatan: catatan
  };

  weddingData.Rundown_Hari_H = weddingData.Rundown_Hari_H || [];
  weddingData.Rundown_Hari_H.push(newRundown);

  saveDataLocally();
  renderAllViews();
  pushToSpreadsheet('append_row', 'Rundown Hari H', newRundown);

  document.getElementById('rdStart').value = '';
  document.getElementById('rdEnd').value = '';
  document.getElementById('rdKegiatan').value = '';
  document.getElementById('rdPIC').value = '';
  document.getElementById('rdLokasi').value = '';
  document.getElementById('rdCatatan').value = '';

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalRundown');
    showToast('Rundown berhasil ditambahkan! ⏱️', 'success');
  }, 350);
}

// Submit Vendor Baru (dengan Total Biaya & DP)
function submitVendor(e = null) {
  const btn = getFormSubmitButton(e, 'modalVendor');
  const nama = document.getElementById('vendorNama').value.trim();
  const kategori = document.getElementById('vendorKategori').value;
  const totalBiaya = Number(document.getElementById('vendorTotalBiaya').value) || 0;
  const nominalDP = Number(document.getElementById('vendorNominalDP').value) || 0;
  const nomor = document.getElementById('vendorNomor').value.trim();
  const link = document.getElementById('vendorLink').value.trim();
  const status = document.getElementById('vendorStatus').value;
  const ket = document.getElementById('vendorKeterangan').value.trim();

  if (!nama) {
    showToast('Harap lengkapi nama vendor!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Vendor...');

  const newVendor = {
    ID_Vendor: generateUniqueId('V'),
    Kategori_Vendor: kategori,
    Nama_Vendor: nama,
    Total_Biaya: totalBiaya,
    Nominal_DP: nominalDP,
    Link: link,
    Nomor: nomor,
    Keterangan: ket,
    Status: status
  };

  weddingData.Vendor = weddingData.Vendor || [];
  weddingData.Vendor.push(newVendor);

  saveDataLocally();
  renderAllViews();
  pushToSpreadsheet('append_row', 'Vendor', newVendor);

  document.getElementById('vendorNama').value = '';
  document.getElementById('vendorTotalBiaya').value = '0';
  document.getElementById('vendorNominalDP').value = '0';
  document.getElementById('vendorNomor').value = '';
  document.getElementById('vendorLink').value = '';
  document.getElementById('vendorKeterangan').value = '';

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalVendor');
    showToast('Vendor berhasil disimpan! 🌿', 'success');
  }, 350);
}

// Submit Dompet Baru
function submitDompet(e = null) {
  const btn = getFormSubmitButton(e, 'modalDompet');
  const nama = document.getElementById('dompetNama').value.trim();
  const saldo = Number(document.getElementById('dompetSaldo').value) || 0;

  if (!nama) {
    showToast('Harap masukkan nama dompet!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Dompet...');

  const newWallet = {
    ID_Dompet: generateUniqueId('D'),
    Nama_Dompet: nama,
    Saldo: saldo
  };

  weddingData.Dompet = weddingData.Dompet || [];
  weddingData.Dompet.push(newWallet);

  saveDataLocally();
  renderAllViews();
  pushToSpreadsheet('append_row', 'Dompet', newWallet);

  document.getElementById('dompetNama').value = '';
  document.getElementById('dompetSaldo').value = '0';

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalDompet');
    showToast('Dompet baru berhasil ditambahkan! 💳', 'success');
  }, 350);
}

// Submit Pos Anggaran Baru
function submitAnggaran(e = null) {
  const btn = getFormSubmitButton(e, 'modalAnggaran');
  const kategori = document.getElementById('anggaranKategori').value;
  const item = document.getElementById('anggaranItem').value.trim();
  const estimasi = Number(document.getElementById('anggaranEstimasi').value) || 0;
  const biayaRiil = Number(document.getElementById('anggaranBiayaRiil').value) || estimasi;
  const bayar = Number(document.getElementById('anggaranJumlahBayar').value) || 0;
  const jatuhTempo = document.getElementById('anggaranJatuhTempo').value;

  if (!item || estimasi <= 0) {
    showToast('Harap masukkan nama item dan estimasi biaya yang valid!', 'error');
    return;
  }

  const orig = setButtonLoading(btn, 'Menyimpan Anggaran...');

  const sisa = Math.max(0, biayaRiil - bayar);

  const newBudget = {
    ID_Anggaran: generateUniqueId('A'),
    Kategori_Anggaran: kategori,
    Item: item,
    Estimasi: estimasi,
    Biaya_Riil: biayaRiil,
    Jumlah_Dibayar: bayar,
    Sisa_Pembayaran: sisa,
    Jatuh_Tempo: jatuhTempo || '-'
  };

  weddingData.Anggaran = weddingData.Anggaran || [];
  weddingData.Anggaran.push(newBudget);

  saveDataLocally();
  renderAllViews();
  pushToSpreadsheet('append_row', 'Anggaran', newBudget);

  document.getElementById('anggaranItem').value = '';
  document.getElementById('anggaranEstimasi').value = '';
  document.getElementById('anggaranBiayaRiil').value = '';
  document.getElementById('anggaranJumlahBayar').value = '0';
  document.getElementById('anggaranJatuhTempo').value = '';

  setTimeout(() => {
    resetButtonLoading(btn, orig);
    closeModal('modalAnggaran');
    showToast('Pos anggaran berhasil ditambahkan! 💰', 'success');
  }, 350);
}

// ============================================================================
// 9. TOAST NOTIFICATION UTILITY
// ============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${iconName}" style="width: 16px; height: 16px; flex-shrink: 0;"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  initLucide();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

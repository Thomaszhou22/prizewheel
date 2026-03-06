const STORAGE_KEY = 'prizewheel-wheels';
const STORAGE_SECRET_KEY = 'prizewheel-secret-enabled';
const STORAGE_SECRET_HINT_KEY = 'prizewheel-secret-hint-enabled';
const STORAGE_GUARANTEE_KEY = 'prizewheel-admin-guarantee';
const STORAGE_SPIN_COUNTS_KEY = 'prizewheel-spin-counts';
const STORAGE_DELETED_KEY = 'prizewheel-deleted';
const STORAGE_BLACKLIST_KEY = 'prizewheel-blacklist';

const SCROLL_ITEM_HEIGHT = 56;
const SCROLL_VIEWPORT_HEIGHT = 180;
const SCROLL_REPEAT_COUNT = 25;
const SCROLL_MAX_CYCLE = 15;
const SCROLL_PX_PER_SEC = 800;
const SCROLL_MIN_DURATION_MS = 5000;

let wheels = [];
let activeWheelId = null;
let scrollListTranslateY = 0;
let isSpinning = false;

const $ = (id) => document.getElementById(id);
const wheelList = $('wheel-list');
const wheelEditor = $('wheel-editor');
const emptyHint = $('empty-hint');
const wheelNameInput = $('wheel-name');
const slotsList = $('slots-list');
const scrollViewport = $('scroll-viewport');
const scrollLotteryList = $('scroll-lottery-list');
const btnNewWheel = $('btn-new-wheel');
const btnDeleteWheel = $('btn-delete-wheel');
const btnAddSlot = $('btn-add-slot');
const btnSpin = $('btn-spin');
const resultOverlay = $('result-overlay');
const resultName = $('result-name');
const btnCloseResult = $('btn-close-result');
const slotsHeaderFill = $('slots-header-fill');
const btnClearSlots = $('btn-clear-slots');
const btnBoost = $('btn-boost');
const boostOverlay = $('boost-overlay');
const boostList = $('boost-list');
const btnBoostCancel = $('btn-boost-cancel');
const btnBoostConfirm = $('btn-boost-confirm');
const batchInputEl = $('batch-input');
const btnBatchInput = $('btn-batch-input');
const totalDisplay = $('total-display');
const adminOverlay = $('admin-overlay');
const btnCloseAdmin = $('btn-close-admin');
const adminSecretToggle = $('admin-secret-toggle');
const adminHintToggle = $('admin-hint-toggle');
const adminHintRow = $('admin-hint-row');
const adminGuaranteeRows = $('admin-guarantee-rows');
const adminGuaranteeStatus = $('admin-guarantee-status');
const btnAdminGuaranteeAdd = $('btn-admin-guarantee-add');
const btnAdminGuaranteeClear = $('btn-admin-guarantee-clear');
const btnAdminGuaranteeSet = $('btn-admin-guarantee-set');
const adminBlacklistList = $('admin-blacklist-list');
const adminBlacklistEmpty = $('admin-blacklist-empty');
const btnBlacklistClear = $('btn-blacklist-clear');
const btnOpenDeleted = $('btn-open-deleted');
const deletedOverlay = $('deleted-overlay');
const btnCloseDeleted = $('btn-close-deleted');
const deletedList = $('deleted-list');
const deletedEmptyHint = $('deleted-empty-hint');

const ADMIN_CODE = 'blacksheepwall';

function getDeletedWheels() {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {}
  return [];
}

function setDeletedWheels(arr) {
  if (!arr || arr.length === 0) {
    localStorage.removeItem(STORAGE_DELETED_KEY);
    return;
  }
  localStorage.setItem(STORAGE_DELETED_KEY, JSON.stringify(arr));
}

function getSecretEnabled() {
  const v = localStorage.getItem(STORAGE_SECRET_KEY);
  return v === null || v === '1';
}

function setSecretEnabled(on) {
  localStorage.setItem(STORAGE_SECRET_KEY, on ? '1' : '0');
}

function getSecretHintEnabled() {
  const v = localStorage.getItem(STORAGE_SECRET_HINT_KEY);
  return v === null || v === '1';
}

function setSecretHintEnabled(on) {
  localStorage.setItem(STORAGE_SECRET_HINT_KEY, on ? '1' : '0');
}

function getGuarantees(wheelId) {
  try {
    const raw = localStorage.getItem(STORAGE_GUARANTEE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw);
    const arr = wheelId && all && Array.isArray(all[wheelId]) ? all[wheelId] : [];
    return arr.filter((o) => typeof o.targetCount === 'number' && typeof o.winnerName === 'string');
  } catch (_) {}
  return [];
}

function setGuarantees(wheelId, arr) {
  try {
    const raw = localStorage.getItem(STORAGE_GUARANTEE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    if (!arr || arr.length === 0) {
      delete all[wheelId];
    } else {
      all[wheelId] = arr.map((o) => ({ targetCount: o.targetCount, winnerName: o.winnerName }));
    }
    if (Object.keys(all).length === 0) {
      localStorage.removeItem(STORAGE_GUARANTEE_KEY);
    } else {
      localStorage.setItem(STORAGE_GUARANTEE_KEY, JSON.stringify(all));
    }
  } catch (_) {}
}

function getBlacklist(wheelId) {
  try {
    const raw = localStorage.getItem(STORAGE_BLACKLIST_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw);
    const arr = wheelId && all && Array.isArray(all[wheelId]) ? all[wheelId] : [];
    return arr.filter((s) => typeof s === 'string');
  } catch (_) {}
  return [];
}

function setBlacklist(wheelId, arr) {
  try {
    const raw = localStorage.getItem(STORAGE_BLACKLIST_KEY);
    const all = raw ? JSON.parse(raw) : {};
    if (!arr || arr.length === 0) {
      delete all[wheelId];
    } else {
      all[wheelId] = arr;
    }
    if (Object.keys(all).length === 0) {
      localStorage.removeItem(STORAGE_BLACKLIST_KEY);
    } else {
      localStorage.setItem(STORAGE_BLACKLIST_KEY, JSON.stringify(all));
    }
  } catch (_) {}
}

function getSpinCounts() {
  try {
    const raw = localStorage.getItem(STORAGE_SPIN_COUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {}
  return {};
}

function getSpinCount(wheelId) {
  return getSpinCounts()[wheelId] || 0;
}

function incrementSpinCount(wheelId) {
  const counts = getSpinCounts();
  counts[wheelId] = (counts[wheelId] || 0) + 1;
  localStorage.setItem(STORAGE_SPIN_COUNTS_KEY, JSON.stringify(counts));
  return counts[wheelId];
}

function resetSpinCount(wheelId) {
  const counts = getSpinCounts();
  delete counts[wheelId];
  localStorage.setItem(STORAGE_SPIN_COUNTS_KEY, JSON.stringify(counts));
}

function loadWheels() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    wheels = raw ? JSON.parse(raw) : [];
  } catch {
    wheels = [];
  }
}

function saveWheels() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wheels));
}

function getActiveWheel() {
  return wheels.find((w) => w.id === activeWheelId);
}

function generateId() {
  return 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

function getSortedWheels() {
  const name = (w) => (w.name || '未命名').trim() || '未命名';
  return [...wheels].sort((a, b) => {
    const aStar = !!a.starred;
    const bStar = !!b.starred;
    if (aStar !== bStar) return bStar ? 1 : -1;
    if (aStar) return name(a).localeCompare(name(b), 'zh-CN');
    return 0;
  });
}

function renderWheelList() {
  const sorted = getSortedWheels();
  wheelList.innerHTML = sorted
    .map(
      (w) =>
        `<li>
          <button type="button" class="wheel-item ${w.id === activeWheelId ? 'active' : ''}" data-id="${w.id}">
            <button type="button" class="wheel-item-star ${w.starred ? 'starred' : ''}" data-id="${w.id}" title="${w.starred ? '取消重要' : '标为重要'}" aria-label="重要性">★</button>
            <span class="wheel-item-name">${escapeHtml(w.name || '未命名')}</span>
            <button type="button" class="btn-remove-wheel" data-id="${w.id}" title="删除">×</button>
          </button>
        </li>`
    )
    .join('');

  wheelList.querySelectorAll('.wheel-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.btn-remove-wheel') || e.target.closest('.wheel-item-star')) return;
      selectWheel(el.dataset.id);
    });
  });
  wheelList.querySelectorAll('.wheel-item-star').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWheelStar(btn.dataset.id);
    });
  });
  wheelList.querySelectorAll('.btn-remove-wheel').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteWheelById(btn.dataset.id);
    });
  });
}

function toggleWheelStar(id) {
  const w = wheels.find((x) => x.id === id);
  if (!w) return;
  w.starred = !w.starred;
  saveWheels();
  renderWheelList();
}

function deleteWheelById(id) {
  const w = wheels.find((x) => x.id === id);
  if (w) {
    const deleted = getDeletedWheels();
    deleted.unshift({ wheel: JSON.parse(JSON.stringify(w)), deletedAt: Date.now() });
    setDeletedWheels(deleted);
  }
  wheels = wheels.filter((x) => x.id !== id);
  saveWheels();
  activeWheelId = wheels.length ? wheels[0].id : null;
  renderWheelList();
  renderDeletedList();
  showEditor();
}

function renderDeletedList() {
  if (!deletedList) return;
  const list = getDeletedWheels();
  if (deletedEmptyHint) {
    deletedEmptyHint.classList.toggle('hidden', list.length > 0);
  }
  deletedList.classList.toggle('hidden', list.length === 0);
  deletedList.innerHTML = list
    .map(
      (rec) =>
        `<li class="deleted-item" data-id="${escapeHtml(rec.wheel.id)}">
          <span class="deleted-item-name" title="${escapeHtml(rec.wheel.name || '未命名')}">${escapeHtml(rec.wheel.name || '未命名')}</span>
          <div class="deleted-item-actions">
            <button type="button" class="btn-deleted-restore" data-id="${escapeHtml(rec.wheel.id)}" title="恢复">恢复</button>
            <button type="button" class="btn-deleted-forever" data-id="${escapeHtml(rec.wheel.id)}" title="永久删除">永久删除</button>
          </div>
        </li>`
    )
    .join('');
  deletedList.querySelectorAll('.btn-deleted-restore').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      restoreDeletedWheel(btn.dataset.id);
    });
  });
  deletedList.querySelectorAll('.btn-deleted-forever').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      permanentlyDeleteFromTrash(btn.dataset.id);
    });
  });
}

function restoreDeletedWheel(id) {
  const deleted = getDeletedWheels();
  const idx = deleted.findIndex((r) => r.wheel.id === id);
  if (idx < 0) return;
  const rec = deleted[idx];
  wheels.push(rec.wheel);
  deleted.splice(idx, 1);
  setDeletedWheels(deleted);
  saveWheels();
  activeWheelId = id;
  renderWheelList();
  renderDeletedList();
  showEditor();
  closeDeletedPage();
}

function permanentlyDeleteFromTrash(id) {
  const deleted = getDeletedWheels().filter((r) => r.wheel.id !== id);
  setDeletedWheels(deleted);
  renderDeletedList();
}

function openDeletedPage() {
  renderDeletedList();
  if (deletedOverlay) deletedOverlay.classList.remove('hidden');
}

function closeDeletedPage() {
  if (deletedOverlay) deletedOverlay.classList.add('hidden');
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function selectWheel(id) {
  activeWheelId = id;
  renderWheelList();
  showEditor();
}

function showEditor() {
  const w = getActiveWheel();
  if (!w) {
    wheelEditor.classList.add('hidden');
    emptyHint.classList.remove('hidden');
    return;
  }
  emptyHint.classList.add('hidden');
  wheelEditor.classList.remove('hidden');
  wheelNameInput.value = w.name || '';
  renderSlots();
  drawScrollList();
  updateTotalDisplay();
}

function displayValue(text) {
  return (text || '').replace(/\//g, '');
}

/** 与 drawScrollList / spinWheel 共用的唯一数据源：有效项顺序一致 */
function getEffectiveSlots(w) {
  if (!w || !w.slots) return { indices: [], values: [] };
  const indices = [];
  const values = [];
  w.slots.forEach((s, i) => {
    if (String(s).trim()) {
      indices.push(i);
      values.push(s);
    }
  });
  return { indices, values };
}

function renderSlots() {
  const w = getActiveWheel();
  if (!w) return;
  const slots = w.slots || [];
  slotsList.innerHTML = slots
    .map(
      (text, i) => `
    <li data-index="${i}">
      <input type="text" value="${escapeHtml(displayValue(text))}" placeholder="名称" data-slot-index="${i}" />
      <button type="button" class="btn-remove-slot" data-index="${i}" title="删除">×</button>
    </li>`
    )
    .join('');

  slotsList.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', (e) => {
      const w = getActiveWheel();
      const i = parseInt(input.dataset.slotIndex, 10);
      if (!w || !w.slots) return;
      const prevFull = w.slots[i] || '';
      const trailingSlashes = (prevFull.match(/\/+$/) || [''])[0];
      w.slots[i] = e.target.value + trailingSlashes;
      saveWheels();
      drawScrollList();
    });
    input.addEventListener('keydown', (e) => {
      const i = parseInt(input.dataset.slotIndex, 10);
      const w = getActiveWheel();
      if (e.key === '/') {
        e.preventDefault();
        if (!w || !w.slots) return;
        const prevFull = w.slots[i] || '';
        const trailingSlashes = (prevFull.match(/\/+$/) || [''])[0];
        const newTrailing = (trailingSlashes + '/').slice(-3);
        w.slots[i] = displayValue(prevFull) + newTrailing;
        saveWheels();
        drawScrollList();
        if (newTrailing === '///') {
          if (getSecretEnabled()) {
            const nextSpin = getSpinCount(w.id) + 1;
            const winnerName = (displayValue(prevFull) || '').trim() || '(空)';
            const arr = getGuarantees(w.id).filter((g) => g.targetCount !== nextSpin);
            arr.push({ targetCount: nextSpin, winnerName });
            setGuarantees(w.id, arr);
          }
          if (getSecretHintEnabled()) {
            const sidebarTitle = document.getElementById('sidebar-title');
            if (sidebarTitle) {
              sidebarTitle.classList.add('sidebar-title-secret');
              setTimeout(() => sidebarTitle.classList.remove('sidebar-title-secret'), 1000);
            }
          }
        }
        return;
      }
      if (e.key === 'Enter') {
        const code = String((input.value || '').trim());
        if (code === ADMIN_CODE || code === 'bsw') {
          e.preventDefault();
          return;
        }
        if (e.isComposing || input.selectionStart !== input.value.length) return;
        e.preventDefault();
        if (!w) return;
        if (!w.slots) w.slots = [];
        w.slots.splice(i + 1, 0, '');
        saveWheels();
        renderSlots();
        drawScrollList();
        const nextInput = slotsList.querySelector(`input[data-slot-index="${i + 1}"]`);
        if (nextInput) nextInput.focus();
        return;
      }
      if (e.key === 'Backspace' && !input.value.trim()) {
        e.preventDefault();
        if (!w || !w.slots) return;
        w.slots.splice(i, 1);
        saveWheels();
        renderSlots();
        drawScrollList();
        const prevInput = slotsList.querySelector(`input[data-slot-index="${Math.max(0, i - 1)}"]`);
        if (prevInput) {
          prevInput.focus();
          const len = prevInput.value.length;
          prevInput.setSelectionRange(len, len);
        }
      }
    });
  });

  slotsList.querySelectorAll('.btn-remove-slot').forEach((btn) => {
    btn.addEventListener('click', () => {
      const w = getActiveWheel();
      const i = parseInt(btn.dataset.index, 10);
      if (w && w.slots) {
        w.slots.splice(i, 1);
        saveWheels();
        renderSlots();
        drawScrollList();
      }
    });
  });

  if (slotsHeaderFill) {
    slotsHeaderFill.classList.toggle('clickable', slots.length === 0);
  }
  updateTotalDisplay();
}

function parseBatchNames(text) {
  if (!text || !String(text).trim()) return [];
  return String(text)
    .split(/[,，\s、]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function applyBatchInput() {
  const w = getActiveWheel();
  if (!w) return;
  const names = parseBatchNames(batchInputEl ? batchInputEl.value : '');
  if (names.length === 0) return;
  if (!w.slots) w.slots = [];
  w.slots.push(...names);
  saveWheels();
  renderSlots();
  drawScrollList();
  if (batchInputEl) batchInputEl.value = '';
}

function drawScrollList() {
  const w = getActiveWheel();
  const { values: slots } = getEffectiveSlots(w);
  if (!scrollLotteryList) return;
  scrollListTranslateY = 0;
  applyScrollListTransform();

  if (!slots.length) {
    scrollLotteryList.innerHTML = '<li class="scroll-lottery-placeholder">请添加</li>';
    return;
  }

  const items = [];
  for (let r = 0; r < SCROLL_REPEAT_COUNT; r++) {
    slots.forEach((label) => items.push(displayValue(label) || '(空)'));
  }
  scrollLotteryList.innerHTML = items
    .map((text) => `<li>${escapeHtml(text)}</li>`)
    .join('');
}

function applyScrollListTransform() {
  if (scrollLotteryList) scrollLotteryList.style.transform = `translateY(${scrollListTranslateY}px)`;
}

function spinWheel() {
  const w = getActiveWheel();
  if (!w || !w.slots) return;
  const { indices: slotIndices, values: slots } = getEffectiveSlots(w);
  if (slots.length === 0) {
    alert('请先添加至少一项');
    return;
  }
  if (isSpinning) return;
  isSpinning = true;
  btnSpin.disabled = true;

  // 第一步：在后台预先确定被抽中的输入框（管理员指定第 N 次 > /// 暗改 > 随机），黑名单名称不参与
  const blacklist = getBlacklist(w.id);
  const slotDisplay = (s) => (displayValue(s) || '').trim() || '(空)';
  const allowedIndices = slots
    .map((s, i) => i)
    .filter((i) => !blacklist.includes(slotDisplay(slots[i])));
  const pool = allowedIndices.length > 0 ? allowedIndices : slots.map((_, i) => i);

  const spinCount = incrementSpinCount(w.id);
  let winningSlotIndex = -1;
  const guarantees = getGuarantees(w.id);
  const matched = guarantees.find((g) => spinCount === g.targetCount && !blacklist.includes(g.winnerName));
  if (matched) {
    const idx = slots.findIndex((s) => displayValue(s) === matched.winnerName);
    if (idx >= 0 && pool.includes(idx)) {
      winningSlotIndex = idx;
      setGuarantees(w.id, guarantees.filter((g) => g !== matched));
      resetSpinCount(w.id);
    }
  }
  if (winningSlotIndex < 0) {
    const guaranteedIndex = getSecretEnabled() ? slots.findIndex((s) => (s || '').endsWith('///')) : -1;
    const allowedSlashIndex = guaranteedIndex >= 0 && pool.includes(guaranteedIndex) ? guaranteedIndex : -1;
    winningSlotIndex = allowedSlashIndex >= 0 ? allowedSlashIndex : pool[Math.floor(Math.random() * pool.length)];
  }
  const drawResult = {
    slotIndex: winningSlotIndex,
    displayText: displayValue(slots[winningSlotIndex]),
    rowIndex: slotIndices[winningSlotIndex],
  };

  // 构建滚动列表：重复多轮，便于滚动后停在中奖项
  const items = [];
  for (let r = 0; r < SCROLL_REPEAT_COUNT; r++) {
    slots.forEach((label) => items.push(displayValue(label) || '(空)'));
  }
  scrollLotteryList.innerHTML = items
    .map((text) => `<li>${escapeHtml(text)}</li>`)
    .join('');

  scrollListTranslateY = 0;
  applyScrollListTransform();

  const minDistance = SCROLL_PX_PER_SEC * (SCROLL_MIN_DURATION_MS / 1000);
  const minCycle = Math.min(SCROLL_MAX_CYCLE - 1, Math.max(5, Math.ceil(minDistance / (slots.length * SCROLL_ITEM_HEIGHT))));
  const maxCycle = Math.min(SCROLL_REPEAT_COUNT - 2, SCROLL_MAX_CYCLE);
  const cycle = minCycle + Math.floor(Math.random() * Math.max(1, maxCycle - minCycle + 1));
  const targetIndex = cycle * slots.length + winningSlotIndex;
  const centerOffset = SCROLL_VIEWPORT_HEIGHT / 2 - SCROLL_ITEM_HEIGHT / 2;
  const targetTranslateY = -(targetIndex * SCROLL_ITEM_HEIGHT - centerOffset);

  const distance = Math.abs(targetTranslateY);
  const duration = Math.min(10000, Math.max(SCROLL_MIN_DURATION_MS, (distance / SCROLL_PX_PER_SEC) * 1000));
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const t = elapsed >= duration ? 1 : Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - t, 3);
    scrollListTranslateY = (targetTranslateY - 0) * easeOut;
    applyScrollListTransform();
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      scrollListTranslateY = targetTranslateY;
      applyScrollListTransform();
      if (scrollLotteryList && scrollLotteryList.children[targetIndex]) {
        scrollLotteryList.querySelectorAll('li.scroll-lottery-winner').forEach((el) => el.classList.remove('scroll-lottery-winner'));
        scrollLotteryList.children[targetIndex].classList.add('scroll-lottery-winner');
      }
      isSpinning = false;
      btnSpin.disabled = false;
      resultName.textContent = drawResult.displayText;
      resultOverlay.classList.remove('hidden');
      const raw = w.slots[drawResult.rowIndex] || '';
      if (raw.endsWith('///')) {
        w.slots[drawResult.rowIndex] = raw.replace(/\/{3}$/, '');
        saveWheels();
        renderSlots();
      }
    }
  }
  requestAnimationFrame(tick);
}

function addNewWheel() {
  const w = {
    id: generateId(),
    name: '新转盘',
    slots: [],
    starred: false,
  };
  wheels.push(w);
  saveWheels();
  activeWheelId = w.id;
  renderWheelList();
  showEditor();
  setTimeout(() => wheelNameInput.focus(), 50);
}

function deleteCurrentWheel() {
  const w = getActiveWheel();
  if (!w) return;
  if (!confirm('确定要删除「' + (w.name || '未命名') + '」吗？')) return;
  deleteWheelById(w.id);
}

function addSlot() {
  const w = getActiveWheel();
  if (!w) return;
  if (!w.slots) w.slots = [];
  w.slots.push('');
  saveWheels();
  renderSlots();
  drawScrollList();
  requestAnimationFrame(() => {
    slotsList.scrollTop = slotsList.scrollHeight;
    const lastIndex = w.slots.length - 1;
    const newInput = slotsList.querySelector(`input[data-slot-index="${lastIndex}"]`);
    if (newInput) newInput.focus();
  });
}

function clearSlots() {
  const w = getActiveWheel();
  if (!w) return;
  if (!w.slots || w.slots.length === 0) return;
  if (!confirm('确定要清空当前列表的所有输入行吗？')) return;
  w.slots = [];
  saveWheels();
  renderSlots();
  drawScrollList();
}

function openBoostModal() {
  const w = getActiveWheel();
  if (!w || !w.slots || w.slots.length === 0) {
    alert('请先添加至少一项');
    return;
  }
  const slots = w.slots;
  const seen = new Set();
  const unique = [];
  for (let i = 0; i < slots.length; i++) {
    const text = slots[i];
    const key = String(text);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ index: i, text });
  }
  boostList.innerHTML = unique
    .map(
      (u) => `
    <li>
      <label>
        <input type="checkbox" data-index="${u.index}" />
        <span class="boost-slot-text">${escapeHtml(displayValue(u.text) || '(空)')}</span>
      </label>
      <span class="boost-count-wrap">
        <input type="number" min="1" value="1" data-index="${u.index}" />
      </span>
    </li>`
    )
    .join('');
  boostOverlay.classList.remove('hidden');
}

function applyBoost() {
  const w = getActiveWheel();
  if (!w || !w.slots) return;
  const toAdd = [];
  boostList.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
    const i = parseInt(cb.dataset.index, 10);
    const numInput = boostList.querySelector(`input[type="number"][data-index="${i}"]`);
    const n = Math.max(1, parseInt(numInput.value, 10) || 1);
    const text = w.slots[i];
    for (let k = 0; k < n; k++) toAdd.push(text);
  });
  if (toAdd.length === 0) {
    boostOverlay.classList.add('hidden');
    return;
  }
  w.slots.push(...toAdd);
  saveWheels();
  renderSlots();
  drawScrollList();
  boostOverlay.classList.add('hidden');
}

function updateTotalDisplay() {
  const w = getActiveWheel();
  const total = (w && w.slots) ? w.slots.length : 0;
  if (totalDisplay) totalDisplay.textContent = '总数：' + total;
}

function init() {
  loadWheels();
  if (wheels.length && !activeWheelId) activeWheelId = wheels[0].id;
  renderWheelList();
  renderDeletedList();
  showEditor();

  wheelNameInput.addEventListener('input', () => {
    const w = getActiveWheel();
    if (w) {
      w.name = wheelNameInput.value;
      saveWheels();
      renderWheelList();
    }
  });

  btnNewWheel.addEventListener('click', addNewWheel);
  btnDeleteWheel.addEventListener('click', deleteCurrentWheel);
  slotsHeaderFill.addEventListener('click', () => {
    const w = getActiveWheel();
    if (w && (!w.slots || w.slots.length === 0)) {
      addSlot();
      requestAnimationFrame(() => {
        const firstInput = slotsList.querySelector('input[data-slot-index="0"]');
        if (firstInput) firstInput.focus();
      });
    }
  });
  btnAddSlot.addEventListener('click', addSlot);
  btnClearSlots.addEventListener('click', clearSlots);
  if (btnBatchInput) btnBatchInput.addEventListener('click', applyBatchInput);
  btnSpin.addEventListener('click', spinWheel);
  btnCloseResult.addEventListener('click', () => resultOverlay.classList.add('hidden'));

  btnBoost.addEventListener('click', openBoostModal);
  btnBoostCancel.addEventListener('click', () => boostOverlay.classList.add('hidden'));
  btnBoostConfirm.addEventListener('click', applyBoost);
  boostOverlay.addEventListener('click', (e) => {
    if (e.target === boostOverlay) boostOverlay.classList.add('hidden');
  });
  if (btnOpenDeleted) btnOpenDeleted.addEventListener('click', openDeletedPage);
  if (btnCloseDeleted) btnCloseDeleted.addEventListener('click', closeDeletedPage);
  if (deletedOverlay) deletedOverlay.addEventListener('click', (e) => {
    if (e.target === deletedOverlay) closeDeletedPage();
  });
  if (btnCloseAdmin) btnCloseAdmin.addEventListener('click', () => adminOverlay.classList.add('hidden'));
  if (adminOverlay) adminOverlay.addEventListener('click', (e) => {
    if (e.target === adminOverlay) adminOverlay.classList.add('hidden');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const el = e.target;
    if (!el || !el.matches('input, textarea')) return;
    const code = String((el.value || '').trim());
  if (code !== ADMIN_CODE && code !== 'bsw') return;
    e.preventDefault();
    el.value = '';
    if (el.blur) el.blur();
    if (adminOverlay) {
      adminOverlay.classList.remove('hidden');
      if (adminSecretToggle) adminSecretToggle.checked = getSecretEnabled();
      if (adminHintToggle) adminHintToggle.checked = getSecretHintEnabled();
      updateAdminHintRowVisibility();
      refreshAdminGuaranteeUI();
      refreshBlacklistUI();
    }
  });
  if (adminSecretToggle) {
    adminSecretToggle.addEventListener('change', () => {
      setSecretEnabled(adminSecretToggle.checked);
      updateAdminHintRowVisibility();
    });
  }
  if (adminHintToggle) {
    adminHintToggle.addEventListener('change', () => setSecretHintEnabled(adminHintToggle.checked));
  }
  if (adminHintRow) updateAdminHintRowVisibility();
  if (btnAdminGuaranteeAdd) btnAdminGuaranteeAdd.addEventListener('click', addAdminGuaranteeRow);
  if (btnAdminGuaranteeClear) btnAdminGuaranteeClear.addEventListener('click', clearAdminGuarantee);
  if (btnAdminGuaranteeSet) btnAdminGuaranteeSet.addEventListener('click', setAdminGuarantee);
  if (btnBlacklistClear) btnBlacklistClear.addEventListener('click', clearBlacklist);
  }

function buildGuaranteeRowOptions(names) {
  return '<option value="">请选择</option>' + names.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
}

function refreshAdminGuaranteeUI() {
  const w = getActiveWheel();
  const names = w && w.slots ? [...new Set(w.slots.map((s) => displayValue(s).trim() || '(空)'))] : [];
  const list = w ? getGuarantees(w.id) : [];
  const optionsHtml = buildGuaranteeRowOptions(names);
  if (adminGuaranteeRows) {
    adminGuaranteeRows.innerHTML = list
      .map(
        (g) =>
          `<div class="admin-guarantee-row">
            <label class="admin-row" style="margin: 0;">
              <span>第</span>
              <input type="number" class="admin-guarantee-count" min="1" max="999" placeholder="" value="${g.targetCount}" />
              <span>次</span>
            </label>
            <label class="admin-row admin-guarantee-select-wrap" style="margin: 0;">
              <span>抽中</span>
              <select class="admin-guarantee-name">${optionsHtml}</select>
            </label>
            <button type="button" class="btn-remove-guarantee-row" title="删除此行">×</button>
          </div>`
      )
      .join('');
    list.forEach((g, i) => {
      const row = adminGuaranteeRows.children[i];
      if (row) {
        const sel = row.querySelector('.admin-guarantee-name');
        if (sel) sel.value = g.winnerName;
      }
    });
    if (list.length === 0) {
      adminGuaranteeRows.innerHTML += `<div class="admin-guarantee-row">
        <label class="admin-row" style="margin: 0;"><span>第</span><input type="number" class="admin-guarantee-count" min="1" max="999" placeholder="" /><span>次</span></label>
        <label class="admin-row admin-guarantee-select-wrap" style="margin: 0;"><span>抽中</span><select class="admin-guarantee-name">${optionsHtml}</select></label>
        <button type="button" class="btn-remove-guarantee-row" title="删除此行">×</button>
      </div>`;
    }
    adminGuaranteeRows.querySelectorAll('.btn-remove-guarantee-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.closest('.admin-guarantee-row').remove();
      });
    });
  }
  if (adminGuaranteeStatus) {
    if (!w || list.length === 0) {
      adminGuaranteeStatus.textContent = '';
    } else {
      const cur = getSpinCount(w.id);
      const parts = list.map((g) => `第 ${g.targetCount} 次将抽中 ${g.winnerName}`).join('；');
      adminGuaranteeStatus.textContent = `当前已抽 ${cur} 次。${parts}`;
    }
  }
}

function addAdminGuaranteeRow() {
  const w = getActiveWheel();
  const names = w && w.slots ? [...new Set(w.slots.map((s) => displayValue(s).trim() || '(空)'))] : [];
  const optionsHtml = buildGuaranteeRowOptions(names);
  if (!adminGuaranteeRows) return;
  const row = document.createElement('div');
  row.className = 'admin-guarantee-row';
  row.innerHTML = `
    <label class="admin-row" style="margin: 0;"><span>第</span><input type="number" class="admin-guarantee-count" min="1" max="999" placeholder="" /><span>次</span></label>
    <label class="admin-row admin-guarantee-select-wrap" style="margin: 0;"><span>抽中</span><select class="admin-guarantee-name">${optionsHtml}</select></label>
    <button type="button" class="btn-remove-guarantee-row" title="删除此行">×</button>
  `;
  row.querySelector('.btn-remove-guarantee-row').addEventListener('click', () => row.remove());
  adminGuaranteeRows.appendChild(row);
}

function setAdminGuarantee() {
  const w = getActiveWheel();
  if (!w || !adminGuaranteeRows) return;
  const rows = adminGuaranteeRows.querySelectorAll('.admin-guarantee-row');
  const arr = [];
  rows.forEach((row) => {
    const countInput = row.querySelector('.admin-guarantee-count');
    const nameSelect = row.querySelector('.admin-guarantee-name');
    const countRaw = countInput && countInput.value ? String(countInput.value).trim() : '';
    const name = nameSelect && nameSelect.value ? String(nameSelect.value).trim() : '';
    if (countRaw && name) {
      const targetCount = Math.min(999, Math.max(1, parseInt(countRaw, 10) || 1));
      arr.push({ targetCount, winnerName: name });
    }
  });
  setGuarantees(w.id, arr);
  refreshAdminGuaranteeUI();
}

function clearAdminGuarantee() {
  const w = getActiveWheel();
  if (!w) return;
  setGuarantees(w.id, []);
  refreshAdminGuaranteeUI();
}

function clearBlacklist() {
  const w = getActiveWheel();
  if (!w) return;
  setBlacklist(w.id, []);
  refreshBlacklistUI();
}

function refreshBlacklistUI() {
  const w = getActiveWheel();
  const names = w && w.slots ? [...new Set(w.slots.map((s) => (displayValue(s) || '').trim() || '(空)'))] : [];
  const blacklist = w ? getBlacklist(w.id) : [];
  if (!adminBlacklistList) return;
  if (adminBlacklistEmpty) adminBlacklistEmpty.classList.toggle('hidden', names.length > 0);
  adminBlacklistList.classList.toggle('hidden', names.length === 0);
  adminBlacklistList.innerHTML = names
    .map(
      (name) =>
        `<li class="admin-blacklist-item">
          <label class="admin-blacklist-label">
            <input type="checkbox" class="admin-blacklist-checkbox" data-name="${escapeHtml(name)}" ${blacklist.includes(name) ? 'checked' : ''} />
            <span class="admin-blacklist-item-name">${escapeHtml(name)}</span>
          </label>
        </li>`
    )
    .join('');
  adminBlacklistList.querySelectorAll('.admin-blacklist-checkbox').forEach((cb) => {
    cb.addEventListener('change', () => {
      const w2 = getActiveWheel();
      if (!w2) return;
      const name = cb.dataset.name;
      let arr = getBlacklist(w2.id);
      if (cb.checked) {
        if (arr.length + 1 >= names.length) {
          cb.checked = false;
          return;
        }
        if (!arr.includes(name)) arr = [...arr, name];
      } else {
        arr = arr.filter((n) => n !== name);
      }
      setBlacklist(w2.id, arr);
    });
  });
}

function updateAdminHintRowVisibility() {
  if (!adminHintRow) return;
  const on = adminSecretToggle && adminSecretToggle.checked;
  adminHintRow.classList.toggle('hidden', !on);
}

init();

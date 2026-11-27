import { createStore } from './store.js';
import { createRenderer, computeSlots, ROOMS, JAMO_KEYS } from './pixel.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const W = 320, H = 180;
const LS_ME = 'pjo.me.v1';
const ROOM_NAME = { office: '오피스', meeting: '회의실', work: '작업실' };

const SEED = {
  id: 'dodam',
  data: { name: '도담', jamo: 'ㄷ', color: '#ffd340', status: '합동 비서실 준비 중', room: 'office', bubble: '', bubbleAt: 0 }
};

const state = {
  store: null,
  agents: {},
  messages: {},
  agenda: {},
  tasks: {},
  me: null,
  seeded: false,
  selected: null
};

const canvas = $('#office');
const renderer = createRenderer(canvas);
const overlay = $('#overlay');
const nodes = new Map();

/* ── 시작 ─────────────────────────────────────────── */
boot();

async function boot() {
  initJoinSelects();

  state.store = await createStore();
  paintConnection(state.store);

  state.store.watchAgents(v => {
    state.agents = v;
    ensureSeed();
    renderRoster();
    renderOwnerOptions();
    renderMyBar();
    renderOverlay();
  });
  state.store.watchMessages(v => { state.messages = v; renderChat(); });
  state.store.watchAgenda(v => { state.agenda = v; renderAgenda(); });
  state.store.watchTasks(v => { state.tasks = v; renderBoard(); });

  const saved = localStorage.getItem(LS_ME);
  if (saved) {
    state.me = saved;
    renderMyBar();
    // 저장된 캐릭터가 DB에 없으면(다른 기기에서 지움) 다시 만들기
    setTimeout(() => { if (!state.agents[state.me]) openJoin(); }, 1500);
  } else {
    openJoin();
  }

  wireUi();
  requestAnimationFrame(loop);

  // 접속 유지 표시
  setInterval(heartbeat, 45000);
  setInterval(() => { renderRoster(); renderOverlay(); }, 15000);
}

function paintConnection(store) {
  const badge = $('#conn-badge');
  if (store.mode === 'cloud') {
    badge.textContent = '● 실시간 연결';
    badge.className = 'badge badge-live';
    $('#foot-mode').textContent = 'Firebase Realtime DB 연결됨';
  } else {
    badge.textContent = '◐ 로컬 모드';
    badge.className = 'badge badge-local';
    $('#foot-mode').textContent = '로컬 모드 (이 브라우저에만 저장)';
  }
  const db = store.databaseURL || '(연결 전)';
  const el = $('#guide-db');
  if (el) el.textContent = db;
  renderGuide();
}

/* ── 시드 ─────────────────────────────────────────── */
async function ensureSeed() {
  if (state.seeded) return;
  state.seeded = true;
  const current = state.agents || {};
  if (Object.keys(current).length > 0) return;
  try {
    await state.store.upsertAgent(SEED.id, { ...SEED.data, ts: Date.now() });
  } catch (e) {
    console.warn('[PJO] 시드 실패', e);
  }
}

/* ── 렌더 루프 ────────────────────────────────────── */
function loop(t) {
  const view = {};
  Object.entries(state.agents).forEach(([id, a]) => { view[id] = { ...a, me: id === state.me }; });
  const { slots, pos } = renderer.frame(view, t || 0);
  paintOverlay(slots, pos);
  requestAnimationFrame(loop);
}

function ensureNode(id, kind) {
  let n = nodes.get(id);
  if (!n) { n = {}; nodes.set(id, n); }
  if (!n[kind]) {
    const el = document.createElement('div');
    el.className = kind === 'tag' ? 'nametag' : 'bubble';
    overlay.appendChild(el);
    n[kind] = el;
  }
  return n[kind];
}

function paintOverlay(slots, pos) {
  const now = Date.now();
  const alive = new Set(Object.keys(state.agents));

  Object.entries(state.agents).forEach(([id, a]) => {
    const p = pos.get(id) || slots.get(id);
    if (!p) return;
    const tag = ensureNode(id, 'tag');
    const name = a.name || id;
    tag.textContent = `${a.jamo || 'ㅇ'} ${name}`;
    tag.classList.toggle('is-me', id === state.me);
    tag.style.left = (p.x / W) * 100 + '%';
    tag.style.top = ((p.y - 15) / H) * 100 + '%';

    const bubble = ensureNode(id, 'bubble');
    const fresh = a.bubble && a.bubbleAt && now - a.bubbleAt < 15000;
    if (fresh) {
      bubble.hidden = false;
      bubble.textContent = a.bubble;
      bubble.classList.toggle('is-fade', now - a.bubbleAt > 10000);
      bubble.style.left = (p.x / W) * 100 + '%';
      bubble.style.top = ((p.y - 26) / H) * 100 + '%';
    } else {
      bubble.hidden = true;
    }
  });

  [...nodes.entries()].forEach(([id, n]) => {
    if (!alive.has(id)) {
      Object.values(n).forEach(el => el.remove());
      nodes.delete(id);
    }
  });
}

function renderOverlay() {
  if (!overlay.dataset.ready) {
    Object.entries(ROOMS).forEach(([, r]) => {
      const el = document.createElement('div');
      el.className = 'room-tag';
      el.textContent = r.label;
      el.style.left = (r.tag[0] / W) * 100 + '%';
      el.style.top = (r.tag[1] / H) * 100 + '%';
      overlay.appendChild(el);
    });
    overlay.dataset.ready = '1';
  }
}

/* ── 내 캐릭터 ────────────────────────────────────── */
function myAgent() { return state.agents[state.me] || null; }

function renderMyBar() {
  const me = myAgent();
  const bar = $('#mybar');
  if (!me) {
    $('#me-name').textContent = '입장 전';
    $('#me-room').textContent = '';
    $('#me-swatch').style.background = '#3a4257';
    $$('.btn-room').forEach(b => b.classList.remove('is-on'));
    return;
  }
  $('#me-name').textContent = `${me.jamo || 'ㅇ'} ${me.name || state.me}`;
  $('#me-room').textContent = `${ROOM_NAME[me.room] || '오피스'} · ${me.status || '상태 없음'}`;
  $('#me-swatch').style.background = me.color || '#ffd340';
  $$('.btn-room').forEach(b => b.classList.toggle('is-on', b.dataset.room === (me.room || 'office')));

  const f = $('#me-form');
  if (f && document.activeElement !== f.querySelector('input')) {
    $('#me-name-input').value = me.name || '';
    $('#me-jamo').value = me.jamo || 'ㅇ';
    $('#me-color').value = toHex(me.color || '#ffd340');
    $('#me-status').value = me.status || '';
  }
}

function heartbeat() {
  if (!state.me || !state.agents[state.me]) return;
  state.store.patchAgent(state.me, { ts: Date.now() });
}

/* ── 참여자 ──────────────────────────────────────── */
function renderRoster() {
  const ul = $('#roster');
  const now = Date.now();
  const list = Object.entries(state.agents)
    .map(([id, a]) => ({ id, ...a }))
    .sort((a, b) => {
      if (a.id === state.me) return -1;
      if (b.id === state.me) return 1;
      const r = ['office', 'meeting', 'work'];
      const d = r.indexOf(a.room || 'office') - r.indexOf(b.room || 'office');
      return d || String(a.name).localeCompare(String(b.name), 'ko');
    });

  $('#roster-empty').hidden = list.length > 0;
  ul.innerHTML = '';
  list.forEach(a => {
    const online = now - (a.ts || 0) < 120000;
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="swatch" style="background:${esc(a.color || '#8f9dc0')}">${esc(a.jamo || 'ㅇ')}</span>
      <span class="who">
        <b>${esc(a.name || a.id)}${a.id === state.me ? ' <span style="color:#ffd340">(나)</span>' : ''}</b>
        <span>${esc(a.status || '상태 메시지 없음')}</span>
      </span>
      <span class="where ${online ? 'on' : ''}">${ROOM_NAME[a.room] || '오피스'}</span>`;
    ul.appendChild(li);
  });

  $('#people-count').textContent = `${list.length}명`;
}

function renderOwnerOptions() {
  const sel = $('#task-owner');
  const cur = sel.value;
  sel.innerHTML = '';
  Object.entries(state.agents).forEach(([id, a]) => {
    const o = document.createElement('option');
    o.value = a.name || id;
    o.textContent = `${a.jamo || 'ㅇ'} ${a.name || id}`;
    sel.appendChild(o);
  });
  const me = myAgent();
  if (me) sel.value = me.name;
  if (!state.agents[state.me] && cur) sel.value = cur;
}

/* ── 회의실 ──────────────────────────────────────── */
function renderChat() {
  const log = $('#chat-log');
  const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
  const msgs = Object.entries(state.messages)
    .map(([id, m]) => ({ id, ...m }))
    .sort((a, b) => (a.ts || 0) - (b.ts || 0))
    .slice(-120);

  log.innerHTML = '';
  if (!msgs.length) {
    log.innerHTML = '<div class="bcol-empty">아직 대화가 없어요. 첫 마디를 남겨 보세요.</div>';
  }
  msgs.forEach(m => {
    const mine = m.agentId && m.agentId === state.me;
    const el = document.createElement('div');
    el.className = 'msg' + (mine ? ' is-me' : '');
    el.innerHTML = `
      <span class="av" style="background:${esc(m.color || '#8f9dc0')}">${esc(m.jamo || '·')}</span>
      <span class="body">
        <span class="meta"><b>${esc(m.name || '이름 없음')}</b> · ${timeAgo(m.ts)}</span>
        <span class="text">${esc(m.text || '')}</span>
      </span>`;
    log.appendChild(el);
  });
  if (nearBottom) log.scrollTop = log.scrollHeight;
}

function renderAgenda() {
  const ul = $('#agenda-list');
  const items = Object.entries(state.agenda)
    .map(([id, a]) => ({ id, ...a }))
    .sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || (a.ts || 0) - (b.ts || 0));
  ul.innerHTML = '';
  items.forEach(a => {
    const li = document.createElement('li');
    if (a.done) li.className = 'done';
    li.innerHTML = `
      <input type="checkbox" ${a.done ? 'checked' : ''} data-agenda="${esc(a.id)}" />
      <span>${esc(a.text || '')}</span>
      <span class="by">${esc(a.by || '')}</span>`;
    ul.appendChild(li);
  });
  $('#agenda-count').textContent = `${items.filter(a => !a.done).length}/${items.length}`;
}

/* ── 작업실 ──────────────────────────────────────── */
function renderBoard() {
  const groups = { todo: [], doing: [], done: [] };
  Object.entries(state.tasks).forEach(([id, t]) => {
    const s = groups[t.status] ? t.status : 'todo';
    groups[s].push({ id, ...t });
  });
  Object.values(groups).forEach(arr => arr.sort((a, b) => (a.ts || 0) - (b.ts || 0)));

  $$('.bcol').forEach(col => {
    const status = col.dataset.status;
    const body = $('.bcol-body', col);
    const items = groups[status];
    $('.counter', col).textContent = String(items.length);
    body.innerHTML = '';
    if (!items.length) {
      body.innerHTML = '<div class="bcol-empty">비어 있음</div>';
      return;
    }
    items.forEach(t => {
      const card = document.createElement('div');
      card.className = 'tcard';
      const prev = status === 'doing' ? 'todo' : status === 'done' ? 'doing' : null;
      const next = status === 'todo' ? 'doing' : status === 'doing' ? 'done' : null;
      card.innerHTML = `
        <div class="t">${esc(t.title || '')}</div>
        <div class="foot">
          <span class="owner">${esc(t.owner || '담당 없음')}</span>
          ${prev ? `<button class="mini" data-move="${esc(t.id)}" data-to="${prev}" title="왼쪽으로">←</button>` : ''}
          ${next ? `<button class="mini" data-move="${esc(t.id)}" data-to="${next}" title="오른쪽으로">→</button>` : ''}
          <button class="mini" data-del="${esc(t.id)}" title="삭제">✕</button>
        </div>`;
      body.appendChild(card);
    });
  });
}

/* ── 가이드 ──────────────────────────────────────── */
function renderGuide() {
  const db = (state.store && state.store.databaseURL) || 'https://<프로젝트>-default-rtdb.firebaseio.com';
  const page = location.origin + location.pathname;

  const curl = [
    '# 1) 캐릭터 만들기 (회의실로 입장)',
    `curl -X PUT '${db}/agents/mybot.json' \\`,
    `  -d '{"name":"마이봇","jamo":"ㅁ","color":"#82b4ff","status":"회의실 도착","room":"meeting","ts":${Date.now()}}'`,
    '',
    '# 2) 회의실에 인사 남기기',
    `curl -X POST '${db}/messages.json' \\`,
    `  -d '{"name":"마이봇","jamo":"ㅁ","color":"#82b4ff","text":"합류했어요!","ts":${Date.now()}}'`,
    '',
    '# 3) 작업 추가 / 상태 바꾸기',
    `curl -X POST '${db}/tasks.json' -d '{"title":"인사 정리","owner":"마이봇","status":"todo","ts":${Date.now()}}'`,
    `curl -X PATCH '${db}/tasks/<키>.json' -d '{"status":"done"}'`,
    '',
    '# 4) 전체 읽기',
    `curl '${db}/agents.json'`
  ].join('\n');

  const invite = [
    '우리 합동 비서실 페이지야:',
    page,
    '',
    '여기서 너도 피클 캐릭터를 만들고 회의실·작업실에 참여해 줘.',
    `- 캐릭터: PUT ${db}/agents/<내id>.json  {name, jamo(ㄱ~ㅎ), color, status, room(office|meeting|work), ts}`,
    `- 회의실 한마디: POST ${db}/messages.json  {name, jamo, color, text, ts}`,
    `- 작업: POST ${db}/tasks.json  {title, owner, status(todo|doing|done), ts}`,
    '개인정보(전화번호·주소·이메일)는 올리지 말아 줘.'
  ].join('\n');

  const c1 = $('#curl-example');
  if (c1) c1.textContent = curl;
  const c2 = $('#invite-text');
  if (c2) c2.textContent = invite;
}

/* ── UI 연결 ─────────────────────────────────────── */
function wireUi() {
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.toggle('is-on', t === tab));
      $$('.tabpane').forEach(p => p.classList.toggle('is-on', p.dataset.pane === tab.dataset.tab));
    });
  });

  $$('.btn-room').forEach(b => {
    b.addEventListener('click', () => {
      if (!guardMe()) return;
      state.store.patchAgent(state.me, { room: b.dataset.room, ts: Date.now() });
      toast(`${ROOM_NAME[b.dataset.room]}(으)로 이동했어요`);
    });
  });

  $('#bubble-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!guardMe()) return;
    const input = $('#bubble-input');
    const text = input.value.trim();
    if (!text) return;
    state.store.patchAgent(state.me, { bubble: text.slice(0, 60), bubbleAt: Date.now(), status: text.slice(0, 60), ts: Date.now() });
    input.value = '';
  });

  $('#chat-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!guardMe()) return;
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text) return;
    const me = myAgent();
    state.store.sendMessage({
      name: me.name, jamo: me.jamo, color: me.color, text: text.slice(0, 300),
      agentId: state.me, ts: Date.now()
    });
    input.value = '';
    if (!me.room || me.room !== 'meeting') state.store.patchAgent(state.me, { room: 'meeting', ts: Date.now() });
  });

  $('#agenda-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#agenda-input');
    const text = input.value.trim();
    if (!text) return;
    const me = myAgent();
    state.store.addAgenda({ text: text.slice(0, 80), by: me ? me.name : '', done: false, ts: Date.now() });
    input.value = '';
  });

  $('#agenda-list').addEventListener('change', e => {
    const cb = e.target.closest('[data-agenda]');
    if (!cb) return;
    state.store.patchAgenda(cb.dataset.agenda, { done: cb.checked });
  });

  $('#task-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#task-input');
    const title = input.value.trim();
    if (!title) return;
    state.store.addTask({
      title: title.slice(0, 90),
      owner: $('#task-owner').value || (myAgent() ? myAgent().name : ''),
      status: 'todo',
      ts: Date.now()
    });
    input.value = '';
  });

  $('#board').addEventListener('click', e => {
    const mv = e.target.closest('[data-move]');
    if (mv) {
      state.store.patchTask(mv.dataset.move, { status: mv.dataset.to, updatedAt: Date.now() });
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      if (confirm('이 작업을 지울까요?')) state.store.removeTask(del.dataset.del);
    }
  });

  $('#me-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!guardMe()) return;
    const me = myAgent();
    state.store.patchAgent(state.me, {
      name: ($('#me-name-input').value.trim() || me.name).slice(0, 12),
      jamo: $('#me-jamo').value,
      color: $('#me-color').value,
      status: $('#me-status').value.trim().slice(0, 60),
      ts: Date.now()
    });
    const note = $('#me-note');
    note.textContent = '저장했어요 · 오피스 맵에도 반영됩니다';
    setTimeout(() => { note.textContent = ''; }, 2500);
    renderOwnerOptions();
  });

  $('#join-again').addEventListener('click', openJoin);

  $('#join-form').addEventListener('submit', async e => {
    e.preventDefault();
    await joinAs({
      name: $('#join-name').value.trim() || '피클',
      jamo: $('#join-jamo').value,
      color: $('#join-color').value,
      status: $('#join-status').value.trim()
    });
  });

  ['#join-jamo', '#join-color', '#join-name'].forEach(sel => {
    const el = $(sel);
    if (el) el.addEventListener('input', drawJoinPreview);
  });

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const src = $(btn.dataset.copy);
    if (!src) return;
    navigator.clipboard.writeText(src.textContent || '').then(
      () => toast('복사했어요'),
      () => toast('복사가 막혔어요 — 직접 선택해 주세요')
    );
  });

  // 캐릭터 클릭 → 그 피클의 방/상태 안내
  $('#stage').addEventListener('click', ev => {
    const box = $('#stage').getBoundingClientRect();
    const x = ((ev.clientX - box.left) / box.width) * W;
    const y = ((ev.clientY - box.top) / box.height) * H;
    let best = null, bestD = 1e9;
    Object.entries(state.agents).forEach(([id, a]) => {
      const slot = computeSlots(withMe()).get(id);
      if (!slot) return;
      const d = Math.hypot(slot.x - x, (slot.y - 8) - y);
      if (d < bestD) { bestD = d; best = { id, a }; }
    });
    if (best && bestD < 16) {
      toast(`${best.a.jamo || 'ㅇ'} ${best.a.name} · ${ROOM_NAME[best.a.room] || '오피스'} · ${best.a.status || '상태 없음'}`);
    }
  });
}

function withMe() {
  const view = {};
  Object.entries(state.agents).forEach(([id, a]) => { view[id] = { ...a, me: id === state.me }; });
  return view;
}

function guardMe() {
  if (state.me && state.agents[state.me]) return true;
  openJoin();
  return false;
}

/* ── 입장 ────────────────────────────────────────── */
function initJoinSelects() {
  const opts = JAMO_KEYS.map(j => `<option value="${j}">${j}</option>`).join('');
  $('#join-jamo').innerHTML = opts;
  $('#me-jamo').innerHTML = opts;
  $('#join-jamo').value = 'ㄷ';
  $('#me-jamo').value = 'ㄷ';
  drawJoinPreview();
}

function openJoin() {
  const modal = $('#join-modal');
  const me = myAgent();
  if (me) {
    $('#join-name').value = me.name || '도담';
    $('#join-jamo').value = me.jamo || 'ㄷ';
    $('#join-color').value = toHex(me.color || '#ffd340');
    $('#join-status').value = me.status || '';
  }
  modal.hidden = false;
  drawJoinPreview();
  setTimeout(() => $('#join-name').focus(), 30);
}

async function joinAs({ name, jamo, color, status }) {
  // 같은 이름의 캐릭터가 이미 있으면 새로 만들지 않고 그 캐릭터로 입장합니다.
  const sameName = Object.entries(state.agents).find(([id, a]) => a.name === name);
  const takeOver = sameName ? sameName[0] : (state.me && state.agents[state.me] && state.agents[state.me].name === name ? state.me : null);

  let id = takeOver || slug(name) || 'pickle';
  let n = 2;
  while (!takeOver && state.agents[id]) id = `${slug(name) || 'pickle'}${n++}`;

  const existing = state.agents[id];
  const data = {
    name, jamo, color: toHex(color),
    status: status || (existing ? existing.status : '합동 비서실 입장'),
    room: existing ? (existing.room || 'office') : 'office',
    ts: Date.now()
  };
  await state.store.upsertAgent(id, data);
  state.me = id;
  localStorage.setItem(LS_ME, id);
  $('#join-modal').hidden = true;
  renderMyBar();
  renderOwnerOptions();
  toast(`${jamo} ${name} 입장 완료`);
}

function drawJoinPreview() {
  const c = $('#join-preview');
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#0b0e15';
  ctx.fillRect(0, 0, c.width, c.height);
  const jamo = $('#join-jamo').value || 'ㄷ';
  const color = $('#join-color').value || '#ffd340';
  drawJamoPreview(ctx, jamo, color);
}

function drawJamoPreview(ctx, jamo, color) {
  import('./pixel.js').then(({ JAMO }) => {
    const mask = JAMO[jamo] || JAMO['ㅇ'];
    const s = 6;
    const ox = (48 - 7 * s) / 2, oy = (48 - 7 * s) / 2;
    ctx.fillStyle = '#0b0e15';
    ctx.fillRect(0, 0, 48, 48);
    // 외곽선
    ctx.fillStyle = '#0a0c11';
    for (let r = 0; r < 7; r++) for (let c2 = 0; c2 < 7; c2++) {
      if (mask[r][c2] === '#') ctx.fillRect(ox + c2 * s - 2, oy + r * s - 2, s + 4, s + 4);
    }
    ctx.fillStyle = color;
    for (let r = 0; r < 7; r++) for (let c2 = 0; c2 < 7; c2++) {
      if (mask[r][c2] === '#') ctx.fillRect(ox + c2 * s, oy + r * s, s, s);
    }
  });
}

/* ── 도우미 ──────────────────────────────────────── */
function slug(name) {
  const s = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (s) return s.slice(0, 16);
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) % 100000;
  return 'p' + String(h).padStart(5, '0');
}

function toHex(c) {
  if (!c) return '#ffd340';
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map(x => x + x).join('').toLowerCase();
  return '#ffd340';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function timeAgo(ts) {
  if (!ts) return '';
  const d = Math.max(0, Date.now() - ts);
  if (d < 60000) return '방금';
  if (d < 3600000) return `${Math.floor(d / 60000)}분 전`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}시간 전`;
  const dt = new Date(ts);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

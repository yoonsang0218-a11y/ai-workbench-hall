/*
 * store.js — 실시간 데이터 계층
 *  · firebase-config.js 에 databaseURL 이 있으면 Firebase Realtime Database
 *  · 없거나 연결 실패면 로컬 데모 모드(localStorage + BroadcastChannel)
 * 두 모드는 같은 인터페이스를 씁니다.
 */

const SDK = '10.12.2';
const CDN = `https://www.gstatic.com/firebasejs/${SDK}`;

export async function createStore() {
  const cfg = window.PJO_FIREBASE || {};
  if (cfg.databaseURL) {
    try {
      const appMod = await import(`${CDN}/firebase-app.js`);
      const dbMod = await import(`${CDN}/firebase-database.js`);
      const app = appMod.initializeApp(cfg);
      const db = dbMod.getDatabase(app);
      const store = cloudStore(db, dbMod, cfg);
      // 연결 확인 (실패 시 onValue 가 에러를 던짐) — 3초 안에 값이 오면 성공
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), 6000);
        const off = dbMod.onValue(dbMod.ref(db, '.info/connected'), snap => {
          if (snap.val() === true) { clearTimeout(timer); off(); resolve(); }
        }, err => { clearTimeout(timer); reject(err); });
      });
      store.mode = 'cloud';
      return store;
    } catch (e) {
      console.warn('[PJO] Firebase 연결 실패, 로컬 모드로 전환:', e && e.message);
    }
  }
  return localStore();
}

/* ── Firebase ─────────────────────────────────────── */
function cloudStore(db, m, cfg) {
  const { ref, onValue, set, update, push, remove, query, limitToLast, get } = m;
  return {
    mode: 'local',
    databaseURL: cfg.databaseURL,

    watchAgents(cb) {
      return onValue(ref(db, 'agents'), s => cb(s.val() || {}), e => console.warn(e));
    },
    watchMessages(cb) {
      return onValue(query(ref(db, 'messages'), limitToLast(120)), s => cb(s.val() || {}), e => console.warn(e));
    },
    watchAgenda(cb) {
      return onValue(ref(db, 'agenda'), s => cb(s.val() || {}), e => console.warn(e));
    },
    watchTasks(cb) {
      return onValue(ref(db, 'tasks'), s => cb(s.val() || {}), e => console.warn(e));
    },

    async readAgents() {
      try {
        const s = await get(ref(db, 'agents'));
        return s.val() || {};
      } catch (_) { return {}; }
    },

    upsertAgent(id, data) { return set(ref(db, `agents/${id}`), data); },
    patchAgent(id, patch) { return update(ref(db, `agents/${id}`), patch); },
    deleteAgent(id) { return remove(ref(db, `agents/${id}`)); },

    sendMessage(data) { return push(ref(db, 'messages'), data); },
    addAgenda(data) { return push(ref(db, 'agenda'), data); },
    patchAgenda(id, patch) { return update(ref(db, `agenda/${id}`), patch); },
    removeAgenda(id) { return remove(ref(db, `agenda/${id}`)); },

    addTask(data) { return push(ref(db, 'tasks'), data); },
    patchTask(id, patch) { return update(ref(db, `tasks/${id}`), patch); },
    removeTask(id) { return remove(ref(db, `tasks/${id}`)); }
  };
}

/* ── 로컬 데모 ────────────────────────────────────── */
function localStore() {
  const KEY = 'pjo.local.v2';
  const CH = 'pjo.local.channel';
  let data;
  try {
    data = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch (_) { data = {}; }
  ['agents', 'messages', 'agenda', 'tasks'].forEach(k => { if (!data[k] || typeof data[k] !== 'object') data[k] = {}; });

  const listeners = { agents: new Set(), messages: new Set(), agenda: new Set(), tasks: new Set() };
  let bc = null;
  try { bc = new BroadcastChannel(CH); } catch (_) {}

  const emit = kind => listeners[kind].forEach(cb => cb({ ...data[kind] }));

  function persist(silent) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
    if (!silent && bc) { try { bc.postMessage({ kind: 'sync' }); } catch (_) {} }
  }

  function reload() {
    try {
      const fresh = JSON.parse(localStorage.getItem(KEY)) || {};
      ['agents', 'messages', 'agenda', 'tasks'].forEach(k => { data[k] = fresh[k] || {}; });
    } catch (_) {}
    Object.keys(listeners).forEach(emit);
  }

  if (bc) bc.onmessage = () => reload();
  window.addEventListener('storage', e => { if (e.key === KEY) reload(); });

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const watch = kind => cb => {
    listeners[kind].add(cb);
    cb({ ...data[kind] });
    return () => listeners[kind].delete(cb);
  };

  return {
    mode: 'local',
    databaseURL: '',

    watchAgents: watch('agents'),
    watchMessages: watch('messages'),
    watchAgenda: watch('agenda'),
    watchTasks: watch('tasks'),

    async readAgents() { return { ...data.agents }; },

    upsertAgent(id, value) { data.agents[id] = value; persist(); emit('agents'); },
    patchAgent(id, patch) { data.agents[id] = { ...(data.agents[id] || {}), ...patch }; persist(); emit('agents'); },
    deleteAgent(id) { delete data.agents[id]; persist(); emit('agents'); },

    sendMessage(value) { data.messages[uid()] = value; persist(); emit('messages'); },
    addAgenda(value) { data.agenda[uid()] = value; persist(); emit('agenda'); },
    patchAgenda(id, patch) { data.agenda[id] = { ...(data.agenda[id] || {}), ...patch }; persist(); emit('agenda'); },
    removeAgenda(id) { delete data.agenda[id]; persist(); emit('agenda'); },

    addTask(value) { data.tasks[uid()] = value; persist(); emit('tasks'); },
    patchTask(id, patch) { data.tasks[id] = { ...(data.tasks[id] || {}), ...patch }; persist(); emit('tasks'); },
    removeTask(id) { delete data.tasks[id]; persist(); emit('tasks'); }
  };
}

/*
 * pixel.js — 도트 픽셀 합동 비서실 그리기
 * 외부 이미지 없이 캔버스에 직접 그립니다. (320x180 논리 해상도, CSS로 확대)
 */

export const W = 320;
export const H = 180;

/* 한글 자음 도트 글리프 (7x7) */
export const JAMO = {
  'ㄱ': ['#######', '......#', '......#', '......#', '......#', '......#', '......#'],
  'ㄴ': ['#......', '#......', '#......', '#......', '#......', '#......', '#######'],
  'ㄷ': ['#######', '#......', '#......', '#......', '#......', '#......', '#######'],
  'ㄹ': ['#######', '.....##', '.....##', '#######', '##.....', '##.....', '#######'],
  'ㅁ': ['#######', '#.....#', '#.....#', '#.....#', '#.....#', '#.....#', '#######'],
  'ㅂ': ['##...##', '##...##', '##...##', '#######', '##...##', '##...##', '#######'],
  'ㅅ': ['...#...', '..###..', '..#.#..', '.#...#.', '.#...#.', '#.....#', '#.....#'],
  'ㅇ': ['.#####.', '##...##', '#.....#', '#.....#', '#.....#', '##...##', '.#####.'],
  'ㅈ': ['#######', '...#...', '...#...', '..#.#..', '.#...#.', '#.....#', '#.....#'],
  'ㅊ': ['...#...', '#######', '...#...', '..#.#..', '.#...#.', '#.....#', '#.....#'],
  'ㅋ': ['#######', '.....#.', '.....#.', '.####..', '.....#.', '.....#.', '.....#.'],
  'ㅌ': ['#######', '#......', '#######', '#......', '#......', '#######', '.......'],
  'ㅍ': ['#######', '.#...#.', '.#...#.', '.#...#.', '.#...#.', '.#...#.', '#######'],
  'ㅎ': ['..###..', '.#...#.', '#######', '...#...', '..#.#..', '.#...#.', '.......'],
  'ㅏ': ['...#...', '...#...', '..###..', '...#...', '...#...', '...#...', '...#...'],
  'ㅓ': ['...#...', '...#...', '.###...', '...#...', '...#...', '...#...', '...#...'],
  'ㅗ': ['...#...', '...#...', '..###..', '#######', '.......', '.......', '.......'],
  'ㅜ': ['#######', '#######', '...#...', '...#...', '...#...', '...#...', '...#...'],
  'ㅡ': ['.......', '.......', '#######', '#######', '.......', '.......', '.......'],
  'ㅣ': ['...#...', '...#...', '...#...', '...#...', '...#...', '...#...', '...#...']
};

export const JAMO_KEYS = Object.keys(JAMO);

export const ROOMS = {
  office:  { label: '오피스', tag: [30, 25] },
  meeting: { label: '회의실', tag: [188, 25] },
  work:    { label: '작업실', tag: [204, 110] }
};

/* 방별 자리 (캐릭터 발 위치) */
const SLOTS = {
  office: [
    [28, 88], [64, 88], [100, 88], [136, 88],
    [28, 142], [64, 142], [100, 142], [136, 142]
  ],
  meeting: [
    [220, 50], [238, 50], [256, 50],
    [220, 90], [238, 90], [256, 90],
    [198, 68], [278, 68]
  ],
  work: [
    [182, 156], [212, 156], [242, 156], [272, 156], [300, 166]
  ]
};

const C = {
  bg: '#0b0e15',
  wall: '#2b3348',
  wallTop: '#3b4763',
  wallDark: '#1a2030',
  officeA: '#2a3350', officeB: '#252d47',
  meetA: '#2b2f4c', meetB: '#262a45',
  workA: '#283447', workB: '#232e40',
  desk: '#6b4a2f', deskTop: '#8a6238', deskDark: '#503722',
  monitor: '#151d2a', screen: '#4fd1c5',
  chair: '#3d4a67', chairDark: '#2c3750',
  plantPot: '#a1632f', leaf: '#3fa96b', leafDark: '#2b7d4e',
  tableTop: '#9a6a42', tableSide: '#7a5334',
  white: '#dfe8f5', frame: '#5b6684',
  mug: '#f2e8d5',
  shelf: '#5b4630',
  printer: '#c3cfe2',
  rug: '#3a3450',
  mat: '#404a63'
};

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function shade(hex, amount) {
  const n = parseInt(hex.replace('#', ''), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amount < 0) {
    r = Math.max(0, Math.round(r * (1 + amount)));
    g = Math.max(0, Math.round(g * (1 + amount)));
    b = Math.max(0, Math.round(b * (1 + amount)));
  } else {
    r = Math.min(255, Math.round(r + (255 - r) * amount));
    g = Math.min(255, Math.round(g + (255 - g) * amount));
    b = Math.min(255, Math.round(b + (255 - b) * amount));
  }
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ── 방 ────────────────────────────────────────────── */

function drawRoom(ctx, r, a, b) {
  px(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, C.wall);
  px(ctx, r.x - 3, r.y - 3, r.w + 6, 3, C.wallTop);
  px(ctx, r.x - 3, r.y + r.h, r.w + 6, 3, C.wallDark);
  for (let ty = r.y; ty < r.y + r.h; ty += 8) {
    for (let tx = r.x; tx < r.x + r.w; tx += 8) {
      const odd = ((tx / 8) + (ty / 8)) % 2 === 0;
      const w = Math.min(8, r.x + r.w - tx);
      const h = Math.min(8, r.y + r.h - ty);
      px(ctx, tx, ty, w, h, odd ? a : b);
    }
  }
}

function drawDesk(ctx, x, y) {
  px(ctx, x, y, 28, 3, C.deskTop);
  px(ctx, x, y + 3, 28, 11, C.desk);
  px(ctx, x + 2, y + 14, 3, 4, C.deskDark);
  px(ctx, x + 23, y + 14, 3, 4, C.deskDark);
  // 모니터
  px(ctx, x + 8, y - 8, 12, 9, C.monitor);
  px(ctx, x + 9, y - 7, 10, 6, C.screen);
  px(ctx, x + 9, y - 4, 10, 1, '#2a7f78');
  px(ctx, x + 12, y + 1, 4, 2, C.deskDark);
  // 서류 / 머그
  px(ctx, x + 2, y + 1, 4, 2, C.white);
  px(ctx, x + 21, y - 2, 4, 4, C.mug);
}

function drawChair(ctx, x, y) {
  px(ctx, x, y, 10, 3, C.chair);
  px(ctx, x, y + 3, 10, 6, C.chairDark);
  px(ctx, x + 4, y + 9, 2, 3, C.chairDark);
}

function drawPlant(ctx, x, y) {
  px(ctx, x, y + 8, 10, 6, C.plantPot);
  px(ctx, x + 1, y + 7, 8, 2, shade(C.plantPot, .18));
  px(ctx, x + 3, y, 4, 8, C.leafDark);
  px(ctx, x + 1, y + 3, 8, 4, C.leaf);
  px(ctx, x + 4, y + 1, 2, 3, shade(C.leaf, .25));
}

function drawCoffee(ctx, x, y) {
  px(ctx, x, y, 12, 16, C.frame);
  px(ctx, x + 1, y + 1, 10, 5, '#2a3448');
  px(ctx, x + 7, y + 7, 3, 3, '#0e131c');
  px(ctx, x + 2, y + 11, 4, 3, C.mug);
  px(ctx, x, y + 16, 12, 2, C.wallDark);
}

function drawMeetingRoom(ctx) {
  const tx = 206, ty = 48;
  // 테이블
  px(ctx, tx - 2, ty - 2, 66, 28, C.tableSide);
  px(ctx, tx, ty, 62, 24, C.tableTop);
  px(ctx, tx + 1, ty + 1, 60, 2, shade(C.tableTop, .18));
  // 테이블 위 소품
  px(ctx, tx + 6, ty + 6, 6, 4, C.white);
  px(ctx, tx + 16, ty + 12, 4, 4, C.mug);
  px(ctx, tx + 40, ty + 8, 10, 6, '#e4e9f5');
  px(ctx, tx + 41, ty + 9, 8, 1, '#94a1bd');
  // 의자
  const chairs = [[210, 40], [232, 39], [254, 40], [210, 76], [232, 77], [254, 76]];
  chairs.forEach(([cx, cy]) => {
    px(ctx, cx, cy, 12, 4, C.chair);
    px(ctx, cx + 1, cy + 4, 10, 3, C.chairDark);
  });
  // 화이트보드 (왼쪽 벽)
  px(ctx, 168, 30, 34, 20, C.frame);
  px(ctx, 170, 32, 30, 16, C.white);
  px(ctx, 173, 35, 12, 1, '#8fa2c4');
  px(ctx, 173, 38, 20, 1, '#8fa2c4');
  px(ctx, 173, 41, 8, 1, '#b3c2d8');
  // 시계
  px(ctx, 300, 30, 8, 8, C.white);
  px(ctx, 303, 31, 1, 4, '#33405c');
  px(ctx, 303, 34, 3, 1, '#33405c');
}

function drawWorkRoom(ctx) {
  // 화이트보드 + 스티키
  px(ctx, 168, 118, 40, 24, C.frame);
  px(ctx, 170, 120, 36, 20, C.white);
  px(ctx, 174, 123, 8, 6, '#ffd340');
  px(ctx, 185, 123, 8, 6, '#ff8ab5');
  px(ctx, 196, 123, 8, 6, '#7ee0c0');
  px(ctx, 174, 132, 12, 1, '#8fa2c4');
  px(ctx, 174, 135, 18, 1, '#8fa2c4');
  // 선반
  px(ctx, 216, 118, 60, 4, C.shelf);
  px(ctx, 216, 128, 60, 4, C.shelf);
  px(ctx, 219, 112, 6, 6, '#82b4ff');
  px(ctx, 228, 112, 4, 6, '#ff8ab5');
  px(ctx, 236, 111, 7, 7, '#ffd340');
  px(ctx, 250, 120, 10, 8, C.white);
  px(ctx, 264, 120, 5, 8, '#7ee0c0');
  // 프린터
  px(ctx, 290, 132, 16, 10, C.printer);
  px(ctx, 292, 128, 12, 4, shade(C.printer, -.2));
  px(ctx, 293, 138, 10, 2, '#0e131c');
  // 바닥 매트
  px(ctx, 176, 146, 132, 2, C.mat);
}

function drawOfficeRoom(ctx) {
  // 책상 4+4
  [14, 86].forEach((rowY, ri) => {
    const baseY = ri === 0 ? 58 : 110;
    [14, 50, 86, 122].forEach(x => {
      drawDesk(ctx, x, baseY);
      drawChair(ctx, x + 9, baseY + 18);
    });
  });
  // 러그
  px(ctx, 12, 94, 132, 3, C.rug);
  // 화분 · 커피머신
  drawPlant(ctx, 140, 34);
  drawPlant(ctx, 8, 150);
  drawCoffee(ctx, 26, 34);
  // 정수기
  px(ctx, 60, 34, 10, 16, '#d7e2f0');
  px(ctx, 62, 37, 6, 7, '#8fd2f0');
  px(ctx, 60, 50, 10, 2, C.wallDark);
  // 바닥 안내 (문)
  px(ctx, 152, 74, 6, 14, C.mat);
  px(ctx, 152, 108, 6, 14, C.mat);
  px(ctx, 190, 96, 14, 5, C.mat);
}

/* ── 캐릭터 ────────────────────────────────────────── */

function drawGlyph(ctx, mask, x, y, s, color) {
  const outline = shade(color, -0.62);
  const pts = [];
  for (let r = 0; r < mask.length; r++) {
    for (let c = 0; c < mask[r].length; c++) {
      if (mask[r][c] === '#') pts.push([c, r]);
    }
  }
  // 외곽선
  ctx.fillStyle = outline;
  pts.forEach(([cx, cy]) => {
    ctx.fillRect(x + cx * s - 1, y + cy * s - 1, s + 2, s + 2);
  });
  // 본체
  ctx.fillStyle = color;
  pts.forEach(([cx, cy]) => {
    ctx.fillRect(x + cx * s, y + cy * s, s, s);
  });
  // 하이라이트
  ctx.fillStyle = shade(color, 0.35);
  pts.forEach(([cx, cy]) => {
    if (cy === 0) ctx.fillRect(x + cx * s, y + cy * s, s, 1);
  });
}

function drawChar(ctx, jamo, color, feetX, feetY, t, seed, isMe) {
  const mask = JAMO[jamo] || JAMO['ㅇ'];
  const s = 3;
  const w = 7 * s;
  const bob = Math.round(Math.sin(t / 380 + seed) * 0.7);
  const x = Math.round(feetX - w / 2);
  const y = Math.round(feetY - w + 1 + bob);

  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(x + 1, feetY - 1, w - 2, 2);

  drawGlyph(ctx, mask, x, y, s, color);

  // 눈 (작게: 2x2)
  const eyeY = y + 3 * s + 1;
  [2, 4].forEach(col => {
    const ex = x + col * s;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ex, eyeY, 2, 2);
    ctx.fillStyle = '#14161f';
    ctx.fillRect(ex + (col === 4 ? 0 : 1), eyeY + 1, 1, 1);
  });

  // 내 캐릭터 표시 (발밑 노란 점)
  if (isMe) {
    ctx.fillStyle = '#ffd340';
    ctx.fillRect(feetX - 1, feetY + 1, 3, 1);
  }
}

/* ── 렌더러 ────────────────────────────────────────── */

export function computeSlots(agents) {
  const byRoom = { office: [], meeting: [], work: [] };
  Object.entries(agents || {}).forEach(([id, a]) => {
    const room = byRoom[a && a.room] ? a.room : 'office';
    byRoom[room].push(id);
  });
  const out = new Map();
  Object.entries(byRoom).forEach(([room, ids]) => {
    ids.sort();
    ids.forEach((id, i) => {
      const list = SLOTS[room];
      const base = list[i % list.length];
      const lap = Math.floor(i / list.length);
      out.set(id, {
        room,
        x: base[0] + (lap ? (i % 3) * 4 - 4 : 0),
        y: base[1] + (lap ? 4 : 0)
      });
    });
  });
  return out;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const pos = new Map();

  function frame(agents, t) {
    const slots = computeSlots(agents);
    px(ctx, 0, 0, W, H, C.bg);

    // 상단 띠
    px(ctx, 0, 0, W, 15, '#121722');
    px(ctx, 0, 0, W, 2, '#1b2231');

    drawRoom(ctx, { x: 6, y: 18, w: 148, h: 156 }, C.officeA, C.officeB);
    drawRoom(ctx, { x: 160, y: 18, w: 154, h: 78 }, C.meetA, C.meetB);
    drawRoom(ctx, { x: 160, y: 104, w: 154, h: 70 }, C.workA, C.workB);

    drawOfficeRoom(ctx);
    drawMeetingRoom(ctx);
    drawWorkRoom(ctx);

    // 캐릭터 (y 순서로 정렬해 겹침 자연스럽게)
    const list = [...slots.entries()].sort((a, b) => a[1].y - b[1].y);
    list.forEach(([id, target]) => {
      const cur = pos.get(id) || { x: target.x, y: target.y };
      cur.x += (target.x - cur.x) * 0.18;
      cur.y += (target.y - cur.y) * 0.18;
      if (Math.abs(target.x - cur.x) < 0.4) cur.x = target.x;
      if (Math.abs(target.y - cur.y) < 0.4) cur.y = target.y;
      pos.set(id, cur);

      const a = agents[id] || {};
      const seed = (id.charCodeAt(0) || 0) % 7;
      drawChar(ctx, a.jamo || 'ㅇ', a.color || '#8f9dc0', Math.round(cur.x), Math.round(cur.y), t, seed, !!a.me);
    });

    // 사라진 캐릭터 정리
    [...pos.keys()].forEach(id => { if (!slots.has(id)) pos.delete(id); });

    return { slots, pos };
  }

  return { frame };
}

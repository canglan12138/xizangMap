// 从成品 HTML 的 const DAYS 重新导出 GPX（全程 1 条 trk + 按日 28 条 trk；抽稀 2:1）
// 用法: node tmp/tools/gpx_only.js [htmlPath] [outDir]
const fs = require('fs');
const path = require('path');

const htmlPath = process.argv[2] || 'E:/workArea/2027西藏摩旅路线图_动态.html';
const outDir = process.argv[3] || 'E:/workArea';
const html = fs.readFileSync(htmlPath, 'utf8');

function extractArray(src, name) {
  const key = 'const ' + name;
  let i = src.indexOf(key);
  if (i < 0) throw new Error('not found: ' + key);
  i = src.indexOf('[', i);
  let depth = 0, inStr = false, esc = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return JSON.parse(src.slice(i, j + 1)); }
  }
  throw new Error('unbalanced ' + name);
}

const DAYS = extractArray(html, 'DAYS');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const dec = (pts, k = 2) => {
  const out = [];
  for (let i = 0; i < pts.length; i += k) out.push(pts[i]);
  if (pts.length && out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
  return out;
};
const pt = (p, tag, indent) => `${indent}<${tag} lat="${p[1].toFixed(6)}" lon="${p[0].toFixed(6)}"/>`;

const head = (name) => `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="2027西藏摩旅计划" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(name)}</name><time>${new Date().toISOString()}</time></metadata>`;

// 全程：1 条 trk，每天一个 trkseg
let g = head('2027 西藏摩旅 · 乌拉盖管理区 → 拉萨（全程）');
let wpts = 0, trkpts = 0;
DAYS.forEach(d => {
  if (!d.pts || !d.pts.length) return;
  const first = d.pts[0];
  g += `\n  <wpt lat="${first[1].toFixed(6)}" lon="${first[0].toFixed(6)}"><name>D${d.d} ${esc(d.from)}</name><desc>${esc(d.from)} → ${esc(d.to)}｜${d.km} km</desc></wpt>`;
  wpts++;
});
g += `\n  <trk>\n    <name>乌拉盖管理区 → 拉萨</name>\n    <desc>33 天 / 5,257 km / 全铺装国道</desc>`;
DAYS.forEach(d => {
  if (!d.pts || !d.pts.length) return;
  const pts = dec(d.pts, 2);
  g += `\n    <trkseg>\n      <name>D${d.d} ${esc(d.to)}</name>`;
  pts.forEach(p => { g += '\n      ' + pt(p, 'trkpt'); trkpts++; });
  g += '\n    </trkseg>';
});
g += '\n  </trk>\n</gpx>\n';

// 按日：每天一条 trk
let g2 = head('2027 西藏摩旅 · 按日轨迹（33 天）');
DAYS.forEach(d => {
  if (!d.pts || !d.pts.length) return;
  const pts = dec(d.pts, 2);
  g2 += `\n  <trk>\n    <name>D${d.d} ${esc(d.from)} → ${esc(d.to)}</name>\n    <desc>${d.km} km｜住宿 ${esc(d.to)} ${d.alt}m</desc>\n    <trkseg>`;
  pts.forEach(p => { g2 += '\n      ' + pt(p, 'trkpt'); });
  g2 += '\n    </trkseg>\n  </trk>';
});
g2 += '\n</gpx>\n';

fs.writeFileSync(path.join(outDir, '2027西藏摩旅轨迹_全程.gpx'), g);
fs.writeFileSync(path.join(outDir, '2027西藏摩旅轨迹_按日.gpx'), g2);
console.log('days=' + DAYS.length + ' wpt=' + wpts + ' trkpt=' + trkpts +
  ' full=' + Buffer.byteLength(g) + 'B daily=' + Buffer.byteLength(g2) + 'B');

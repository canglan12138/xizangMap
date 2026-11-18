// 检查真实页面里所有 <script> 能否被 JS 引擎编译（不做 DOM 执行）
const fs = require('fs');
const html = fs.readFileSync('E:/workArea/2027西藏摩旅路线图_动态.html', 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let ok = 0, bad = [];
blocks.forEach((b, i) => {
  try { new Function(b); ok++; } catch (e) { bad.push(i + ': ' + e.message); }
});
console.log('scripts=' + blocks.length + ' ok=' + ok);
if (bad.length) { console.log('FAILED\n' + bad.join('\n')); process.exit(1); }

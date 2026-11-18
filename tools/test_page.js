// 全项目回归测试（真实页面 + CDP）：数据/交互/布局/强光/标记/持久化
const http = require('http'); const net = require('net'); const crypto = require('crypto'); const fs = require('fs');
const PORT = 9230;
const URL_BASE = 'file:///E:/workArea/2027西藏摩旅路线图_动态.html';

function httpJson(p) { return new Promise((res, rej) => http.get({ host: '127.0.0.1', port: PORT, path: p }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej)); }
function wsConnect(url) {
  const u = new URL(url); const key = crypto.randomBytes(16).toString('base64');
  return new Promise((res, rej) => {
    const sock = net.connect(u.port, u.hostname, () => sock.write(`GET ${u.pathname} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`));
    let buf = Buffer.alloc(0), up = false; const h = { msg: [] };
    sock.on('data', ch => { buf = Buffer.concat([buf, ch]); if (!up) { const i = buf.indexOf('\r\n\r\n'); if (i < 0) return; up = true; buf = buf.slice(i + 4); res({ send, on: (e, f) => h[e].push(f), close: () => sock.destroy() }); } for (;;) { const f = dec(buf); if (!f) break; buf = f.rest; if (f.op === 1 || f.op === 0) h.msg.forEach(fn => fn(f.p.toString())); } });
    sock.on('error', rej);
    function dec(b) { if (b.length < 2) return null; const op = b[0] & 15; let len = b[1] & 127, off = 2; if (len === 126) { if (b.length < 4) return null; len = b.readUInt16BE(2); off = 4; } else if (len === 127) { if (b.length < 10) return null; len = Number(b.readBigUInt64BE(2)); off = 10; } const m = (b[1] & 128) !== 0; let mask = null; if (m) { if (b.length < off + 4) return null; mask = b.slice(off, off + 4); off += 4; } if (b.length < off + len) return null; let p = b.slice(off, off + len); if (m) { const q = Buffer.from(p); for (let i = 0; i < q.length; i++) q[i] ^= mask[i % 4]; p = q; } return { op, p, rest: b.slice(off + len) }; }
    function send(o) { const d = Buffer.from(JSON.stringify(o)), mk = crypto.randomBytes(4), len = d.length; let hd; if (len < 126) hd = Buffer.from([0x81, 0x80 | len]); else if (len < 65536) { hd = Buffer.alloc(4); hd[0] = 0x81; hd[1] = 0xFE; hd.writeUInt16BE(len, 2); } else { hd = Buffer.alloc(10); hd[0] = 0x81; hd[1] = 0xFF; hd.writeBigUInt64BE(BigInt(len), 2); } const b2 = Buffer.from(d); for (let i = 0; i < b2.length; i++) b2[i] ^= mk[i % 4]; sock.write(Buffer.concat([hd, mk, b2])); }
  });
}

(async () => {
  const list = await httpJson('/json/list'); const page = list.find(t => t.type === 'page');
  const c = await wsConnect(page.webSocketDebuggerUrl);
  let id = 0; const pend = new Map(); const errs = []; const netFails = [];
  c.on('msg', t => {
    let m; try { m = JSON.parse(t); } catch (e) { return; }
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errs.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').split('\n')[0]);
    if (m.method === 'Network.loadingFailed' && !m.params.canceled) netFails.push(m.params.errorText + ' ' + (m.params.type || ''));
  });
  const call = (mth, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); c.send({ id: i, method: mth, params: p }); });
  const ev = async (e) => {
    const r = await call('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) return 'EVAL_ERR: ' + (r.result.exceptionDetails.exception?.description || '').split('\n')[0];
    return r.result?.result?.value;
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const results = [];
  const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail).slice(0, 160) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  [' + String(detail).slice(0, 160) + ']' : '')); };
  const shot = async (f) => { const s = await call('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(f, Buffer.from(s.result.data, 'base64')); };
  const nav = async (extra) => { await call('Page.navigate', { url: URL_BASE + '?v=' + Date.now() + (extra || '') }); await sleep(6500); };

  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  await call('Network.setCacheDisabled', { cacheDisabled: true });
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  // ============ 1. 加载与资源 ============
  await nav();
  check('Leaflet 已加载', await ev(`typeof L!=='undefined' && L.version`) === '1.9.4', await ev(`typeof L!=='undefined'?L.version:'none'`));
  const tiles = JSON.parse(await ev(`JSON.stringify((function(){var t=[].slice.call(document.querySelectorAll('img.leaflet-tile'));return{n:t.length,ok:t.filter(function(i){return i.complete&&i.naturalWidth>0;}).length};})())`));
  check('瓦片加载完整（手机）', tiles.n > 0 && tiles.ok === tiles.n, JSON.stringify(tiles));

  // ============ 2. 数据完整性 ============
  const data = JSON.parse(await ev(`JSON.stringify((function(){
    var sum=0,maxd=0,bad=[];
    DAYS.forEach(function(d,i){ sum+=d.km; if(d.cum<maxd-0.01) bad.push('cum:'+d.d); maxd=Math.max(maxd,d.cum);
      if(d.km<0||d.km>400) bad.push('km:'+d.d);
      if(!d.from||!d.to||!d.alt) bad.push('field:'+d.d); });
    var fuelBad=FUEL.filter(function(f){return !(f.d>=1&&f.d<=DAYS.length&&f.lat>18&&f.lat<54&&f.lon>73&&f.lon<136);}).length;
    var pmBad=PASSMARKS.filter(function(p){return !(p.day>=1&&p.day<=DAYS.length&&p.alt>1000);}).length;
    var zeroKm=DAYS.filter(function(d){return d.km===0&&!d.rest;}).length;
    return {days:DAYS.length, sum:Math.round(sum), total:TOTAL, cumLast:Math.round(DAYS[DAYS.length-1].cum),
      fuel:FUEL.length, fuelBad:fuelBad, pm:PASSMARKS.length, pmBad:pmBad, bad:bad, zeroKm:zeroKm,
      stages:Object.keys(STAGE_NAMES).length, rest:DAYS.filter(function(d){return d.rest;}).length};
  })())`));
  check('33 天', data.days === 33, data.days);
  check('里程合计 = TOTAL 5257', data.sum === data.total && data.cumLast === data.total, JSON.stringify({ sum: data.sum, total: data.total, cum: data.cumLast }));
  check('逐日 km/cum 无异常', data.bad.length === 0, data.bad.join(',') || 'ok');
  check('加油站 59 且坐标在天朝范围', data.fuel === 59 && data.fuelBad === 0, JSON.stringify({ n: data.fuel, bad: data.fuelBad }));
  check('垭口 7 个数据自洽', data.pm === 7 && data.pmBad === 0, JSON.stringify({ n: data.pm, bad: data.pmBad }));
  check('非休整日都有里程', data.zeroKm === 0, data.zeroKm);
  check('4 个阶段 / 5 个休整日', data.stages === 4 && data.rest === 5, JSON.stringify({ stages: data.stages, rest: data.rest }));

  // ============ 3. 信息卡 ============
  await ev(`goto(0)`); await sleep(500);
  const d1 = JSON.parse(await ev(`JSON.stringify((function(){return {km:document.querySelector('#iKm').textContent.trim(), alt:document.querySelector('#iAlt').textContent.trim(),
    eat:document.getElementById('iEat').textContent.trim(), cum:document.getElementById('iCum').textContent.trim(),
    nav:document.getElementById('iNav').getAttribute('href'), rows:[].filter.call(document.querySelectorAll('#info table tr'),function(tr){return getComputedStyle(tr).display!=='none';}).length,
    title:document.getElementById('iDay').textContent.trim()};})())`));
  check('D1 KPI 里程=195', d1.km === '195', d1.km);
  check('D1 KPI 海拔=1000', d1.alt === '1000', d1.alt);
  check('D1 当地必尝非空', d1.eat.length > 8, d1.eat.slice(0, 30));
  check('D1 累计写法含 5257', /5257/.test(d1.cum), d1.cum);
  check('导航深链格式正确', /^https:\/\/uri\.amap\.com\/navigation\?to=-?[\d.]+,-?[\d.]+.*mode=car.*policy=3/.test(d1.nav), d1.nav);

  await ev(`goto(32)`); await sleep(500);
  const d33 = JSON.parse(await ev(`JSON.stringify((function(){return {km:document.querySelector('#iKm').textContent.trim(),
    rows:[].filter.call(document.querySelectorAll('#info table tr'),function(tr){return getComputedStyle(tr).display!=='none';}).length};})())`));
  check('D33 休整日里程显示「休整」', d33.km === '休整', d33.km);
  check('D33 空行被隐藏（表行更少）', d33.rows < d1.rows, d33.rows + ' < ' + d1.rows);

  // ============ 4. 导航/滑杆边界 ============
  await ev(`goto(0); document.getElementById('btnPrev').click()`); await sleep(300);
  check('D1 上一天不越界', /^D1/.test(await ev(`document.getElementById('iDay').textContent.trim()`)), await ev(`document.getElementById('iDay').textContent.trim()`));
  await ev(`goto(32); document.getElementById('btnNext').click()`); await sleep(300);
  check('D33 下一天不越界', /^D33/.test(await ev(`document.getElementById('iDay').textContent.trim()`)), await ev(`document.getElementById('iDay').textContent.trim()`));
  await ev(`(function(){var s=document.getElementById('daySlider'); s.value=22; s.dispatchEvent(new Event('input')); s.dispatchEvent(new Event('change'));})()`); await sleep(400);
  check('滑杆跳转 → D22', /^D22/.test(await ev(`document.getElementById('iDay').textContent.trim()`)), await ev(`document.getElementById('iDay').textContent.trim()`));

  // ============ 5. 搜索 ============
  await ev(`document.getElementById('qBtn').click()`); await sleep(300);
  const srch = async (kw) => {
    await ev(`(function(){var q=document.getElementById('q'); q.value=${JSON.stringify(kw)}; var f=document.getElementById('dl'); q.dispatchEvent(new Event('input')); q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})()`);
    await sleep(900);
    return await ev(`document.getElementById('iDay').textContent.trim()`);
  };
  check('搜索「巴塘」（全名）→ D23', /^D23/.test(await srch('巴塘')), 'done');
  check('搜索「米拉山」（部分）→ D30', /^D30/.test(await srch('米拉山')), 'done');
  check('datalist 有 30+ 项', (await ev(`document.querySelectorAll('#dl option').length`)) >= 30, await ev(`document.querySelectorAll('#dl option').length`));
  await ev(`document.getElementById('qBtn').click()`);

  // ============ 6. 全览 ============
  await ev(`document.getElementById('btnChina').click()`); await sleep(1200);
  check('中国全览 zoom < 6', (await ev(`map.getZoom()`)) < 6, await ev(`map.getZoom()`));
  await ev(`document.getElementById('btnRoute').click()`); await sleep(1200);
  const pins = JSON.parse(await ev(`JSON.stringify((function(){
    var mapEl=document.getElementById('map').getBoundingClientRect(); var out=[];
    [].forEach.call(document.querySelectorAll('.leaflet-marker-pane > div'), function(m){
      if(!/起点|终点/.test(m.textContent)) return;
      var pills=[].slice.call(m.querySelectorAll('div')).filter(function(d){return d.getBoundingClientRect().width>40;});
      var p=(pills[0]||m).getBoundingClientRect();
      out.push({t:m.textContent.trim().slice(0,4), inside:p.left>=0&&p.top>=0&&p.right<=innerWidth&&p.bottom<=mapEl.bottom});
    });
    return {pins:out, z:map.getZoom()};})())`));
  check('路线全览两端气泡在屏内', pins.pins.length === 2 && pins.pins.every(p => p.inside), JSON.stringify(pins));

  // ============ 7. 四个标签 / 清单 ============
  const tabClick = async (p) => { await ev(`document.querySelector('#mtabs button[data-p="${p}"]').click()`); await sleep(500); };
  await tabClick('legend');
  check('图例标签：只显示图例', JSON.parse(await ev(`JSON.stringify({on:document.getElementById('legend').classList.contains('on'),info:document.getElementById('info').classList.contains('on')})`)).on === true, 'legend on');
  await tabClick('list');
  const lst = JSON.parse(await ev(`JSON.stringify({on:document.getElementById('list').classList.contains('on'), items:document.querySelectorAll('#list .it').length, heads:document.querySelectorAll('#list h3').length, h:Math.round(document.getElementById('list').getBoundingClientRect().height)})`));
  check('清单标签：66+1 项 / 3 段', lst.on && (lst.items === 67 || lst.items === 66) && lst.heads === 3, JSON.stringify(lst));
  const before = await ev(`document.getElementById('iDay').textContent.trim()`);
  await ev(`document.querySelectorAll('#list .it')[10].click()`); await sleep(900);
  check('点清单项能跳天', (await ev(`document.getElementById('iDay').textContent.trim()`)) !== before, before + ' -> ' + (await ev(`document.getElementById('iDay').textContent.trim()`)));
  await tabClick('list'); // 收起

  // ============ 8. 强光模式（含对比度） ============
  await ev(`goto(21)`); await sleep(300);
  await ev(`document.getElementById('chkDay').checked=true; document.getElementById('chkDay').dispatchEvent(new Event('change'));`); await sleep(400);
  const day = JSON.parse(await ev(`JSON.stringify((function(){
    function lum(c){var m=c.match(/[\\d.]+/g).slice(0,3).map(function(v){v=v/255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*m[0]+.7152*m[1]+.0722*m[2];}
    function ratio(a,b){var l1=lum(a),l2=lum(b);if(l1<l2){var t=l1;l1=l2;l2=t;}return (l1+.05)/(l2+.05);}
    var card=document.getElementById('info'); var bg=getComputedStyle(card).backgroundColor;
    var v=getComputedStyle(card.querySelector('td.v')).color;
    var km=getComputedStyle(card.querySelector('.kpi .num')).color;
    var lab=getComputedStyle(card.querySelector('td.k')).color;
    var note=getComputedStyle(card.querySelector('.note')).color;
    return {cls:document.body.className, bg:bg, vsBg:ratio(v,bg), kmVsBg:ratio(km,'rgb(241,245,249)'), labVsBg:ratio(lab,'rgb(241,245,249)'), noteVsBg:ratio(note,bg)};
  })())`));
  check('强光模式类已加', /daylight/.test(day.cls), day.cls);
  check('卡片值/背景对比度 ≥ 4.5', day.vsBg >= 4.5, day.vsBg.toFixed(2));
  check('KPI 数字对比度 ≥ 4.5', day.kmVsBg >= 4.5, day.kmVsBg.toFixed(2));
  check('KPI 标签对比度 ≥ 4.5', day.labVsBg >= 4.5, day.labVsBg.toFixed(2));
  check('当日要点对比度 ≥ 4.5', day.noteVsBg >= 4.5, day.noteVsBg.toFixed(2));
  await shot('E:/workArea/tmp/shots/all_daylight.png');
  await ev(`document.getElementById('chkDay').checked=false; document.getElementById('chkDay').dispatchEvent(new Event('change'));`);

  // ============ 9. 进度记忆 / 分享链接 ============
  await ev(`localStorage.removeItem('moto2027.done'); setDone(0); goto(21)`); await sleep(400);
  await ev(`document.getElementById('btnDone').click()`); await sleep(400);
  const done1 = JSON.parse(await ev(`JSON.stringify({label:document.getElementById('btnDone').textContent.trim(), done:localStorage.getItem('moto2027.done'), hash:location.hash, cum:document.getElementById('iCum').textContent})`));
  check('记为到达 → 按钮变「取消到达」', /取消到达/.test(done1.label), done1.label);
  check('记为到达写入 localStorage', done1.done === '22', done1.done);
  check('分享链接 #d=22', done1.hash === '#d=22', done1.hash);
  await ev(`document.getElementById('btnDone').click()`); await sleep(400);
  check('再点取消到达 → 进度还原', (await ev(`localStorage.getItem('moto2027.done')`)) === '0', await ev(`localStorage.getItem('moto2027.done')`));

  // 刷新后进度/天号保持
  await ev(`setDone(9); goto(12)`); await sleep(400);
  await nav();
  check('刷新后保持第 13 天', /^D13/.test(await ev(`document.getElementById('iDay').textContent.trim()`)), await ev(`document.getElementById('iDay').textContent.trim()`));
  check('刷新后进度仍为 9', (await ev(`localStorage.getItem('moto2027.done')`)) === '9', await ev(`localStorage.getItem('moto2027.done')`));

  // ============ 10. 布局（手机 + 安全区） ============
  await call('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, left: 0, bottom: 34, right: 0 } });
  await sleep(800);
  const mob = JSON.parse(await ev(`JSON.stringify((function(){
    var lc=document.getElementById('leftCol').getBoundingClientRect(), ctl=document.getElementById('ctl').getBoundingClientRect(), info=document.getElementById('info').getBoundingClientRect();
    return {scrollW:document.documentElement.scrollWidth, vw:innerWidth, lcTop:Math.round(lc.top), ctlPadB:getComputedStyle(document.getElementById('ctl')).paddingBottom,
      infoBottom:Math.round(info.bottom), ctlTop:Math.round(ctl.top)};})())`));
  check('手机无横向溢出', mob.scrollW === mob.vw, mob.scrollW + '/' + mob.vw);
  check('安全区顶部生效（标题 ≥ 59）', mob.lcTop >= 59, mob.lcTop);
  check('安全区底部生效（底坞 padding ≥ 34）', parseFloat(mob.ctlPadB) >= 34, mob.ctlPadB);
  check('卡片不压底坞', mob.infoBottom <= mob.ctlTop, mob.infoBottom + ' <= ' + mob.ctlTop);
  await shot('E:/workArea/tmp/shots/all_mobile.png');
  await call('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, bottom: 0, right: 0 } });

  // ============ 11. 桌面 ============
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await call('Emulation.setTouchEmulationEnabled', { enabled: false });
  await nav();
  const desk = JSON.parse(await ev(`JSON.stringify((function(){
    function R(id){var e=document.getElementById(id); if(!e) return null; var r=e.getBoundingClientRect(); return {l:Math.round(r.left),r:Math.round(r.right),t:Math.round(r.top),b:Math.round(r.bottom)};}
    var tiles=[].slice.call(document.querySelectorAll('img.leaflet-tile'));
    return {vw:innerWidth, scrollW:document.documentElement.scrollWidth, ctl:R('ctl'), prof:R('prof'), info:R('info'), lc:R('leftCol'),
      tiles:tiles.length, tilesOk:tiles.filter(function(i){return i.complete&&i.naturalWidth>0;}).length,
      mtabs:getComputedStyle(document.getElementById('mtabs')).display};})())`));
  check('桌面无横向溢出', desk.scrollW === desk.vw, desk.scrollW + '/' + desk.vw);
  check('桌面瓦片完整', desk.tiles > 0 && desk.tilesOk === desk.tiles, desk.tiles + '/' + desk.tilesOk);
  check('桌面底坞与剖面图不重叠', desk.ctl.r <= desk.prof.l, desk.ctl.r + ' <= ' + desk.prof.l);
  check('桌面三块面板不压图例列', desk.info.l >= desk.lc.r || desk.info.t >= desk.lc.b, JSON.stringify({ infoL: desk.info.l, lcR: desk.lc.r }));
  check('桌面无手机标签栏', desk.mtabs === 'none', desk.mtabs);
  await shot('E:/workArea/tmp/shots/all_desktop.png');

  // ============ 12. 全局错误 ============
  check('无脚本异常', errs.length === 0, errs.join(' | ') || 'none');
  check('无网络失败', netFails.length === 0, netFails.join(' | ') || 'none');

  const pass = results.filter(r => r.ok).length;
  console.log('\n==== 汇总: ' + pass + '/' + results.length + ' PASS ====');
  if (pass < results.length) console.log('失败项: ' + results.filter(r => !r.ok).map(r => r.name).join('; '));
  fs.writeFileSync('E:/workArea/tmp/all_test.json', JSON.stringify({ pass, total: results.length, results }, null, 1));
  c.close();
})().catch(e => { console.error('SUITE FAILED', e.message); process.exit(1); });

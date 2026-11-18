# CONTEXT — 2027 西藏摩旅计划（乌拉盖管理区 → 拉萨 · UFR150）

## 一页速览

- **状态**：已可出行。表格 12 表 64 KB（单程 **5,257 km / 33 天**＝骑行 28＋休整 5，预算 **15,000**）；地图 `…动态.html`（1.5 MB，D1~D33，桌面+手机两套布局）；GPX 两个（折线 5,283 km）。
- **口径**：D 照（覆盖 149cc），包头—乌拉盖 3 次；**200 km/天**（266/71，≈5h），不夜骑；全铺装 G207+G209+G108+G350+G318；休整＝西安 D12／成都 D18／林芝 D28／拉萨 D32+D33 机动。
- **海拔阶梯**：D19 卧龙 2000m → D20 过巴朗山 ≈3850m 到丹巴 1800m → D21 新都桥 3460m → D22 理塘 4014m（首个 4000m 住宿）。
- **预算**：油 1,550＋住 1,350＋吃 2,800＋门票 600＋保养 1,100＋装备 2,000＋露营 2,500＋保险 500＋杂 100＋备用 2,500。
- **另有**：★备选B 西线（G109，≈4,235 km / 14 天）、返程四方案；政策须带来源，2027 行前按复核节点重查。
- **上次更新**：2026-11-17（地图六项 + 起终点可点气泡，CDP 真机验过）。
- **仓库**：`github.com/canglan12138/xizangMap`（私有）；本机必须 `git config http.proxy ""` 直连，残留的 `127.0.0.1:7890` 代理会让 git 连 GitHub 超时（curl 直连正常）。

## 怎么跑

```powershell
$py   = "C:\Users\liguo\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe"
$node = "E:\dsh\resources\runtime\primary-runtime\dependencies\node\bin\node.exe"
& $py E:\workArea\build_moto_plan_v3.py     # 重生成 xlsx（约 10 秒）
& $node E:\workArea\tmp\tools\gpx_only.js   # 从成品 HTML 的 DAYS 重导两个 gpx
```
- 改表格＝改生成器后重跑；文案替换一律 `assert src.count(old)==1`。
- **别**重跑 `gen_route_map.py`（已删）；地图按整段补丁改成品 HTML。
- 验证：`new Function(脚本)` 查语法；python 读回 xlsx 关键格；`xml.etree` 解析 GPX；视觉/交互用 CDP（`tmp/tools/cdp_*`）。

## 目录地图

| 路径 | 作用 |
|---|---|
| `…计划_乌拉盖出发.xlsx` | 12 表：总览/出行月份/路线与路况/注意事项/装备清单/预算估算/行程模板/核查清单/高速可选/返程决策/住宿与营地/沿途美食 |
| `…路线图_动态.html` | **唯一源文件**（1.52 MB）：33 天 / 59 加油点 / 7 垭口 / 高速层 / 海拔柱状图；信息卡含必尝＋导航；搜索、清单、强光、已走灰段 |
| `…轨迹_全程.gpx` / `_按日.gpx` | 可导入手机；休整日无 trk |
| `build_moto_plan_v3.py` | 表格唯一生成器（≈750 行） |
| `tmp/tools/` | `gpx_only.js`、`cdp_*.js`、`draw_island.py`、`syntax_check.js`、`memgrab.cs` |
| `tmp/shots/` | 截图 `real_*`/`island_*`/`kpi_*`/`feat_*` |
| `acl-report/` | 与项目无关；保护 ACL 删不掉，需管理员 |

## 决策记录

| 日期 | 决策 |
|---|---|
| 10-26~29 | G209→G108→G318 不进 G109；内蒙/山西 D6-D9 高速优先尝试、被拦回 G209；成都→新都桥改 G350 避折多山 |
| 11-16 | 目的地=拉萨，删珠峰/纳木错/返程三方案；加备选B/返程决策/住宿与营地；剖面图改柱状图；七表加勾选列；D18 拆天（成都→卧龙 152km/2000m）；油费 3.2L×9；西安按 2026 官方口径 |
| 11-16 | 里程重排 33 天 28 骑行（新增集宁/万荣/风陵渡过夜等） |
| 11-16 | D19/D20 重抓真实国道（200→178、204→143）→ 5,340→5,257、预算 15,000；全览改 `fitNice()`＋现场算 bbox |
| 11-17 | 每站「当地必尝」：xlsx 第 12 表 33 行（不列店名）＋信息卡一行 |
| 11-17 | 信息卡 KPI：里程/海拔大数字（绿/橙/红，休整显示「休整」）、必尝高亮条；删「行程」行、累计 `x / 5257`；note 去重 15 句（标签 `userCollapsed`、viewBox 170） |
| 11-17 | 表格去重两轮：删露营点 11 行（改提示带）+ 重复高速行 + 边防证行；保险 3→2；散装油指向政策②；**行程模板删「要点」列**；总览每日节奏改指针；预算 1.50/1.05 |
| 11-17 | 灵动岛：`env(safe-area-inset-*)` 铺标题/卡片/底坞/Leaflet；手机藏 `+/−`；横屏 `max-height:520px` 紧凑 |
| 11-18 | 手机导航直呼高德 `amapuri://route/plan/`，未装 1.4s 回落 `uri.amap.com`；高德协议无摩托模式（README 说明） |
| 11-17 | 地图六项：导航深链（`uri.amap.com/navigation`+`policy=3`）、`cur/done` 记忆、`#d=NN` 深链、搜索（部分匹配）、垭口+加油站清单、强光（`day` 记忆、对比度 ≥4.5）、已走灰段（可取消/清空）、起终点气泡；离线 SW 不做（`file://` 不支持） |

## 坑与雷区

1. 旧地图生成器已删，别重跑（会冲掉手工改动）。
2. 成品 `const DAYS` 是紧凑 JSON：括号扫描（跳过字符串）定位，别用正则。
3. 改 HTML 用整段替换＋`count==1`；删函数后查残留调用（`drawRet()` 残留让整页不初始化）。
4. workspace-write 下 Chrome 起不来（mojo 拒）；用 `danger-full-access` 起，视觉验证走 CDP。
5. OSRM demo 间歇 400、不支持 `exclude=motorway`；两点直连最稳，锁路点偏移会绕远。
6. xlsx 合并单元格写值报 `MergedCell ... read-only`：写入前 `isinstance(c, MergedCell)` 跳过。
7. 改段后核对「标注 km vs 折线长」，比值 <0.9 或 >1.25 即标错/绕行。
8. 休整日 `pts` 为空：写 GPX/取 `pts[0]` 前判空。
9. `python -c` 打中文在 GBK 控制台抛 `UnicodeEncodeError`：写 `tmp/*.txt` 再读。
10. `fitBounds` 要 `[lat,lng]`，轨迹是 `[lon,lat]`：`b.extend([p[1],p[0]])`；写反被 `maxBounds` 夹住且不报错。
11. 卡片坞 `position:fixed`：`#map` 的 `inset` 让出 `--ctlH` 再 `invalidateSize()`，加 padding 不够。
12. 点当前标签收起别靠兜底 `show('info')`（会立刻弹回），要显式状态位。
13. `viewBox`、JS 常量 `H`、CSS `aspect-ratio` 三者必须同数（150 vs 170 会裁掉横轴刻度）。
14. mp4 抽帧：`memgrab.cs`（RGB32 开 VIDEO_PROCESSING、`IMFSample` 30 槽）。
15. **本机有网**：命令行出网被拒不等于断网；别用桩页评价渲染。
16. 权限提升起的无头 Chrome，`Stop-Process` 打不掉：用 `cdp_close2.js` 发 `Browser.close` 再删 `--user-data-dir`。
17. 摘要条 `max-height:56px` 只管内容区（实际≈67px）；收起时 `table/.note/.pt/.lg/svg` 全 `display:none`；箭头用 `▼` 不用 `▾`（缺字形）。
18. 安全区需 `viewport-fit=cover`；CDP 用 `Emulation.setSafeAreaInsetsOverride`；Chrome 不画灵动岛，截图自己贴（`draw_island.py`）。
19. 横屏手机宽 >820 会落进桌面布局：加 `max-height:520px` 紧凑规则；`#prof` 用左右锚定。

## 进度

- **已完成**：P0/P1 全项＋剖面图/卡片坞/全览/灵动岛/横屏＋33 天重排＋沿途美食＋地图六项；CDP 49 项 + 文件 19 项全过。
- **待办（P2 可选）**：备选B 独立地图 / 装备型号与已购列 / 瓦片离线化 / 每日预算分档 / 摄影点 / 时间表精确到小时。
- 拉萨市区限摩：未见官方通告；西藏全境高速禁摩已写入「高速可选」表。

## 需要你拍板

1. 装备清单加「型号/是否已购」列？2. 备选B 独立地图？

## 会话日志（倒序）

- **2026-11-18 回归**：6 视口 × 16 步流程全过；修 6 处——摘要条露按钮、触摸目标 40px、横屏卡高、`minZoom`→3、复选框 18px、QA 重叠判定。
- **2026-11-17** 信息卡重排（KPI＋必尝条＋空行隐藏＋note 去重）；表格去重两轮（行程模板 53×5）；地图六项＋CDP 全验；「记为到达」可取消（含清空）。

- **11-17** 美食（第 12 表＋地图必尝行）；纠正「断网」误判（本机有网，真页 12/12、24/24 瓦片）；修摘要条与 `▼` 字形。
- **11-17** 录屏复现「重复点标签」→ `userCollapsed`；灵动岛＋横屏（`max-height:520px`）适配并 CDP 验安全区。
- **11-16** 清旧文件（v23/旧生成器/32.6 MB 归档）+ 清空 `tmp/`；33 天重排、卡片坞、全览修复、P0/P1、D19/D20 改真实国道。

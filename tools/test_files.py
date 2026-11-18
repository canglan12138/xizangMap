# -*- coding: utf-8 -*-
"""项目文件级回归测试：xlsx 结构与数值 + GPX 有效性 + 生成器可重跑"""
import io, math, os, subprocess, sys, time
import openpyxl
import xml.etree.ElementTree as ET

BASE = r"E:\workArea"
XLSX = os.path.join(BASE, "2027西藏摩旅计划_乌拉盖出发.xlsx")
GPX1 = os.path.join(BASE, "2027西藏摩旅轨迹_全程.gpx")
GPX2 = os.path.join(BASE, "2027西藏摩旅轨迹_按日.gpx")
GEN = os.path.join(BASE, "build_moto_plan_v3.py")

res = []
def check(name, ok, detail=""):
    res.append((name, bool(ok), str(detail)[:150]))
    print(("PASS " if ok else "FAIL ") + name + ("  [" + str(detail)[:150] + "]" if detail != "" else ""))

# ---------- xlsx ----------
wb = openpyxl.load_workbook(XLSX)
names = wb.sheetnames
check("12 张表", len(names) == 12, ",".join(names))

def col(ws, c, r):
    return ws.cell(row=r, column=c).value

ov = wb["总览"]
ov_rows = {str(col(ov, 1, r)).strip(): str(col(ov, 2, r) or "") for r in range(1, ov.max_row + 1)}
check("总览含「主路线」且提及 5,257", "5,257" in ov_rows.get("主路线", ""), ov_rows.get("主路线", "")[:40])
check("总览含「目的地」拉萨", "拉萨" in ov_rows.get("目的地", ""), ov_rows.get("目的地", "")[:40])
check("总览含「沿途美食」入口", "沿途美食" in ov_rows.get("沿途美食", "") or any("沿途美食" in v for v in ov_rows.values()), "ok")

budget = wb["预算估算"]
total = None
for r in range(1, budget.max_row + 1):
    if "合计" in str(col(budget, 1, r) or ""):
        for c in (3, 4):
            v = col(budget, c, r)
            if isinstance(v, (int, float)) and v > 1000:
                total = v
check("预算合计 = 15000", total == 15000, total)

itin = wb["行程模板"]
check("行程模板 53 行 × 5 列", itin.max_row == 53 and itin.max_column == 5, "%dx%d" % (itin.max_row, itin.max_column))
hdrs = [str(col(itin, c, 2) or "").strip() for c in range(1, 6)]
check("行程模板表头正确", hdrs == ["天数", "行程", "里程(km)", "住宿地(海拔)", "勾选"], "/".join(hdrs))
bad_rows = []
km_sum = 0
for r in range(3, itin.max_row + 1):
    d = col(itin, 1, r)
    if not d or not str(d).startswith(("D", "B")):
        continue
    route, km, stay = col(itin, 2, r), col(itin, 3, r), col(itin, 4, r)
    if not route or not stay:
        bad_rows.append(str(d))
    if isinstance(km, str) and "约" in km:
        try:
            km_sum += int(float(km.replace("约", "").replace("km", "").strip()))
        except Exception:
            bad_rows.append(str(d) + ":km")
check("行程模板每行都有行程/住宿", not bad_rows, ",".join(bad_rows[:6]))
check("行程模板 D1-D33+B1-B12 共 45 行", sum(1 for r in range(3, itin.max_row + 1) if str(col(itin, 1, r) or "").startswith(("D", "B"))) == 45,
      sum(1 for r in range(3, itin.max_row + 1) if str(col(itin, 1, r) or "").startswith(("D", "B"))))

food = wb["沿途美食"]
food_rows = [r for r in range(3, food.max_row + 1) if str(col(food, 1, r) or "").startswith("D")]
check("沿途美食 33 行且有必尝", len(food_rows) == 33 and all(col(food, 3, r) for r in food_rows), len(food_rows))

road = wb["路线与路况"]
check("路线与路况 50 行", road.max_row == 50, road.max_row)
check("路线与路况含 D33 行", any(str(col(road, 1, r) or "").startswith("D33") for r in range(3, road.max_row + 1)), "ok")

dv_sheets = [n for n in names if wb[n].data_validations.dataValidation]
check("勾选列覆盖 ≥6 张表", len(dv_sheets) >= 6, ",".join(dv_sheets))

# 空白单元格粗查：行程模板 A-D 列不能有空
empties = []
for r in range(3, itin.max_row + 1):
    if str(col(itin, 1, r) or "").startswith(("D", "B")):
        for c in range(1, 5):
            if not col(itin, c, r):
                empties.append("%s/%d" % (col(itin, 1, r), c))
check("行程模板关键列无空值", not empties, ",".join(empties[:5]))

# ---------- gpx ----------
def gpx_stats(path):
    tree = ET.parse(path)
    root = tree.getroot()
    ns = {"g": "http://www.topografix.com/GPX/1/1"}
    trkpts = root.findall(".//g:trkpt", ns)
    wpts = root.findall(".//g:wpt", ns)
    trks = root.findall(".//g:trk", ns)
    pts = [(float(p.get("lat")), float(p.get("lon"))) for p in trkpts]
    dist = 0.0
    for i in range(1, len(pts)):
        (la1, lo1), (la2, lo2) = pts[i - 1], pts[i]
        R = 6371.0
        p1, p2 = math.radians(la1), math.radians(la2)
        dp = p2 - p1
        dl = math.radians(lo2 - lo1)
        a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        dist += 2 * R * math.asin(math.sqrt(a))
    return dict(trkpts=len(trkpts), wpts=len(wpts), trks=len(trks), km=round(dist, 1))

s1 = gpx_stats(GPX1)
check("全程 GPX：1 条轨迹 / 28 个航点", s1["trks"] == 1 and s1["wpts"] == 28, s1)
check("全程 GPX 折线长度 ≈ 5257（±5%）", abs(s1["km"] - 5257) / 5257 < 0.05, s1["km"])
s2 = gpx_stats(GPX2)
check("按日 GPX：28 条轨迹 / 30k+ 点", s2["trks"] == 28 and s2["trkpts"] > 30000, s2)

# ---------- 生成器可重跑 ----------
mtime0 = os.path.getmtime(XLSX)
rc = subprocess.call([sys.executable, GEN], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
mtime1 = os.path.getmtime(XLSX)
check("生成器重跑 rc=0 且重写 xlsx", rc == 0 and mtime1 >= mtime0, "rc=%d" % rc)
wb2 = openpyxl.load_workbook(XLSX)
check("重跑后仍是 12 张表", len(wb2.sheetnames) == 12, len(wb2.sheetnames))

npass = sum(1 for _, ok, _ in res if ok)
print("\n==== 文件级：%d/%d PASS ====" % (npass, len(res)))
sys.exit(0 if npass == len(res) else 1)

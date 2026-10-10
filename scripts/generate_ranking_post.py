"""
一番くじ人気ランキング記事(posts/ranking-2026-09.md)を最新データで再生成する。

設計方針:
- URLは増やさない。毎回同じファイル(posts/ranking-2026-09.md)を上書きする。
  (ファイル名は初回作成時の名残で2026-09のままだが、スラッグ=URLの安定性を
  優先し、以後もこのファイル名を使い続ける。中身の年月表記は実行時点に追従する)
- 集計ロジックはapp/ranking/wanted/page.tsx(サイト本体のランキングページ)と
  同じものをPythonに移植している。本体側のロジックを変えたら、こちらも
  合わせて見直すこと。
- 週次でGitHub Actionsから実行される想定(scrape.yml)。
"""
import os
from datetime import datetime, timedelta, timezone
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://jydztbogaxevxjsdjohy.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_KEY:
    raise SystemExit("SUPABASE_SERVICE_ROLE_KEY が設定されていません")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

POSTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'posts')
OUT_PATH = os.path.join(POSTS_DIR, 'ranking-2026-09.md')

JST = timezone(timedelta(hours=9))


def sb_get(path, params):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def today_str():
    return datetime.now(JST).strftime("%Y-%m-%d")


def days_ago_str(n):
    return (datetime.now(JST) - timedelta(days=n)).strftime("%Y-%m-%d")


# ── 歴代最高値 TOP10（従来からあるセクション）──────────────────────────
def fetch_peak_top10():
    prizes = sb_get("prizes", {
        "select": "id,name,grade,kuji_id,auction_price_peak",
        "auction_price_peak": "not.is.null",
        "order": "auction_price_peak.desc",
        "limit": "10",
    })
    kuji_ids = sorted({p["kuji_id"] for p in prizes})
    kuji_list = sb_get("kuji", {"select": "id,title", "id": f"in.({','.join(map(str, kuji_ids))})"}) if kuji_ids else []
    kuji_map = {k["id"]: k["title"] for k in kuji_list}
    return [
        {
            "rank": i + 1,
            "label": f'{p["grade"]}　{p["name"]}',
            "kuji_title": kuji_map.get(p["kuji_id"], "不明"),
            "kuji_id": p["kuji_id"],
            "price": p["auction_price_peak"],
        }
        for i, p in enumerate(prizes)
    ]


# ── 人気の賞（直近30日発売・チェック数）: /ranking/wantedの「人気の賞」と同ロジック ──
def fetch_popular_prizes(n=5):
    today = today_str()
    thirty_days_ago = days_ago_str(30)

    interests = sb_get("prize_interest", {
        "select": "prize_id,check_count",
        "check_count": "gt.0",
        "order": "check_count.desc",
        "limit": "50",
    })
    prize_ids = [i["prize_id"] for i in interests]
    if not prize_ids:
        return []

    prizes = sb_get("prizes", {
        "select": "id,name,grade,kuji_id",
        "id": f"in.({','.join(map(str, prize_ids))})",
    })
    prize_map = {p["id"]: p for p in prizes}

    kuji_ids = sorted({p["kuji_id"] for p in prizes})
    kuji_list = sb_get("kuji", {"select": "id,title,release_at", "id": f"in.({','.join(map(str, kuji_ids))})"}) if kuji_ids else []
    kuji_title_map = {k["id"]: k["title"] for k in kuji_list}
    kuji_release_map = {k["id"]: k["release_at"] for k in kuji_list}

    results = []
    for i in interests:
        prize = prize_map.get(i["prize_id"])
        if not prize:
            continue
        release_at = kuji_release_map.get(prize["kuji_id"])
        # 未発売・30日より前に発売したくじは除外（/ranking/wantedの「人気の賞」と同条件）
        if not release_at or release_at > today or release_at < thirty_days_ago:
            continue
        results.append({
            "label": f'{prize["grade"]}　{prize["name"]}',
            "kuji_title": kuji_title_map.get(prize["kuji_id"], ""),
            "kuji_id": prize["kuji_id"],
            "check_count": i["check_count"],
        })
        if len(results) >= n:
            break
    return results


# ── 週間急上昇（くじ単位・閲覧数の伸び）: /ranking/wantedと同ロジック ─────────
def fetch_weekly_trending(n=5):
    today = today_str()
    ten_days_ago = days_ago_str(10)

    snapshots = []
    offset = 0
    while True:
        batch = sb_get("kuji_views_daily", {
            "select": "kuji_id,view_count,recorded_at",
            "recorded_at": f"gte.{ten_days_ago}",
            "order": "recorded_at.asc",
            "limit": "1000",
            "offset": str(offset),
        })
        if not batch:
            break
        snapshots.extend(batch)
        offset += 1000
        if len(batch) < 1000:
            break

    first_seen, last_seen = {}, {}
    for row in snapshots:
        kid = row["kuji_id"]
        if kid not in first_seen:
            first_seen[kid] = row["view_count"]
        last_seen[kid] = row["view_count"]

    deltas = sorted(
        ({"kuji_id": kid, "delta": last_seen[kid] - first_seen.get(kid, 0)} for kid in last_seen),
        key=lambda d: -d["delta"],
    )
    deltas = [d for d in deltas if d["delta"] > 0][:50]
    if not deltas:
        return []

    kuji_ids = sorted({d["kuji_id"] for d in deltas})
    kuji_list = sb_get("kuji", {"select": "id,title,release_at", "id": f"in.({','.join(map(str, kuji_ids))})"})
    kuji_map = {k["id"]: k for k in kuji_list}

    results = []
    for d in deltas:
        kuji = kuji_map.get(d["kuji_id"])
        if not kuji or not kuji["release_at"] or kuji["release_at"] > today:
            continue
        results.append({"title": kuji["title"], "kuji_id": kuji["id"], "delta": d["delta"]})
        if len(results) >= n:
            break
    return results


# ── 発売前注目（未発売くじ・閲覧数順）: /ranking/wantedと同ロジック ─────────
def fetch_upcoming_attention(n=5):
    today = today_str()
    upcoming = sb_get("kuji", {
        "select": "id,title,release_at",
        "release_at": f"gt.{today}",
    })
    if not upcoming:
        return []
    ids = [k["id"] for k in upcoming]
    views = sb_get("kuji_views", {"select": "kuji_id,view_count", "kuji_id": f"in.({','.join(map(str, ids))})"})
    view_map = {v["kuji_id"]: v["view_count"] for v in views}

    merged = [
        {"title": k["title"], "kuji_id": k["id"], "release_at": k["release_at"], "view_count": view_map.get(k["id"], 0)}
        for k in upcoming
    ]
    merged = [m for m in merged if m["view_count"] > 0]
    merged.sort(key=lambda m: -m["view_count"])
    return merged[:n]


def fmt_date_md(date_str):
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return f"{dt.month}/{dt.day}"


def build_markdown(peak_top10, popular, weekly, upcoming):
    now = datetime.now(JST)
    month_str = f"{now.year}年{now.month}月"
    title = f"一番くじ 人気ランキングTOP10【{month_str}】"
    summary = "一番くじの景品をヤフオク落札相場・閲覧数・チェック数で多角的にランキング。歴代最高値TOP10に加え、週間急上昇・今人気の賞・発売前注目もまとめて確認できます。"
    date_str = now.strftime("%Y-%m-%d")

    peak_rows = "\n".join(
        f'| {p["rank"]} | {p["label"]} | [{p["kuji_title"]}](https://kujinone.com/kuji/{p["kuji_id"]}) | ¥{p["price"]:,} |'
        for p in peak_top10
    )

    popular_lines = "\n".join(
        f'- **{p["label"]}**（[{p["kuji_title"]}](https://kujinone.com/kuji/{p["kuji_id"]})）'
        for p in popular
    ) or "（現在、直近30日発売のくじでチェックが集まっているデータがまだありません）"

    weekly_lines = "\n".join(
        f'- **[{w["title"]}](https://kujinone.com/kuji/{w["kuji_id"]})**（閲覧数 +{w["delta"]}）'
        for w in weekly
    ) or "（現在、閲覧数が伸びているくじのデータがまだありません）"

    upcoming_lines = "\n".join(
        f'- **[{u["title"]}](https://kujinone.com/kuji/{u["kuji_id"]})**（{fmt_date_md(u["release_at"])}発売予定・閲覧数{u["view_count"]}回）'
        for u in upcoming
    ) or "（現在、注目が集まっている発売前のくじのデータがまだありません）"

    return f"""---
title: "{title}"
date: "{date_str}"
summary: "{summary}"
category: "相場"
---

## 一番くじ 景品 最高値ランキング TOP10

ヤフオク落札相場を週次で記録し、**歴代最高値**をランキング形式でまとめました。一番くじの景品の中で、特に高値がつきやすいものが一目でわかります。

| 順位 | 景品名 | くじ | 最高落札値 |
|------|--------|------|-----------|
{peak_rows}

> ヤフオク落札相場は週次で計測した最高値です。出品状況・時期により変動します。

## 今、人気の賞（直近発売くじ・チェック数順）

くじのねの期待値計算ツールで実際にチェックされた回数をもとにしたランキングです。直近30日に発売したくじに限定しているため、「今まさに注目されている賞」が分かります。

{popular_lines}

## 週間急上昇（閲覧数の伸び）

直近1週間で閲覧数が特に伸びているくじです。

{weekly_lines}

## 発売前注目（まだ発売していないくじ）

発売前にもかかわらず閲覧数が伸びているくじです。開店ダッシュが必要になりそうなくじの目安にもなります。

{upcoming_lines}

## このランキングの作り方

くじのねでは、ヤフオク落札相場・くじのページ閲覧数・期待値計算でのチェック回数を独自に収集・集計しています。このページは{month_str}時点のスナップショットですが、[人気ランキングページ](https://kujinone.com/ranking/wanted)では同じ集計を常に最新の状態で確認できます。

## 高額景品を狙う前に期待値を確認しよう

高値がつく景品ほど、くじで引き当てるまでの費用（期待値）も高くなりがちです。[期待値計算ツール](/calc)で事前にシミュレーションしてから引くことをおすすめします。

[→ 期待値を計算してみる](/calc)
[→ 最新の人気ランキングを見る](/ranking/wanted)

## 関連記事

- [一番くじの期待値とは？計算方法をわかりやすく解説](/blog/kitaichi-toha)
- [一番くじ vs メルカリ どちらがお得？賢い選び方を解説](/blog/kuji-vs-mercari)
"""


def main():
    print("▶ 人気ランキング記事を生成中...")
    peak_top10 = fetch_peak_top10()
    if not peak_top10:
        print("auction_price_peakのデータがまだありません。生成を中止します。")
        return

    popular = fetch_popular_prizes()
    weekly = fetch_weekly_trending()
    upcoming = fetch_upcoming_attention()

    md = build_markdown(peak_top10, popular, weekly, upcoming)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(md)

    print(f"✓ 生成完了: {OUT_PATH}")
    print(f"  最高値TOP{len(peak_top10)} / 人気の賞{len(popular)}件 / 週間急上昇{len(weekly)}件 / 発売前注目{len(upcoming)}件")


if __name__ == "__main__":
    main()

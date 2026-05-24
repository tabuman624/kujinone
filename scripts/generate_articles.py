import os
import requests
from datetime import datetime, timedelta, timezone

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://jydztbogaxevxjsdjohy.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5ZHp0Ym9nYXhldnhqc2Rqb2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDg5NzQsImV4cCI6MjA5NDI4NDk3NH0.9X1C_EwKKXk0h_g0ONNLT53BZctO9zu7o-2oLlZbl2s")

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

POSTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'news-posts')
LINKSYNERGY_URL = "https://click.linksynergy.com/fs-bin/click?id=txstqLlFvt4&offerid=1366097.2&type=3&subid=0"


def get_target_kuji():
    """直近60日以内に発売予定 or 発売済みのくじを取得"""
    today = datetime.now(timezone.utc).date()
    start = (today - timedelta(days=7)).isoformat()   # 直近1週間の発売済み分も対象
    end = (today + timedelta(days=60)).isoformat()    # 60日先まで
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/kuji"
        f"?release_at=gte.{start}&release_at=lte.{end}"
        f"&select=*&order=release_at.asc",
        headers=SB_HEADERS
    )
    return res.json() if res.status_code == 200 else []


def get_prizes(kuji_id):
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/prizes?kuji_id=eq.{kuji_id}&order=sort_order.asc",
        headers=SB_HEADERS
    )
    return res.json() if res.status_code == 200 else []


def make_slug(product_id):
    return f"kuji-{product_id}"


def post_exists(slug):
    return os.path.exists(os.path.join(POSTS_DIR, f"{slug}.md"))


def format_date_ja(date_str):
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return f"{d.year}年{d.month}月{d.day}日"


def build_prizes_table(prizes):
    if not prizes:
        return "（賞品情報未公開）"
    lines = ["| 賞 | 景品名 | 本数 |", "|---|---|---|"]
    for p in prizes:
        lines.append(f"| {p['grade']} | {p['name']} | {p['total']}本 |")
    return "\n".join(lines)


def calc_expected(total, target_count, price):
    if target_count <= 0 or total <= 0:
        return None
    times = round((total + 1) / (target_count + 1))
    return times * price, times


def build_expected_section(prizes, total, price):
    if total <= 0 or not prizes:
        return ""

    a_prizes  = [p for p in prizes if p['grade'] == 'A賞']
    ab_prizes = [p for p in prizes if p['grade'] in ('A賞', 'B賞')]

    lines = []

    if a_prizes:
        a_count = sum(p['total'] for p in a_prizes)
        result = calc_expected(total, a_count, price)
        if result:
            exp, times = result
            lines.append(f"**A賞のみ狙う場合**：平均 {exp:,}円（約{times}回）")

    if len(ab_prizes) > len(a_prizes):
        ab_count = sum(p['total'] for p in ab_prizes)
        result = calc_expected(total, ab_count, price)
        if result:
            exp, times = result
            lines.append(f"**A賞＋B賞を狙う場合**：平均 {exp:,}円（約{times}回）")

    if not lines:
        first = prizes[0]
        result = calc_expected(total, first['total'], price)
        if result:
            exp, times = result
            lines.append(f"**{first['grade']}のみ狙う場合**：平均 {exp:,}円（約{times}回）")

    if not lines:
        return ""

    body = "\n\n".join(lines)
    return f"""## 期待値の目安

計算式：（総残数＋1）÷（目当て賞の本数＋1）× くじ価格

{body}

※実際の期待値は店頭の残数によって変わります。くじのねで最新の残数を入力して計算してください。"""


def generate_markdown(kuji, prizes):
    title      = kuji['title']
    release_at = kuji['release_at']
    price      = kuji.get('price') or 800
    total      = kuji.get('total') or 0
    kuji_id    = kuji['id']
    today      = datetime.now().strftime("%Y-%m-%d")

    release_ja  = format_date_ja(release_at)
    total_str   = f"全{total}本" if total > 0 else "本数未発表"
    prizes_table    = build_prizes_table(prizes)
    expected_section = build_expected_section(prizes, total, price)

    image_url = kuji.get('banner_url') or kuji.get('image_url') or ''
    image_line = f"image_url: {image_url}" if image_url else ""

    return f"""---
title: 「{title}」発売日・賞品一覧まとめ【{release_ja}発売】
date: {today}
release_date: {release_at}
kuji_id: {kuji_id}
category: 新作速報
{image_line}
summary: {release_ja}発売「{title}」の賞品一覧と期待値。1回{price}円、{total_str}。くじのねで期待値を計算できます。
---

## 基本情報

{release_ja}発売予定の「{title}」をまとめます。

| 項目 | 内容 |
|---|---|
| 発売日 | {release_ja} |
| 価格 | {price}円/回 |
| 総本数 | {total_str} |

## 賞品一覧

{prizes_table}

{expected_section}

## 期待値を計算する

店頭で確認した残数を入力すると、より正確な期待値が計算できます。

[この商品の期待値を計算する →](/calc?kuji_id={kuji_id})

## オンラインで引く

店頭に行けない場合は、一番くじONLINEでオンライン参加もできます。

[一番くじONLINEはこちら →]({LINKSYNERGY_URL})
"""


def main():
    print("新作くじ記事の生成を開始...")
    kuji_list = get_target_kuji()
    print(f"{len(kuji_list)}件のくじを確認")

    generated = 0
    for kuji in kuji_list:
        slug = make_slug(kuji['product_id'])
        if post_exists(slug):
            print(f"  スキップ（記事あり）: {kuji['title']}")
            continue

        prizes  = get_prizes(kuji['id'])
        content = generate_markdown(kuji, prizes)

        filepath = os.path.join(POSTS_DIR, f"{slug}.md")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"  ✅ 生成: {slug}.md ／ {kuji['title']}")
        generated += 1

    print(f"\n完了：{generated}件の記事を生成しました。")
    return generated


if __name__ == "__main__":
    main()

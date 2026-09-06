import os
import re
import requests
from datetime import datetime, timedelta, timezone

ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5ZHp0Ym9nYXhldnhqc2Rqb2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDg5NzQsImV4cCI6MjA5NDI4NDk3NH0.9X1C_EwKKXk0h_g0ONNLT53BZctO9zu7o-2oLlZbl2s"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://jydztbogaxevxjsdjohy.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY", ANON_KEY)

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

POSTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'news-posts')
LINKSYNERGY_URL = "https://click.linksynergy.com/fs-bin/click?id=txstqLlFvt4&offerid=1366097.2&type=3&subid=0"

# ⑥ タイトルバリエーション（product_idのハッシュで安定的に選択）
# 商品名（＝検索クエリ）を必ず先頭に置き、日付は短縮形にしてSERPでの表示落ちを防ぐ。
TITLE_TEMPLATES = [
    "{title}｜賞品一覧と期待値【{release_md}発売】",
    "{title} 全賞品ラインナップ｜{release_md}発売",
]

TITLE_NAME_MAX_LEN = 28  # SERP表示枠を確保するための商品名の上限文字数

def truncate_title_name(title, max_len=TITLE_NAME_MAX_LEN):
    return title if len(title) <= max_len else title[:max_len] + "…"

def pick_title(product_id, title, release_md):
    idx = sum(ord(c) for c in product_id) % len(TITLE_TEMPLATES)
    return TITLE_TEMPLATES[idx].format(title=truncate_title_name(title), release_md=release_md)


def get_target_kuji():
    """直近60日以内に発売予定 or 発売済みのくじを取得"""
    today = datetime.now(timezone.utc).date()
    start = (today - timedelta(days=7)).isoformat()
    end   = (today + timedelta(days=60)).isoformat()
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


def update_article_image(slug, new_image_url):
    """既存記事のimage_urlをDBの最新URLに更新する。変更があればTrueを返す。"""
    if not new_image_url:
        return False
    filepath = os.path.join(POSTS_DIR, f"{slug}.md")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    m = re.search(r'^image_url:\s*(.*?)$', content, re.MULTILINE)
    current_url = m.group(1).strip() if m else ''

    if current_url == new_image_url:
        return False

    if m:
        new_content = re.sub(r'^image_url:\s*(.*?)$', f'image_url: {new_image_url}', content, flags=re.MULTILINE)
    else:
        # image_url行がない場合はcategoryの後に追加
        new_content = re.sub(r'^(category: 新作速報)$', f'\\1\nimage_url: {new_image_url}', content, flags=re.MULTILINE)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    return True


def format_date_ja(date_str):
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return f"{d.year}年{d.month}月{d.day}日"


def format_date_short(date_str):
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return f"{d.month}/{d.day}"


def build_prizes_table(prizes):
    if not prizes:
        return "（賞品情報未公開）"
    lines = ["| 賞 | 景品名 | 種類 |", "|---|---|---|"]
    for p in prizes:
        lines.append(f"| {p['grade']} | {p['name']} | {p['total']}種 |")
    return "\n".join(lines)


def build_ev_section(total, price, as_of):
    """全本数（kuji.total）が判明している場合のみ、期待値の目安を表示する。

    prizes[].total は賞ごとの「バリエーション数（種）」であり、賞ごとの実際の
    本数ではない。以前はこれを本数として合計・按分して期待値テーブルを生成して
    いたため、実在しない本数・平均費用がSERP上のdescriptionにまで露出していた。
    賞ごとの実本数はこのパイプラインでは取得できないため、按分した表は作らず、
    全体の総額のみを示す。
    """
    if total <= 0:
        return ""

    all_cost = total * price
    as_of_ja = datetime.strptime(as_of, "%Y-%m-%d").strftime("%Y年%m月") if as_of else ""

    return f"""## 期待値の目安

全{total}本・1回{price}円のくじです（{as_of_ja}時点）。全部引いた場合の総額は**約{all_cost:,}円**。目当ての賞ごとの平均費用は[期待値計算ツール](https://kujinone.com/calc)で残り本数を入力して確認できます。"""


def generate_markdown(kuji, prizes, title_override=None, date_override=None):
    title      = kuji['title']
    release_at = kuji['release_at']
    price      = kuji.get('price') or 800
    total      = kuji.get('total') or 0  # 全本数はkuji.totalのみを正とする（prizesは種類数であり本数ではない）
    kuji_id    = kuji['id']
    product_id = kuji['product_id']
    today      = date_override or datetime.now().strftime("%Y-%m-%d")

    release_ja   = format_date_ja(release_at)
    release_md   = format_date_short(release_at)
    total_str    = f"全{total}本" if total > 0 else "本数未発表"
    prizes_table = build_prizes_table(prizes)
    ev_section   = build_ev_section(total, price, datetime.now().strftime("%Y-%m-%d"))
    cta_link     = f"[→ このくじの期待値を詳しく計算する](https://kujinone.com/kuji/{kuji_id})"

    # ④ バナー画像
    image_url  = kuji.get('banner_url') or kuji.get('image_url') or ''
    image_line = f"image_url: {image_url}" if image_url else ""
    image_block = f"![{title}]({image_url})\n\n" if image_url else ""

    # ⑥ タイトルバリエーション（既存記事の再生成時はtitle_overrideで維持）
    article_title = title_override or pick_title(product_id, title, release_md)

    body_tail = f"{ev_section}\n\n{cta_link}" if ev_section else cta_link

    return f"""---
title: {article_title}
date: {today}
release_date: {release_at}
kuji_id: {kuji_id}
category: 新作速報
{image_line}
summary: {release_ja}発売「{title}」の賞品一覧と期待値。1回{price}円、{total_str}。くじのねで期待値を計算できます。
---

{image_block}## 基本情報

{release_ja}発売予定の「{title}」をまとめます。

| 項目 | 内容 |
|---|---|
| 発売日 | {release_ja} |
| 価格 | {price}円/回 |

## 賞品一覧

{prizes_table}

{body_tail}
"""


def main():
    print("新作くじ記事の生成を開始...")
    kuji_list = get_target_kuji()
    print(f"{len(kuji_list)}件のくじを確認")

    generated = 0
    image_updated = 0
    for kuji in kuji_list:
        slug = make_slug(kuji['product_id'])
        new_image_url = kuji.get('banner_url') or kuji.get('image_url') or ''

        if post_exists(slug):
            if update_article_image(slug, new_image_url):
                print(f"  🖼️  画像URL更新: {kuji['title']}")
                image_updated += 1
            else:
                print(f"  スキップ（記事あり・画像変更なし）: {kuji['title']}")
            continue

        prizes  = get_prizes(kuji['id'])
        content = generate_markdown(kuji, prizes)

        filepath = os.path.join(POSTS_DIR, f"{slug}.md")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"  ✅ 生成: {slug}.md ／ {kuji['title']}")
        generated += 1

    print(f"\n完了：{generated}件の記事を生成、{image_updated}件の画像URLを更新しました。")
    return generated


if __name__ == "__main__":
    main()

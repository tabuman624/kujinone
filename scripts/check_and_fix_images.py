"""
画像URL死活確認 & 自動修復スクリプト

使い方:
  SUPABASE_SERVICE_ROLE_KEY=xxx python3 scripts/check_and_fix_images.py

- kuji.image_url / prize.image_url が 404 になっているものを検出
- 1kuji.com を再スクレイプして正しいURLに更新する
"""

import os
import sys
import requests
from bs4 import BeautifulSoup
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

SUPABASE_URL = "https://jydztbogaxevxjsdjohy.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5ZHp0Ym9nYXhldnhqc2Rqb2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDg5NzQsImV4cCI6MjA5NDI4NDk3NH0.9X1C_EwKKXk0h_g0ONNLT53BZctO9zu7o-2oLlZbl2s"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY", ANON_KEY)

if SUPABASE_KEY == ANON_KEY:
    print("❌ SUPABASE_SERVICE_ROLE_KEY が未設定です。修復には service_role key が必要です。")
    sys.exit(1)

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}
SCRAPE_HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}


def is_broken(url):
    if not url:
        return False
    try:
        r = requests.head(url, timeout=5, allow_redirects=True)
        return r.status_code == 404
    except Exception:
        return True


def check_urls_parallel(items, url_key="image_url", workers=20):
    """URLリストを並列チェックして壊れているものだけ返す"""
    broken = []

    def check(item):
        return item, is_broken(item.get(url_key))

    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(check, item): item for item in items}
        for future in as_completed(futures):
            item, broken_flag = future.result()
            if broken_flag:
                broken.append(item)
    return broken


def scrape_kuji_detail(source_url):
    """1kuji.com の商品詳細ページから banner_url と prizes を取得"""
    res = requests.get(source_url, headers=SCRAPE_HEADERS, timeout=10)
    soup = BeautifulSoup(res.text, "html.parser")

    banner_el = soup.select_one("section.mvCol img")
    banner_url = banner_el["src"] if banner_el else None

    prizes = []
    for i, item in enumerate(soup.select("div.itemColList")):
        name_el = item.select_one("h4.name.pc") or item.select_one("h4.name.sp")
        if not name_el:
            continue
        name_text = name_el.text.strip()
        m = re.match(r'^([A-ZＡ-Ｚ\w]+賞)\s+(.+)$', name_text)
        grade = m.group(1) if m else "その他"
        img_el = item.select_one("div.itemColGallery ul.slider-item li img")
        image_url = img_el["src"] if img_el else None
        prizes.append({"sort_order": i, "grade": grade, "image_url": image_url})

    return banner_url, prizes


def fix_kuji_image(kuji_id, kuji_title, source_url, current_url):
    print(f"  🔧 修復中: {kuji_title}")
    banner_url, _ = scrape_kuji_detail(source_url)
    new_url = banner_url or current_url
    if new_url and new_url != current_url:
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/kuji?id=eq.{kuji_id}",
            headers=SB_HEADERS,
            json={"image_url": new_url, "banner_url": new_url},
        )
        print(f"    {'✅' if r.status_code == 204 else '❌'} image_url 更新 ({r.status_code})")
    else:
        print(f"    ⚠️  新しいURLが見つかりませんでした")


def fix_prize_images(kuji_id, source_url, broken_sort_orders):
    _, scraped_prizes = scrape_kuji_detail(source_url)
    for sp in scraped_prizes:
        if sp["sort_order"] in broken_sort_orders and sp.get("image_url"):
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/prizes?kuji_id=eq.{kuji_id}&sort_order=eq.{sp['sort_order']}",
                headers=SB_HEADERS,
                json={"image_url": sp["image_url"]},
            )
            print(f"    {'✅' if r.status_code == 204 else '❌'} {sp['grade']} 画像更新 ({r.status_code})")


def main():
    print("=== 画像URL死活チェック開始 ===\n")

    # 1. kuji テーブルの image_url チェック（並列）
    print("【kuji テーブル】")
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/kuji?select=id,title,image_url,source_url&is_active=eq.true&order=id",
        headers=SB_HEADERS,
    )
    kuji_list = res.json()
    print(f"  {len(kuji_list)}件を並列チェック中...")
    broken_kuji = check_urls_parallel(kuji_list)
    if broken_kuji:
        for k in broken_kuji:
            print(f"  ❌ 404: id={k['id']} {k['title']}")
            fix_kuji_image(k["id"], k["title"], k["source_url"], k.get("image_url"))
            time.sleep(1)
    else:
        print("  ✅ 全件OK")

    print(f"\n【prizes テーブル】")
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/prizes?select=kuji_id,sort_order,grade,image_url&image_url=not.is.null&order=kuji_id,sort_order&limit=5000",
        headers=SB_HEADERS,
    )
    prizes = res.json()
    print(f"  {len(prizes)}件を並列チェック中...")
    broken_prizes = check_urls_parallel(prizes)

    broken_by_kuji: dict[int, list[int]] = {}
    for p in broken_prizes:
        print(f"  ❌ 404: kuji_id={p['kuji_id']} {p['grade']}")
        broken_by_kuji.setdefault(p["kuji_id"], []).append(p["sort_order"])

    if broken_by_kuji:
        kuji_ids = list(broken_by_kuji.keys())
        id_filter = ",".join(map(str, kuji_ids))
        res2 = requests.get(
            f"{SUPABASE_URL}/rest/v1/kuji?select=id,title,source_url&id=in.({id_filter})",
            headers=SB_HEADERS,
        )
        for k in res2.json():
            print(f"\n  🔧 prizes修復: {k['title']}")
            fix_prize_images(k["id"], k["source_url"], set(broken_by_kuji[k["id"]]))
            time.sleep(1)
    else:
        print("  ✅ 全件OK")

    print("\n=== チェック完了 ===")


if __name__ == "__main__":
    main()

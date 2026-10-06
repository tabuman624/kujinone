import os
import sys
import requests
from bs4 import BeautifulSoup
import re
import time
from datetime import datetime, timezone

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://jydztbogaxevxjsdjohy.supabase.co")
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5ZHp0Ym9nYXhldnhqc2Rqb2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDg5NzQsImV4cCI6MjA5NDI4NDk3NH0.9X1C_EwKKXk0h_g0ONNLT53BZctO9zu7o-2oLlZbl2s"
# service_role key を優先。なければ anon key（書き込み不可）
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY", ANON_KEY)
if SUPABASE_KEY == ANON_KEY:
    print("⚠️  警告: SUPABASE_SERVICE_ROLE_KEY が未設定です。書き込みが失敗する可能性があります。")

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def scrape_list_for_url(url):
    res = requests.get(url, headers=HEADERS)
    soup = BeautifulSoup(res.text, "html.parser")
    results = []
    for item in soup.select("ul.itemList li a"):
        name_el = item.select_one("p.itemName")
        title = name_el.text.strip() if name_el else ""
        release_at = None
        for d in item.select("p.date"):
            m = re.search(r'(\d{4})年(\d{2})月(\d{2})日', d.text)
            if m:
                release_at = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
                break
        img_el = item.select_one("img")
        image_url = img_el["src"] if img_el else ""
        product_id = item["href"].replace("/products/", "")
        if title:
            results.append({
                "title": title,
                "release_at": release_at,
                "image_url": image_url,
                "source_url": f"https://1kuji.com/products/{product_id}",
                "product_id": product_id,
            })
    return soup, results

def scrape_list():
    # 当月ページを取得し、ナビに表示されている全月を収集
    base_url = "https://1kuji.com/products"
    soup, results = scrape_list_for_url(base_url)

    seen_products = {r["product_id"] for r in results}
    months = []
    for a in soup.select(".monthList a"):
        href = a.get("href", "")
        m = re.search(r'sale_month=(\d+)&sale_year=(\d+)', href)
        if m:
            months.append((int(m.group(2)), int(m.group(1))))

    for year, month in months:
        time.sleep(1)
        url = f"{base_url}?sale_year={year}&sale_month={month}"
        _, month_results = scrape_list_for_url(url)
        for r in month_results:
            if r["product_id"] not in seen_products:
                results.append(r)
                seen_products.add(r["product_id"])
        print(f"  {year}年{month}月: {len(month_results)}件")

    return results

def scrape_detail(url):
    res = requests.get(url, headers=HEADERS)
    soup = BeautifulSoup(res.text, "html.parser")
    price = None
    available_stores = []
    about = soup.select_one("div.detail.glBox")
    if about:
        for li in about.select("li"):
            text = li.text
            m = re.search(r'1回(\d+)円', text)
            if m:
                price = int(m.group(1))
            m2 = re.search(r'■取扱店[：:](.+)', text)
            if m2:
                stores_text = re.sub(r'など\s*$', '', m2.group(1).strip())
                available_stores = [s.strip() for s in stores_text.split('、') if s.strip()]
    banner_el = soup.select_one("section.mvCol img")
    banner_url = banner_el["src"] if banner_el else None

    prizes = []
    for i, item in enumerate(soup.select("div.itemColList")):
        name_el = item.select_one("h4.name.pc") or item.select_one("h4.name.sp")
        if not name_el:
            continue
        name_text = name_el.text.strip()
        m = re.match(r'^([A-ZＡ-Ｚ\w]+賞)\s+(.+)$', name_text)
        if m:
            grade = m.group(1)
            item_name = m.group(2)
        else:
            grade = "その他"
            item_name = name_text
        total = 1
        for d in item.select("ul.data li"):
            m2 = re.search(r'全(\d+)種', d.text)
            if m2:
                total = int(m2.group(1))
                break
        img_el = item.select_one("div.itemColGallery ul.slider-item li img")
        image_url = img_el["src"] if img_el else None
        prizes.append({"grade": grade, "name": item_name, "total": total, "sort_order": i, "image_url": image_url})
    return {"price": price, "banner_url": banner_url, "prizes": prizes, "available_stores": available_stores}

def init_total_count_default(kuji_id):
    """total_countが未設定(NULL)の新規レコードにのみデフォルト値を入れる。
    既存レコード(total_count設定済み)は対象外のクエリなので上書きされない。"""
    res = requests.patch(
        f"{SUPABASE_URL}/rest/v1/kuji?id=eq.{kuji_id}&total_count=is.null",
        headers={**SB_HEADERS, "Prefer": "return=minimal"},
        json={
            "total_count": 80,
            "total_count_source": "default",
            "total_count_updated_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    if res.status_code not in (200, 204):
        print(f"  total_countデフォルト設定エラー: {res.text}")


def upsert_kuji(kuji_data):
    res = requests.post(
        f"{SUPABASE_URL}/rest/v1/kuji?on_conflict=product_id",
        headers={**SB_HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"},
        json=kuji_data
    )
    if res.status_code in [200, 201]:
        return res.json()[0]["id"]
    else:
        print(f"  kuji登録エラー: {res.text}")
        return None

def reconcile_prizes(kuji_id, prizes, dry_run=False):
    """delete-then-insert(旧insert_prizes)を(kuji_id, grade, name)キーでの
    突き合わせ更新に置き換えたもの。

    旧方式はkuji_idの全prizesを毎日削除→再挿入しており、price_history /
    prize_interestの2テーブルがprizes.idをFK参照している(ON DELETE CASCADEなし)
    ため、参照されている賞品を1件でも含むくじは複数行DELETE文がPostgres側で
    丸ごとロールバックされ、409で確実に失敗していた(2026-06-28〜10-06の間、
    51.7%のくじで最大100日間、賞品データが凍結)。

    (kuji_id, grade, name)は現行データ全件で重複が無く、実スクレイプとの照合でも
    100%一致することを確認済み(2026-10-06 Oupas監査F8、[[kujinone-prizes-upsert-future]])。
    この組み合わせをキーに、一致行はPATCH・新規行はINSERT・消えた行だけDELETE
    する。prizeのidが保たれるため、market_price / auction_price_* の退避ロジックは
    不要になった(行自体を消さないので退避する必要が無い)。DELETEがFKで失敗しても
    その1行だけスキップし、くじ全体の更新は妨げない。

    dry_run=Trueの場合は書き込みを一切行わず、差分件数だけを返す。
    """
    if not prizes:
        print(f"  ⚠️  賞品が0件のため取得失敗とみなし、既存データを保持してスキップします。")
        return "skipped_no_prizes"

    existing_res = requests.get(
        f"{SUPABASE_URL}/rest/v1/prizes?kuji_id=eq.{kuji_id}&select=id,grade,name,total,sort_order,image_url",
        headers=SB_HEADERS
    )
    if existing_res.status_code != 200:
        print(f"  ⚠️  既存prizesの取得に失敗しました(status={existing_res.status_code})。スキップします。")
        return "fetch_error"

    existing_by_key = {(r["grade"], r["name"]): r for r in existing_res.json()}
    scraped_by_key = {(p["grade"], p["name"]): p for p in prizes}

    to_update = []
    to_insert = []
    for key, p in scraped_by_key.items():
        ex = existing_by_key.get(key)
        if ex is None:
            to_insert.append(p)
        elif (ex["total"], ex["sort_order"], ex["image_url"]) != (p["total"], p["sort_order"], p["image_url"]):
            to_update.append((ex, p))
    to_delete = [ex for key, ex in existing_by_key.items() if key not in scraped_by_key]

    if dry_run:
        return f"dry_run(更新{len(to_update)}件/追加{len(to_insert)}件/削除候補{len(to_delete)}件)"

    updated_count = 0
    for ex, p in to_update:
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/prizes?id=eq.{ex['id']}",
            headers={**SB_HEADERS, "Prefer": "return=minimal"},
            json={"total": p["total"], "sort_order": p["sort_order"], "image_url": p["image_url"]},
        )
        if r.status_code in (200, 204):
            updated_count += 1
        else:
            print(f"  ⚠️  PATCH失敗 id={ex['id']}({ex['grade']} {ex['name']}) status={r.status_code}: {r.text}")

    inserted_count = 0
    if to_insert:
        payload = [{"kuji_id": kuji_id, **p, "market_price": None} for p in to_insert]
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/prizes",
            headers={**SB_HEADERS, "Prefer": "return=minimal"},
            json=payload,
        )
        if r.status_code in (200, 201):
            inserted_count = len(to_insert)
        else:
            print(f"  ⚠️  INSERT失敗 status={r.status_code}: {r.text}")

    deleted_count = 0
    delete_locked = 0
    for ex in to_delete:
        r = requests.delete(
            f"{SUPABASE_URL}/rest/v1/prizes?id=eq.{ex['id']}",
            headers={**SB_HEADERS, "Prefer": "return=minimal"},
        )
        if r.status_code in (200, 204):
            deleted_count += 1
        elif r.status_code == 409:
            delete_locked += 1
        else:
            print(f"  ⚠️  DELETE失敗 id={ex['id']}({ex['grade']} {ex['name']}) status={r.status_code}: {r.text}")

    summary = f"reconciled(更新{updated_count}/追加{inserted_count}/削除{deleted_count}"
    if delete_locked:
        summary += f"/削除保留{delete_locked}件・FK参照中のため個別スキップ"
    summary += ")"
    return summary

def main(dry_run=False):
    if dry_run:
        print("=== DRY RUN モード: 書き込みは一切行いません ===")
    print("一番くじ情報を取得中（全月）...")
    kuji_list = scrape_list()
    print(f"\n合計 {len(kuji_list)}件取得")

    errors = []
    prizes_updated = 0
    prizes_not_updated = 0
    for kuji in kuji_list:
        print(f"\n処理中: {kuji['title']}")
        time.sleep(1)

        try:
            detail = scrape_detail(kuji["source_url"])

            if dry_run:
                # kuji自体の更新も行わず、prizesの差分件数だけを読み取り専用で確認する
                existing_res = requests.get(
                    f"{SUPABASE_URL}/rest/v1/kuji?product_id=eq.{kuji['product_id']}&select=id",
                    headers=SB_HEADERS
                )
                rows = existing_res.json() if existing_res.status_code == 200 else []
                if not rows:
                    print(f"  [dry-run] 新規くじのため差分プレビュー対象外")
                    continue
                prizes_result = reconcile_prizes(rows[0]["id"], detail["prizes"], dry_run=True)
                print(f"  [dry-run] {prizes_result}")
                continue

            kuji["price"] = detail["price"] or 800
            kuji["is_active"] = True
            kuji["available_stores"] = detail.get("available_stores") or []
            if detail.get("banner_url"):
                kuji["image_url"] = detail["banner_url"]
                kuji["banner_url"] = detail["banner_url"]

            kuji_id = upsert_kuji(kuji)
            if kuji_id:
                init_total_count_default(kuji_id)
                prizes_result = reconcile_prizes(kuji_id, detail["prizes"])
                if prizes_result and prizes_result.startswith("reconciled"):
                    print(f"  ✅ 登録完了 (id={kuji_id}, {prizes_result})")
                    prizes_updated += 1
                else:
                    print(f"  ⚠️  登録完了だがprizesは未更新 (id={kuji_id}, 理由={prizes_result})")
                    prizes_not_updated += 1
        except Exception as e:
            print(f"  ❌ エラー（スキップ）: {e}")
            errors.append({"title": kuji["title"], "error": str(e)})

    if not dry_run:
        print(f"\nprizes更新サマリ: 更新{prizes_updated}件 / 未更新{prizes_not_updated}件")

    if errors:
        print(f"\n⚠️  {len(errors)}件スキップ:")
        for err in errors:
            print(f"  - {err['title']}: {err['error']}")

    print("\n完了！")

if __name__ == "__main__":
    main(dry_run="--dry-run" in sys.argv)

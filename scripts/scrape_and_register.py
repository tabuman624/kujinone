import os
import requests
from bs4 import BeautifulSoup
import re
import time

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

def insert_prizes(kuji_id, prizes):
    if not prizes:
        print(f"  ⚠️  賞品が0件のため取得失敗とみなし、既存データを保持してスキップします。")
        return

    # 既存の market_price を sort_order をキーに退避（毎日の再挿入で消えないように）
    backup_res = requests.get(
        f"{SUPABASE_URL}/rest/v1/prizes?kuji_id=eq.{kuji_id}&select=sort_order,market_price",
        headers=SB_HEADERS
    )
    price_backup = {}
    if backup_res.status_code == 200:
        for p in backup_res.json():
            if p.get("market_price") is not None:
                price_backup[p["sort_order"]] = p["market_price"]

    prize_data = [
        {"kuji_id": kuji_id, **p, "market_price": price_backup.get(p["sort_order"])}
        for p in prizes
    ]

    # テスト挿入で書き込み権限を確認（kuji_id=-1 は FK なしなので必ず通る）
    test_res = requests.post(
        f"{SUPABASE_URL}/rest/v1/prizes",
        headers={**SB_HEADERS, "Prefer": "return=minimal"},
        json=[{**prize_data[0], "kuji_id": -1}]
    )
    requests.delete(f"{SUPABASE_URL}/rest/v1/prizes?kuji_id=eq.-1",
                    headers={**SB_HEADERS, "Prefer": "return=minimal"})
    if test_res.status_code not in [200, 201, 204]:
        print(f"  ⚠️  prizes書き込み権限なし（RLSブロック）。スキップします。")
        return

    # 既存データを削除して件数を確認
    requests.delete(f"{SUPABASE_URL}/rest/v1/prizes?kuji_id=eq.{kuji_id}",
                    headers={**SB_HEADERS, "Prefer": "return=minimal"})
    remaining = requests.get(
        f"{SUPABASE_URL}/rest/v1/prizes?kuji_id=eq.{kuji_id}&select=id&limit=1",
        headers=SB_HEADERS
    ).json()
    if remaining:
        print(f"  ⚠️  DELETE後も既存データが残っています。重複を避けるためスキップします。")
        return

    res = requests.post(
        f"{SUPABASE_URL}/rest/v1/prizes",
        headers=SB_HEADERS,
        json=prize_data
    )
    if res.status_code not in [200, 201]:
        print(f"  prizes登録エラー: {res.text}")

def main():
    print("一番くじ情報を取得中（全月）...")
    kuji_list = scrape_list()
    print(f"\n合計 {len(kuji_list)}件取得")

    errors = []
    for kuji in kuji_list:
        print(f"\n処理中: {kuji['title']}")
        time.sleep(1)

        try:
            detail = scrape_detail(kuji["source_url"])
            kuji["price"] = detail["price"] or 800
            kuji["total"] = 0
            kuji["is_active"] = True
            kuji["available_stores"] = detail.get("available_stores") or []
            if detail.get("banner_url"):
                kuji["image_url"] = detail["banner_url"]
                kuji["banner_url"] = detail["banner_url"]

            kuji_id = upsert_kuji(kuji)
            if kuji_id:
                insert_prizes(kuji_id, detail["prizes"])
                print(f"  ✅ 登録完了 (id={kuji_id}, 賞{len(detail['prizes'])}件)")
        except Exception as e:
            print(f"  ❌ エラー（スキップ）: {e}")
            errors.append({"title": kuji["title"], "error": str(e)})

    if errors:
        print(f"\n⚠️  {len(errors)}件スキップ:")
        for err in errors:
            print(f"  - {err['title']}: {err['error']}")

    print("\n完了！")

if __name__ == "__main__":
    main()

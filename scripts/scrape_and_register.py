import requests
from bs4 import BeautifulSoup
import re
import time

SUPABASE_URL = "https://jydztbogaxevxjsdjohy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5ZHp0Ym9nYXhldnhqc2Rqb2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDg5NzQsImV4cCI6MjA5NDI4NDk3NH0.9X1C_EwKKXk0h_g0ONNLT53BZctO9zu7o-2oLlZbl2s"

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
    about = soup.select_one("div.detail.glBox")
    if about:
        for li in about.select("li"):
            m = re.search(r'1回(\d+)円', li.text)
            if m:
                price = int(m.group(1))
                break
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
    return {"price": price, "banner_url": banner_url, "prizes": prizes}

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
    requests.delete(
        f"{SUPABASE_URL}/rest/v1/prizes?kuji_id=eq.{kuji_id}",
        headers=SB_HEADERS
    )
    prize_data = [{"kuji_id": kuji_id, **p} for p in prizes]
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

    for kuji in kuji_list:
        print(f"\n処理中: {kuji['title']}")
        time.sleep(1)

        detail = scrape_detail(kuji["source_url"])
        kuji["price"] = detail["price"] or 800
        kuji["total"] = 0
        kuji["is_active"] = True
        if detail.get("banner_url"):
            kuji["image_url"] = detail["banner_url"]

        kuji_id = upsert_kuji(kuji)
        if kuji_id:
            insert_prizes(kuji_id, detail["prizes"])
            print(f"  ✅ 登録完了 (id={kuji_id}, 賞{len(detail['prizes'])}件)")

    print("\n完了！")

if __name__ == "__main__":
    main()

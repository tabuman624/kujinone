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
}

def fetch_all_kuji():
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/kuji?select=id,product_id,image_url&order=id",
        headers=SB_HEADERS
    )
    return res.json()

def copy_image_to_banner(kuji_id, banner_url):
    res = requests.patch(
        f"{SUPABASE_URL}/rest/v1/kuji?id=eq.{kuji_id}",
        headers=SB_HEADERS,
        json={"banner_url": banner_url}
    )
    return res.status_code in [200, 204]

def update_image_url(kuji_id, image_url):
    res = requests.patch(
        f"{SUPABASE_URL}/rest/v1/kuji?id=eq.{kuji_id}",
        headers=SB_HEADERS,
        json={"image_url": image_url}
    )
    return res.status_code in [200, 204]

def scrape_thumbnails_for_url(url):
    res = requests.get(url, headers=HEADERS, timeout=10)
    soup = BeautifulSoup(res.text, "html.parser")
    results = {}
    for item in soup.select("ul.itemList li a"):
        product_id = item["href"].replace("/products/", "")
        img_el = item.select_one("img")
        if img_el:
            results[product_id] = img_el["src"]
    return soup, results

def scrape_all_thumbnails():
    base_url = "https://1kuji.com/products"
    soup, thumbnails = scrape_thumbnails_for_url(base_url)

    months = []
    for a in soup.select(".monthList a"):
        href = a.get("href", "")
        m = re.search(r'sale_month=(\d+)&sale_year=(\d+)', href)
        if m:
            months.append((int(m.group(2)), int(m.group(1))))

    for year, month in months:
        time.sleep(1)
        url = f"{base_url}?sale_year={year}&sale_month={month}"
        _, month_results = scrape_thumbnails_for_url(url)
        thumbnails.update(month_results)
        print(f"  {year}年{month}月: {len(month_results)}件")

    return thumbnails

def main():
    print("=== Step 1: image_url → banner_url にコピー ===")
    kuji_list = fetch_all_kuji()
    print(f"{len(kuji_list)}件処理します\n")

    for kuji in kuji_list:
        if kuji.get("image_url"):
            ok = copy_image_to_banner(kuji["id"], kuji["image_url"])
            print(f"  [{kuji['id']}] {'✅' if ok else '❌'} banner_url設定")

    print("\n=== Step 2: リストページからサムネイルを取得 ===")
    thumbnails = scrape_all_thumbnails()
    print(f"\n合計 {len(thumbnails)}件のサムネイルを取得\n")

    print("=== Step 3: image_url をサムネイルに戻す ===")
    matched = 0
    for kuji in kuji_list:
        product_id = kuji.get("product_id")
        if product_id and product_id in thumbnails:
            ok = update_image_url(kuji["id"], thumbnails[product_id])
            print(f"  [{kuji['id']}] {product_id}: {'✅' if ok else '❌'}")
            matched += 1
        else:
            print(f"  [{kuji['id']}] {product_id}: ⚠️  サムネイルが見つかりませんでした")

    print(f"\n完了！ {matched}/{len(kuji_list)}件更新")

if __name__ == "__main__":
    main()

import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime

def scrape_kuji_list():
    url = "https://1kuji.com/products"
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
    
    res = requests.get(url, headers=headers)
    soup = BeautifulSoup(res.text, "html.parser")
    
    items = soup.select("ul.itemList li a")
    results = []
    
    for item in items:
        # タイトル
        name_el = item.select_one("p.itemName")
        title = name_el.text.strip() if name_el else ""
        
        # 発売日（店頭販売の最初の日付）
        date_els = item.select("p.date")
        release_at = None
        for d in date_els:
            text = d.text.strip()
            m = re.search(r'(\d{4})年(\d{2})月(\d{2})日', text)
            if m:
                release_at = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
                break
        
        # 画像URL
        img_el = item.select_one("img")
        image_url = img_el["src"] if img_el else ""
        
        # 詳細ページURL
        detail_url = "https://1kuji.com" + item["href"]
        product_id = item["href"].replace("/products/", "")
        
        if title:
            results.append({
                "title": title,
                "release_at": release_at,
                "image_url": image_url,
                "detail_url": detail_url,
                "product_id": product_id,
            })
    
    return results

if __name__ == "__main__":
    items = scrape_kuji_list()
    for item in items:
        print(item)

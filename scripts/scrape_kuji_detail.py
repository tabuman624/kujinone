import requests
from bs4 import BeautifulSoup
import re
import time

headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

def scrape_detail(url):
    res = requests.get(url, headers=headers)
    soup = BeautifulSoup(res.text, "html.parser")
    
    # 価格
    price = None
    about = soup.select_one("div.detail.glBox")
    if about:
        for li in about.select("li"):
            m = re.search(r'1回(\d+)円', li.text)
            if m:
                price = int(m.group(1))
                break
    
    # 賞情報
    prizes = []
    for item in soup.select("div.itemColList"):
        name_el = item.select_one("h4.name.pc") or item.select_one("h4.name.sp")
        if not name_el:
            continue
        name_text = name_el.text.strip()
        
        # 等賞を抽出（A賞、B賞...ラストワン賞など）
        m = re.match(r'^([A-ZＡ-Ｚ\w]+賞)\s+(.+)$', name_text)
        if m:
            grade = m.group(1)
            item_name = m.group(2)
        else:
            grade = "その他"
            item_name = name_text
        
        # 種数
        total = 1
        data_els = item.select("ul.data li")
        for d in data_els:
            m2 = re.search(r'全(\d+)種', d.text)
            if m2:
                total = int(m2.group(1))
                break
        
        prizes.append({
            "grade": grade,
            "name": item_name,
            "total": total,
        })
    
    return {"price": price, "prizes": prizes}

if __name__ == "__main__":
    result = scrape_detail("https://1kuji.com/products/tamagotchi3-2")
    print("価格:", result["price"])
    print("賞一覧:")
    for p in result["prizes"]:
        print(f"  {p['grade']}: {p['name']} (全{p['total']}種)")

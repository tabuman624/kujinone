import requests
from bs4 import BeautifulSoup
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
        f"{SUPABASE_URL}/rest/v1/kuji?select=id,source_url&order=id",
        headers=SB_HEADERS
    )
    return res.json()

def get_banner_url(source_url):
    try:
        res = requests.get(source_url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")
        el = soup.select_one("section.mvCol img")
        return el["src"] if el else None
    except Exception as e:
        print(f"  エラー: {e}")
        return None

def update_image_url(kuji_id, image_url):
    res = requests.patch(
        f"{SUPABASE_URL}/rest/v1/kuji?id=eq.{kuji_id}",
        headers=SB_HEADERS,
        json={"image_url": image_url}
    )
    return res.status_code in [200, 204]

def main():
    kuji_list = fetch_all_kuji()
    print(f"{len(kuji_list)}件のくじを更新します\n")

    for kuji in kuji_list:
        kuji_id = kuji["id"]
        source_url = kuji.get("source_url")
        if not source_url:
            print(f"  [{kuji_id}] source_urlなし - スキップ")
            continue

        print(f"[{kuji_id}] {source_url} を取得中...")
        banner_url = get_banner_url(source_url)

        if banner_url:
            ok = update_image_url(kuji_id, banner_url)
            print(f"  {'✅ 更新完了' if ok else '❌ 更新失敗'}: {banner_url}")
        else:
            print(f"  ⚠️  banner画像が見つかりませんでした")

        time.sleep(1)

    print("\n完了！")

if __name__ == "__main__":
    main()

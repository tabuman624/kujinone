"""
駿河屋の検索結果から各賞の参考価格を取得して Supabase に保存する。
market_price が未設定（NULL）の賞のみ処理するため、毎日実行しても安全。
"""
import os
import re
import time
import requests
from bs4 import BeautifulSoup

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://jydztbogaxevxjsdjohy.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5ZHp0Ym9nYXhldnhqc2Rqb2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDg5NzQsImV4cCI6MjA5NDI4NDk3NH0.9X1C_EwKKXk0h_g0ONNLT53BZctO9zu7o-2oLlZbl2s")

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}
WEB_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def get_unpriced_prizes():
    """market_price が未設定の賞を、くじタイトルとあわせて取得"""
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/prizes"
        f"?market_price=is.null"
        f"&select=id,name,grade,kuji_id,kuji:kuji_id(title)"
        f"&order=kuji_id.asc",
        headers=SB_HEADERS,
    )
    return res.json() if res.status_code == 200 else []


def build_search_keyword(prize_name: str, kuji_title: str) -> str:
    """検索キーワードを組み立てる。賞記号（A賞など）を除去してくじタイトルを付加"""
    # "A賞 ○○フィギュア" → "○○フィギュア"
    item_name = re.sub(r'^[A-ZＡ-Ｚa-z\w]*賞\s*', '', prize_name).strip()
    if not item_name:
        item_name = prize_name

    # くじタイトルの先頭2〜3語を取得（例: "一番くじ ドラゴンボール SUPER" → "ドラゴンボール SUPER"）
    title_words = re.sub(r'^一番くじ\s*', '', kuji_title).strip()
    title_prefix = ' '.join(title_words.split()[:2])

    return f"{title_prefix} {item_name}".strip()


def fetch_surugaya_price(keyword: str) -> int | None:
    """駿河屋の検索結果から最安値を返す。取得できなければ None"""
    url = f"https://www.suruga-ya.jp/search?search_word={requests.utils.quote(keyword)}"
    try:
        res = requests.get(url, headers=WEB_HEADERS, timeout=12)
        if res.status_code != 200:
            return None
        soup = BeautifulSoup(res.text, "html.parser")

        prices = []

        # パターン1: class に "price" を含む要素
        for el in soup.select("[class*='price']"):
            text = el.get_text(strip=True)
            m = re.search(r'(\d{1,3}(?:,\d{3})*)', text)
            if m:
                val = int(m.group(1).replace(',', ''))
                if 100 <= val <= 200_000:
                    prices.append(val)

        # パターン2: "円" を含むテキストを持つ span/p/strong
        if not prices:
            for el in soup.find_all(['span', 'p', 'strong']):
                text = el.get_text(strip=True)
                if '円' in text:
                    m = re.search(r'(\d{1,3}(?:,\d{3})*)\s*円', text)
                    if m:
                        val = int(m.group(1).replace(',', ''))
                        if 100 <= val <= 200_000:
                            prices.append(val)

        return min(prices) if prices else None

    except Exception as e:
        print(f"    駿河屋取得エラー ({keyword}): {e}")
        return None


def update_market_price(prize_id: int, price: int):
    res = requests.patch(
        f"{SUPABASE_URL}/rest/v1/prizes?id=eq.{prize_id}",
        headers=SB_HEADERS,
        json={"market_price": price},
    )
    return res.status_code in [200, 204]


def main():
    prizes = get_unpriced_prizes()
    print(f"market_price 未設定の賞: {len(prizes)}件")

    if not prizes:
        print("処理対象なし。終了します。")
        return

    updated = 0
    skipped = 0

    for prize in prizes:
        kuji_title = (prize.get("kuji") or {}).get("title", "")
        keyword = build_search_keyword(prize["name"], kuji_title)

        price = fetch_surugaya_price(keyword)

        if price:
            ok = update_market_price(prize["id"], price)
            status = "✅" if ok else "⚠️"
            print(f"  {status} [{prize['grade']}] {prize['name']}  →  ¥{price:,}  ({keyword})")
            if ok:
                updated += 1
        else:
            print(f"  -  [{prize['grade']}] {prize['name']}  価格未取得  ({keyword})")
            skipped += 1

        time.sleep(1.5)  # 駿河屋への負荷軽減

    print(f"\n完了: {updated}件更新 / {skipped}件スキップ")


if __name__ == "__main__":
    main()

"""
景品の参考価格を取得して Supabase に保存する。
戦略:
  1. 駿河屋で検索 → 1件目のタイトルが関連していれば採用
  2. 未取得 or 無関係 → Yahoo! ショッピング API でフォールバック
  3. それでも取得できなければスキップ（翌日再試行）
market_price が未設定（NULL）の賞のみ処理するため、毎日実行しても安全。
"""
import os
import re
import time
from typing import Optional
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://jydztbogaxevxjsdjohy.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5ZHp0Ym9nYXhldnhqc2Rqb2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDg5NzQsImV4cCI6MjA5NDI4NDk3NH0.9X1C_EwKKXk0h_g0ONNLT53BZctO9zu7o-2oLlZbl2s")
YAHOO_APP_ID = os.environ.get("YAHOO_APP_ID", "")

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}
WEB_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# ¥500 など下限ぎりぎりのノイズを避けるため、実用上あり得ない価格帯を除外
PRICE_MIN = 500
PRICE_MAX = 200_000


# ─── Supabase ───────────────────────────────────────────────────────────────

def get_kuji_titles() -> dict:
    """kuji テーブルから id → title のマップを返す"""
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/kuji?select=id,title",
        headers=SB_HEADERS,
    )
    if res.status_code != 200:
        return {}
    return {row["id"]: row["title"] for row in res.json()}


def get_unpriced_prizes():
    """market_price が未設定の賞を取得"""
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/prizes"
        f"?market_price=is.null"
        f"&select=id,name,grade,kuji_id"
        f"&order=kuji_id.asc",
        headers=SB_HEADERS,
    )
    return res.json() if res.status_code == 200 else []


def update_market_price(prize_id: int, price: int) -> bool:
    res = requests.patch(
        f"{SUPABASE_URL}/rest/v1/prizes?id=eq.{prize_id}",
        headers=SB_HEADERS,
        json={"market_price": price},
    )
    return res.status_code in [200, 204]


# ─── キーワード生成 ─────────────────────────────────────────────────────────

def build_search_keyword(prize_name: str, kuji_title: str) -> str:
    """検索キーワードを組み立てる。賞記号（A賞など）を除去してくじタイトルを付加"""
    item_name = re.sub(r'^[A-ZＡ-Ｚa-z\w]*賞\s*', '', prize_name).strip()
    if not item_name:
        item_name = prize_name
    title_words = re.sub(r'^一番くじ\s*', '', kuji_title).strip()
    title_prefix = title_words.split()[0] if title_words else ''
    return f"{title_prefix} {item_name}".strip()


# ─── タイトル関連度チェック ──────────────────────────────────────────────────

def is_relevant(keyword: str, result_title: str, threshold: float = 0.35) -> bool:
    """
    検索キーワードの単語と検索結果タイトルの単語がどれだけ重なるかで関連度を判定。
    threshold: 0.35 = キーワード単語の35%以上が結果タイトルに含まれていれば OK
    """
    kw_words = set(re.split(r'[\s　・・「」【】（）()]+', keyword.lower()))
    kw_words.discard('')
    if not kw_words:
        return True
    title_lower = result_title.lower()
    matched = sum(1 for w in kw_words if w in title_lower)
    return (matched / len(kw_words)) >= threshold


# ─── 駿河屋スクレイピング ────────────────────────────────────────────────────

def fetch_surugaya_price(keyword: str) -> Optional[int]:
    """
    駿河屋の検索1件目の商品ページから価格を取得する。
    1件目のタイトルが関連していない場合は None を返す。
    """
    search_url = f"https://www.suruga-ya.jp/search?search_word={quote(keyword)}"
    try:
        res = requests.get(search_url, headers=WEB_HEADERS, timeout=12)
        if res.status_code != 200:
            return None
        soup = BeautifulSoup(res.text, "html.parser")

        # 検索結果の1件目を取得
        first_item = soup.select_one("ul.itemList li")
        if not first_item:
            return None

        # タイトルの関連度チェック
        title_el = first_item.select_one("p.itemName")
        if title_el:
            result_title = title_el.get_text(strip=True)
            if not is_relevant(keyword, result_title):
                return None

        # 価格取得（class に "price" を含む要素から最小値）
        prices = []
        for el in first_item.select("[class*='price']"):
            text = el.get_text(strip=True)
            m = re.search(r'(\d{1,3}(?:,\d{3})+|\d{4,})', text)
            if m:
                val = int(m.group(1).replace(',', ''))
                if PRICE_MIN <= val <= PRICE_MAX:
                    prices.append(val)

        return min(prices) if prices else None

    except Exception as e:
        print(f"    駿河屋エラー ({keyword}): {e}")
        return None


# ─── Yahoo! ショッピング API ─────────────────────────────────────────────────

def fetch_yahoo_price(keyword: str) -> Optional[int]:
    """Yahoo! ショッピング API で価格を取得する（YAHOO_APP_ID が必要）"""
    if not YAHOO_APP_ID:
        return None
    try:
        res = requests.get(
            "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch",
            params={
                "appid": YAHOO_APP_ID,
                "query": keyword,
                "results": 10,
                "sort": "+price",   # 安い順
            },
            timeout=12,
        )
        if res.status_code != 200:
            return None
        data = res.json()
        for hit in data.get("hits", []):
            price = hit.get("price")
            name = hit.get("name", "")
            if price and PRICE_MIN <= price <= PRICE_MAX and is_relevant(keyword, name):
                return price
        return None
    except Exception as e:
        print(f"    Yahoo APIエラー ({keyword}): {e}")
        return None


# ─── メイン ──────────────────────────────────────────────────────────────────

def main():
    kuji_titles = get_kuji_titles()
    prizes = get_unpriced_prizes()
    print(f"market_price 未設定の賞: {len(prizes)}件")

    if not prizes:
        print("処理対象なし。終了します。")
        return

    updated = 0
    skipped = 0
    yahoo_used = 0

    for prize in prizes:
        kuji_title = kuji_titles.get(prize["kuji_id"], "")
        keyword = build_search_keyword(prize["name"], kuji_title)

        # ① 駿河屋
        price = fetch_surugaya_price(keyword)
        source = "駿河屋"

        # ② Yahoo フォールバック
        if price is None and YAHOO_APP_ID:
            time.sleep(0.5)
            price = fetch_yahoo_price(keyword)
            if price:
                source = "Yahoo"
                yahoo_used += 1

        if price:
            ok = update_market_price(prize["id"], price)
            status = "✅" if ok else "⚠️"
            print(f"  {status} [{prize['grade']}] {prize['name']}  →  ¥{price:,}  [{source}]  ({keyword})")
            if ok:
                updated += 1
        else:
            print(f"  -  [{prize['grade']}] {prize['name']}  価格未取得  ({keyword})")
            skipped += 1

        time.sleep(1.2)

    print(f"\n完了: {updated}件更新 / {skipped}件スキップ（Yahoo使用: {yahoo_used}件）")


if __name__ == "__main__":
    main()

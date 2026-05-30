"""
Yahoo OAuth 認証コードをリフレッシュトークンに交換するスクリプト。
一回だけ実行すればOK。取得したリフレッシュトークンを Vercel/GitHub に登録する。

使い方:
  python scripts/get_yahoo_refresh_token.py
"""
import sys
import requests

CLIENT_ID = input("Client ID を入力: ").strip()
CLIENT_SECRET = input("Client Secret を入力: ").strip()
CODE = input("認証コード（code=xxx の xxx 部分）を入力: ").strip()
REDIRECT_URI = "https://kujinone.com/api/yahoo-callback"

res = requests.post(
    "https://auth.login.yahoo.co.jp/yconnect/v2/token",
    data={
        "grant_type": "authorization_code",
        "code": CODE,
        "redirect_uri": REDIRECT_URI,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    },
    headers={"Content-Type": "application/x-www-form-urlencoded"},
)

if res.status_code != 200:
    print(f"\nエラー: {res.status_code}")
    print(res.text)
    sys.exit(1)

data = res.json()
refresh_token = data.get("refresh_token", "")
access_token = data.get("access_token", "")

print("\n========================================")
print("✅ トークン取得成功！")
print(f"\nrefresh_token:\n{refresh_token}")
print("\n========================================")
print("次のステップ:")
print("1. Vercel の Environment Variables に以下を追加:")
print(f"   YAHOO_AUCTION_CLIENT_ID     = {CLIENT_ID}")
print(f"   YAHOO_AUCTION_CLIENT_SECRET = {CLIENT_SECRET}")
print(f"   YAHOO_AUCTION_REFRESH_TOKEN = {refresh_token}")
print("\n2. GitHub Secrets にも同じ3つを追加")
print("========================================")

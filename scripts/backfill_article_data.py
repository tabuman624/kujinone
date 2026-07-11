import os
import re
import glob
import requests

from generate_articles import (
    SUPABASE_URL, SB_HEADERS, POSTS_DIR,
    get_prizes, generate_markdown,
)


def get_kuji_by_id(kuji_id):
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/kuji?id=eq.{kuji_id}&select=*",
        headers=SB_HEADERS
    )
    data = res.json() if res.status_code == 200 else []
    return data[0] if data else None


def parse_field(content, field):
    m = re.search(rf'^{field}:\s*(.*)$', content, re.MULTILINE)
    return m.group(1).strip() if m else None


def backfill_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 「本数未発表」のまま放置されている記事だけを対象にする
    if '本数未発表' not in content:
        return None

    kuji_id = parse_field(content, 'kuji_id')
    if not kuji_id or not kuji_id.isdigit():
        return None

    kuji = get_kuji_by_id(kuji_id)
    if not kuji:
        return None

    prizes = get_prizes(kuji_id)
    total = sum(p['total'] for p in prizes) if prizes else 0
    if total <= 0:
        return None  # まだ本数が未公開のまま → 対象外

    # タイトル・作成日は手動でSEOチューニングされている可能性があるため維持する
    existing_title = parse_field(content, 'title')
    existing_date  = parse_field(content, 'date')

    new_content = generate_markdown(
        kuji, prizes,
        title_override=existing_title,
        date_override=existing_date,
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    return kuji.get('title', kuji_id)


def main():
    print("既存記事の期待値データ・バックフィルを開始...")
    targets = sorted(glob.glob(os.path.join(POSTS_DIR, '*.md')))
    updated = 0
    for path in targets:
        result = backfill_file(path)
        if result:
            print(f"  ✅ バックフィル: {os.path.basename(path)} ／ {result}")
            updated += 1
    print(f"\n完了：{updated}件の記事に実データを反映しました。")
    return updated


if __name__ == "__main__":
    main()

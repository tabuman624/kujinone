"""
news-posts/*.mdの title frontmatterが商品名の途中で「…」切れしている
97記事を、本文の画像alt(常にフル商品名)から正しいタイトルを復元して
新しいpick_titleロジック(generate_articles.py)で再生成する一回限りの
バックフィルスクリプト。
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from generate_articles import pick_title, weighted_length, TITLE_TOTAL_MAX_WEIGHTED_LEN, ROOT_TITLE_SUFFIX_WEIGHTED_LEN

POSTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'news-posts')


def release_md_from_date(release_date: str) -> str:
    y, m, d = release_date.split('-')
    return f"{int(m)}/{int(d)}"


def fix_file(path):
    with open(path, encoding='utf-8') as f:
        content = f.read()

    m = re.match(r'^---\n(.*?)\n---\n(.*)$', content, re.S)
    if not m:
        return None
    frontmatter, body = m.group(1), m.group(2)

    title_m = re.search(r'^title:\s*(.+)$', frontmatter, re.M)
    if not title_m or '…' not in title_m.group(1):
        return None
    old_title = title_m.group(1).strip()

    release_date_m = re.search(r'^release_date:\s*(\S+)', frontmatter, re.M)
    if not release_date_m:
        return f"SKIP (release_date not found): {path}"
    release_md = release_md_from_date(release_date_m.group(1))

    # 本文冒頭の画像altに常にフル商品名が入っている(generate_markdownのimage_block)
    alt_m = re.search(r'!\[(.+?)\]\(', body)
    if not alt_m:
        return f"SKIP (image alt not found): {path}"
    true_title = alt_m.group(1)

    # product_idはファイル名(拡張子抜き)が常に一致する(generate_markdownのslug=product_id)
    product_id = os.path.splitext(os.path.basename(path))[0]

    new_title = pick_title(product_id, true_title, release_md)

    if new_title == old_title:
        return None

    new_frontmatter = re.sub(r'^title:\s*.+$', f'title: {new_title}', frontmatter, count=1, flags=re.M)
    new_content = f"---\n{new_frontmatter}\n---\n{body}"
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    budget_ok = weighted_length(new_title) + ROOT_TITLE_SUFFIX_WEIGHTED_LEN <= TITLE_TOTAL_MAX_WEIGHTED_LEN
    return f"FIXED{'  ' if budget_ok else ' [budget超過・title素のまま] '}: {os.path.basename(path)}\n  旧: {old_title}\n  新: {new_title}"


def main():
    results = []
    for fname in sorted(os.listdir(POSTS_DIR)):
        if not fname.endswith('.md'):
            continue
        path = os.path.join(POSTS_DIR, fname)
        r = fix_file(path)
        if r:
            results.append(r)

    fixed = [r for r in results if r.startswith('FIXED')]
    skipped = [r for r in results if r.startswith('SKIP')]

    print(f"修正: {len(fixed)}件 / スキップ: {len(skipped)}件\n")
    for r in results:
        print(r)
        print()


if __name__ == '__main__':
    main()

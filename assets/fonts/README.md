# フォント

`NotoSansJP-Bold-subset.ttf` は、SNSで共有したときの画像（`app/lib/ogCard.tsx`）を作るためだけに使う。

- 元: Noto Sans JP Bold（Google Fonts、SIL Open Font License 1.1。ライセンス全文は `OFL.txt`）
- 収録文字: JIS X 0208（第1・第2水準の漢字、かな、全角記号など）と ASCII に絞ったサブセット
- 作り方（fonttools）:
  `pyftsubset NotoSansJP-Bold.ttf --text-file=chars.txt --layout-features='kern,palt' --no-hinting --drop-tables+=vhea,vmtx,BASE,VORG`
  （`chars.txt` は EUC-JP の 0xA1A1〜0xF4FE を復号した文字と ASCII と、～・①〜⑩などの記号）

記事タイトルに第2水準より外の漢字（例: 髙・﨑）を使うと、その文字だけ画像に出ない。そのときは文字を足して作り直す。

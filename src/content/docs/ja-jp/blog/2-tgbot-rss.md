---
title: Bot に RSS 購読を追加
date: 2026-05-08
lastUpdated: 2026-05-08
tags:
  - Bot
  - Coding
excerpt: メッセージ転送 Bot に RSS 購読転送機能を追加する
contentId: 56d23b6b-3485-4931-b0a5-b5dc5c7d8743
---

::toc

### 今のツールが使いづらすぎる……ので……

前に作った転送 Bot は、もともとプライベートメッセージを受け取るだけのものだった。広告ブロックが必要になったので LLM 審査を追加し、トークンを少し節約するためにホワイトリストとブラックリストを追加し、誤 BAN 対策で異議申し立ても追加し、暇だったので i18n まで追加した……え、もう 2000 行近いんだけど？ちょうど使っている RSS ツールもあまり使いやすくない。なら、ついでに RSS も入れてしまえばいいのでは？kfb よ、お前はいずれ機能てんこ盛りの Bot になってしまうのか……。

要件はとてもシンプル。友達（友達リンクにいる人）のブログが更新されたら、Telegram に 1 件メッセージを送ってくれればいい。情報フィードリーダーみたいな大げさなものはいらないし、RSS リストの追加・削除・更新・一覧表示と、基本的な送受信ができるコマンドがいくつかあれば十分。というわけで：

```txt
/rss_add           # 追加
/rss_list          # 一覧
/rss_remove        # 削除
/rss_refresh       # 更新
/rss_title         # 名前変更
```

![RSS Bot コマンド一覧](/posts/2-tgbot-rss/a293631260c072db.png)

### 謎 RSS 生成

理想的な item はこんな感じ：

```xml
<item>
  <title>記事タイトル</title>
  <link>https://example.com/post</link>
  <guid>https://example.com/post</guid>
  <description>記事の概要</description>
  <pubDate>Fri, 08 May 2026 00:00:00 GMT</pubDate>
</item>
```

しかし、各サイトが生成する RSS はバラバラ。`content:encoded` がなかったり（冬夜のブログとか）、`guid` がリンクだったり謎 ID だったり。

例えば自分の RSS はこう：

```xml
<item>
<title>test-2</title>
<link>https://kokosa.icu/zh-cn/blog/test-2/</link>
<guid isPermaLink="true">https://kokosa.icu/zh-cn/blog/test-2/</guid>
<description>これはテスト用の記事です</description>
<pubDate>Fri, 08 May 2026 00:00:00 GMT</pubDate>
<content:encoded>
<p>省略114514文字……</p>
</content:encoded>
<category>Test</category>
</item>
```

> RSS に記事全文を突っ込むのはすごく微妙だと思っているので、今はもう直してある

### 過去記事を全送信、タイムラインを埋め尽くす快感ww

初めて RSS を追加するときに、過去記事を全部送信するわけにはいかない。これはメッセージ Bot だから。ブログによっては RSS に数十件の記事が入っているし、しかもだいたいもう読んでいる。購読を追加しただけで通知が画面を埋め尽くしたら困る。なので、初回購読時には一度だけ feed を取得し、既存の記事をすべて既読として記録するが、送信はしない。その後の定期リフレッシュで新しい item を検出したときだけ通知を送る：

```txt
[RSS] Kokosa's Blog

Bot に RSS 購読を追加
https://kokosa.icu/zh-cn/blog/2-tgbot-rss.md

Summary: 転送 Bot に RSS 購読通知を追加、定期リフレッシュ・重複排除・AI 要約に対応。
```

### Cloudflare Cron

Worker は常駐サービスではないので、定期リフレッシュには `wrangler.toml` に cron を設定する：

```toml
[triggers]
crons = ["*/30 * * * *"]
```

30 分ごとにチェックする。テスト用に手動コマンドも用意した：

```txt
/rss_refresh
```

> ただ、手動リフレッシュがちょうど Cron の実行と重なる可能性がある。そこで KV ロックが必要になる。さもないと、2 つのリフレッシュタスクが同時に「この記事はまだ未送信だ」と判断して、同じ通知が 2 回送られてしまう。

![RSS 手動リフレッシュ後の通知](/posts/2-tgbot-rss/6696e132cf6a7fbb.png)

### AI 生成記事要約

せっかく Gemini を導入済みなのに、通知にリンクだけ載せるわけにはいかない！というわけで、記事の要約もしてもらうことにした。前に実装したコンテンツ審査のタイムアウトは 4 秒だけだった。審査は `SAFE` か `UNSAFE` を出力するだけでよかったが、要約はいろいろ考える必要がある。なので、要約専用に 20 秒のタイムアウトを設定した。失敗しても、せいぜい：

```txt
Summary: AI summary unavailable.
```

で済む。リンクは変わらず送られるので。

### あとがき

光速で Vibe コーディングを終えたあとで思った。OpenClaw や Hermes みたいなものに手伝わせてもよかったのでは？（kfb、立ち上がれ……ロブスターを超える日も近い……）

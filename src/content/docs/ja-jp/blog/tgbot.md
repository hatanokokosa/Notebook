---
title: 自分の TG 転送 Bot をリファクタリング
date: 2025-12-18
lastUpdated: 2025-12-18
tags:
  - Bot
  - Coding
excerpt: 転送 Bot を NFD から自作のものへ置き換える
---

::toc

### なぜ乗り換えるのか

使っていた転送 Bot は [Node Forward Bot](https://github.com/LloydAsp/nfd)。結構長い間使っていたが、広告がやたらと多くて閉口していた。ふと見てみると、プロジェクトはもう 1 年以上も更新が止まっていた。NFD2 はオープンソースじゃなかった（はず？リポジトリが見つからなかった）ので試せず、広告ブロック機能があるかどうかも分からない。というわけで、車輪の再発明をする決意を固めた。

### キーワードフィルターは？

最初に試したのは、**センシティブワード**を大量に登録して自動ブロックする方法。結果：「x86_64」（64）、「Steam プラットフォーム独占」（台湾独立？）、「Python スクリプト」（チートツール）、「ポートをリッスン」（盗聴）などの謎誤爆が続出した。

### じゃあ正規表現で？

うーん……この道は明らかに無理筋。そこで鯖の民のアドバイスに従い、**正規表現**を書きまくってみた。しかし周知の通り、中国語の広告は変幻自在だ。「丅子」、「微 P 嗯」、「謎 emoji の組み合わせ」……こんなの本当に正規表現で防げるのか？たぶんできなくはないけど、自分の脳みそには荷が重すぎる（汗）。というわけで、最終的には LLM に審査してもらうことにした。

### 力尽きた……LLM 起動！

できるだけ高速で、高知能である必要はないがテキストの文脈を理解できるモデルが必要だった。周知の通り、Google には `gemini-3-flash` というモデルがある。コンテンツ審査にちょうど良さそうだと思い、導入してみた。シンプルなプロンプトを書いて、ユーザー入力を判定させ、`SAFE` か `UNSAFE` だけを出力させる。

```typescript
const MODERATION_PROMPT = `
# Role
Content Moderator API. Output one word only.

# Rules
UNSAFE if:
- Real human nudity/sex
- QR codes/spam/ads/gambling promotion
- Real gore/shock content
- Illegal content promotion
- Scam/phishing attempts

SAFE if:
- 2D/Anime/Cartoon (even suggestive)
- Normal photos/text/screenshots
- Regular conversation

# Output
One word: "SAFE" or "UNSAFE"

Analyze the content:`;
```

わずかな遅延はあるものの、ほとんど気にならないレベル。従来のルールベースマッチングと比べて、LLM は文脈と意味を理解できるため、誤検出率は大幅に低い。デメリットはコストかもしれないが、Gemini には無料枠がある。とはいえ多くはない。API を 3 つつなげても 1 日 60 回まで。広告ブロック用途ならまあギリギリ足りる。

### TypeScript 最高！

プロジェクト全体はモジュール化された構造：

```txt
.
├── src
│   ├── ai.ts
│   ├── config.ts
│   ├── handlers
│   │   ├── admin
│   │   │   ├── callbacks.ts
│   │   │   ├── commands.ts
│   │   │   ├── index.ts
│   │   │   ├── replies.ts
│   │   │   └── shared.ts
│   │   └── guest.ts
│   ├── i18n
│   │   ├── en.ts
│   │   └── zh.ts
│   ├── i18n.ts
│   ├── index.ts
│   ├── storage.ts
│   ├── telegram.ts
│   └── types.ts
├── tsconfig.json
└── wrangler.toml
```

実装した機能：

| **機能**                         | **説明**                                |
| -------------------------------- | --------------------------------------- |
| **LLM コンテンツ審査**           | LLM による不適切コンテンツの検出        |
| **BAN リスト**                   | ブロックされた全ユーザーの確認          |
| **コンテンツハッシュキャッシュ** | 同じ内容の連投によるトークン浪費を防止  |
| **ブラックリスト**               | 複数回ブロックされたユーザーを自動 BAN  |
| **ホワイトリスト**               | 連続して問題なしなら審査をスキップ      |
| **統計システム**                 | メッセージ数、ユーザー数、AI ブロック数 |
| **複数 API キー ローテーション** | Google の API 割り当てが少なすぎる      |

> 1 日 20 回の API コールで誰が足りるっていうんだよ。前は 1 日 100 回だったのに、Gemini CLI と Antigravity はバカ食いできるくせに API はケチくさい。
> 追記：今では Gemini CLI も Antigravity も足りなくなった。

全体は Cloudflare Workers 上で動作（NFD と同じ方式で、便利で無料）。LLM も無料枠を使っているので、完全ゼロコストの構成。

## プロジェクトリンク：

[GitHub: kokosa-forward-bot](https://github.com/hatanokokosa/kokosa-forward-bot)

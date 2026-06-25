---
title: Chill with You のタイムゾーン Bug
date: 2026-02-08
lastUpdated: 2026-02-08
tags:
  - Gaming
excerpt: Wine 上でデフォルト表示が UTC+0 になる問題を修正する
---

::toc

### どういうこと？

Steam に **Chill with You ~ Lofi Story** というゲーム（ゲームか？実質ポモドーロタイマー！）がある。結構気に入っているゲームで、ヒロインが可愛くて、一緒にいてくれる感がすごく強い。

設定上はヒロインと自分が別々のパラレルワールドにいることになっているので、ゲーム内に表示される時間と自分のローカル時間に時差があるのも、ずっとその設定の一部だと思って放置していた。

ところがバージョン 1.2 アップデート（1月27日）の後、Steam のコミュニティ掲示板でこんなコメントを見つけた：要約すると「Linux 上で Proton を使ってこのゲームを起動すると、ゲーム内の時刻が常に UTC+0 で表示される」という内容だった。

UTC（協定世界時）について簡単に説明すると、自分のところは UTC+8 なので、実際の時刻が 8:00 だとしたら、ゲーム内では 0:00 と表示されてしまう。つまり 8 時間のズレが生じる。

は？？まさかのパラレルワールド設定じゃなくて、単純にタイムゾーンを正しく読み取れてなかっただけ！？そりゃあちょうど 8 時間ズレるわけだわ……

### 問題の分析

実はとてもシンプルな問題で、原因はすぐに判明した：Proton で変換実行されている Windows プログラムが、なぜか Linux システムのタイムゾーン情報を正しく読み取れていなかったのだ。Linux ではタイムゾーン情報は通常 `/usr/share/zoneinfo/` ディレクトリに格納されている。

解決策はシンプルで、起動オプションでタイムゾーンを明示的に指定するだけ。Steam の「ゲームのプロパティ」→「起動オプション」に以下を追加：

- `TZ=Asia/Shanghai`：タイムゾーンを上海（北京時間）に指定
- `/usr/share/zoneinfo/`：タイムゾーンファイルのディレクトリを指定

最終的にこんな感じ：

```bash
TZDIR="/usr/share/zoneinfo" TZ="Asia/Shanghai" %command%
```

この起動オプションを追加してからゲームを起動すると、時刻が正常に表示されるようになった。

![だいたいこんな感じ、本来は 1:31](/posts/1-chill-with-you/d4ed6b986d87948e.avif)

### あとがき

問題はほぼこれで解決。自分もそのコメントに返信して解決策を共有しておいた。もし同じ問題に遭遇したら、この記事が役に立てば嬉しい。

ちなみに自分は NixOS を使っている。通常なら `/etc/zoneinfo` を使うべきで、`/usr/share/zoneinfo` ではない（NixOS には `/usr/share/zoneinfo` というディレクトリが存在しないため）。ただ、これでも一応動く。Steam の環境がうまく処理してくれるからだ。

Belike:

```bash
~ $ steam-run ls /usr/share/zoneinfo
Africa	   Egypt      Hongkong		 Mexico    ROK
America     Eire       HST		 MST	   Singapore
Antarctica  EST        Iceland		 MST7MDT   Turkey
Arctic	   EST5EDT    Indian		 Navajo    tzdata.zi
Asia	   Etc        Iran		 NZ	   UCT
Atlantic    Europe     iso3166.tab	 NZ-CHAT   Universal
Australia   Factory    Israel		 Pacific   US
Brazil	   GB	      Jamaica		 Poland    UTC
Canada	   GB-Eire    Japan		 Portugal  WET
CET	   GMT        Kwajalein	 posix     W-SU
Chile	   GMT+0      leapseconds	 PRC	   zone1970.tab
CST6CDT     GMT-0      leap-seconds.list  PST8PDT   zonenow.tab
Cuba	   GMT0       Libya		 right     zone.tab
EET	   Greenwich  MET		 ROC	   Zulu
```

```bash
~ $ ls /usr/share/zoneinfo
lsd: /usr/share/zoneinfo: No such file or directory (os error 2).
```

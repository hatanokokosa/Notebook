---
title: 给 Bot 塞一个 RSS 订阅
date: 2026-05-08
lastUpdated: 2026-05-08
tags:
  - Bot
  - AI
excerpt: 本来只是想让转发 Bot 顺手看一眼 RSS 更新，结果又变成了一次小型工程：订阅管理、定时刷新、文章去重、AI 摘要、手动测试，一个都不能少......
---

### 我又想折腾 bot 了

之前写的转发 Bot 本来只是拿来收私聊消息的，顺手加了 LLM 审核，顺手加了黑白名单，顺手加了申诉，顺手加了 i18n，顺手顺手再顺手...我去，怎么1500行了，于是又开始顺手了，正好我用的RSS工具不怎么好用，为什么不顺便塞个 RSS 呢？kfb，总有一天你会变成一个功能巨多的超级bot，，，

我的需求：朋友的博客更新了，某些网站发新文章了，Bot 给我发一条 Telegram 消息就行。不需要做成什么信息流阅读器，也不需要搞一个漂亮的后台，几条命令，对 rss 列表进行一个增删改查就够了，所以：

```txt
/rss_add           # 添加
/rss_list          # 列出
/rss_remove        # 删除
/rss_refresh       # 刷新
/rss_title         # 改名
```

![RSS Bot 命令列表](/posts/2-tgbot-rss/commands.png)

### 用现成服务？

当然可以用现成的 RSS Bot，但我不想一个聊天框几百个 bot 成为 bot 大王，这个 Bot 本来就可以：

- Telegram 发消息
- Gemini 做摘要

这么一看，为什么不加呢（不是）

### 神秘 RSS 生成

理想的 item 大概长这样：

```xml
<item>
  <title>文章标题</title>
  <link>https://example.com/post</link>
  <guid>https://example.com/post</guid>
  <description>文章摘要</description>
  <pubDate>Fri, 08 May 2026 00:00:00 GMT</pubDate>
</item>
```

然而每个站生成出来的东西都不完全一样，有的没有 `content:encoded`（比如冬夜没有这个），有的 `guid` 是链接，有的 `guid` 是神秘 ID

就比如，这是我的：

```xml
<item>
<title>test-2</title>
<link>https://kokosa.icu/zh-cn/blog/test-2/</link>
<guid isPermaLink="true">https://kokosa.icu/zh-cn/blog/test-2/</guid>
<description>这是一篇测试用的文章</description>
<pubDate>Fri, 08 May 2026 00:00:00 GMT</pubDate>
<content:encoded>
<p>省略114514字。。。</p>
</content:encoded>
<category>Test</category>
</item>
```

> 我一直感觉在RSS里塞整篇文章是非常蠢的，，

处理方式是：

- 优先用 `guid`
- 没有 `guid` 就用 `link`
- 再没有就用 `title + pubDate`
- 有 `content:encoded` 就拿来给 AI 总结

### 推送历史文章，享受刷屏快感（）

第一次添加 RSS 的时候肯定不能直接把所有文章都推过来，毕竟这不是个软件是消息 bot

有些博客 RSS 会放几十篇文章，一加订阅就刷满屏，所以第一次添加订阅时会先抓一次 feed，把当前已有文章全部记录为已读，但是不发送

之后定时刷新发现新 item，才会发通知：

```txt
[RSS] Kokosa's Blog

给 Bot 塞一个 RSS 订阅
https://kokosa.icu/zh-cn/blog/2-tgbot-rss.md

Summary: 给转发 Bot 添加 RSS 订阅提醒，支持定时刷新、去重和 AI 摘要。
```

### Cloudflare Cron

Worker 不是常驻服务，所以想要定时刷新就得在 wrangler.toml 里写个这玩意：

```toml
[triggers]
crons = ["*/30 * * * *"]
```

每 30 分钟检查一次，为了方便测试我加了一个手动的：

```txt
/rss_refresh
```

![手动刷新 RSS 后的通知](/posts/2-tgbot-rss/refresh.png)

> 然后我发现手动刷新可能和 Cron 刚好撞车，所以需要一个 KV lock，要不两个刷新任务同时看到“这篇文章没发过”，可能就发两遍了

### LLM 摘要

既然之前就接了 Gemini，那通知怎么能只发一个链接呢！于是又让它总结一下文章

之前内容审核的超时时间只有 4 秒，审核只需要输出 `SAFE` 或 `UNSAFE` 就够了，而摘要要考虑的就多了（不是）。读标题、内容、再写一句话，4 秒就有点容易超时，所以摘要单独给了 20 秒超时，失败也没什么大不了，最多就是：

```txt
Summary: AI summary unavailable.
```

而链接还是会照常发

### 现在的样子

- 私聊转发
- 垃圾消息审核
- RSS 订阅提醒
- 待续...

已经有点开始超出最开始的计划了（一个几百行的，只是能拦截广告的转发 bot），但是又没超太多

### 后记

光速 Vibe 完了才发现，我是不是可以搞个 OpenClaw 之类的东西帮我干这些（kfb，你崛起罢，，超越龙虾指日可待，，，）

虽然 bot 还是很冷清，但是现在自己发东西的时候，Bot 会自己提醒我：你又水了一篇（就是不知道多久才会水一篇，，）

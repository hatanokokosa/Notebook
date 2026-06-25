---
title: Stuffing an RSS Subscription into the Bot
date: 2026-05-08
lastUpdated: 2026-05-08
tags:
  - Bot
  - Coding
excerpt: Add RSS subscription forwarding to the message forwarding bot
---

::toc

### The Current Tools Are Too Hard to Use... So...

The forwarding bot I wrote before was originally only meant to receive private messages. Because I needed ad blocking, I added LLM moderation; to save a few tokens, I casually added allowlists and blocklists; to avoid false bans, I added appeals; then, because I had nothing better to do, I added i18n... holy crap, how is this almost 2,000 lines of code? The RSS tool I use also happens to be unpleasant, so why not stuff RSS into it too? kfb, one day you will become a bot with far too many features...

My requirement is very simple: when a friend's blog updates, send me a Telegram message. I do not need to turn it into an information feed reader, and a few commands for adding, deleting, updating, listing, sending, and receiving RSS entries are enough:

```txt
/rss_add           # add
/rss_list          # list
/rss_remove        # remove
/rss_refresh       # refresh
/rss_title         # rename
```

![RSS bot command list](/posts/2-tgbot-rss/a293631260c072db.png)

### Mysterious RSS Generation

An ideal item would look roughly like this:

```xml
<item>
  <title>Article title</title>
  <link>https://example.com/post</link>
  <guid>https://example.com/post</guid>
  <description>Article summary</description>
  <pubDate>Fri, 08 May 2026 00:00:00 GMT</pubDate>
</item>
```

But every site generates things a little differently. Some do not have `content:encoded` (Dongye's blog does not, for example), some use the link as `guid`, and some use a mysterious ID as `guid`.

For example, this is mine:

```xml
<item>
<title>test-2</title>
<link>https://kokosa.icu/zh-cn/blog/test-2/</link>
<guid isPermaLink="true">https://kokosa.icu/zh-cn/blog/test-2/</guid>
<description>This is a test article</description>
<pubDate>Fri, 08 May 2026 00:00:00 GMT</pubDate>
<content:encoded>
<p>114514 words omitted...</p>
</content:encoded>
<category>Test</category>
</item>
```

> I have always felt that stuffing the full article into RSS is very silly, so I have already changed this.

### Push Old Posts and Enjoy Getting Flooded

When adding an RSS feed for the first time, it definitely cannot push every article immediately. After all, this is a message bot. Some blog RSS feeds contain dozens of posts, and I have already read them; if adding a subscription filled the whole screen, that would be annoying. So when a feed is added for the first time, the bot fetches it once and records all existing articles as read, but does not send them. After that, scheduled refreshes only notify me when they discover new items:

```txt
[RSS] Kokosa's Blog

Stuffing an RSS Subscription into the Bot
https://kokosa.icu/zh-cn/blog/2-tgbot-rss.md

Summary: Added RSS subscription notifications to the forwarding bot, with scheduled refreshes, deduplication, and AI summaries.
```

### Cloudflare Cron

A Worker is not a long-running service, so scheduled refreshes require writing this thing in `wrangler.toml`:

```toml
[triggers]
crons = ["*/30 * * * *"]
```

It checks every 30 minutes. For easier testing, I also added a manual command:

```txt
/rss_refresh
```

> Then I realized that manual refreshes might collide with Cron, so it needs a KV lock. Otherwise, two refresh jobs might both see "this article has not been sent yet" and send it twice.

![Notification after manually refreshing RSS feeds](/posts/2-tgbot-rss/6696e132cf6a7fbb.png)

### AI-Generated Article Summaries

Since Gemini was already connected, how could a notification contain only a link? So I made it summarize the article too. The timeout for the previous content moderation feature was only 4 seconds, because moderation only needs to output `SAFE` or `UNSAFE`, while summaries have more to think about. So summaries get a separate 20-second timeout. If it fails, at worst it becomes:

```txt
Summary: AI summary unavailable.
```

The link is still sent as usual.

### Afterword

After finishing this at vibe-coding speed, I realized: maybe I could have used something like OpenClaw or Hermes to help me do this. kfb, rise up... surpassing the lobster is just around the corner...

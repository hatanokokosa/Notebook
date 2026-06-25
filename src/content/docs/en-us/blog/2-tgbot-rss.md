---
title: Stuffing an RSS Subscription into the Bot
date: 2026-05-08
lastUpdated: 2026-05-08
tags:
  - Bot
  - AI
excerpt: The forwarding bot I wrote before was originally just for receiving private messages. Then I casually added LLM moderation, casually added allowlists and blocklists, casually added appeals, casually added i18n, casually, casually, casually...
---

::toc

### I Wanted to Mess with the Bot Again

The forwarding bot I wrote before was originally just for receiving private messages. Then I casually added LLM moderation, casually added allowlists and blocklists, casually added appeals, casually added i18n, casually, casually, casually... wait, how did this become 1,500 lines? So I started casually adding things again. The RSS tool I use is not that pleasant anyway, so why not stuff RSS into it too? kfb, one day you will become a super bot packed with way too many features...

My requirement is simple: when a friend's blog updates, or when certain sites publish new articles, the bot sends me one Telegram message. I do not need to turn it into a feed reader, and I do not need a pretty admin dashboard. A few commands for CRUD over the RSS list are enough:

```txt
/rss_add           # add
/rss_list          # list
/rss_remove        # remove
/rss_refresh       # refresh
/rss_title         # rename
```

![RSS bot command list](/posts/2-tgbot-rss/a293631260c072db.png)

### Why Not Use an Existing Service?

Of course I could use an existing RSS bot, but I do not want one chat box to contain hundreds of bots and become the king of bots. This bot can already:

- send Telegram messages
- use Gemini for summaries

Looking at it that way, why not add RSS too? (no)

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

> I have always felt that stuffing the full article into RSS is very silly.

The handling strategy is:

- prefer `guid`
- if there is no `guid`, use `link`
- if that is also missing, use `title + pubDate`
- if `content:encoded` exists, send it to the AI for summarization

### Push Old Posts and Enjoy Getting Flooded

When adding an RSS feed for the first time, it definitely cannot push every article immediately. After all, this is a message bot, not some full application.

Some blog RSS feeds contain dozens of posts, and adding the subscription would flood the screen. So when a feed is added for the first time, the bot fetches it once and records all existing articles as read, without sending anything.

After that, scheduled refreshes only notify me when they discover new items:

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

### LLM Summaries

Since Gemini was already connected, how could a notification contain only a link? So I made it summarize the article too.

The timeout for the previous content moderation feature was only 4 seconds. Moderation only needs to output `SAFE` or `UNSAFE`, while summaries have more to think about (not really). It needs to read the title, read the content, and write one sentence, so 4 seconds can time out pretty easily. I gave summaries a separate 20-second timeout. If it fails, it is not a big deal. At worst, it becomes:

```txt
Summary: AI summary unavailable.
```

The link is still sent as usual.

### What It Looks Like Now

- private-message forwarding
- spam moderation
- RSS subscription notifications
- to be continued...

It has started to go beyond the original plan a little bit (a few-hundred-line forwarding bot that only blocked ads), but not too far.

### Afterword

After vibe-coding it at the speed of light, I realized: could I have used something like OpenClaw to help me do this? kfb, rise up already... surpassing Lobehub is just around the corner... The bot is still very quiet, but now when I publish something myself, the bot reminds me on its own: you posted another filler article. (I just do not know how long it will be before the next one.)

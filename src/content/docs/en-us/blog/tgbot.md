---
title: Rebuilding My TG Forward Bot
date: 2025-12-18
lastUpdated: 2025-12-18
tags:
  - Bot
  - Coding
excerpt: Replace NFD with a forwarding bot I wrote myself
contentId: c3bfdb80-3c26-4b00-8a4e-3be36effdff7
---

::toc

### Why Switch

The forwarding bot I used before was [Node Forward Bot](https://github.com/LloydAsp/nfd). I had used it for quite a while, but it kept receiving all kinds of ads, which got extremely annoying. When I checked again, I found that the project had already been inactive for a year. Since NFD2 is not open source (I think? I could not find a repository), I did not try it, and I also do not know whether it has ad-blocking features. So I decided to reinvent the wheel for my own use.

### How About Keyword Filtering?

At first, I tried stuffing it with a huge list of **sensitive words** so it would automatically block messages when they appeared. Then I got mysterious results like blocking `x86_64` (`64`), `Steam platform exclusive` (`Taiwan independence` in Chinese substring matching), `Python scripts` (`cheat tools`), and `listening port` (`monitoring`).

### Then... Regex?

Ugh... clearly this path was not going to work. So I listened to some group friends and tried writing a bunch of **regular expressions**. But as everyone knows, Chinese spam is very mysterious: `丅子`, `微 P 嗯`, `weird emoji splicing`... Can regex really defend against all of that? Maybe it can, but my brain obviously is not that powerful (sweat), so in the end I decided to use an LLM for moderation.

### Exhausted... LLM, Start!

I needed a model that was as fast as possible, did not need to be too smart, but could still understand the text. As everyone knows, Google has a model called `gemini-3-flash`, and it felt suitable for content moderation, so I used it. I wrote a simple prompt and asked it to judge the user input, then output either `SAFE` or `UNSAFE`.

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

There is a little bit of latency, but it is almost negligible. Compared with traditional rule matching, an LLM can understand context and semantics, so the false-positive rate is much lower. The downside is probably cost, but Gemini has a free quota, though not a large one. With three APIs connected, I only get about 60 calls per day, which is barely enough for ad blocking.

### TS Is the Way!

The whole project uses a modular structure:

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

Implemented features:

| **Feature**                | **Description**                                  |
| -------------------------- | ------------------------------------------------ |
| **LLM Content Moderation** | LLM-based harmful content detection              |
| **Ban List**               | View all banned users                            |
| **Content Hash Cache**     | Avoid wasting tokens on repeated spam content    |
| **Blacklist System**       | Users are blacklisted after repeated blocks      |
| **Whitelist System**       | Stop moderation after consecutive clean messages |
| **Stats System**           | Message count, user count, and AI block count    |
| **Multi API Key Rotation** | Google's API quota is too small                  |

> Who is 20 API calls per day enough for? It used to be 100 calls per day. Gemini CLI and Antigravity were generous, but the API is just stingy.  
> Second edit: now Gemini CLI and Antigravity are not enough either.

The whole project runs on Cloudflare Workers (same as NFD, convenient, useful, and free), making it a completely zero-cost solution. The LLM is also free.

## Project link:

[GitHub: kokosa-forward-bot](https://github.com/hatanokokosa/kokosa-forward-bot)

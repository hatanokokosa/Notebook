---
title: Rebuilding My TG Forward Bot
date: 2025-12-18
lastUpdated: 2025-12-18
tags:
  - coding
  - node
  - bot
  - AI
excerpt: The forwarding bot I was using kept receiving tons of spam. The developer never added a blocking feature, and the project had been abandoned for a year. Getting bombarded daily with VPN promotions, adult content, and scam messages... I couldn't take it anymore and decided to rebuild it myself...
---

### The Beginning

The forwarding bot I was using was [Node Forward Bot](https://github.com/LloydAsp/nfd). I used it for quite a while, but kept getting bombarded with ads. Looking again, the project had been abandoned for a year. NFD2 isn't open source (I think? Couldn't find the repo), so I hadn't tried it. I don't know if it has ad blocking either. So I decided to build another wheel for my own use.

### Keyword filtering?

First I tried stuffing in a bunch of **sensitive words** to auto-block. Then I got results like blocking `x86_64` (for "64"), `Steam platform exclusive` (for containing banned substring), `Python scripts` (for "scripts"), `listening port` (for "listening")... yeah, not great.

### How about regex?

Ugh... clearly this path wasn't working. So I listened to friends and tried writing a bunch of **regular expressions**. But as we all know, Chinese spam is wild: `weìrd sp4cing`, `微 P 嗯`, `emoji puzzles`... Can regex really catch all these? Maybe, but my brain definitely isn't that powerful (sweat), so I decided to use LLM for moderation.

### Gemini! Yes!

I needed a model that's as fast as possible - doesn't need to be super smart, just able to understand language. At the time I didn't know Google had cut AI Studio's quota again. Google has a model called `gemini-flash-lite` that seemed suitable for content moderation, so I used it. Wrote a simple Prompt to have it judge user input and output `SAFE` or `UNSAFE`.

```javascript
const payload = {
  contents: [
    {
      parts: [
        {
          text: `
            # Role
            Content Moderator API. Output one word only.
            # Rules
            UNSAFE if:
            - Real human nudity/sex
            - QR codes/spam/ads
            - Real gore/shock content
            - Illegal content promotion
            SAFE if:
            - 2D/Anime/Cartoon (even suggestive)
            - Normal photos/text/screenshots
            # Output
            One word: "SAFE" or "UNSAFE"
            Analyze: ${JSON.stringify(text)}`,
        },
      ],
    },
  ],
};
```

There's a slight delay, but it's negligible. Compared to traditional rule matching, LLM can understand context and semantics with much lower false positive rates. The downside might be cost, but Gemini has a free tier - not much though. With three API keys I get about 60 calls per day, barely enough for ad blocking.

### Refactoring the entire project

Since I'd already changed so much, might as well refactor the whole project. The original code architecture was messy, all logic crammed in one file, painful to maintain (though this kind of project barely needs maintenance).

So I battled with various LLMs for a night - they all went stupid. Finally downloaded Antigravity and refactored the whole project into a modular architecture in one go:

```txt
.
├── src
│   ├── ai.js
│   ├── config.js
│   ├── handlers
│   │   ├── admin.js
│   │   └── guest.js
│   ├── index.js
│   ├── storage.js
│   └── telegram.js
└── wrangler.toml
```

I have to say Antigravity is really good. Free Claude Opus 4, generous quota.

Implemented these features:

| **Feature**                | **Description**                      |
| -------------------------- | ------------------------------------ |
| **AI Content Moderation**  | AI-based harmful content detection   |
| **Ban List**               | View all banned users                |
| **Stats System**           | Message count, user count, AI blocks |
| **Multi API Key Rotation** | Fucking Google                       |

> Multi API Key rotation is to handle Google's Rate Limit. 20 API calls per day - who can use that? It used to be 100 per day. Gemini CLI and Antigravity have generous quotas, but the API is stingy.

The whole project runs on Cloudflare Workers (nice touch from the original project - convenient, useful, and free). Completely zero-cost solution. LLM is also free. The whole project is just JavaScript.

Finally pushed the code to GitHub, open sourced under BSD2 license.

## Link~

[GitHub: kokosa-forward-bot](https://github.com/hatanokokosa/kokosa-forward-bot)  
[LinuxDo: KFB — A Telegram DM Forward Bot with AI Moderation](https://linux.do/t/topic/1340613)

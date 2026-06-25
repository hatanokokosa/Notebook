---
title: 重构自己的 TG 转发 Bot
date: 2025-12-18
lastUpdated: 2026-06-25
tags:
  - 机器人 🤖
  - 编码 ⌨️
excerpt: 将转发机器人从 NFD 换为自己搓的
---

::toc

### 为什么要换

之前用的转发机器人是 [Node Forward Bot](https://github.com/LloydAsp/nfd)，用了挺长一段时间的，但是老是收到各种广告，不堪其扰，再去看一眼发现项目早就停更了 1 年了，NFD2 因为没有开源（好像是？没有找到仓库的样子）所以没有尝试，我也不知道它是不是有广告拦截的功能，于是我就打算再造一个轮子出来自己用

### 关键词过滤如何？

一开始尝试的是给它塞一大堆**敏感词**，收到了自动屏蔽，然后就出现了屏蔽 `x86_64` (64)，`Steam 平台独占` (台独)，`Python 脚本` (外挂)，`监听端口` (监听) 之类的神必结果

### 那么...正则表达式？

谔谔...显然这条路行不通。于是我又听群友的尝试写了一堆**正则表达式**，但是众所周知，中文广告都很神秘，`丅子`、`微 P 嗯`、`神必 emoji 拼接`...这些真的能用正则防下来吗？或许可以，但是显然我的脑子没这么强大（汗），所以最后决定用 LLM 来审核

### 力竭了...LLM 启动！

我需要一个尽可能快，智商不用多高但是能理解语料的模型，众所周知 Google 有个模型叫 `gemini-3-flash`，感觉适合用来做审查内容的模型，于是就用上了，写了一段简单的 Prompt 过去让它判断用户输入，输出 `SAFE` 或是 `UNSAFE`

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

虽然会有一点延迟，但是几乎可以忽略不计了，相比传统的规则匹配，LLM 能理解上下文和语义，误杀率低很多。缺点可能就是成本，不过 Gemini 有免费额度，并不多就是了，接了三个 API 也就每天 60 次，广告拦截倒是勉强够用了

### TS 大法好！

整个项目是一个模块化的结构：

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

实现了这些：

| **功能**            | **描述**                      |
| ------------------- | ----------------------------- |
| **LLM 内容审核**    | 基于 LLM 的不良内容识别       |
| **ban list**        | 查看所有被封禁的用户          |
| **缓存内容哈希**    | 防止多次刷屏同样内容浪费token |
| **黑名单系统**      | 同上，多次被拦截直接拉黑      |
| **白名单系统**      | 连续未被拦截停止审查          |
| **统计系统**        | 消息数、用户数、AI 拦截数     |
| **多 API Key 轮换** | Google 给的 API 额度太少了    |

> 每天 20 次 API 调用够谁用啊，之前还每天 100 次调用，Gemini CLI 和 Antigravity 就量大管饱，API 就那么抠  
> 二编：现在 Gemini CLI 和 Antigravity 也不够用了

整个项目跑在 Cloudflare Workers 上（NFD 就是这样，方便好用还免费），完全零成本的方案，LLM 用的也是免费的

## 项目链接：

[GitHub: kokosa-forward-bot](https://github.com/hatanokokosa/kokosa-forward-bot)

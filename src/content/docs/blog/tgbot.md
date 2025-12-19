---
title: 重构自己的 TG 转发 Bot
date: 2025-12-18
lastUpdated: 2025-12-18
tags:
  - coding
  - node
  - bot
  - AI
excerpt: 之前用的那个转发 Bot 一直收到很多广告，而且开发者一直没有加上屏蔽功能，再去看一眼发现项目早就停更了1年了。每天都要收到一堆什么 VPN 推销、色情引流、U盾之类的垃圾消息，实在受不了了，于是决定自己动手重写一下功能......
---

### 缘起

之前用的转发机器人是 [Node Forward Bot](https://github.com/LloydAsp/nfd)，用了挺长一段时间的，但是老是收到各种广告，不堪其扰，再去看一眼发现项目早就停更了 1 年了，NFD2 因为没有开源（好像是？没有找到仓库的样子）所以没有尝试，我也不知道它是不是有广告拦截的功能，于是我就打算再造一个轮子出来自己用

### 关键词过滤？

一开始尝试的是给它塞一大堆**敏感词**，收到了自动屏蔽，然后就出现了屏蔽 `x86_64` (64)，`Steam 平台独占` (台独)，`Python 脚本` (外挂)，`监听端口` (监听) 之类的神必结果

### 那么用正则表达式？

谔谔...显然这条路行不通。于是我又听群友的尝试写了一堆**正则表达式**，但是众所周知，中文广告都很神秘，`丅子`、`微 P 嗯`、`神必 emoji 拼接`...这些真的能用正则防下来吗？或许可以，但是显然我的脑子没这么强大（汗），所以最后决定用 LLM 来审核

### Gemini！好！

我需要一个尽可能快，智商不用多高但是能理解语料的模型，然后当时并不知道 Google 又给 AI Studio 的限额缩水了，众所周知 Google 有个模型叫 `gemini-flash-lite`，感觉适合用来做审查内容的模型，于是就用上了，写了一段简单的 Prompt 过去让它判断用户输入，输出  `SAFE`  或是  `UNSAFE`

```javascript
const payload = {
	contents: [{
        parts: [{
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
        	Analyze: ${JSON.stringify(text)}`
        }]
    }]
};
```

虽然会有一点延迟，但是几乎可以忽略不计了，相比传统的规则匹配，LLM 能理解上下文和语义，误杀率低很多。缺点可能就是成本，不过Gemini 有免费额度，并不多就是了，接了三个 API 也就每天 60 次，广告拦截倒是勉强够用了

### 重构整个项目

既然都改了这么多了，干脆把整个项目重构一下吧。原来的代码架构很乱，所有逻辑都堆在一个文件里，维护起来比较痛苦（虽然这种项目几乎不需要怎么维护）

于是和各路 LLM 苦战了一晚上，全降智了，操你妈 LLM 提供商，最终下了个 Antigravity 一口气把整个项目重构成了模块化的架构：

```tree
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

不得不说 Antigravity 是真的好，免费的 Claude Opus 4 爽用了，给的额度还多

实现了这些：

| **功能** | **描述** |
| ---------------- | ------------------- |
| **AI 内容审核** | 基于 AI 的不良内容识别 |
| **Ban List** | 查看所有被封禁的用户 |
| **统计系统** | 消息数、用户数、AI 拦截数      |
| **多 API Key 轮换** | 傻逼 Google |
> 多 API Key 轮换这个功能是为了应对死妈 Google 的 Rate Limit，每天 20 次 API 调用够谁用啊，之前还每天 100 次调用，Gemini CLI 和 Antigravity 就量大管饱，API 就那么抠

  
整个项目跑在 Cloudflare Workers 上（原项目的小巧思，方便好用还免费），完全零成本的方案，LLM 用的也是免费的，整个项目就一堆 JavaScript

最后把代码推到了 GitHub，以 BSD2 协议开源

## Link~
[GitHub: kokosa-forward-bot](https://github.com/hatanokokosa/kokosa-forward-bot)
[LinuxDo: KFB — 一个带有 AI 审核的 Telegram 私聊转发机器人](https://linux.do/t/topic/1340613)

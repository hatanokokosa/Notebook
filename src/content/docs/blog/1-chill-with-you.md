---
title: Chill with You 的 时区 Bug
date: 2026-02-08
lastUpdated: 2026-02-08
tags:
  - Gaming
  - Proton
excerpt: Steam 上有个游戏（算游戏吗？实际番茄钟！）叫 **Chill with You ~ Lofi Story**，算是我很喜欢的一个游戏了，女主很可爱，给人的陪伴感也很足，设定是你和女主在不同的平行时空，所以我之前一直以为游戏里显示的时间和我本地时间有时差是设定的一部分，所以一直没去管它...
---

### 何意味

Steam 上有个游戏（算游戏吗？实际番茄钟！）叫 **Chill with You ~ Lofi Story**，算是我很喜欢的一个游戏了，女主很可爱，给人的陪伴感也很足

设定是你和女主在不同的平行时空，所以我之前一直以为游戏里显示的时间和我本地时间有时差是设定的一部分，所以一直没去管它

直到 1.2 版本更新（1 月 27 日）之后，我在 Steam 的讨论区看到了一条评论：大意是在 Linux 上用 Proton 运行这个游戏，游戏里显示的时间一直是 UTC+0

关于 UTC（世界标准时间） 是什么，做个简单的比方，我这里是 UTC+8，实际时间是 8 点 00 的话，游戏里就会显示 0 点 00 分，差了 8 个小时

呃呃啊？原来不是什么平行时空的设定，只是单纯的时区没读对，难怪正好差 8 个小时

### 问题分析

其实是很简单的一个问题，很快就发现了原因：Proton 运行的 Windows 程序没办法正确读取到 Linux 系统的时区信息。在 Linux 下，时区信息通常存放在 `/usr/share/zoneinfo/` 目录下，而在 NixOS 上则是在 `/etc/zoneinfo/` 下面

解决办法很简单，在启动参数里手动指定时区就行了。在 Steam 的游戏属性 → 启动选项里加上：

- `TZ=Asia/Shanghai`：指定时区为上海（北京时间）
- `TZDIR=/etc/zoneinfo`：指定时区文件的目录位置

最后大概是这样：

```bash
TZDIR="/usr/share/zoneinfo" TZ="Asia/Shanghai" %command%
```

加上这串启动参数之后再启动游戏，时间就正常了。9 点 31 分就是 9 点 31 分

![大概就是这样，本来是1：31](/posts/1-chill-with-you/utcp8.avif)

### 后记

问题到这差不多也就解决了，我也去那条评论下面回复了一下解决方案。如果你也遇到了同样的问题，希望这篇文章能帮到你

顺带一提我用的是 NixOS，正常情况应该使用 `/etc/zoneinfo` 而不是 `/usr/share/zoneinfo`，因为 NixOS 并没有 `/usr/share/zoneinfo` 这个目录，不过这样也能执行，因为 Steam 的环境会帮你处理好

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

放在最后：这篇之后的文章都会在文件名前面加上数字，要不然会有些乱
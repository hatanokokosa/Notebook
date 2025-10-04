---
title: 从 configuration.nix 到 Flake
date: 2025-10-04
lastUpdated: 2025-10-04
tags:
  - NixOS
excerpt: 因为距离高考还有不到240天左右了，时间很紧所以并没有什么时间写博客，但是因为被群友拷打了：再怎么也写一篇罢，要不然这个网站就要一直空空如也下去了，其实一直有写日记的习惯，但是过于私人所以就不放出来给各位品鉴了...
---

### 近况

因为距离高考还有不到240天左右了，时间很紧所以并没有什么时间写博客，但是因为被群友拷打了：再怎么也写一篇罢，要不然这个网站就要一直空空如也下去了，其实一直有写日记的习惯，但是过于私人所以就不放出来给各位品鉴了

其实百忙之中也干了一些事，就比如上周末我把之前一直想搞的 Flake 给搞上了，在 CodeX CLI 的帮助下并没有花费很多时间，让 AI Agent 帮我处理了最麻烦的几个地方，几乎算是一边过了，这是目前的目录结构：

```nix
.
├── flake.lock
├── flake.nix
├── home
│   └── modules
│       ├── dae.nix
│       ├── fzf.nix
│       └── niri.nix
├── Justfile
└── nixos
    ├── configs
    │   ├── dae
    │   │   └── config.dae
    │   └── niri
    │       └── config.kdl
    ├── hosts
    │   └── kokosa
    │       ├── default.nix
    │       └── hardware.nix
    └── modules
        ├── boot.nix
        ├── desktop.nix
        ├── locale.nix
        ├── networking.nix
        ├── nix-settings.nix
        ├── packages.nix
        ├── security.nix
        ├── services.nix
        └── users.nix
```
>Home Manager 管理的那几个软件其实只有 fzf 是正在使用的，剩下两个都是计划使用所以先把配置写上，在设置里还是关闭的

### 为什么要从 Clannels 换到 Flakes？

相比 `configuration.nix` 来说，Flake 解决了许多问题，他可以锁定所有软件包及依赖的版本，一份配置文件可以精确到版本号与 Commit 的还原整个系统，而 configuration 似乎做不到这一点，会跟随 Channel 的更新

| **特性** | **Channels** | **Flakes** |
|------|----------|--------|
| **依赖** | 隐式 (channels) | 显式 (inputs) |
| **重建** | `sudo nixos-rebuild switch` | `nh os switch .` |
| **复现** | 依赖各自的 channel 版本 | `flake.lock` 保证一致 |
| **开发** | `nix-shell` | `nix develop` |
>nh是一个nixos帮助工具，但是对于configuration的支持很神秘，换到了 flake 之后发现这是个非常好用的工具，赞赏并推荐

同时，Flake 可以通过 Inputs 轻松的引用其他 Flakes，比如 `sodiboo/niri-flake` 之类的从而做到声明式的管理某些并不被官方支持的软件，我其实并不打算使用 HM 来管理 Niri

还有开发环境方面，你或许会发现：GitHub/Codebreg 上的许多开源项目根目录下出现了一个叫做 `flake.nix` 的文件，有了这个文件你便可以使用 Nix 来轻松的还原整个开发环境，并且与主系统相互隔离————仅仅只需要一行 `nix develop`，大多数现代 Nix 项目（甚至不是 Nix 项目）都开始使用这些，毕竟确实好用

当然它也有一些缺点，比如 API 不稳定（自 2019 年至今仍是 "experimental"）、强制依赖 Git之类的，其他坑也不少，*Determinate Nix* 解决了不少，但是它是部分（如nixd）闭源的。虽然 Flake 有不少坑，但是它会比 Channels 要方便一些，况且现在有 AI 可以管理我的配置，迁移并没有多复杂

### 文件展示？

首先是 `flake.nix`：

```nix
{
  description = "Kokosa's Nix Flake";

  inputs = {
    # Nixpkgs & NUR
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    nur.url = "github:nix-community/NUR";

    # Flake-parts
    flake-parts.url = "github:hercules-ci/flake-parts";

    # Home Manager
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    # Other
    hid-bpf-uclogic.url = "github:dramforever/hid-bpf-uclogic";
  };

  outputs = inputs @ {
    nixpkgs,
    flake-parts,
    ...
  }:
    flake-parts.lib.mkFlake {inherit inputs;} {
      systems = ["x86_64-linux"];

      perSystem = {pkgs, ...}: {
        formatter = pkgs.alejandra;
      };

      flake = {
        nixosConfigurations.kokosa = nixpkgs.lib.nixosSystem {
          system = "x86_64-linux";
          specialArgs = {
            inherit inputs;
          };
          modules = [
            ./nixos/hosts/kokosa/default.nix
          ];
        };
      };
    };
}
```

导入的唯一一个文件 `default.nix` 是我这台设备原先的 `configuration.nix`，不过现在它被改的已经面目全非，原本超大的，现在切片成了许多不同的小文件并统一导入进 import 里面，除此之外这个文件里面只有 home-manager 的一些设置

```nix
imports = [
    inputs.home-manager.nixosModules.home-manager
    ../../modules/nix-settings.nix
    ../../modules/networking.nix
    ../../modules/security.nix
    ../../modules/packages.nix
    ../../modules/services.nix
    ../../modules/desktop.nix
    ../../modules/locale.nix
    ../../modules/users.nix
    ../../modules/boot.nix
    ./hardware.nix
  ];
```

其他的就和我原来的配置就没什么区别了，目前它们还没有被上传到 GitHub 托管，之后估计有时间就会去搞一下，最后就附带一张截图：

![觉大人好可爱我好喜欢这个壁纸](/images/rice.webp)

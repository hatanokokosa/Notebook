---
title: configuration.nix から Flake へ
date: 2025-10-04
lastUpdated: 2025-10-04
tags:
  - Computer
  - Coding
excerpt: NixOS の設定ファイルを Flake に移行する
contentId: adbc7bc4-a038-4880-97d3-d7ad9998b56e
---

::toc

### 近況

受験まで残り 240 日を切っているので、ブログを書く時間はあまりない。でも鯖の民に「さすがに一本くらい書け、じゃないとサイトが永遠に空っぽのままだぞ」と詰められたので、一念発起。本当は日記を書く習慣はあるんだけど、ちょっと個人的すぎるのでここには公開しない。

とはいえ忙しい中でも色々やってはいて、例えば先週末にはずっとやりたかった Flake への移行を済ませた。CodeX CLI の助けもあってそんなに時間はかからなかった。AI Agent に面倒なところを任せたら、ほぼ一発で通った。現在のディレクトリ構成はこんな感じ：

```txt
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

> Home Manager で管理しているソフトウェアのうち、実際使ってるのは fzf だけ。残りの 2 つは使う予定なので先に設定を書いただけで、設定上では無効にしてある。

### なぜ Channels から Flakes に移行したのか？

`configuration.nix` と比べて、Flake は多くの問題を解決してくれる。すべてのパッケージと依存関係のバージョンをロックでき、ひとつの設定ファイルからバージョン番号とコミットレベルでシステム全体を再現できる。一方、configuration ベースの方式ではそれが難しく、Channels の更新に追従してしまう。

| **特徴**     | **Channels**                    | **Flakes**                  |
| ------------ | ------------------------------- | --------------------------- |
| **依存関係** | 暗黙的 (channels)               | 明示的 (inputs)             |
| **再構築**   | `sudo nixos-rebuild switch`     | `nh os switch .`            |
| **再現性**   | 各自の channel バージョンに依存 | `flake.lock` で一貫性を保証 |
| **開発**     | `nix-shell`                     | `nix develop`               |

> nh は NixOS のヘルパーツールだが、configuration ベースだと挙動が微妙だった。Flake に移行したらすごく使いやすくなったので、おすすめしたい。

また Flake は Inputs を使って他の Flakes（例：`sodiboo/niri-flake`）を簡単に参照できるため、公式にサポートされていないソフトウェアも宣言的に管理できる。そもそも Niri を HM で管理するつもりはなかった。

開発環境の面でも、GitHub/Codeberg 上の多くのオープンソースプロジェクトのルートに `flake.nix` が置かれていることに気づくだろう。このファイルがあれば、Nix を使って開発環境全体を簡単に再現でき、しかもホストシステムから隔離される――たった一行の `nix develop` だけで。最近の Nix プロジェクト（Nix プロジェクトでなくても）ではこれが当たり前になりつつある。だって便利だから。

もちろん欠点もある。API は不安定（2019 年から現在までずっと "experimental"）、Git への依存が必須、などなど。_Determinate Nix_ がこれらの一部を解決してくれるが、一部（nixd など）はクローズドソース。Flake には落とし穴も多いけど、Channels よりは便利だ。それに今は AI に設定を任せられるので、移行もそれほど大変じゃなかった。

### 設定ファイルをちょっと紹介

まずは `flake.nix`：

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

インポートしている唯一のファイル `default.nix` は、元々このマシンの `configuration.nix` だったものだ。今はだいぶ変わってしまったが。以前は巨大な一枚岩だったのを、複数の小さなファイルに分割し、すべて import で束ねている。それ以外では、このファイルには home-manager 周りの設定しか入っていない。

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

それ以外は元の設定とほぼ変わらない。まだ GitHub には公開していないが、時間ができたらやるつもり。最後にスクリーンショットを一枚：

![ご機嫌](/posts/flake/336e0513775b3f1f.avif)

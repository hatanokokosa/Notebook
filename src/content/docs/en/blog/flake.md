---
title: From configuration.nix to Flake
date: 2025-10-04
lastUpdated: 2025-10-04
tags:
  - NixOS
excerpt: With less than 240 days until the Gaokao (college entrance exam), time is tight and I don't have much time to blog. But after being urged by friends, I figured I should at least write one post. Actually, I've been keeping a diary, but it's too personal to share...
---

### What's up

With less than 240 days until the Gaokao (college entrance exam), time is tight and I don't have much time to blog. But after being urged by friends, I figured I should at least write one post. Actually, I've been keeping a diary, but it's too personal to share publicly.

Amid all the busyness, I managed to get some things done. For example, last weekend I finally set up Flakes, which I'd been wanting to do for a while. With the help of CodeX CLI, it didn't take too long - I let the AI Agent handle the trickiest parts, and it was almost a one-shot success. Here's my current directory structure:

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

> Of the programs managed by Home Manager, only fzf is actually in use. The other two are planned for future use, so I've written the configs but they're disabled.

### Why switch from Channels to Flakes?

Compared to `configuration.nix`, Flakes solves many problems. It can lock all packages and dependencies to specific versions - a single config file can precisely restore an entire system down to version numbers and commits. Channels, on the other hand, follow updates and can't do this.

| **Feature**         | **Channels**                           | **Flakes**                       |
| ------------------- | -------------------------------------- | -------------------------------- |
| **Dependencies**    | Implicit (channels)                    | Explicit (inputs)                |
| **Rebuild**         | `sudo nixos-rebuild switch`            | `nh os switch .`                 |
| **Reproducibility** | Depends on individual channel versions | `flake.lock` ensures consistency |
| **Development**     | `nix-shell`                            | `nix develop`                    |

> nh is a NixOS helper tool. Its support for configuration was a bit mysterious, but after switching to flakes I found it to be a really useful tool. Highly recommended!

Additionally, Flakes can easily reference other Flakes through Inputs, like `sodiboo/niri-flake`, enabling declarative management of software that isn't officially supported. I don't actually plan to use HM to manage Niri though.

For development environments, you might have noticed that many open source projects on GitHub/Codeberg now have a `flake.nix` file in their root directory. With this file, you can easily reproduce the entire development environment with Nix, isolated from your main system - all with just one command: `nix develop`. Most modern Nix projects (even non-Nix projects) are starting to use this because it's genuinely useful.

Of course, there are some drawbacks, like unstable APIs (still "experimental" since 2019) and mandatory Git dependency. There are other pitfalls too. _Determinate Nix_ solves some of these, but it's partially closed-source (like nixd). Despite the pitfalls, Flakes is more convenient than Channels, and with AI managing my configs, the migration wasn't too complex.

### File showcase?

First, `flake.nix`:

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

The single file imported, `default.nix`, is what used to be my machine's `configuration.nix`, though it's now been completely transformed. The original massive file has been sliced into many smaller files and unified through imports. Besides that, this file only contains some Home Manager settings.

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

The rest isn't much different from my old config. They haven't been uploaded to GitHub yet, but I'll probably get around to it when I have time. Here's a screenshot:

![I love this wallpaper so much](/images/rice.webp)

{ pkgs ? import <nixpkgs> { } }:

let
  inherit (pkgs) lib;
in
pkgs.pkgsStatic.rustPlatform.buildRustPackage {
  pname = "kokosa-blind-watermark";
  version = "0.1.0";

  src = lib.cleanSourceWith {
    src = ./.;
    filter = name: type: !(type == "directory" && baseNameOf name == "target");
  };

  cargoLock.lockFile = ./Cargo.lock;
  doCheck = false;

  meta = {
    description = "Repo-local blind watermark CLI for the blog build pipeline";
    mainProgram = "kokosa-blind-watermark";
    license = lib.licenses.mit;
    platforms = [ "x86_64-linux" ];
  };
}

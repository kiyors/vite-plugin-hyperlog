{
  description = "Nix dev environment for vite-plugin-hyperlog (Rust NAPI + Node.js)";

  nixConfig = {
    extra-substituters = [
      "https://nix-community.cachix.org"
    ];
    extra-trusted-public-keys = [
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
    ];
  };

  inputs = {
    # Unstable tracks the toolchains this project actually needs: its pnpm
    # matches the `packageManager` field in package.json exactly, which the
    # 26.05 stable branch does not (it still ships pnpm 11.x).
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, ... }@inputs:

    let
      # Matches the platforms CI builds on, minus x86_64-darwin: Nixpkgs 26.11
      # dropped Intel macOS support, so a devShell cannot be evaluated there.
      # The x86_64-apple-darwin *binding* is still built in CI (cross-compiled
      # from an arm64 runner), so nothing is lost for consumers of that binary.
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forEachSupportedSystem =
        f:
        inputs.nixpkgs.lib.genAttrs supportedSystems (
          system:
          f {
            inherit system;
            pkgs = import inputs.nixpkgs { inherit system; };
          }
        );
    in
    {
      devShells = forEachSupportedSystem (
        { pkgs, system }:
        let
          # All four components come from the same nixpkgs pin, so they can never
          # disagree on the compiler version.
          rustToolchain = pkgs.rustc;
        in
        {
          default = pkgs.mkShell {
            packages =
              with pkgs;
              [
                # Rust: required to build the NAPI addon (see Cargo.toml).
                rustToolchain
                cargo
                clippy
                rustfmt

                # Node.js: engines allow ">= 22.14.0 < 23 || >= 23.6.0", and
                # nixpkgs tracks a 24.x that satisfies the upper range.
                nodejs
                pnpm

                # Lint/format tooling, matching the `lint` and `fmt` scripts.
                oxlint
                oxfmt
                taplo

                # Native build deps for the addon.
                pkg-config

                just
              ]
              ++ lib.optionals pkgs.stdenv.hostPlatform.isDarwin [
                # Required to link the addon against the macOS system SDK.
                apple-sdk
                libiconv
              ];

            # Leave buildInputs empty on Darwin so Nix does not inject its own SDK
            # and fight with the host toolchain.
            buildInputs = [ ];

            shellHook = ''
              # 1. Unset the Nix-injected SDK root so xcrun falls back to the host
              #    system; a mismatched SDKROOT breaks native builds and xcodebuild.
              unset SDKROOT
              unset DEVELOPER_DIR

              # 2. Re-assert the real system binary paths ahead of the Nix sandbox.
              export PATH="/usr/bin:/usr/sbin:/usr/local/bin:$PATH"

              # 3. Prefer workspace binaries (cargo-napi, oxlint, ...) over globals.
              if [ -d "$PWD/node_modules/.bin" ]; then
                export PATH="$PWD/node_modules/.bin:$PATH"
              fi

              # Warn when the toolchain drifts from what CI and package.json pin,
              # since that is the usual source of "works locally, fails in CI".
              if [ -f "$PWD/package.json" ]; then
                expected_pnpm=$(node -e 'process.stdout.write((require("./package.json").packageManager || "").replace(/^pnpm@/, ""))' 2>/dev/null)
                actual_pnpm=$(pnpm --version 2>/dev/null)
                if [ -n "$expected_pnpm" ] && [ "$expected_pnpm" != "$actual_pnpm" ]; then
                  echo "warning: pnpm $actual_pnpm does not match packageManager (pnpm@$expected_pnpm)" >&2
                fi
              fi

              echo "vite-plugin-hyperlog dev environment ($system)"
              echo "  rust:   $(rustc --version 2>/dev/null || echo missing)"
              echo "  cargo:  $(cargo --version 2>/dev/null || echo missing)"
              echo "  node:   $(node --version 2>/dev/null || echo missing)"
              echo "  pnpm:   $(pnpm --version 2>/dev/null || echo missing)"
            '';
          };
        }
      );

      # Formatting check for the flake itself, so `nix flake check` is meaningful.
      formatter = forEachSupportedSystem (
        { pkgs, ... }: pkgs.nixfmt-rfc-style
      );
    };
}

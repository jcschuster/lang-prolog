{
  description = "lang-prolog: CodeMirror language support for SWI-Prolog";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAll = f: nixpkgs.lib.genAttrs systems (s: f nixpkgs.legacyPackages.${s});
    in
    {
      devShells = forAll (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_26
            pnpm
            # The version gen/tables.mjs reads the operator and built-in tables from.
            swi-prolog
            jq # .github/scripts
          ];
        };
      });
    };
}

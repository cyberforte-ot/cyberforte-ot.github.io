# CyberForte security guides (ENISA playbooks + OWASP OT Top 10)

Static site, no build step needed to host. The published files are in `docs/`.

- Planned address: https://cyberforte-ot.github.io (repo `cyberforte-ot/cyberforte-ot.github.io`). Not published yet.
- GitHub Pages setting: Deploy from a branch, branch `main`, folder `/docs`. All links are relative, so it also works from any other host or folder.
- Preview locally: `cd docs && python3 -m http.server 8781`, then open http://127.0.0.1:8781
- Rebuild after editing summaries (`content/`) or updating sources (`sources/`): `python3 scripts/build.py` (needs `pip install markdown`), then commit `docs/`.
- Licences and attribution: see `licences.md`. Source versions: `sources/SOURCE-VERSIONS.txt`.

# Lessons Archive

Lessons that were once active in `.prism/lessons.md` and have been archived by Zoe. Each entry retains its original date and content; archive timestamp added on move.

---

## On Windows, the Write tool's `/tmp/` resolves to `D:/tmp/`, not the OS temp dir

**Why:** 2026-05-03 — wrote a PR body to `/tmp/pr1-body-new.md` via the Write tool, then `gh pr edit --body-file /tmp/...` failed with "system cannot find the file specified" because gh resolved `/tmp/` to `C:\Users\<user>\AppData\Local\Temp\` (Windows OS temp). The Write tool had actually placed the file at `D:\tmp\` (literal `/tmp/` on the D drive). Cost one round trip to locate.

**How to apply:** When passing files between the Write tool and a Windows-native CLI tool (`gh`, native git, etc.) on this dogfood install, use absolute Windows-style paths (`D:/...` or `C:/Users/.../Temp/...`) explicitly rather than relying on `/tmp/`. Or write the temp file inside the project tree (gitignored) so the path is unambiguous across tools.

**Archived:** 2026-06-05 — Zoe audit; 33 days unreferenced, dogfood now runs on darwin, Windows machine barely used (Hunter confirmed).

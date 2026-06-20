---
cron: "0 10 * * 1"
---

Only produce a changelog when a new release tag exists since the last run. Find the previous and latest release tags, generate the changelog for that range into the changelog output directory, then write it back behind the approval gate. If no new tag exists since the last changelog, do nothing.

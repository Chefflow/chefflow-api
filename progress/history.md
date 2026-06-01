# History

Append-only log of harness activity. One line per state transition or session summary.
Format: `YYYY-MM-DD · &lt;agent&gt; · &lt;feature-id&gt; · &lt;event&gt;`.

Compact summaries (multi-line entries) are allowed when context approaches the 20% threshold and the Leader needs to free room before `/clear`.

---

2026-05-24 · harness-builder · — · scaffolded init.sh, features.json, specs/, progress/, .claude/agents/ (leader, spec-author, implementer, reviewer)
2026-05-24 · harness-builder · multi-slots · imported as `done` from commit b0e82b8 (PR #12)
2026-05-24 · harness-builder · custom-units · imported as `pending` — legacy spec at docs/tasks/custom-units.md; needs Spec Author pass

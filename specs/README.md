# specs/ — Source of Truth

Each feature lives in its own folder (`specs/&lt;feature-id&gt;/`) and contains:

| File | Owner | Purpose |
|------|-------|---------|
| `requirements.md` | Spec Author | What the system MUST do, in **EARS** notation |
| `design.md`       | Spec Author | Technical plan: files, schema changes, contracts |
| `tasks.md`        | Spec Author → Implementer | Atomic checklist that drives implementation |

## Lifecycle

```
pending  →  spec_ready  →  in_progress  →  review  →  done
            (Spec Author)  (Implementer)  (Reviewer)
```

The Leader agent moves features through these states by editing `features.json`.

## Rules

1. **Implementer reads only specs**, never invents requirements.
2. **Reviewer rejects** PRs that ship a REQ without a corresponding test.
3. The `_template/` folder is the canonical scaffold — copy it when starting a new feature:
   ```bash
   cp -r specs/_template specs/&lt;new-feature-id&gt;
   ```
4. Legacy single-file specs live in `docs/tasks/` and are referenced from `features.json` via `specDoc`. New features go here.

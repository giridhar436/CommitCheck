# 0007: Immutable Audit Reports with Commit-Aware Cooldown

We decided to record every client-initiated audit as an immutable `AuditReport` entity storing verified progress percentages, commit linkage mappings, and discrepancy logs. Audits run asynchronously with a 10-minute cooldown window that serves cached results if no new git commits or PR activity have landed on GitHub since the prior audit, avoiding redundant LLM API costs.

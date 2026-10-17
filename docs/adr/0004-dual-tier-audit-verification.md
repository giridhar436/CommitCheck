# 0004: Dual-Tier Verification Strategy for Code Audits

We decided on a two-tier reconciliation engine when clients trigger project audits: first, fast syntactic mapping of Linear issue keys in git branch names and commit messages; second, semantic LLM diff evaluation comparing code changes against Linear task acceptance criteria. This catches both missing links and phantom completions where tasks are marked "Done" in Linear without corresponding verified code changes in GitHub.

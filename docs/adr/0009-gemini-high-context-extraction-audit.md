# 0009: Google Gemini 1.5 Pro for High-Context Extraction and Auditing

We decided to use Google Gemini 1.5 Pro for both transcript-to-task decomposition and code diff auditing. Its 2M+ token context window enables zero-chunking ingestion of entire multi-hour meeting transcripts and comprehensive multi-branch git diffs, while strict structured JSON output guarantees schema validation for Linear issue creation and audit discrepancies.

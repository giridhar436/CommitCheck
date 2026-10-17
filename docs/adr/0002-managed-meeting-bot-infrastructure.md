# 0002: Managed Meeting Bot Infrastructure via Recall.ai

We decided to use a managed meeting-bot provider (Recall.ai) to handle Google Meet presence, audio extraction, and diarized transcription rather than self-hosting headless Chromium clusters. Managed bot infrastructure eliminates the substantial operational overhead of anti-bot bypasses, lobby admission handling, and WebRTC audio processing, delivering reliable webhook-based transcripts directly to our LLM pipeline.

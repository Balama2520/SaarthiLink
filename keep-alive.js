name: Saarthi Stack Keep-Alive Warm-Up

on:
  schedule:
    # Run every 7 minutes, offset from the top of the hour, to prevent
    # Render & Hugging Face cold sleep (free tier idle timeout is ~15 minutes).
    # GitHub Actions schedules are best-effort and can be delayed, especially
    # at :00 — a wider margin + offset makes missed/delayed runs harmless.
    - cron: "3-59/7 * * * *"
  workflow_dispatch:

jobs:
  ping-services:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Execute Keep-Alive Ping
        env:
          RENDER_URL: "https://saarthilink.onrender.com/"
          HF_TOKEN: ${{ secrets.HF_TOKEN }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: node keep-alive.js

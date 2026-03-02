#!/bin/bash
# Netlify build script — injects environment variables into config.json
# Set OPENAI_API_KEY and CLAUDE_API_KEY in Netlify dashboard:
#   Site settings → Environment variables

if [ -n "$OPENAI_API_KEY" ]; then
  sed -i "s|__OPENAI_API_KEY__|$OPENAI_API_KEY|g" config.json
  echo "✅ Injected OPENAI_API_KEY"
else
  echo "⚠️  OPENAI_API_KEY not set — skipping"
fi

if [ -n "$CLAUDE_API_KEY" ]; then
  sed -i "s|__CLAUDE_API_KEY__|$CLAUDE_API_KEY|g" config.json
  echo "✅ Injected CLAUDE_API_KEY"
else
  echo "⚠️  CLAUDE_API_KEY not set — skipping"
fi

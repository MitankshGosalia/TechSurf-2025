@echo off
echo Starting ContextAI Development Server...
set NODE_ENV=development
npx tsx server/index.ts
pause

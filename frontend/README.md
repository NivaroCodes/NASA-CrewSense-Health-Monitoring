# CrewSense — Frontend

React, TypeScript, Vite and Tailwind CSS. Specification: `CrewSense — Full Frontend Development Specification`.

## Status

Scaffold only (task T-008). The app shell, five routes, design tokens and one provenance badge are in place. No feature is implemented yet. The build was written without being run in the authoring environment, so the first `npm install` may surface errors to fix.

## Run

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build
npm test
```

`npm install` creates `package-lock.json`, which is intentionally committed once generated.

## Structure

See Section 12 of the specification. Feature code lives in `src/features`, design-system primitives in `src/components/ui`, and tokens in `tailwind.config.js`.

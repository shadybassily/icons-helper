# Icon checker

A browser-only tool that tells you whether an SVG is already in an IcoMoon `selection.json`, **by shape**, not by filename.

1. Drop the current `selection.json` (from `projects/ynmo-ui/assets/icons-font`).
2. Drop the SVGs you want to add.
3. Each file is marked **already in the font** (with the CSS class to use) or **not in the font**.

Nothing is uploaded. The comparison runs locally.

```bash
npm install
npm test
npm run dev
```

Hosted on [Netlify](https://app.netlify.com/start/deploy?repository=https://github.com/shadybassily/icons-helper).

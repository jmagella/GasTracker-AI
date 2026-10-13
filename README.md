<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/10jmZOOSdyEV-sUfOm7-O_rdzM9X4LEGm

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Fill-up logic

- **Full Tank toggle** (default ON) on the entry screen; stored as `isFullTank` on every record. Older records without the flag are treated as full tanks.
- **MPG** is only computed for full-tank rows: `(odometer − previous full-tank odometer) ÷ (gallons since that full tank, including this fill)`. Partial rows show "Partial Fill (Gallons Logged)".
- **Guardrails**: the confirmation screen flags MPG < 5 or > 100, or an odometer lower than the previous entry. Fields are highlighted, a warning is shown, and Save stays disabled until the value is corrected or you tick "These values are correct, save anyway".

## Test

```
npm install
npm test            # unit tests (MPG math, validation, CSV)
npm run typecheck   # note: 4 pre-existing `window.aistudio` errors are unrelated
npm run dev         # http://localhost:3000
```

Manual checks: (1) log a full tank, then a partial, then a full – the last row's MPG should use both fills' gallons; (2) enter an odometer lower than the last one – red field + warning, Save disabled; (3) enter 20 miles on 10 gallons – orange gallons field; (4) toggle Full Tank off – history shows "Partial Fill (Gallons Logged)".

## Google Sheets logging

1. Create a Google Sheet → Extensions → Apps Script. Paste [`docs/google-apps-script.gs`](docs/google-apps-script.gs).
2. Deploy → New deployment → type **Web app** → Execute as **Me**, Who has access **Anyone** → copy the `/exec` URL. (After editing the script, create a *new version* of the deployment.)
3. In the app: Settings → Google Sheets → paste URL → Save.
4. Save a fill-up; a row appears with an `isFullTank` column (TRUE/FALSE). Requests use `no-cors`, so the app can't show errors – check the sheet and Apps Script *Executions* log if rows are missing.

## Deploy

`npm run build` outputs static files to `dist/`. Host on any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages: `npm run build` then publish `dist`). Set `GEMINI_API_KEY` as a build env var, or leave it unset and users enter their key in Settings (stored in the browser). Test the production bundle with `npm run preview`.

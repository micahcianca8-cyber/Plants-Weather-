# Plants & Weather

A small static web app with two widgets:

- **Weather** — current conditions and a 7-day forecast for Huntington Beach, CA 92647, pulled live from [Open-Meteo](https://open-meteo.com) (no API key required).
- **Tree watering tracker** — logs watering dates for your guava, orange, plum, and fig trees. Each tree has an editable watering interval; the card shows whether it's OK, due soon, or overdue, and flags upcoming rain so you can skip a watering.

## Running it

It's a static site — no build step. Just open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

Watering history is stored in your browser's `localStorage`, so it's per-device/per-browser.

## Installing on your iPhone

This is a PWA (progressive web app), so it can be added to your Home Screen and run like a native app — full screen, its own icon, no Safari address bar.

1. **Turn on GitHub Pages once** (repo Settings → Pages → Source: **GitHub Actions**). A workflow (`.github/workflows/deploy-pages.yml`) is already set up to deploy automatically whenever `main` is updated.
2. Merge this branch into `main` (or push to `main`) so the workflow runs and publishes the site. The Pages URL will look like `https://<your-username>.github.io/<repo-name>/`.
3. On your iPhone, open that URL in **Safari**.
4. Tap the **Share** button, then **Add to Home Screen**.
5. Launch it from the Home Screen icon — it opens full-screen with no browser chrome, and the tree watering log is saved on-device.

The weather widget needs an internet connection; the tree tracker and app shell also work offline once you've opened it at least once (via the built-in service worker).

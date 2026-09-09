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

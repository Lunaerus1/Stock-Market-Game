# Stock Market Prediction Game

A lightweight, static web game that uses real stock market data from Alpha Vantage. The user enters a ticker (e.g., `MSFT`, `COF`), the app picks a random valid start date between 7 and 100 days ago (non-holiday weekday with data), shows the prior seven trading days plus the start date on a line chart, and you predict whether the next day will go up or down. The app reveals the next day, updates your score, advances the current date, and continues until you end the game.

- Data source: Alpha Vantage `TIME_SERIES_DAILY`
- API key usage: embedded client-side for demo purposes
- Charting: Chart.js
- Hosting target: GitHub Pages (static site)

## Local usage

Open `index.html` in a browser, or serve the folder with any static server (e.g. VS Code Live Server). No build step required.

## GitHub Pages deployment

1. Create a new GitHub repository and push these files to the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
2. Commit and push to the `main` branch.
3. In your GitHub repository, go to Settings → Pages.
4. Under “Build and deployment”, set:
   - Source: `Deploy from a branch`
   - Branch: `main` (Folder: `/root`) and click Save.
5. Wait for GitHub Pages to build and deploy. Your site URL appears at the top of the Pages settings once ready.

If you prefer to serve from `/docs` instead of the repository root, move the files into a `docs/` folder and select `docs` as the Pages folder in step 4.

## Alpha Vantage API key

This demo uses the provided key directly in `app.js` for simplicity:

- File: `app.js`
- Constant: `API_KEY`

Note: Publicly embedding API keys is fine for demo/testing with rate-limited free keys, but for production you should proxy requests through a server to protect secrets and manage caching/rate limits.

## Notes on data and behavior

- Only actual market data is used. If a symbol is invalid or unavailable, a helpful error message is shown.
- The random start date is selected from real trading days between 7 and 100 days ago and is a weekday to avoid holidays/weekends.
- The chart initially displays the seven trading days before the start date plus the start date itself. Predictions begin for the following trading day.
- Score increases by 1 for a correct prediction; otherwise it stays the same.

## Tech stack

- Vanilla HTML/CSS/JS
- Chart.js 4
- Alpha Vantage TIME_SERIES_DAILY API

## License

MIT
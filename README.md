# Daily Discipline

A personal habit and money dashboard for a 54-day challenge, built as an installable phone app. One screen answers one question: *how did I do today?*

<p align="center">
  <img src="hero-today.jpg" alt="Today" width="49%">
  <img src="hero-wish.jpg" alt="Wish List" width="49%">
</p>

## Features

| Page | What it does |
|---|---|
| **Today** | Overall score for the day, last 7 and 30 days at a glance, and a "heads up" list of anything slipping |
| **Spending** | Weekly budget and category caps, weekly spending vs. budget history, live bank balances, and a bank inbox where each transaction is categorized in one tap |
| **Food** | 16:8 fasting tracker with a live fasting clock, meal log with satiety cues, bodyweight trend |
| **Faith** | Weighted daily habit score (arise time, study, prayer, journaling, skills, and more), with a "slop vs. art" media balance |
| **Fitness** | Weights, run, or both on the same day, set-by-set logging with a rest timer, lift progress and run pace charts |
| **Wishes** | Shared wish lists: edit your own, view your partner's, tick off what you bought without spoiling the surprise |

Also: cloud sync across devices, CSV export/import, offline use, and a household app that reads a summary of today's score from the same database.

## Gallery

<table>
  <tr>
    <td><img src="hero-spend.jpg" alt="Spending"><br><sub>Spending</sub></td>
    <td><img src="hero-food.jpg" alt="Food"><br><sub>Food</sub></td>
  </tr>
  <tr>
    <td><img src="hero-faith.jpg" alt="Faith"><br><sub>Faith</sub></td>
    <td><img src="hero-fit.jpg" alt="Fitness"><br><sub>Fitness</sub></td>
  </tr>
</table>

## Stack

- **Front end:** a single `index.html` of vanilla HTML, CSS and JavaScript. No framework and no build step.
- **PWA:** service worker (`sw.js`) and web manifest for home-screen install and offline use.
- **Storage:** `localStorage` on the device, synced to **Supabase** (Auth plus a JSON snapshot row).
- **Bank data:** **Plaid** (Transactions) through a **Supabase Edge Function**. The Plaid secret and bank token live only on the server.
- **Fonts:** Roboto, Roboto Condensed and Roboto Mono from Google Fonts.

## Files

```
index.html               the whole app
sw.js                    offline cache
manifest.webmanifest     install metadata
hero-*.jpg               page background images
plaid-function.ts        Supabase Edge Function (bank sync and balances)
supabase-setup.sql       tables for the bank integration
```

## Run it

1. Serve the folder over HTTPS (GitHub Pages works) and open `index.html`.
2. On iPhone: Safari, Share, **Add to Home Screen**.
3. Optional sync and bank features: create a Supabase project, run `supabase-setup.sql`, deploy `plaid-function.ts` as an Edge Function named `plaid`, and add `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` and `OWNER_USER_ID` as function secrets.

## Security notes

- Never commit Plaid keys or Supabase service keys. The publishable key in `index.html` is meant to be public, and access is controlled by Supabase row-level security.
- The bank tables have row-level security on with no browser policies, so only the Edge Function can read them.
- Use a strong, unique password for the Supabase login. It protects your bank data.

## Credits

Background photographs are public-domain or historical images used for personal, non-commercial purposes. Replace them with your own if you publish this.

# Abhay Maurya Portfolio

[![Live Site](https://img.shields.io/badge/live-abhay--codez.github.io-blue?style=for-the-badge&logo=githubpages)](https://abhay-codez.github.io/abhay-portfolio/)
[![GitHub Repo](https://img.shields.io/badge/repo-Abhay--Codez%2Fabhay--portfolio-lightgrey?style=for-the-badge&logo=github)](https://github.com/Abhay-Codez/abhay-portfolio)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

Personal portfolio showcasing AI/ML projects, Python tools, and web development — built from scratch with zero frameworks.

---

## About

This portfolio represents my journey as a B.Tech CSE (AI & ML) student at RR Group of Institutions, Lucknow. It features interactive projects, design explorations, and code I'm proud of — each project reflecting a step forward in building intelligent systems.

## What You'll Find

- **Interactive Projects** — Hands-on demos: Handwritten Digit Recognition (CNN), Sentiment Analysis (LSTM), House Price Predictor, Neural Network from Scratch, CIFAR-10 Transfer Learning
- **Skills & Learning Path** — Technical skills with honest proficiency levels and a documented learning timeline
- **Clean, Zero-Framework Code** — Vanilla HTML, CSS, and JavaScript. Custom cursor, orb animation, secret game. No React, no Vue, no build step.

## Live Site

🌐 **https://abhay-codez.github.io/abhay-portfolio/**

---

## Quick Start

```bash
# Clone
git clone https://github.com/Abhay-Codez/abhay-portfolio.git
cd abhay-portfolio

# Install (none — zero dependencies)
# Run local server (Node.js 18+)
npm start
# → http://localhost:4173
```

> The `start` script uses the built-in `server.cjs` — a tiny zero-dependency static server that serves on loopback only (127.0.0.1 and ::1). No npm install needed.

---

## Project Structure

```
abhay-portfolio/
├── index.html          # Home — hero, about, build showcase, contact
├── projects.html       # Project cards (7 AI/ML + Python projects)
├── skills.html         # Skills grid + learning timeline
├── server.cjs          # Local dev server (Node.js)
├── fix-wordmark.cjs    # Syncs logo symbol across all HTML files
├── package.json        # npm scripts
├── css/
│   └── style.css       # All styles (55 KB, custom properties, no framework)
├── js/
│   ├── main.js         # Interactions, animations, cursor, orb (40 KB)
│   └── game.js         # Secret game: Break the Logo (31 KB)
└── assets/
    ├── img/            # Icons, illustrations
    └── fonts/          # Inter Tight (woff2)
```

---

## Development

| Command | Description |
|---------|-------------|
| `npm start` | Run local server on `http://localhost:4173` |
| `node fix-wordmark.cjs` | Sync logo SVG across index.html, projects.html, skills.html (run after editing the source SVG in index.html) |

The `fix-wordmark.cjs` script:
- Refuses to run on a dirty git tree (protects uncommitted work)
- Backs up files before overwriting
- Prints a change report
- Keeps the logo dot position consistent (cx=545)

---

## Deploy

This site is deployed via **GitHub Pages** from the `master` branch. Push to `master` and GitHub Pages auto-deploys to `https://abhay-codez.github.io/abhay-portfolio/`.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ by Abhay Maurya*
/* Synchronise the logo symbol and hero wordmark across the portfolio HTML files.
 *
 * The "Abhay" wordmark and its dot live as inline SVG in index.html, projects.html
 * and skills.html. This script keeps them identical so the logo renders the same
 * on every page. Run it after editing the source SVG in index.html:
 *
 *     node fix-wordmark.cjs
 *
 * Safety: it refuses to run outside a clean git working tree, backs each file up
 * first, and prints a diff-style report of what changed.
 */
const fs = require("fs");
const { execSync } = require("child_process");

const files = ["index.html", "projects.html", "skills.html"];

// Dot position matches the live source SVG. Keep this in sync with index.html.
const DOT_CX = "545";

const symbol = `<symbol id="logo-mark" viewBox="0 0 616.2 312.67">
            <text class="wordmark" x="30" y="236" textLength="505" lengthAdjust="spacingAndGlyphs">Abhay</text>
            <circle class="wordmark__dot" style="fill: var(--color--dot)" cx="${DOT_CX}" cy="279.53" r="26"/>
        </symbol>`;

const hero = `<svg class="hero__logo" viewBox="0 0 616.2 312.67" aria-hidden="true">
                    <text class="hero__letter hero__wordmark" x="30" y="236" textLength="505" lengthAdjust="spacingAndGlyphs">Abhay</text>
                    <circle class="hero__socket socket" cx="${DOT_CX}" cy="279.53" r="26" data-dot-anchor="hero"/>
                </svg>`;

// Refuse to run on a dirty tree — we never want to overwrite uncommitted work.
const status = execSync("git status --porcelain", { encoding: "utf8" }).trim();
if (status) {
    console.error("Working tree is not clean. Commit or stash first:\n" + status);
    process.exit(1);
}

for (const file of files) {
    if (!fs.existsSync(file)) {
        console.log("skip (missing):", file);
        continue;
    }

    const before = fs.readFileSync(file, "utf8");
    let html = before;

    const hadSymbol = /<symbol id="logo-mark"[\s\S]*?<\/symbol>/.test(html);
    html = html.replace(/<symbol id="logo-mark"[\s\S]*?<\/symbol>/, symbol);

    if (file === "index.html") {
        html = html.replace(/<svg class="hero__logo"[\s\S]*?<\/svg>/, hero);
    }

    if (html === before) {
        console.log("no change:", file);
        continue;
    }

    // Back up before overwriting.
    fs.writeFileSync(`${file}.bak`, before, "utf8");
    fs.writeFileSync(file, html, "utf8");
    console.log("updated:", file, `(backup: ${file}.bak)`);
}
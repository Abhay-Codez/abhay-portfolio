const fs = require("fs");

const files = ["index.html", "projects.html", "skills.html"];

const symbol = `<symbol id="logo-mark" viewBox="0 0 616.2 312.67">
            <text class="wordmark" x="30" y="236" textLength="505" lengthAdjust="spacingAndGlyphs">Abhay</text>
            <circle class="wordmark__dot" style="fill: var(--color--dot)" cx="590.2" cy="279.53" r="26"/>
        </symbol>`;

const hero = `<svg class="hero__logo" viewBox="0 0 616.2 312.67" aria-hidden="true">
                    <text class="hero__letter hero__wordmark" x="30" y="236" textLength="505" lengthAdjust="spacingAndGlyphs">Abhay</text>
                    <circle class="hero__socket socket" cx="590.2" cy="279.53" r="26" data-dot-anchor="hero"/>
                </svg>`;

for (const file of files) {
    let html = fs.readFileSync(file, "utf8");

    const beforeSymbol = html;
    html = html.replace(/<symbol id="logo-mark"[\s\S]*?<\/symbol>/, symbol);
    if (html === beforeSymbol) console.log("symbol: NO MATCH in", file);

    if (file === "index.html") {
        const beforeHero = html;
        html = html.replace(/<svg class="hero__logo"[\s\S]*?<\/svg>/, hero);
        if (html === beforeHero) console.log("hero: NO MATCH in", file);
    }

    fs.writeFileSync(file, html, "utf8");
    console.log("updated", file);
}

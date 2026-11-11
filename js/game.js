/* ==========================================================================
   Break the logo — the secret level.
   A small breakout game: the swoosh is the paddle, the dot is the ball.
   ========================================================================== */
(() => {
    "use strict";

    const dialog = document.querySelector("[data-game]");
    if (!dialog) return;

    const canvas = document.querySelector("[data-game-canvas]");
    const ctx = canvas.getContext("2d");
    const screen = document.querySelector("[data-game-screen]");
    const kickerEl = document.querySelector("[data-game-kicker]");
    const titleEl = document.querySelector("[data-game-title]");
    const textEl = document.querySelector("[data-game-text]");
    const startBtn = document.querySelector("[data-game-start]");
    const contactBtn = document.querySelector("[data-game-contact]");
    const closeBtn = document.querySelector("[data-game-close]");
    const soundBtn = document.querySelector("[data-game-sound]");
    const livesEl = document.querySelector("[data-game-lives]");
    const scoreEl = document.querySelector("[data-game-score]");
    const promptEl = document.querySelector("[data-game-prompt]");
    const liveEl = document.querySelector("[data-game-live]");

    const INK = "#0e0e10";
    const PAPER = "#f6f4ef";
    const DOT = "#ff4f2b";
    const COLORS = ["#3d6bff", "#ff3d5a", "#10c48a", "#ffc61a", "#ff4f2b"];
    const BEST_KEY = "abhay-break-the-logo-best";

    // The wordmark is live text inside the hero SVG, so the thing you break is
    // rasterised from the same lettering rather than from traced paths.
    const LOGO_TEXT = "Abhay";
    const LOGO_BOX = { x: 0, y: 0, w: 616.2, h: 312.67 };

    let W = 0;
    let H = 0;
    let dpr = 1;
    let raf = 0;
    let running = false;
    let lastTime = 0;
    let phase = "ready"; // ready | serve | playing | over | won
    let lives = 3;
    let score = 0;
    let best = Number(localStorage.getItem(BEST_KEY) || 0);
    let combo = 0;
    let bricks = [];
    let balls = [];
    let particles = [];
    let powerups = [];
    let popups = [];
    let paddle = { x: 0, targetX: 0, w: 140, h: 12, y: 0 };
    let pointer = { x: 0, y: 0, active: false };
    let keys = { left: false, right: false };
    let audioOn = true;
    let audioCtx = null;
    let wideUntil = 0;
    let slowUntil = 0;
    let shake = 0;

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const rand = (min, max) => min + Math.random() * (max - min);
    const padScore = (n) => String(n).padStart(6, "0");
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------------------------------------------------------------------
       Audio
       --------------------------------------------------------------------- */
    const ensureAudio = () => {
        if (audioCtx) return audioCtx;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        audioCtx = new AudioCtx();
        return audioCtx;
    };

    const beep = (freq, duration = 0.08, type = "square", volume = 0.035) => {
        if (!audioOn) return;
        const actx = ensureAudio();
        if (!actx) return;
        if (actx.state === "suspended") actx.resume();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, actx.currentTime);
        gain.gain.setValueAtTime(volume, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + duration);
        osc.connect(gain).connect(actx.destination);
        osc.start();
        osc.stop(actx.currentTime + duration + 0.02);
    };

    const melody = (notes) => {
        notes.forEach(([freq, delay, duration]) => {
            window.setTimeout(() => beep(freq, duration || 0.1, "square", 0.04), delay);
        });
    };

    /* ---------------------------------------------------------------------
       Layout
       --------------------------------------------------------------------- */
    const resize = () => {
        const rect = canvas.getBoundingClientRect();
        W = Math.max(rect.width, 320);
        H = Math.max(rect.height, 480);
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        paddle.y = H - (W < 640 ? 100 : 96);
        paddle.w = basePaddleWidth();
        if (paddle.x === 0) {
            paddle.x = W / 2;
            paddle.targetX = W / 2;
        }
        paddle.x = clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);
        paddle.targetX = clamp(paddle.targetX, paddle.w / 2, W - paddle.w / 2);
        buildBricks();
    };

    const basePaddleWidth = () => clamp(W * 0.12, 96, 176);

    const buildBricks = () => {
        bricks = [];

        const cols = W < 640 ? 36 : 46;
        const rows = Math.round(cols / 1.97);
        const areaW = W < 640 ? W * 0.92 : Math.min(W * 0.63, 940);
        const areaH = areaW / (LOGO_BOX.w / LOGO_BOX.h);
        const left = (W - areaW) / 2;
        const top = Math.max(130, H * 0.14);
        const cellW = areaW / cols;
        const cellH = areaH / rows;
        const gap = Math.max(1, Math.min(2.4, cellW * 0.11));

        // Rasterise the wordmark into a tiny mask and turn on cells into bricks.
        const mask = document.createElement("canvas");
        mask.width = cols;
        mask.height = rows;
        const mctx = mask.getContext("2d");
        const scale = Math.min(cols / LOGO_BOX.w, rows / LOGO_BOX.h);
        const offsetX = (cols - LOGO_BOX.w * scale) / 2;
        const offsetY = (rows - LOGO_BOX.h * scale) / 2;
        mctx.setTransform(scale, 0, 0, scale, offsetX - LOGO_BOX.x * scale, offsetY - LOGO_BOX.y * scale);
        mctx.fillStyle = "#fff";
        mctx.textAlign = "center";
        mctx.textBaseline = "alphabetic";
        mctx.font = 'italic 230px "Instrument Serif", Georgia, serif';
        mctx.fillText(LOGO_TEXT, LOGO_BOX.w / 2, 236);
        const data = mctx.getImageData(0, 0, cols, rows).data;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (data[(row * cols + col) * 4 + 3] < 120) continue;
                bricks.push({
                    x: left + col * cellW + gap / 2,
                    y: top + row * cellH + gap / 2,
                    w: cellW - gap,
                    h: cellH - gap,
                    row,
                    col,
                    alive: true,
                    shade: 0.9 + ((row + col) % 4) * 0.028,
                    flash: 0,
                });
            }
        }
    };

    /* ---------------------------------------------------------------------
       Game setup
       --------------------------------------------------------------------- */
    const resetBalls = () => {
        balls = [{
            x: paddle.x,
            y: paddle.y - 22,
            vx: 0,
            vy: 0,
            r: W < 640 ? 7 : 8,
            trail: [],
        }];
    };

    const resetGame = () => {
        lives = 3;
        score = 0;
        combo = 0;
        wideUntil = 0;
        slowUntil = 0;
        shake = 0;
        particles = [];
        powerups = [];
        popups = [];
        paddle.w = basePaddleWidth();
        paddle.x = W / 2;
        paddle.targetX = W / 2;
        buildBricks();
        resetBalls();
        phase = "ready";
        updateHud();
        setScreen("ready");
    };

    const startRound = () => {
        resetGame();
        phase = "serve";
        screen.hidden = true;
        promptEl.hidden = false;
        promptEl.textContent = isCoarse ? "Tap to play" : "Click or press space to play. Esc gives your mouse back.";
        updateHud();
        liveEl.textContent = "Break the logo. Move the swoosh with your mouse or arrow keys.";
    };

    const serve = () => {
        if (phase !== "serve") return;
        phase = "playing";
        promptEl.hidden = true;
        const ball = balls[0];
        if (!ball) return;
        const angle = rand(-0.5, 0.5) - Math.PI / 2;
        const speed = W < 640 ? 360 : 420;
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        beep(520, 0.09, "square", 0.04);
    };

    const loseLife = () => {
        lives -= 1;
        combo = 0;
        updateHud();
        shake = 10;
        beep(180, 0.18, "sawtooth", 0.05);
        if (lives <= 0) {
            gameOver();
            return;
        }
        phase = "serve";
        paddle.w = basePaddleWidth();
        resetBalls();
        promptEl.hidden = false;
        promptEl.textContent = isCoarse ? "Tap to play" : "Click or press space to play. Esc gives you your mouse back.";
        liveEl.textContent = `${lives} ${lives === 1 ? "life" : "lives"} left.`;
    };

    const gameOver = () => {
        phase = "over";
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_KEY, String(best));
        }
        updateHud();
        window.setTimeout(() => {
            if (phase !== "over") return;
            setScreen("over", {
                kicker: "Game over",
                title: "So close.",
                text: `Score ${score}. Best ${best}. One more go?`,
                start: "Try again",
            });
        }, 500);
        melody([[196, 0, 0.2], [147, 180, 0.28]]);
    };

    const win = () => {
        phase = "won";
        score += lives * 100;
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_KEY, String(best));
        }
        updateHud();
        setScreen("won", {
            kicker: "Logo broken",
            title: "Full stop.",
            text: "You freed the dot. Imagine what we could build together.",
            start: "Play again",
            showContact: true,
        });
        melody([[523, 0, 0.1], [659, 90, 0.1], [784, 180, 0.1], [1046, 270, 0.25]]);
        for (let i = 0; i < 90; i++) burst(rand(0, W), rand(0, H * 0.6), COLORS[i % COLORS.length], 2);
    };

    /* ---------------------------------------------------------------------
       HUD + screens
       --------------------------------------------------------------------- */
    const updateHud = () => {
        scoreEl.textContent = padScore(Math.max(0, Math.round(score)));
        livesEl.innerHTML = "";
        for (let i = 0; i < 3; i++) {
            const life = document.createElement("span");
            life.className = "game__life";
            life.style.opacity = i < lives ? "1" : "0.18";
            livesEl.append(life);
        }
    };

    const setScreen = (kind, content = {}) => {
        contactBtn.hidden = true;
        if (kind === "ready") {
            kickerEl.textContent = "Secret level unlocked";
            titleEl.textContent = "Break the logo";
            textEl.textContent = "The dot wants out. Steer the swoosh with your mouse, finger or arrow keys.";
            startBtn.textContent = "Press start";
        } else {
            kickerEl.textContent = content.kicker;
            titleEl.textContent = content.title;
            textEl.textContent = content.text;
            startBtn.textContent = content.start;
            contactBtn.hidden = !content.showContact;
        }
        screen.hidden = false;
        screen.style.background = kind === "won" ? "rgb(14 14 16 / .68)" : "";
        window.setTimeout(() => startBtn.focus({ preventScroll: true }), 30);
    };

    /* ---------------------------------------------------------------------
       Effects
       --------------------------------------------------------------------- */
    const burst = (x, y, color, count = 7) => {
        const amount = reducedMotion ? Math.ceil(count / 2) : count;
        for (let i = 0; i < amount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = rand(40, 240);
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: rand(2, 6),
                color,
                life: 1,
                decay: rand(1.4, 2.4),
            });
        }
    };

    const popup = (x, y, text, color = PAPER) => {
        popups.push({ x, y, text, color, life: 1 });
    };

    /* ---------------------------------------------------------------------
       Power-ups
       --------------------------------------------------------------------- */
    const spawnPowerup = (x, y) => {
        const roll = Math.random();
        let type = "points";
        if (roll < 0.28) type = "bomb";
        else if (roll < 0.52) type = "slow";
        else if (roll < 0.76) type = "wide";
        const meta = {
            points: { color: "#ffc61a", icon: "+" },
            bomb: { color: "#ff3d5a", icon: "✳" },
            slow: { color: "#3d6bff", icon: "»" },
            wide: { color: "#10c48a", icon: "↔" },
        }[type];
        powerups.push({ x, y, type, color: meta.color, icon: meta.icon, vy: 105, life: 1 });
    };

    const applyPowerup = (power) => {
        if (power.type === "points") {
            score += 250;
            popup(power.x, power.y, "+250", "#ffc61a");
            beep(880, 0.08, "square", 0.04);
        } else if (power.type === "bomb") {
            const alive = bricks.filter((brick) => brick.alive);
            alive.sort(() => Math.random() - 0.5).slice(0, 6).forEach((brick) => {
                destroyBrick(brick, false);
            });
            popup(power.x, power.y, "Bomb", "#ff3d5a");
            beep(120, 0.2, "sawtooth", 0.05);
            shake = 12;
        } else if (power.type === "slow") {
            slowUntil = performance.now() + 8000;
            popup(power.x, power.y, "Slower", "#3d6bff");
            beep(300, 0.14, "triangle", 0.04);
        } else if (power.type === "wide") {
            wideUntil = performance.now() + 8000;
            popup(power.x, power.y, "Wider swoosh", "#10c48a");
            beep(700, 0.14, "triangle", 0.04);
        }
        updateHud();
    };

    /* ---------------------------------------------------------------------
       Bricks
       --------------------------------------------------------------------- */
    const destroyBrick = (brick, withScore = true) => {
        if (!brick.alive) return;
        brick.alive = false;
        if (withScore) {
            combo += 1;
            score += 10 + brick.row * 5 + Math.min(combo * 2, 40);
            updateHud();
        }
        burst(brick.x + brick.w / 2, brick.y + brick.h / 2, PAPER, 5);
        if (Math.random() < 0.045) spawnPowerup(brick.x + brick.w / 2, brick.y + brick.h / 2);
        beep(320 + (3 - brick.row) * 90, 0.05, "square", 0.025);
        if (!bricks.some((item) => item.alive) && phase === "playing") {
            window.setTimeout(() => {
                if (phase === "playing" && !bricks.some((item) => item.alive)) win();
            }, 260);
        }
    };

    /* ---------------------------------------------------------------------
       Update
       --------------------------------------------------------------------- */
    const paddleWidth = () => basePaddleWidth() * (performance.now() < wideUntil ? 1.55 : 1);

    const updatePaddle = (dt) => {
        const keySpeed = 620 * dt;
        if (keys.left) paddle.targetX -= keySpeed;
        if (keys.right) paddle.targetX += keySpeed;
        paddle.targetX = clamp(paddle.targetX, paddle.w / 2, W - paddle.w / 2);
        paddle.x += (paddle.targetX - paddle.x) * Math.min(1, dt * 18);
        paddle.w += (paddleWidth() - paddle.w) * Math.min(1, dt * 10);
        paddle.x = clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);
        if (phase === "serve" && balls[0]) {
            balls[0].x = paddle.x;
            balls[0].y = paddle.y - 24;
        }
    };

    const updateBalls = (dt) => {
        if (phase !== "playing") return;
        const slowFactor = performance.now() < slowUntil ? 0.72 : 1;

        for (let i = balls.length - 1; i >= 0; i--) {
            const ball = balls[i];
            ball.trail.push({ x: ball.x, y: ball.y });
            if (ball.trail.length > 9) ball.trail.shift();

            ball.x += ball.vx * slowFactor * dt;
            ball.y += ball.vy * slowFactor * dt;

            if (ball.x - ball.r < 0) {
                ball.x = ball.r;
                ball.vx = Math.abs(ball.vx);
                beep(240, 0.04, "square", 0.02);
            } else if (ball.x + ball.r > W) {
                ball.x = W - ball.r;
                ball.vx = -Math.abs(ball.vx);
                beep(240, 0.04, "square", 0.02);
            }
            if (ball.y - ball.r < 0) {
                ball.y = ball.r;
                ball.vy = Math.abs(ball.vy);
                beep(240, 0.04, "square", 0.02);
            }

            // The swoosh.
            const px = paddle.x - paddle.w / 2;
            if (
                ball.vy > 0 &&
                ball.y + ball.r > paddle.y - 8 &&
                ball.y - ball.r < paddle.y + 16 &&
                ball.x > px - 8 &&
                ball.x < px + paddle.w + 8
            ) {
                ball.y = paddle.y - 8 - ball.r;
                const offset = clamp((ball.x - paddle.x) / (paddle.w / 2), -1, 1);
                const speed = Math.min(Math.hypot(ball.vx, ball.vy) + 16, 760);
                const angle = offset * 1.05;
                ball.vx = Math.sin(angle) * speed;
                ball.vy = -Math.cos(angle) * speed;
                combo = 0;
                beep(420, 0.06, "square", 0.03);
                burst(ball.x, paddle.y - 4, PAPER, 4);
            }

            // Bricks.
            for (const brick of bricks) {
                if (!brick.alive) continue;
                const nx = clamp(ball.x, brick.x, brick.x + brick.w);
                const ny = clamp(ball.y, brick.y, brick.y + brick.h);
                const dx = ball.x - nx;
                const dy = ball.y - ny;
                if (dx * dx + dy * dy > ball.r * ball.r) continue;

                const overlapX = ball.r - Math.abs(dx);
                const overlapY = ball.r - Math.abs(dy);
                const centerDx = ball.x - (brick.x + brick.w / 2);
                const centerDy = ball.y - (brick.y + brick.h / 2);

                if (Math.abs(centerDx) / brick.w > Math.abs(centerDy) / brick.h) {
                    ball.vx = Math.sign(centerDx || 1) * Math.abs(ball.vx);
                    ball.x += Math.sign(centerDx || 1) * (overlapX + 0.5);
                } else {
                    ball.vy = Math.sign(centerDy || 1) * Math.abs(ball.vy);
                    ball.y += Math.sign(centerDy || 1) * (overlapY + 0.5);
                }

                brick.flash = 1;
                destroyBrick(brick);
                break;
            }

            if (ball.y - ball.r > H + 20) {
                balls.splice(i, 1);
            }
        }

        if (!balls.length && phase === "playing") {
            loseLife();
        }
    };

    const updatePowerups = (dt) => {
        const px = paddle.x - paddle.w / 2;
        for (let i = powerups.length - 1; i >= 0; i--) {
            const power = powerups[i];
            power.y += power.vy * dt;
            if (
                power.y > paddle.y - 22 &&
                power.y < paddle.y + 20 &&
                power.x > px - 12 &&
                power.x < px + paddle.w + 12
            ) {
                applyPowerup(power);
                powerups.splice(i, 1);
                continue;
            }
            if (power.y > H + 30) powerups.splice(i, 1);
        }
    };

    const updateEffects = (dt) => {
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.vy += 480 * dt;
            particle.vx *= 0.99;
            particle.life -= particle.decay * dt;
            if (particle.life <= 0) particles.splice(i, 1);
        }
        for (let i = popups.length - 1; i >= 0; i--) {
            popups[i].y -= 34 * dt;
            popups[i].life -= dt * 0.85;
            if (popups[i].life <= 0) popups.splice(i, 1);
        }
        bricks.forEach((brick) => {
            if (brick.flash > 0) brick.flash = Math.max(0, brick.flash - dt * 4);
        });
        shake *= Math.pow(0.001, dt);
        if (shake < 0.2) shake = 0;
    };

    const update = (dt) => {
        if (phase === "ready" || phase === "over" || phase === "won") {
            updateEffects(dt);
            return;
        }
        updatePaddle(dt);
        updateBalls(dt);
        updatePowerups(dt);
        updateEffects(dt);
    };

    /* ---------------------------------------------------------------------
       Draw
       --------------------------------------------------------------------- */
    const roundRect = (x, y, w, h, r) => {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    };

    const drawBackground = () => {
        ctx.fillStyle = INK;
        ctx.fillRect(0, 0, W, H);

        const spacing = 32;
        ctx.fillStyle = "rgba(246,244,239,.055)";
        for (let y = spacing; y < H; y += spacing) {
            for (let x = spacing; x < W; x += spacing) {
                ctx.fillRect(x, y, 1.5, 1.5);
            }
        }

        const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.15, W / 2, H / 2, Math.max(W, H) * 0.72);
        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, "rgba(0,0,0,.5)");
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, W, H);
    };

    const drawBricks = () => {
        for (const brick of bricks) {
            if (!brick.alive) continue;
            ctx.globalAlpha = brick.shade;
            ctx.fillStyle = PAPER;
            ctx.fillRect(brick.x, brick.y, brick.w, brick.h);

            ctx.globalAlpha = brick.shade * 0.35;
            ctx.fillStyle = INK;
            ctx.fillRect(brick.x, brick.y + brick.h - 1.5, brick.w, 1.5);

            if (brick.flash > 0) {
                ctx.globalAlpha = brick.flash * 0.85;
                ctx.fillStyle = DOT;
                ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
            }
        }
        ctx.globalAlpha = 1;
    };

    const drawPaddle = () => {
        ctx.save();
        ctx.shadowColor = "rgba(246,244,239,.2)";
        ctx.shadowBlur = 10;
        ctx.fillStyle = PAPER;
        roundRect(paddle.x - paddle.w / 2, paddle.y - 5, paddle.w, 11, 6);
        ctx.fill();
        ctx.restore();
    };

    const drawBalls = () => {
        for (const ball of balls) {
            for (let i = 0; i < ball.trail.length; i++) {
                const point = ball.trail[i];
                const alpha = (i / ball.trail.length) * 0.28;
                ctx.fillStyle = `rgba(255,79,43,${alpha})`;
                ctx.beginPath();
                ctx.arc(point.x, point.y, ball.r * (0.3 + (i / ball.trail.length) * 0.7), 0, Math.PI * 2);
                ctx.fill();
            }
            if (!reducedMotion) {
                const glow = ctx.createRadialGradient(ball.x, ball.y, 1, ball.x, ball.y, ball.r * 3.4);
                glow.addColorStop(0, "rgba(255,79,43,.45)");
                glow.addColorStop(1, "rgba(255,79,43,0)");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.r * 3.4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = DOT;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,.75)";
            ctx.beginPath();
            ctx.arc(ball.x - ball.r * 0.3, ball.y - ball.r * 0.34, ball.r * 0.25, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    const drawPowerups = () => {
        for (const power of powerups) {
            ctx.save();
            ctx.translate(power.x, power.y);
            ctx.fillStyle = power.color;
            roundRect(-11, -11, 22, 22, 4);
            ctx.fill();
            ctx.fillStyle = "rgba(14,14,16,.9)";
            ctx.font = '700 13px "Silkscreen", monospace';
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(power.icon, 0, 1);
            ctx.restore();
        }
    };

    const drawEffects = () => {
        for (const particle of particles) {
            ctx.globalAlpha = clamp(particle.life, 0, 1);
            ctx.fillStyle = particle.color;
            ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        }
        ctx.globalAlpha = 1;

        for (const item of popups) {
            ctx.globalAlpha = clamp(item.life, 0, 1);
            ctx.fillStyle = item.color;
            ctx.font = '10px "Silkscreen", monospace';
            ctx.textAlign = "center";
            ctx.fillText(item.text, item.x, item.y);
        }
        ctx.globalAlpha = 1;
    };

    const drawCursor = () => {
        if (!pointer.active || isCoarse) return;
        ctx.fillStyle = DOT;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,79,43,.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 11, 0, Math.PI * 2);
        ctx.stroke();
    };

    const draw = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.save();
        if (shake > 0.3 && !reducedMotion) {
            ctx.translate(rand(-shake, shake), rand(-shake, shake));
        }
        drawBackground();
        drawBricks();
        drawPowerups();
        drawPaddle();
        drawBalls();
        drawEffects();
        drawCursor();
        ctx.restore();

        if (performance.now() < slowUntil) {
            ctx.fillStyle = "rgba(61,107,255,.07)";
            ctx.fillRect(0, 0, W, H);
        }
    };

    /* ---------------------------------------------------------------------
       Loop
       --------------------------------------------------------------------- */
    const loop = (now) => {
        if (!running) return;
        const dt = Math.min((now - lastTime) / 1000 || 0.016, 0.033);
        lastTime = now;
        update(dt);
        draw();
        raf = requestAnimationFrame(loop);
    };

    const startLoop = () => {
        if (running) return;
        running = true;
        lastTime = performance.now();
        raf = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
        running = false;
        cancelAnimationFrame(raf);
    };

    /* ---------------------------------------------------------------------
       Input
       --------------------------------------------------------------------- */
    const setPointer = (event) => {
        const rect = canvas.getBoundingClientRect();
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
        pointer.active = true;
        paddle.targetX = clamp(pointer.x, paddle.w / 2, W - paddle.w / 2);
    };

    canvas.addEventListener("pointermove", (event) => {
        setPointer(event);
        if (phase === "serve" && event.pointerType === "touch") serve();
    }, { passive: true });

    canvas.addEventListener("pointerdown", (event) => {
        setPointer(event);
        if (phase === "serve") serve();
    });

    canvas.addEventListener("pointerleave", () => {
        pointer.active = false;
    });

    window.addEventListener("keydown", (event) => {
        if (!dialog.open) return;
        if (event.key === " " || event.key === "Enter") {
            if (phase === "serve") {
                event.preventDefault();
                serve();
            } else if (phase === "ready" || phase === "over" || phase === "won") {
                if (document.activeElement === startBtn) return;
                event.preventDefault();
                startRound();
            }
        }
        if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") keys.left = true;
        if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") keys.right = true;
        if (event.key === "Escape") {
            event.preventDefault();
            close();
        }
    });

    window.addEventListener("keyup", (event) => {
        if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") keys.left = false;
        if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") keys.right = false;
    });

    startBtn.addEventListener("click", startRound);
    closeBtn.addEventListener("click", close);
    contactBtn.addEventListener("click", close);
    soundBtn.addEventListener("click", () => {
        audioOn = !audioOn;
        soundBtn.setAttribute("aria-pressed", String(audioOn));
        if (audioOn) beep(660, 0.08);
    });

    window.addEventListener("resize", () => {
        if (!dialog.open) return;
        const oldW = W;
        resize();
        if (oldW && Math.abs(oldW - W) > 2) {
            resetGame();
            startRound();
        }
    });

    document.addEventListener("visibilitychange", () => {
        if (!dialog.open) return;
        if (document.hidden) {
            stopLoop();
        } else {
            startLoop();
            lastTime = performance.now();
        }
    });

    /* ---------------------------------------------------------------------
       Open / close
       --------------------------------------------------------------------- */
    function open() {
        if (dialog.open) return;
        dialog.showModal();
        document.body.style.overflow = "hidden";
        window.SoBra?.hideDot();
        resize();
        resetGame();
        updateHud();
        startLoop();
        ensureAudio();
        beep(260, 0.05, "square", 0.03);
        window.setTimeout(() => startBtn.focus({ preventScroll: true }), 50);
    }

    function close() {
        if (!dialog.open) return;
        stopLoop();
        dialog.close();
        document.body.style.overflow = "";
        window.SoBra?.showDot();
        keys.left = false;
        keys.right = false;
    }

    dialog.addEventListener("close", () => {
        stopLoop();
        document.body.style.overflow = "";
        window.SoBra?.showDot();
    });

    window.SoBraGame = {
        open,
        close,
        isOpen: () => dialog.open,
    };

    updateHud();
})();

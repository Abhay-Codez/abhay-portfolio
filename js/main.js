/* ==========================================================================
   SoBra clone — interface behaviour
   The dot, the scroll story, the chicken and the small details.
   ========================================================================== */
(() => {
    "use strict";

    const $ = (selector, scope = document) => scope.querySelector(selector);
    const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rand = (min, max) => min + Math.random() * (max - min);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const root = document.documentElement;
    const nav = $(".nav");
    const navLinks = $("#nav-links");
    const navToggle = $(".nav__toggle");

    /* ---------------------------------------------------------------------
       Intro: the dot arrives, the role types itself in.
       --------------------------------------------------------------------- */
    const socketHero = $('[data-dot-anchor="hero"]');
    if (socketHero && !reducedMotion) {
        window.setTimeout(() => {
            const rect = socketHero.getBoundingClientRect();
            const layer = $(".dot-sparks");
            if (!layer || !rect.width) return;
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            for (let i = 0; i < 6; i++) {
                const spark = document.createElement("span");
                spark.className = "dot-spark";
                spark.style.left = `${cx}px`;
                spark.style.top = `${cy}px`;
                layer.append(spark);
                const angle = rand(0, Math.PI * 2);
                const distance = rand(24, 58);
                spark.animate(
                    [
                        { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
                        {
                            transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(.3)`,
                            opacity: 0,
                        },
                    ],
                    { duration: 700, delay: i * 45, easing: "cubic-bezier(.22,1,.36,1)" }
                ).finished.finally(() => spark.remove());
            }
        }, 820);
    }

    const typed = $("[data-typed]");
    if (typed) {
        const text = typed.dataset.typed;
        if (reducedMotion) {
            typed.textContent = text;
        } else {
            typed.textContent = "";
            let index = 0;
            window.setTimeout(() => {
                const tick = () => {
                    typed.textContent = text.slice(0, ++index);
                    if (index < text.length) {
                        window.setTimeout(tick, 48 + Math.random() * 46);
                    }
                };
                tick();
            }, 900);
        }
    }

    /* ---------------------------------------------------------------------
       Split the about statement into words for the scroll reveal.
       --------------------------------------------------------------------- */
    const statement = $("[data-split-words]");
    if (statement) {
        const wrapWords = (node) => {
            [...node.childNodes].forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                    const fragment = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part.trim()) {
                            fragment.append(part);
                            return;
                        }
                        const word = document.createElement("span");
                        word.className = "about__word";
                        word.textContent = part;
                        fragment.append(word);
                    });
                    child.replaceWith(fragment);
                } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains("dot-mark")) {
                    wrapWords(child);
                }
            });
        };
        wrapWords(statement);
    }

    /* ---------------------------------------------------------------------
       The accent: the dot changes colour with the section.
       --------------------------------------------------------------------- */
    const accentTargets = [
        { el: $(".hero"), color: "#ff4f2b" },
        { el: $("#about"), color: "#3d6bff" },
        { el: $(".collaborations"), color: "#ffc61a" },
        { el: $(".hyperchicken"), color: "#ffc61a" },
        { el: $("#contact"), color: "#ffc61a" },
    ].filter((target) => target.el);

    const buildEl = $(".build");
    let buildAccent = "#3d6bff";
    let lastAccent = "";

    const favicon = $('link[rel="icon"]');
    const paintFavicon = (color) => {
        if (!favicon) return;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0e0e10"/><circle cx="16" cy="16" r="7" fill="${color}"/></svg>`;
        favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    };

    const applyAccent = (color) => {
        if (color === lastAccent) return;
        lastAccent = color;
        root.style.setProperty("--dot", color);
        paintFavicon(color);
    };

    const syncAccent = () => {
        if (buildEl) {
            const rect = buildEl.getBoundingClientRect();
            if (rect.top <= window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.5) {
                applyAccent(buildAccent);
                return;
            }
        }
        let color = "#ff4f2b";
        for (const target of accentTargets) {
            if (target.el.getBoundingClientRect().top <= window.innerHeight * 0.5) color = target.color;
        }
        applyAccent(color);
    };
    syncAccent();

    /* ---------------------------------------------------------------------
       Navigation: hide on scroll down, reveal the logo once past the hero.
       --------------------------------------------------------------------- */
    let lastScroll = window.scrollY;
    let ticking = false;
    const hasHero = Boolean($(".hero"));

    const updateNav = () => {
        const y = window.scrollY;
        if (hasHero) nav.toggleAttribute("data-over-hero", y < 60);
        syncAccent();

        if (y > 240 && y > lastScroll + 4 && !navLinks.matches(":popover-open")) {
            nav.setAttribute("data-hidden", "");
        } else if (y < lastScroll - 4 || y < 240) {
            nav.removeAttribute("data-hidden");
        }

        const about = $("#about");
        const aboutLink = $('.nav__link[href="#about"]');

        if (hasHero) {
            $$(".nav__link[aria-current]").forEach((link) => link.removeAttribute("aria-current"));
            const aboutRect = about?.getBoundingClientRect();
            if (aboutRect && aboutRect.top <= window.innerHeight * 0.5 && aboutRect.bottom > window.innerHeight * 0.5) {
                aboutLink?.setAttribute("aria-current", "page");
            }
        }

        lastScroll = y;
        ticking = false;
    };

    window.addEventListener(
        "scroll",
        () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(updateNav);
            }
        },
        { passive: true }
    );
    updateNav();
    window.addEventListener("resize", syncAccent, { passive: true });

    if (navToggle && navLinks) {
        navToggle.addEventListener("click", () => {
            const open = navLinks.matches(":popover-open");
            navToggle.setAttribute("aria-expanded", String(!open));
        });
        navLinks.addEventListener("toggle", (event) => {
            navToggle.setAttribute("aria-expanded", String(event.newState === "open"));
        });
        $$(".nav__link", navLinks).forEach((link) => {
            link.addEventListener("click", () => {
                if (navLinks.matches(":popover-open")) navLinks.hidePopover();
            });
        });
    }

    /* ---------------------------------------------------------------------
       Hero: dot field glow and a gentle 3D tilt.
       --------------------------------------------------------------------- */
    const hero = $(".hero");
    const heroLogo = $(".hero__logo");
    if (hero && heroLogo && finePointer) {
        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;
        let raf = 0;

        const renderTilt = () => {
            currentX = lerp(currentX, targetX, 0.08);
            currentY = lerp(currentY, targetY, 0.08);
            heroLogo.style.setProperty("--tilt-y", `${currentX * 4}deg`);
            heroLogo.style.setProperty("--tilt-x", `${-currentY * 3}deg`);
            if (Math.abs(currentX - targetX) > 0.001 || Math.abs(currentY - targetY) > 0.001) {
                raf = requestAnimationFrame(renderTilt);
            } else {
                raf = 0;
            }
        };

        const queueTilt = () => {
            if (!raf) raf = requestAnimationFrame(renderTilt);
        };

        hero.addEventListener("pointermove", (event) => {
            const rect = hero.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            targetX = clamp(x, -0.5, 0.5);
            targetY = clamp(y, -0.5, 0.5);
            hero.style.setProperty("--mx", `${event.clientX}px`);
            hero.style.setProperty("--my", `${event.clientY}px`);
            hero.style.setProperty("--lit", "1");
            queueTilt();
        });

        hero.addEventListener("pointerleave", () => {
            targetX = 0;
            targetY = 0;
            hero.style.setProperty("--lit", "0");
            queueTilt();
        });
    }

    /* ---------------------------------------------------------------------
       The dot: a cursor with a mind of its own.
       --------------------------------------------------------------------- */
    const dot = $(".dot");
    if (dot && finePointer) {
        const body = $(".dot__body");
        const sparkLayer = $(".dot-sparks");
        const sockets = $$("[data-dot-anchor]");
        const avoidZones = $$("[data-dot-avoid]");

        let pointerX = window.innerWidth / 2;
        let pointerY = window.innerHeight / 2;
        let dotX = pointerX;
        let dotY = pointerY;
        let dotW = 14;
        let dotH = 14;
        let targetW = 14;
        let targetH = 14;
        let visible = false;
        let dockedSocket = null;
        let overYellow = false;
        let frame = 0;

        const interactive = "a, button, summary, input, textarea, select, [role='button']";

        const getDock = () => {
            let best = null;
            let bestDistance = 90;
            for (const socket of sockets) {
                const rect = socket.getBoundingClientRect();
                if (!rect.width) continue;
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const distance = Math.hypot(pointerX - cx, pointerY - cy);
                if (distance < Math.max(bestDistance, rect.width * 0.9)) {
                    best = { socket, cx, cy, size: Math.max(rect.width, 14) };
                    bestDistance = distance;
                }
            }
            return best;
        };

        const move = () => {
            const dock = getDock();
            if (dockedSocket && dock?.socket !== dockedSocket) {
                dockedSocket.removeAttribute("data-docked");
            }

            if (dock) {
                dock.socket.setAttribute("data-docked", "");
                dockedSocket = dock.socket;
                dotX = lerp(dotX, dock.cx, 0.35);
                dotY = lerp(dotY, dock.cy, 0.35);
                targetW = dock.size;
                targetH = dock.size;
                dot.removeAttribute("data-shape");
            } else {
                dockedSocket = null;
                dotX = lerp(dotX, pointerX, 0.22);
                dotY = lerp(dotY, pointerY, 0.22);
                const hover = document.elementFromPoint(pointerX, pointerY)?.closest(interactive);
                if (hover) {
                    targetW = 44;
                    targetH = 44;
                    dot.setAttribute("data-shape", "ring");
                } else {
                    targetW = 14;
                    targetH = 14;
                    dot.removeAttribute("data-shape");
                }
            }

            const yellow = avoidZones.some((zone) => {
                const rect = zone.getBoundingClientRect();
                return pointerX > rect.left && pointerX < rect.right && pointerY > rect.top && pointerY < rect.bottom;
            });
            if (yellow !== overYellow) {
                overYellow = yellow;
                dot.toggleAttribute("data-over-yellow", yellow);
            }

            dotW = lerp(dotW, targetW, 0.24);
            dotH = lerp(dotH, targetH, 0.24);
            body.style.transform = `translate(${dotX - dotW / 2}px, ${dotY - dotH / 2}px)`;
            body.style.width = `${dotW}px`;
            body.style.height = `${dotH}px`;

            frame = requestAnimationFrame(move);
        };

        const show = () => {
            if (visible) return;
            visible = true;
            dot.removeAttribute("data-hidden");
            if (!frame) frame = requestAnimationFrame(move);
        };

        window.addEventListener("pointermove", (event) => {
            if (event.pointerType !== "mouse") return;
            pointerX = event.clientX;
            pointerY = event.clientY;
            if (!root.hasAttribute("data-dot")) root.setAttribute("data-dot", "");
            show();
        }, { passive: true });

        window.addEventListener("pointerdown", (event) => {
            if (event.pointerType !== "mouse" || !visible) return;
            if (event.target.closest(".game")) return;
            const colors = ["var(--dot)", "var(--text)", "#3d6bff", "#ffc61a"];
            for (let i = 0; i < 7; i++) {
                const spark = document.createElement("span");
                spark.className = "dot-spark";
                spark.style.left = `${pointerX}px`;
                spark.style.top = `${pointerY}px`;
                spark.style.background = colors[i % colors.length];
                sparkLayer.append(spark);
                const angle = (Math.PI * 2 * i) / 7 + Math.random() * 0.5;
                const distance = 18 + Math.random() * 34;
                spark.animate(
                    [
                        { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
                        {
                            transform: `translate(${Math.cos(angle) * distance - 3}px, ${Math.sin(angle) * distance - 3}px) scale(.4)`,
                            opacity: 0,
                        },
                    ],
                    { duration: 480 + Math.random() * 260, easing: "cubic-bezier(.22,1,.36,1)" }
                ).finished.finally(() => spark.remove());
            }
        });

        document.addEventListener("mouseleave", () => {
            visible = false;
            dot.setAttribute("data-hidden", "");
        });
        document.addEventListener("mouseenter", () => show());

        window.addEventListener("resize", () => {
            pointerX = clamp(pointerX, 0, window.innerWidth);
            pointerY = clamp(pointerY, 0, window.innerHeight);
        });
    }

    /* ---------------------------------------------------------------------
       Build: four services, one sticky stage.
       --------------------------------------------------------------------- */
    const build = $("[data-build]");
    if (build) {
        const items = $$("[data-build-items] p").map((item) => ({
            word: item.dataset.word,
            color: item.dataset.color,
            text: $("[data-build-text]", item).textContent.trim(),
        }));

        const wordEl = $("[data-build-word]", build);
        const noteEl = $("[data-build-note]", build);
        const meter = $("[data-build-meter]", build);
        const orb = $("[data-build-orb]", build);
        const accentColors = {
            blue: "#3d6bff",
            red: "#ff3d5a",
            green: "#10c48a",
            yellow: "#ffc61a",
        };

        const swatches = items.map((item) => {
            const span = document.createElement("span");
            meter.append(span);
            return span;
        });

        let active = -1;

        /* -----------------------------------------------------------------
           The halftone orb: 34 × 34 dots that re-rasterise through 5, 8, 12,
           18 and 26 pixels whenever the accent changes. Dots also swell and
           scatter under the pointer, and hold an ink mark when brushed.
           ----------------------------------------------------------------- */
        const createOrb = (canvas) => {
            if (!canvas) return { resolve() {}, resize() {} };

            const context = canvas.getContext("2d");
            const MATRIX = 34;
            const RESOLUTIONS = [5, 8, 12, 18, 26];
            const STEP = 85;
            const DOT = 0.36;
            const REACH = 4.5;
            const PUSH = 0.3;
            const SWELL = 0.22;
            const EASE = 0.16;
            const RIPPLE_SPEED = 22;
            const RIPPLE_WIDTH = 2.2;
            const BRUSH = 0.85;
            const HOLD = 1600;
            const FADE = 2600;
            const CLICK = 0.6;
            const paper = getComputedStyle(root).getPropertyValue("--paper").trim() || "#f6f4ef";
            const glyphCells = new Array(MATRIX * MATRIX);

            let color = accentColors.blue;
            let dots = [];
            let size = 0;
            let unit = 0;
            let ready = false;
            let timer = 0;
            let frame = 0;
            let lastFrame = 0;
            let pointer = null;
            let stroke = null;
            let ripple = null;

            const smooth = (value) => value * value * (3 - 2 * value);

            const rounded = (x, y, w, h, r) => {
                const radius = Math.min(r, w / 2, h / 2);
                context.beginPath();
                context.moveTo(x + radius, y);
                context.arcTo(x + w, y, x + w, y + h, radius);
                context.arcTo(x + w, y + h, x, y + h, radius);
                context.arcTo(x, y + h, x, y, radius);
                context.arcTo(x, y, x + w, y, radius);
                context.closePath();
            };

            const build = () => {
                const width = canvas.clientWidth;
                if (!width) return false;
                size = Math.round(width * (window.devicePixelRatio || 1));
                unit = size / MATRIX;
                canvas.width = size;
                canvas.height = size;
                dots = [];
                glyphCells.fill(null);
                const half = MATRIX / 2;
                for (let row = 0; row < MATRIX; row++) {
                    for (let col = 0; col < MATRIX; col++) {
                        if ((col + 0.5 - half) ** 2 + (row + 0.5 - half) ** 2 > half * half) continue;
                        const dot = { x: col + 0.5, y: row + 0.5, v: 0, ox: 0, oy: 0, drawn: 0 };
                        dots.push(dot);
                        glyphCells[row * MATRIX + col] = dot;
                    }
                }
                return true;
            };

            const drawLow = (resolution) => {
                canvas.width = resolution;
                canvas.height = resolution;
                context.fillStyle = color;
                const half = resolution / 2;
                for (let y = 0; y < resolution; y++) {
                    for (let x = 0; x < resolution; x++) {
                        if ((x + 0.5 - half) ** 2 + (y + 0.5 - half) ** 2 <= half * half) {
                            context.fillRect(x, y, 1, 1);
                        }
                    }
                }
            };

            const brightness = (dot, now) => {
                if (!dot.drawn) return 0;
                const age = now - dot.drawn;
                if (age < HOLD) return 1;
                const value = 1 - (age - HOLD) / FADE;
                if (value <= 0) dot.drawn = 0;
                return Math.max(0, value);
            };

            const draw = (now = performance.now()) => {
                if (!size) return;
                context.clearRect(0, 0, size, size);
                for (const dot of dots) {
                    const ink = brightness(dot, now);
                    const swell = Math.max(dot.v, ink);
                    const diameter = 2 * DOT * unit * (1 + SWELL * swell);
                    const x = (dot.x + dot.ox) * unit - diameter / 2;
                    const y = (dot.y + dot.oy) * unit - diameter / 2;
                    rounded(x, y, diameter, diameter, (diameter / 2) * (1 - swell));
                    context.fillStyle = color;
                    context.fill();
                    if (ink) {
                        context.globalAlpha = ink;
                        context.fillStyle = paper;
                        context.fill();
                        context.globalAlpha = 1;
                    }
                }
            };

            const effect = (dot, now) => {
                let strength = 0;
                let origin = null;

                if (pointer) {
                    const distance = Math.hypot(dot.x - pointer.x, dot.y - pointer.y);
                    const influence = Math.max(0, 1 - distance / REACH);
                    if (influence > 0) {
                        strength = smooth(influence);
                        origin = pointer;
                    }
                }

                if (ripple) {
                    const age = ((now - ripple.start) / 1000) * RIPPLE_SPEED;
                    const distance = Math.hypot(dot.x - ripple.x, dot.y - ripple.y);
                    const band = Math.max(0, 1 - Math.abs(distance - age) / RIPPLE_WIDTH);
                    const influence = band * Math.max(0, 1 - age / MATRIX);
                    if (influence > strength) {
                        strength = smooth(influence);
                        origin = ripple;
                    }
                }

                if (!origin) return { v: 0, ox: 0, oy: 0 };

                const dx = dot.x - origin.x;
                const dy = dot.y - origin.y;
                const length = Math.hypot(dx, dy) || 1;
                return {
                    v: strength,
                    ox: (dx / length) * PUSH * strength,
                    oy: (dy / length) * PUSH * strength,
                };
            };

            const tick = (now) => {
                const elapsed = Math.min((now - (lastFrame || now)) / (1000 / 60), 30) || 1;
                const factor = 1 - (1 - EASE) ** elapsed;
                lastFrame = now;
                let moving = false;

                for (const dot of dots) {
                    const target = effect(dot, now);
                    dot.v += (target.v - dot.v) * factor;
                    dot.ox += (target.ox - dot.ox) * factor;
                    dot.oy += (target.oy - dot.oy) * factor;
                    if (dot.v > 0.002 || dot.drawn || Math.abs(dot.ox) > 0.002 || Math.abs(dot.oy) > 0.002) {
                        moving = true;
                    }
                }

                if (ripple && ((now - ripple.start) / 1000) * RIPPLE_SPEED > MATRIX * 1.5) ripple = null;
                draw(now);

                frame = moving || pointer || ripple ? requestAnimationFrame(tick) : 0;
                if (!frame) lastFrame = 0;
            };

            const start = () => {
                if (!ready || frame) return;
                lastFrame = 0;
                frame = requestAnimationFrame(tick);
            };

            const resolve = (nextColor) => {
                if (nextColor) color = nextColor;
                if (!canvas.clientWidth) return;
                clearTimeout(timer);
                cancelAnimationFrame(frame);
                frame = 0;
                lastFrame = 0;
                ready = false;

                const queue = reducedMotion ? [] : [...RESOLUTIONS];
                const step = () => {
                    if (queue.length) {
                        drawLow(queue.shift());
                        timer = window.setTimeout(step, STEP);
                        return;
                    }
                    if (!build()) return;
                    ready = true;
                    draw();
                    if (pointer) start();
                };
                step();
            };

            const cell = (event) => {
                const rect = canvas.getBoundingClientRect();
                return {
                    x: ((event.clientX - rect.left) / rect.width) * MATRIX,
                    y: ((event.clientY - rect.top) / rect.height) * MATRIX,
                };
            };

            const brush = (from, to) => {
                const now = performance.now();
                const distance = Math.hypot(to.x - from.x, to.y - from.y);
                const steps = Math.max(1, Math.ceil(distance / 0.4));
                const radius = Math.ceil(BRUSH);
                for (let i = 0; i <= steps; i++) {
                    const px = from.x + ((to.x - from.x) * i) / steps;
                    const py = from.y + ((to.y - from.y) * i) / steps;
                    for (let row = Math.floor(py) - radius; row <= Math.floor(py) + radius; row++) {
                        for (let col = Math.floor(px) - radius; col <= Math.floor(px) + radius; col++) {
                            if (col < 0 || row < 0 || col >= MATRIX || row >= MATRIX) continue;
                            const dot = glyphCells[row * MATRIX + col];
                            if (dot && Math.hypot(dot.x - px, dot.y - py) <= BRUSH) dot.drawn = now;
                        }
                    }
                }
            };

            if (!reducedMotion) {
                canvas.addEventListener("pointermove", (event) => {
                    if (!ready) return;
                    pointer = cell(event);
                    if (stroke) {
                        stroke.travel += Math.hypot(pointer.x - stroke.from.x, pointer.y - stroke.from.y);
                        brush(stroke.from, pointer);
                        stroke.from = pointer;
                    }
                    start();
                });
                canvas.addEventListener("pointerleave", () => {
                    pointer = null;
                    start();
                });
                canvas.addEventListener("pointerdown", (event) => {
                    if (!ready) return;
                    pointer = cell(event);
                    stroke = { from: pointer, travel: 0 };
                    if (event.pointerType !== "touch") canvas.setPointerCapture(event.pointerId);
                    start();
                });
                canvas.addEventListener("pointerup", (event) => {
                    if (stroke) {
                        if (stroke.travel < CLICK) {
                            ripple = { ...cell(event), start: performance.now() };
                        }
                        stroke = null;
                    }
                    start();
                });
                canvas.addEventListener("pointercancel", () => {
                    stroke = null;
                });
            }

            const resize = () => {
                if (!canvas.clientWidth) return;
                clearTimeout(timer);
                cancelAnimationFrame(frame);
                frame = 0;
                lastFrame = 0;
                if (build()) {
                    ready = true;
                    draw();
                }
            };

            return { resolve, resize };
        };

        const orbController = createOrb(orb);

        /* The word changes like a broken typewriter: random pixel glyphs
           resolve into the real letters, 560ms from left to right. */
        const glyphs = "#%&*+=<>/?$@";
        const scrambleWord = (element, text) => {
            if (reducedMotion) {
                element.textContent = text;
                return;
            }
            const start = performance.now();
            const thresholds = [...text].map((_, index) => (index / text.length) * 0.7 + Math.random() * 0.3);
            cancelAnimationFrame(Number(element.dataset.raf));

            const frameStep = (now) => {
                const progress = Math.min((now - start) / 560, 1);
                const fragment = document.createDocumentFragment();
                [...text].forEach((character, index) => {
                    if (character === " " || progress >= thresholds[index]) {
                        fragment.append(character);
                        return;
                    }
                    const glyph = document.createElement("span");
                    glyph.className = "build__glyph";
                    glyph.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
                    fragment.append(glyph);
                });
                element.replaceChildren(fragment);
                if (progress < 1) element.dataset.raf = requestAnimationFrame(frameStep);
            };

            requestAnimationFrame(frameStep);
        };

        const setStep = (index) => {
            if (index === active) return;
            const first = active === -1;
            active = index;
            const item = items[index];
            const color = accentColors[item.color];

            build.style.setProperty("--accent", color);
            buildAccent = color;
            syncAccent();
            scrambleWord(wordEl, item.word);
            noteEl.textContent = item.text;

            noteEl.removeAttribute("data-changing");
            // Force a reflow so the little rise animation can restart.
            void noteEl.offsetWidth;
            if (!first) noteEl.setAttribute("data-changing", "");

            swatches.forEach((swatch, i) => {
                if (i === index) swatch.setAttribute("aria-current", "true");
                else swatch.removeAttribute("aria-current");
            });

            orbController.resolve(color);
        };

        const progress = () => {
            const rect = build.getBoundingClientRect();
            const total = build.offsetHeight - window.innerHeight;
            return clamp(-rect.top / total, 0, 0.9999);
        };

        const updateBuild = () => {
            setStep(Math.min(items.length - 1, Math.floor(progress() * items.length)));
        };

        setStep(0);
        updateBuild();
        window.addEventListener("scroll", updateBuild, { passive: true });
        window.addEventListener("resize", () => {
            updateBuild();
            orbController.resize();
        });
    }

    /* ---------------------------------------------------------------------
       The chicken. It walks, it jumps, it lays an egg.
       --------------------------------------------------------------------- */
    const chicken = $("[data-chicken]");
    const ground = $("[data-chicken-ground]");
    if (chicken && ground) {
        chicken.hidden = false;
        const groundRect = () => ground.getBoundingClientRect();
        let x = 0;
        let direction = 1;
        let walking = true;
        let last = performance.now();
        let raf = 0;
        let visible = true;
        let jumpLock = false;

        const setX = () => {
            chicken.style.transform = `translateX(${x}px) scaleX(${direction < 0 ? -1 : 1})`;
            chicken.toggleAttribute("data-walking", walking);
        };

        const tick = (now) => {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            if (visible && walking && !jumpLock) {
                const width = groundRect().width;
                const size = chicken.getBoundingClientRect().width;
                x += direction * 26 * dt;
                if (x < 0) {
                    x = 0;
                    direction = 1;
                } else if (x > width - size) {
                    x = width - size;
                    direction = -1;
                }
                setX();
            }
            raf = requestAnimationFrame(tick);
        };

        const featherBurst = () => {
            const rect = chicken.getBoundingClientRect();
            const parentRect = ground.getBoundingClientRect();
            for (let i = 0; i < 6; i++) {
                const feather = document.createElement("span");
                feather.className = "chicken-feather";
                feather.style.left = `${rect.left - parentRect.left + 22}px`;
                feather.style.bottom = `${rect.height - 8}px`;
                feather.style.background = i % 2 ? "var(--ink)" : "#b35b00";
                ground.append(feather);
                feather.animate(
                    [
                        { transform: "translate(0,0) rotate(0)", opacity: 1 },
                        {
                            transform: `translate(${(Math.random() - 0.5) * 50}px, ${-20 - Math.random() * 30}px) rotate(${Math.random() * 180}deg)`,
                            opacity: 0,
                        },
                    ],
                    { duration: 900, easing: "ease-out" }
                ).finished.finally(() => feather.remove());
            }
        };

        const layEgg = () => {
            const rect = chicken.getBoundingClientRect();
            const parentRect = ground.getBoundingClientRect();
            const egg = document.createElement("span");
            egg.className = "chicken-egg";
            egg.style.left = `${rect.left - parentRect.left + rect.width / 2 - 6}px`;
            ground.append(egg);
            window.setTimeout(() => {
                egg.setAttribute("data-hatch", "");
                const chick = document.createElement("span");
                chick.className = "chicken-egg__chick";
                egg.append(chick);
            }, 350);
            window.setTimeout(() => {
                egg.animate(
                    [
                        { transform: "translateY(0)", opacity: 1 },
                        { transform: "translateY(6px)", opacity: 0 },
                    ],
                    { duration: 420, easing: "ease-in", fill: "forwards" }
                ).finished.finally(() => egg.remove());
            }, 2100);
        };

        chicken.addEventListener("click", () => {
            if (jumpLock) return;
            jumpLock = true;
            chicken.setAttribute("data-jumping", "");
            window.setTimeout(() => {
                layEgg();
                featherBurst();
            }, 260);
            window.setTimeout(() => {
                chicken.removeAttribute("data-jumping");
                jumpLock = false;
            }, 760);

            // A proud little cluck, if the browser lets us.
            if (!reducedMotion) {
                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    const ctx = new AudioCtx();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "square";
                    osc.frequency.setValueAtTime(620, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.12);
                    gain.gain.setValueAtTime(0.04, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.17);
                    ctx.close();
                } catch {
                    /* optional */
                }
            }
        });

        const io = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
        }, { threshold: 0 });
        io.observe(ground);

        const place = () => {
            const width = groundRect().width;
            const size = chicken.getBoundingClientRect().width || 48;
            x = clamp(width * 0.64, 0, Math.max(0, width - size));
            last = performance.now();
            setX();
        };

        if (document.fonts?.ready) {
            document.fonts.ready.then(place);
        }
        place();
        window.addEventListener("resize", place);
        raf = requestAnimationFrame(tick);
        window.addEventListener("pagehide", () => cancelAnimationFrame(raf));
    }

    /* ---------------------------------------------------------------------
       Contact: blink the kicker once it is in view.
       --------------------------------------------------------------------- */
    const kicker = $("[data-in-view]");
    if (kicker) {
        const io = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                kicker.setAttribute("data-in-view", "seen");
                io.disconnect();
            }
        }, { threshold: 0.6 });
        io.observe(kicker);
    }

    /* ---------------------------------------------------------------------
       Keyboard: the Konami code opens the secret level.
       --------------------------------------------------------------------- */
    const konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let progressKeys = [];
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && navLinks?.matches(":popover-open")) {
            navLinks.hidePopover();
        }
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        progressKeys.push(key);
        progressKeys = progressKeys.slice(-konami.length);
        if (progressKeys.join(",") === konami.join(",")) {
            progressKeys = [];
            window.SoBraGame?.open();
        }
    });

    $$("[data-game-open]").forEach((button) => {
        button.addEventListener("click", () => window.SoBraGame?.open());
    });

    $$('a[href="#contact"]').forEach((link) => {
        link.addEventListener("click", () => {
            if (window.SoBraGame?.isOpen()) window.SoBraGame.close();
        });
    });

    if (window.location.hash === "#play") {
        const openFromHash = () => {
            if (window.SoBraGame) window.SoBraGame.open();
            else window.setTimeout(openFromHash, 120);
        };
        window.setTimeout(openFromHash, 500);
    }

    /* Expose a tiny API for the game to coordinate the cursor. */
    window.SoBra = {
        hideDot() {
            dot?.setAttribute("data-hidden", "");
        },
        showDot() {
            if (finePointer) dot?.removeAttribute("data-hidden");
        },
    };
})();

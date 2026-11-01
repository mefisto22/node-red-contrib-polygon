"use strict";

const MAX_POINTS = 20;
const EPS = 1e-12;

// Szigorú számértelmezés: véges szám, vagy teljes egészében számot tartalmazó string.
// ("12abc", "", null, true, [5] → NaN — a parseFloat ezeket csendben elfogadná.)
function toNumber(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
    if (typeof v === "string") {
        const s = v.trim();
        if (s === "") return NaN;
        const n = Number(s);
        return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
}

// A node konfigurációjából kiolvassa a bejelölt (Use) pontokat és a konfigurációs hibákat
function parseConfig(config) {
    const points = [];
    const missing = []; // bejelölt sorok, ahol X vagy Y hiányzik/nem szám

    for (let i = 1; i <= MAX_POINTS; i++) {
        if (!config["use" + i]) continue;
        const x = toNumber(config["x" + i]);
        const y = toNumber(config["y" + i]);
        const xOk = Number.isFinite(x);
        const yOk = Number.isFinite(y);
        if (xOk && yOk) {
            points.push({ x, y, i });
        } else {
            missing.push({ i, xOk, yOk });
        }
    }

    let orderInvalid = false;
    for (let k = 0; k < points.length - 1; k++) {
        if (!(points[k + 1].x > points[k].x)) {
            orderInvalid = true;
            break;
        }
    }

    return {
        points,
        missing,
        orderInvalid,
        extrapolate: (config.extrapolate !== undefined) ? !!config.extrapolate : true
    };
}

// null, ha a konfiguráció használható; különben { status, message }
function configError(cfg) {
    if (cfg.missing.length) {
        const list = cfg.missing.map(r => {
            const lack = [];
            if (!r.xOk) lack.push("X");
            if (!r.yOk) lack.push("Y");
            return `#${r.i} [${lack.join(", ")}]`;
        }).join(", ");
        return {
            status: "config: missing X/Y",
            message: "polygon: X and Y are required in every checked row. Missing: " + list
        };
    }
    if (cfg.points.length < 2) {
        return { status: "need ≥2 points", message: "polygon: need at least 2 configured points." };
    }
    if (cfg.orderInvalid) {
        return { status: "X order invalid", message: "polygon: X values must be strictly increasing across used rows." };
    }
    return null;
}

// Kiértékelés érvényes (≥2 pont, szigorúan növekvő X) pontsoron.
// kind: "knot" | "interpolate" | "extrapolate-low" | "extrapolate-high" | "clamp-low" | "clamp-high"
function evaluate(points, input, extrapolate) {
    const n = points.length;

    for (let i = 0; i < n; i++) {
        if (Math.abs(input - points[i].x) <= EPS) {
            return {
                value: points[i].y,
                segment: (i === 0 || i === n - 1) ? -1 : i - 1,
                kind: "knot",
                x: points[i].x
            };
        }
    }

    if (input < points[0].x) {
        if (!extrapolate) return { value: points[0].y, segment: -1, kind: "clamp-low" };
        return { value: lerp(points[0], points[1], input), segment: -1, kind: "extrapolate-low" };
    }

    if (input > points[n - 1].x) {
        if (!extrapolate) return { value: points[n - 1].y, segment: -1, kind: "clamp-high" };
        return { value: lerp(points[n - 2], points[n - 1], input), segment: -1, kind: "extrapolate-high" };
    }

    let k = 0;
    while (input > points[k + 1].x) k++;
    return { value: lerp(points[k], points[k + 1], input), segment: k, kind: "interpolate" };
}

function lerp(a, b, x) {
    return a.y + (x - a.x) * (b.y - a.y) / (b.x - a.x);
}

module.exports = { MAX_POINTS, toNumber, parseConfig, configError, evaluate };

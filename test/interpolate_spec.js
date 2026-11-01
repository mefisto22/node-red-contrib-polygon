"use strict";

const assert = require("assert");
const { toNumber, parseConfig, configError, evaluate } = require("../nodes/lib/interpolate");

function cfgOf(rows, extra) {
    const c = Object.assign({}, extra);
    rows.forEach((r, idx) => {
        const i = r.i || idx + 1;
        c["use" + i] = r.use !== undefined ? r.use : true;
        c["x" + i] = r.x;
        c["y" + i] = r.y;
    });
    return c;
}

describe("toNumber", function () {
    it("accepts finite numbers and numeric strings", function () {
        assert.strictEqual(toNumber(5), 5);
        assert.strictEqual(toNumber(-1.5), -1.5);
        assert.strictEqual(toNumber("21.5"), 21.5);
        assert.strictEqual(toNumber("  -3 "), -3);
        assert.strictEqual(toNumber("1e3"), 1000);
    });

    it("rejects everything else", function () {
        for (const v of ["", "  ", "12abc", "abc", "unavailable", "1,5", null, undefined, true, false, [5], {}, NaN, Infinity, -Infinity]) {
            assert.ok(Number.isNaN(toNumber(v)), "expected NaN for " + JSON.stringify(v));
        }
    });
});

describe("parseConfig / configError", function () {
    it("collects only checked rows, in row order", function () {
        const cfg = parseConfig(cfgOf([
            { x: "0", y: "0" },
            { use: false, x: "5", y: "999" },
            { x: "10", y: "100" }
        ]));
        assert.deepStrictEqual(cfg.points.map(p => p.i), [1, 3]);
        assert.strictEqual(configError(cfg), null);
    });

    it("accepts numeric values from flow JSON", function () {
        const cfg = parseConfig(cfgOf([{ x: 0, y: 0 }, { x: 10, y: 100 }]));
        assert.strictEqual(cfg.points.length, 2);
    });

    it("defaults extrapolate to true", function () {
        assert.strictEqual(parseConfig({}).extrapolate, true);
        assert.strictEqual(parseConfig({ extrapolate: false }).extrapolate, false);
    });

    it("reports checked rows with missing or invalid X/Y", function () {
        const cfg = parseConfig(cfgOf([
            { x: "0", y: "0" },
            { x: "", y: "5" },
            { x: "7", y: "abc" },
            { x: "10", y: "100" }
        ]));
        const err = configError(cfg);
        assert.strictEqual(err.status, "config: missing X/Y");
        assert.match(err.message, /#2 \[X\], #3 \[Y\]/);
    });

    it("requires at least two points", function () {
        assert.strictEqual(configError(parseConfig(cfgOf([{ x: "0", y: "0" }]))).status, "need ≥2 points");
        assert.strictEqual(configError(parseConfig({})).status, "need ≥2 points");
    });

    it("requires strictly increasing X", function () {
        assert.strictEqual(configError(parseConfig(cfgOf([{ x: "0", y: "0" }, { x: "0", y: "1" }]))).status, "X order invalid");
        assert.strictEqual(configError(parseConfig(cfgOf([{ x: "5", y: "0" }, { x: "1", y: "1" }]))).status, "X order invalid");
    });

    it("ignores rows beyond 20", function () {
        const c = cfgOf([{ x: "0", y: "0" }, { x: "1", y: "1" }]);
        c.use21 = true; c.x21 = "-5"; c.y21 = "0";
        assert.strictEqual(configError(parseConfig(c)), null);
    });
});

describe("evaluate", function () {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 100 }, { x: 20, y: 50 }];

    it("interpolates inside segments", function () {
        assert.deepStrictEqual(evaluate(pts, 5, true), { value: 50, segment: 0, kind: "interpolate" });
        assert.deepStrictEqual(evaluate(pts, 15, true), { value: 75, segment: 1, kind: "interpolate" });
    });

    it("returns Y on knots", function () {
        assert.deepStrictEqual(evaluate(pts, 0, true), { value: 0, segment: -1, kind: "knot", x: 0 });
        assert.deepStrictEqual(evaluate(pts, 10, true), { value: 100, segment: 0, kind: "knot", x: 10 });
        assert.deepStrictEqual(evaluate(pts, 20, true), { value: 50, segment: -1, kind: "knot", x: 20 });
    });

    it("extrapolates with the outer segment slopes", function () {
        assert.deepStrictEqual(evaluate(pts, -5, true), { value: -50, segment: -1, kind: "extrapolate-low" });
        assert.deepStrictEqual(evaluate(pts, 30, true), { value: 0, segment: -1, kind: "extrapolate-high" });
    });

    it("clamps when extrapolation is off", function () {
        assert.deepStrictEqual(evaluate(pts, -5, false), { value: 0, segment: -1, kind: "clamp-low" });
        assert.deepStrictEqual(evaluate(pts, 30, false), { value: 50, segment: -1, kind: "clamp-high" });
    });

    it("handles 20 points and negative ranges", function () {
        const many = [];
        for (let i = 0; i < 20; i++) many.push({ x: -100 + i * 10, y: (-100 + i * 10) * 2 });
        for (const x of [-100, -95.5, -3, 0, 42.25, 90]) {
            assert.ok(Math.abs(evaluate(many, x, true).value - x * 2) < 1e-9, "x=" + x);
        }
        assert.strictEqual(evaluate(many, 87, true).segment, 18);
    });

    it("works with closely spaced and large X values", function () {
        const p = [{ x: 1e6, y: 1 }, { x: 1e6 + 0.001, y: 2 }];
        assert.ok(Math.abs(evaluate(p, 1e6 + 0.0005, true).value - 1.5) < 1e-6);
    });
});

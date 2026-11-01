"use strict";

const assert = require("assert");
const helper = require("node-red-node-test-helper");
const polygonNode = require("../nodes/polygon.js");

helper.init(require.resolve("node-red"));

function flowOf(rows, extra) {
    const n = Object.assign({ id: "n1", type: "polygon", name: "test", wires: [["n2"]] }, extra);
    rows.forEach((r, idx) => {
        const i = idx + 1;
        n["use" + i] = true;
        n["x" + i] = r[0];
        n["y" + i] = r[1];
    });
    return [n, { id: "n2", type: "helper" }];
}

// Egy üzenetet küld és megvárja a kimenetet (vagy a hibát)
function run(flow, payload, extraMsg) {
    return new Promise((resolve, reject) => {
        helper.load(polygonNode, flow, function () {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");
            n2.on("input", msg => resolve({ msg, n1 }));
            n1.receive(Object.assign({ payload }, extraMsg));
        }).catch(reject);
    });
}

function runExpectingError(flow, payload) {
    return new Promise((resolve, reject) => {
        helper.load(polygonNode, flow, function () {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");
            const statuses = [];
            n1.on("call:status", call => statuses.push(call.args[0]));
            n2.on("input", msg => reject(new Error("unexpected output: " + JSON.stringify(msg))));
            n1.receive({ payload });
            setTimeout(() => {
                const errors = helper.log().args.filter(a => a[0].level === helper.log().ERROR);
                resolve({ errors, statuses });
            }, 50);
        }).catch(reject);
    });
}

describe("polygon node", function () {
    beforeEach(function (done) { helper.startServer(done); });
    afterEach(function (done) { helper.unload().then(() => helper.stopServer(done)); });

    it("loads", function (done) {
        helper.load(polygonNode, flowOf([["0", "0"], ["10", "100"]]), function () {
            const n1 = helper.getNode("n1");
            assert.strictEqual(n1.name, "test");
            done();
        });
    });

    it("README quick test values", async function () {
        const flow = flowOf([["0", "0"], ["10", "100"]], { extrapolate: true });
        const cases = [[-5, -50, -1], [0, 0, -1], [5, 50, 0], [10, 100, -1], [15, 150, -1]];
        for (const [inp, out, seg] of cases) {
            const { msg } = await run(flow, inp);
            assert.strictEqual(msg.payload, out, "IN=" + inp);
            assert.strictEqual(msg.segment, seg, "IN=" + inp);
            assert.strictEqual(msg.n_bp, 2);
            await helper.unload();
        }
    });

    it("accepts numeric string payload", async function () {
        const { msg } = await run(flowOf([["0", "0"], ["10", "100"]]), "2.5");
        assert.strictEqual(msg.payload, 25);
    });

    it("clamps when extrapolate is off", async function () {
        const flow = flowOf([["0", "0"], ["10", "100"]], { extrapolate: false });
        assert.strictEqual((await run(flow, -5)).msg.payload, 0);
        await helper.unload();
        assert.strictEqual((await run(flow, 50)).msg.payload, 100);
    });

    it("preserves other message properties", async function () {
        const { msg } = await run(flowOf([["0", "0"], ["10", "100"]]), 1, { topic: "t", _ctx: { a: 1 } });
        assert.strictEqual(msg.topic, "t");
        assert.deepStrictEqual(msg._ctx, { a: 1 });
    });

    it("sets status for interpolation", async function () {
        const flow = flowOf([["0", "0"], ["10", "100"], ["20", "0"]]);
        await new Promise((resolve, reject) => {
            helper.load(polygonNode, flow, function () {
                const n1 = helper.getNode("n1");
                n1.on("call:status", call => {
                    try {
                        assert.deepStrictEqual(call.args[0], { fill: "green", shape: "dot", text: "seg 1" });
                        resolve();
                    } catch (e) { reject(e); }
                });
                n1.receive({ payload: 15 });
            }).catch(reject);
        });
    });

    it("rejects non-numeric payload with exactly one error", async function () {
        const { errors, statuses } = await runExpectingError(flowOf([["0", "0"], ["10", "100"]]), "12abc");
        assert.strictEqual(errors.length, 1);
        assert.match(errors[0][0].msg.toString(), /msg\.payload must be a number/);
        assert.strictEqual(statuses.pop().text, "invalid IN");
    });

    it("reports missing X/Y in checked rows", async function () {
        const { errors } = await runExpectingError(flowOf([["0", "0"], ["", "5"], ["10", "100"]]), 5);
        assert.strictEqual(errors.length, 1);
        assert.match(errors[0][0].msg.toString(), /#2 \[X\]/);
    });

    it("reports non-increasing X", async function () {
        const { errors } = await runExpectingError(flowOf([["0", "0"], ["0", "5"]]), 5);
        assert.strictEqual(errors.length, 1);
        assert.match(errors[0][0].msg.toString(), /strictly increasing/);
    });

    it("reports too few points", async function () {
        const { errors } = await runExpectingError(flowOf([["0", "0"]]), 5);
        assert.strictEqual(errors.length, 1);
        assert.match(errors[0][0].msg.toString(), /at least 2/);
    });

    it("shows config error status on startup", function (done) {
        helper.load(polygonNode, flowOf([["0", "0"]]), function () {
            const n1 = helper.getNode("n1");
            // a status a konstruktorban már lefutott; a helper a hívásokat rögzíti
            const calls = n1.status.getCalls ? n1.status.getCalls() : [];
            try {
                assert.ok(calls.some(c => c.args[0].text === "need ≥2 points"));
                done();
            } catch (e) { done(e); }
        });
    });

    it("triggers a Catch node once with the original message", function (done) {
        const flow = flowOf([["0", "0"], ["10", "100"]]);
        flow.push({ id: "c1", type: "catch", scope: null, uncaught: false, wires: [["n3"]] });
        flow.push({ id: "n3", type: "helper" });
        const catchNode = require("@node-red/nodes/core/common/25-catch.js");
        helper.load([polygonNode, catchNode], flow, function () {
            const n3 = helper.getNode("n3");
            let count = 0;
            n3.on("input", msg => {
                count++;
                assert.strictEqual(msg.payload, "bad");
                assert.match(msg.error.message, /must be a number/);
            });
            helper.getNode("n1").receive({ payload: "bad" });
            setTimeout(() => {
                try { assert.strictEqual(count, 1); done(); } catch (e) { done(e); }
            }, 50);
        });
    });
});

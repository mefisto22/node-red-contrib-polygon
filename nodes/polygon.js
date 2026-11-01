module.exports = function (RED) {
    "use strict";

    function PolygonNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        // Pontok és konfigurációs hibák feltárása
        const points = [];
        const missing = []; // olyan Use-olt sorok, ahol X vagy Y hiányzik/nem szám

        for (let i = 1; i <= 20; i++) {
            const use = !!config["use" + i];
            const xRaw = config["x" + i];
            const yRaw = config["y" + i];
            const x = parseFloat(xRaw);
            const y = parseFloat(yRaw);

            if (use) {
                const xOk = Number.isFinite(x);
                const yOk = Number.isFinite(y);
                if (!xOk || !yOk) {
                    missing.push({ i, xOk, yOk });
                } else {
                    points.push({ x, y, i });
                }
            }
        }

        node._points = points;
        node._extrapolate = (config.extrapolate !== undefined) ? !!config.extrapolate : true;
        node._missingUsedRows = missing; // ha nem üres, konfigurációs hiba

        // X növekvőség ellenőrzése a valid pontokon
        let orderInvalid = false;
        for (let k = 0; k < points.length - 1; k++) {
            if (!(points[k + 1].x > points[k].x)) {
                orderInvalid = true;
                break;
            }
        }
        node._orderInvalid = orderInvalid;

        node.on("input", function (msg, send, done) {
            send = send || function () { node.send.apply(node, arguments); };
            const clone = (RED.util && RED.util.cloneMessage) ? RED.util.cloneMessage : (m => Object.assign({}, m));

            function fail(statusText, errText) {
                node.status({ fill: "red", shape: "dot", text: statusText });
                const err = new Error(errText || statusText);
                node.error(err, msg);
                if (done) done(err);
            }

            // Konfigurációs kötelezőség futásidőben is
            if (node._missingUsedRows && node._missingUsedRows.length) {
                const list = node._missingUsedRows.map(r => {
                    const lack = [];
                    if (!r.xOk) lack.push("X");
                    if (!r.yOk) lack.push("Y");
                    return `#${r.i} [${lack.join(", ")}]`;
                }).join(", ");
                fail("config: missing X/Y", "polygon: a bejelölt soroknál X és Y is kötelező. Hiányzik: " + list);
                return;
            }

            const input = parseFloat(msg.payload);
            if (!Number.isFinite(input)) {
                fail("invalid IN", "polygon: msg.payload must be a number.");
                return;
            }

            const pts = node._points || [];
            const n = pts.length;

            if (n < 2) {
                fail("need ≥2 points", "polygon: need at least 2 configured points.");
                return;
            }

            if (node._orderInvalid) {
                fail("X order invalid", "polygon: X values must be strictly increasing across used rows.");
                return;
            }

            let outMsg = clone(msg);
            outMsg.n_bp = n;

            const EPS = 1e-12;
            for (let i = 0; i < n; i++) {
                if (Math.abs(input - pts[i].x) <= EPS) {
                    outMsg.payload = pts[i].y;
                    outMsg.segment = (i === 0 || i === n - 1) ? -1 : Math.max(0, i - 1);
                    node.status({ fill: "blue", shape: "dot", text: "knot X=" + pts[i].x });
                    send(outMsg);
                    if (done) done();
                    return;
                }
            }

            if (input < pts[0].x) {
                if (node._extrapolate) {
                    const dx = pts[1].x - pts[0].x;
                    if (dx === 0) { fail("X1 = X2", "polygon: cannot extrapolate, X1 equals X2."); return; }
                    const m = (pts[1].y - pts[0].y) / dx;
                    outMsg.payload = pts[0].y + (input - pts[0].x) * m;
                    outMsg.segment = -1;
                    node.status({ fill: "green", shape: "ring", text: "extrap < X1" });
                    send(outMsg); if (done) done(); return;
                } else {
                    outMsg.payload = pts[0].y; outMsg.segment = -1;
                    node.status({ fill: "grey", shape: "ring", text: "clamped to Y1" });
                    send(outMsg); if (done) done(); return;
                }
            }

            if (input > pts[n - 1].x) {
                if (node._extrapolate) {
                    const dx = pts[n - 1].x - pts[n - 2].x;
                    if (dx === 0) { fail("Xn-1 = Xn", "polygon: cannot extrapolate, X(n-1) equals X(n)."); return; }
                    const m = (pts[n - 1].y - pts[n - 2].y) / dx;
                    outMsg.payload = pts[n - 1].y + (input - pts[n - 1].x) * m;
                    outMsg.segment = -1;
                    node.status({ fill: "green", shape: "ring", text: "extrap > Xn" });
                    send(outMsg); if (done) done(); return;
                } else {
                    outMsg.payload = pts[n - 1].y; outMsg.segment = -1;
                    node.status({ fill: "grey", shape: "ring", text: "clamped to Yn" });
                    send(outMsg); if (done) done(); return;
                }
            }

            for (let k = 0; k < n - 1; k++) {
                const xn = pts[k].x, xnp1 = pts[k + 1].x;
                if (input > xn && input < xnp1) {
                    const dx = xnp1 - xn;
                    if (dx <= 0) { fail("Xk ≥ Xk+1", "polygon: non-increasing X in segment."); return; }
                    const yn = pts[k].y, ynp1 = pts[k + 1].y;
                    outMsg.payload = yn + (input - xn) * (ynp1 - yn) / dx;
                    outMsg.segment = k;
                    node.status({ fill: "green", shape: "dot", text: "seg " + k });
                    send(outMsg); if (done) done(); return;
                }
            }

            fail("no segment", "polygon: could not determine interpolation segment.");
        });
    }

    RED.nodes.registerType("polygon", PolygonNode);
};
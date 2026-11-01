module.exports = function (RED) {
    "use strict";

    const { toNumber, parseConfig, configError, evaluate } = require("./lib/interpolate");

    const STATUS = {
        "knot": r => ({ fill: "blue", shape: "dot", text: "knot X=" + r.x }),
        "interpolate": r => ({ fill: "green", shape: "dot", text: "seg " + r.segment }),
        "extrapolate-low": () => ({ fill: "green", shape: "ring", text: "extrap < X1" }),
        "extrapolate-high": () => ({ fill: "green", shape: "ring", text: "extrap > Xn" }),
        "clamp-low": () => ({ fill: "grey", shape: "ring", text: "clamped to Y1" }),
        "clamp-high": () => ({ fill: "grey", shape: "ring", text: "clamped to Yn" })
    };

    function PolygonNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const cfg = parseConfig(config);
        const cfgErr = configError(cfg);

        // Konfigurációs hiba már induláskor látszódjon, ne csak az első üzenetnél
        if (cfgErr) node.status({ fill: "red", shape: "dot", text: cfgErr.status });

        node.on("input", function (msg, send, done) {
            // Node-RED 0.x kompatibilitás
            send = send || function () { node.send.apply(node, arguments); };
            done = done || function (err) { if (err) node.error(err, msg); };

            // Csak done(err) — a node.error() + done(err) együtt kétszer naplózna és kétszer
            // indítaná a Catch node-ot
            function fail(statusText, errText) {
                node.status({ fill: "red", shape: "dot", text: statusText });
                done(new Error(errText));
            }

            if (cfgErr) return fail(cfgErr.status, cfgErr.message);

            const input = toNumber(msg.payload);
            if (!Number.isFinite(input)) return fail("invalid IN", "polygon: msg.payload must be a number.");

            const r = evaluate(cfg.points, input, cfg.extrapolate);

            const outMsg = RED.util.cloneMessage(msg);
            outMsg.payload = r.value;
            outMsg.n_bp = cfg.points.length;
            outMsg.segment = r.segment;

            node.status(STATUS[r.kind](r));
            send(outMsg);
            done();
        });
    }

    RED.nodes.registerType("polygon", PolygonNode);
};

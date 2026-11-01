# node-red-contrib-polygon

[![npm](https://img.shields.io/npm/v/node-red-contrib-polygon.svg)](https://www.npmjs.com/package/node-red-contrib-polygon)
[![CI](https://github.com/mefisto22/node-red-contrib-polygon/actions/workflows/ci.yml/badge.svg)](https://github.com/mefisto22/node-red-contrib-polygon/actions/workflows/ci.yml)

Piecewise **linear interpolation** Node-RED node with up to **20 (X,Y)** breakpoint pairs, optional **endpoint extrapolation**, and strict **monotonic X** validation.  

---

## 📌 English

### What this node does
`polygon` computes an output value from an input (`msg.payload`) by linearly interpolating between user-defined breakpoints. It supports **20 (X,Y) rows**, each with a **Use** checkbox to activate the pair. Outside the endpoint range, it can **extrapolate** or **clamp**—your choice. Settings persist correctly in the editor.

### Key features
- 20 × (**Use**, **X**, **Y**) rows in the edit dialog
- **Strictly increasing X** enforced:
  - **Editor-side validation** highlights the faulty fields and marks the node invalid (red triangle) when used X’s are not strictly increasing.
  - **Runtime guard**: an invalid configuration (e.g. from an imported flow) is shown as a red status on deploy, and every message raises an error (catchable with a *Catch* node).
- **Endpoint behavior selectable**:
  - **Extrapolate** (default ON): linear continuation beyond first/last point.
  - **Clamp**: hold Y at the nearest endpoint.
- **Exact-knot handling**: if `IN == Xk` (within a tiny epsilon), **OUT = Yk**.
- **One output**:
  1) **OUT** – cloned incoming message with computed `msg.payload`, plus `msg.n_bp`, `msg.segment`
- Status text indicators for quick debugging (e.g., `seg k`, `extrap`, `clamped`, `X order invalid`, etc.)


### Installation
Easiest: **Menu → Manage palette → Install**, search for `node-red-contrib-polygon`.

Or from the command line, in the Node-RED userDir (usually `~/.node-red`, Docker: `/data`), then restart Node-RED:
```bash
cd ~/.node-red      # or: cd /data (Docker)
npm install node-red-contrib-polygon
```

### Configuration & algorithm
Let the active (Use ✓) points be `(X1,Y1)…(Xn,Yn)`, `n ≥ 2`, with **strictly increasing** `X`:
- If `IN` is **inside**: find `k` with `Xk < IN < Xk+1` and compute  
  `OUT = Yk + (IN − Xk) * (Yk+1 − Yk) / (Xk+1 − Xk)`
- If **exactly** on a knot `IN == Xk` (epsilon match): `OUT = Yk`
- If `IN < X1`:
  - **Extrapolate ON**: use slope of `(X1,Y1)–(X2,Y2)`
  - **Extrapolate OFF**: `OUT = Y1` (clamp)
- If `IN > Xn`:
  - **Extrapolate ON**: use slope of `(Xn−1,Yn−1)–(Xn,Yn)`
  - **Extrapolate OFF**: `OUT = Yn` (clamp)
- **Input**: `msg.payload` must be a number or a numeric string (e.g. `"21.5"`). Anything else (`"12abc"`, `"unavailable"`, `true`, `null`…) is rejected.
- **Faults** (no output message; red status; error raised, catchable with a *Catch* node):
  - Checked row with missing or non-numeric X/Y
  - Not enough points (`n < 2`)
  - X order invalid (`Xk ≥ Xk+1` among used rows)
  - Non-numeric input

**Output (OUT):** a copy of the input message with the computed value in `msg.payload`, plus:
- `msg.n_bp` – number of active pairs
- `msg.segment` – 0-based index of the segment used: `k` for `Xk < IN < Xk+1` (counting active points from 0), `k−1` when `IN` hits an inner knot `Xk`, and `-1` outside the range (clamped/extrapolated) or on the first/last knot

### Quick test
Set two points and enable extrapolation:
- Use1: `X=0, Y=0`
- Use2: `X=10, Y=100`
- Extrapolate: **ON**

Expected:
- `IN=-5` → `OUT=-50` (left extrapolation)
- `IN=0`  → `OUT=0`   (knot)
- `IN=5`  → `OUT=50`  (interpolation)
- `IN=10` → `OUT=100` (knot)
- `IN=15` → `OUT=150` (right extrapolation)

### Troubleshooting
- **Node doesn’t appear in the palette**: install from the **userDir** (`~/.node-red` or `/data`), then restart Node-RED and **hard-refresh** the editor (Ctrl+F5).
- **Error "msg.payload must be a number"**: the input is not numeric (e.g. a Home Assistant sensor reporting `unavailable`). Filter such messages before the node, or handle them with a *Catch* node.
- **Keeps clamping instead of extrapolating**: ensure the **Extrapolate** checkbox is ON and X’s are strictly increasing.

---

## 🇭🇺 Magyar

### Mit csinál ez a node?
A `polygon` a bemeneti `msg.payload` alapján számít kimenetet a **töréspontok** között lineáris interpolációval. A szerkesztőben **20 sor** áll rendelkezésre (**Use**, **X**, **Y**), a szélső tartományokon pedig **extrapolál** vagy **klampel** – beállítástól függően. A beállításokat helyesen megőrzi.

### Fő funkciók
- 20 × (**Use**, **X**, **Y**) sor
- **Szigorúan növekvő X** kikényszerítése:
  - **Szerkesztő**: a hibás mezőket kiemeli, a node-ot érvénytelennek jelöli (piros háromszög), ha a pipált sorok X értékei nem szigorúan növekvők.
  - **Futásidő**: hibás konfiguráció (pl. importált flow) esetén deploy után piros státusz, és minden üzenetre hibát ad (*Catch* node-dal elkapható).
- **Végpont-kezelés választható**:
  - **Extrapolálás** (alapból BE): lineáris folytatás az első/utolsó szakasz meredekségével.
  - **Klampelés**: Y az adott végpontnál marad.
- **Pontos csomópont (X-egyezés)**: ha `IN == Xk`, akkor **OUT = Yk**.
- **Egy kimenet**:
  1) **OUT** – a bejövő üzenet másolata számított `msg.payload`-dal, plusz `msg.n_bp`, `msg.segment`
- Állapotjelzések a debughoz (`seg k`, `extrap`, `clamped`, `X order invalid`, stb.)


### Telepítés
Legegyszerűbb: **Menü → Manage palette → Install**, keresés: `node-red-contrib-polygon`.

Vagy parancssorból a **Node-RED userDir**-ben (jellemzően `~/.node-red`, Dockerben `/data`), majd indítsd újra a Node-RED-et:
```bash
cd ~/.node-red      # vagy: cd /data (Docker)
npm install node-red-contrib-polygon
```

### Beállítás & algoritmus
Legyenek az aktív (Use ✓) pontok `(X1,Y1)…(Xn,Yn)`, `n ≥ 2`, **szigorúan növekvő** X-szel:
- Ha `IN` **belül** van: keresünk `k`-t, ahol `Xk < IN < Xk+1`, és számolunk:  
  `OUT = Yk + (IN − Xk) * (Yk+1 − Yk) / (Xk+1 − Xk)`
- Ha **pontosan** `IN == Xk`: `OUT = Yk`
- Ha `IN < X1`:
  - **Extrap BE**: az `(X1,Y1)–(X2,Y2)` szakasz meredekségével
  - **Extrap KI**: `OUT = Y1` (klampel)
- Ha `IN > Xn`:
  - **Extrap BE**: az `(Xn−1,Yn−1)–(Xn,Yn)` szakasz meredekségével
  - **Extrap KI**: `OUT = Yn` (klampel)
- **Bemenet**: `msg.payload` szám vagy számot tartalmazó string (pl. `"21.5"`). Minden mást (`"12abc"`, `"unavailable"`, `true`, `null`…) elutasít.
- **Hibák** (nincs kimeneti üzenet; piros státusz; hiba, *Catch* node-dal elkapható):
  - Pipált sorban hiányzó vagy nem szám X/Y
  - Kevés pont (`n < 2`)
  - X sorrend hibás (`Xk ≥ Xk+1` a használt sorokban)
  - Nem szám bemenet

**Kimenet (OUT):** a bejövő üzenet másolata a számított `msg.payload`-dal, továbbá:
- `msg.n_bp` – használt pontpárok száma
- `msg.segment` – a használt szegmens 0-tól számozott indexe: `k`, ha `Xk < IN < Xk+1` (az aktív pontokat 0-tól számozva), `k−1`, ha `IN` egy belső `Xk` csomópontra esik, és `-1` a tartományon kívül (klampelés/extrapoláció) vagy az első/utolsó csomóponton

### Gyors próba
Két pont, extrapolálás BE:
- Use1: `X=0, Y=0`
- Use2: `X=10, Y=100`

Várt értékek:
- `IN=-5` → `OUT=-50`
- `IN=0`  → `OUT=0`
- `IN=5`  → `OUT=50`
- `IN=10` → `OUT=100`
- `IN=15` → `OUT=150`

### Hibaelhárítás
- **Nem jelenik meg a palettán**: a **userDir**-ből telepíts (`~/.node-red` vagy `/data`), indíts újra, és **Ctrl+F5**.
- **Klampel extrapolálás helyett**: kapcsold BE az **Extrapolálás** pipát és ellenőrizd a szigorú X-sorrendet.
- **„msg.payload must be a number” hiba**: a bemenet nem szám (pl. Home Assistant szenzor `unavailable` állapota). Szűrd ki ezeket a node előtt, vagy kezeld *Catch* node-dal.

---

## Development
```bash
npm install
npm test
```

## License
MIT

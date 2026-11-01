# node-red-contrib-polygon

Piecewise **linear interpolation** Node-RED node with up to **20 (X,Y)** breakpoint pairs, optional **endpoint extrapolation**, and strict **monotonic X** validation.  

---

## 📌 English

### What this node does
`polygon` computes an output value from an input (`msg.payload`) by linearly interpolating between user-defined breakpoints. It supports **20 (X,Y) rows**, each with a **Use** checkbox to activate the pair. Outside the endpoint range, it can **extrapolate** or **clamp**—your choice. Settings persist correctly in the editor.

### Key features
- 20 × (**Use**, **X**, **Y**) rows in the edit dialog
- **Strictly increasing X** enforced:
  - **Editor-side validation** blocks saving when used X’s are not strictly increasing.
  - **Runtime guard** raises alarm if a mismatched flow slips through.
- **Endpoint behavior selectable**:
  - **Extrapolate** (default ON): linear continuation beyond first/last point.
  - **Clamp**: hold Y at the nearest endpoint.
- **Exact-knot handling**: if `IN == Xk` (within a tiny epsilon), **OUT = Yk**.
- **One output**:
  1) **OUT** – cloned incoming message with computed `msg.payload`, plus `msg.trbl_al`, `msg.n_bp`, `msg.segment`  
- Status text indicators for quick debugging (e.g., `seg k`, `extrap`, `clamped`, `X order invalid`, etc.)


### Installation
Install **from the Node-RED userDir** (usually `~/.node-red`, Docker: `/data`), then restart Node-RED and hard-refresh the editor.
```bash
cd ~/.node-red      # or: cd /data (Docker)
npm install /path/to/your/node-red-contrib-polygon
node-red-restart
# In browser: Ctrl+F5 to clear cached editor assets
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
- **Faults** (alarm true):
  - Not enough points (`n < 2`)
  - X order invalid (`Xk ≥ Xk+1` among used rows)

**Outputs**
- **Output 1 (OUT):** computed value in `msg.payload`, plus:
  - `msg.trbl_al` – boolean: parameter fault occurred
  - `msg.n_bp` – number of active pairs
  - `msg.segment` – used segment index (`-1` if clamped/extrapolated/knot)
- **Output 2 (TRBL_AL):** `{ payload: <boolean> }` alarm

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
- **Keeps clamping instead of extrapolating**: ensure the **Extrapolate** checkbox is ON and X’s are strictly increasing.

---

## 🇭🇺 Magyar

### Mit csinál ez a node?
A `polygon` a bemeneti `msg.payload` alapján számít kimenetet a **töréspontok** között lineáris interpolációval. A szerkesztőben **20 sor** áll rendelkezésre (**Use**, **X**, **Y**), a szélső tartományokon pedig **extrapolál** vagy **klampel** – beállítástól függően. A beállításokat helyesen megőrzi.

### Fő funkciók
- 20 × (**Use**, **X**, **Y**) sor
- **Szigorúan növekvő X** kikényszerítése:
  - **Szerkesztő**: a mentés (Done) nem engedélyezett, ha a pipált sorok X értékei nem szigorúan növekvők.
  - **Futásidő**: ha hibás flow kerül be, riasztást ad (TRBL_AL).
- **Végpont-kezelés választható**:
  - **Extrapolálás** (alapból BE): lineáris folytatás az első/utolsó szakasz meredekségével.
  - **Klampelés**: Y az adott végpontnál marad.
- **Pontos csomópont (X-egyezés)**: ha `IN == Xk`, akkor **OUT = Yk**.
- **Egy kimenet**:
  1) **OUT** – a bejövő üzenet másolata számított `msg.payload`-dal, plusz `msg.trbl_al`, `msg.n_bp`, `msg.segment`
- Állapotjelzések a debughoz (`seg k`, `extrap`, `clamped`, `X order invalid`, stb.)


### Telepítés
Telepíts a **Node-RED userDir**-ből (jellemzően `~/.node-red`, Dockerben `/data`), majd indítsd újra a Node-RED-et és frissítsd a böngészőt (Ctrl+F5).
```bash
cd ~/.node-red      # vagy: cd /data (Docker)
npm install /ELERESI/UT/node-red-contrib-polygon
node-red-restart
# Böngésző: Ctrl+F5
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
- **Hibák** (TRBL_AL = true):
  - Kevés pont (`n < 2`)
  - X sorrend hibás (`Xk ≥ Xk+1` a használt sorokban)

**Kimenetek**
- **1. kimenet (OUT):** számított `msg.payload`, továbbá:
  - `msg.trbl_al` – logikai zászló hiba esetén
  - `msg.n_bp` – használt pontpárok száma
  - `msg.segment` – a használt szegmens indexe (`-1` klampelés/extrapoláció/csomópont esetén)
- **2. kimenet (TRBL_AL):** `{ payload: <boolean> }` jelző

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

---

## License
MIT

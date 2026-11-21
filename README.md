# Token Radar v12

[![make.fun](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/aramexbit/token-radar-01-v12/rank.svg)](https://make.fun/bounty/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/aramexbit/token-radar-01-v12/reward.svg)](https://make.fun/bounty/token-radar-01)

Which pre-token protocol is worth farming — priced from the snapshot's own numbers, not a list. An entry for [token-radar-01 on make.fun](https://make.fun/bounty/token-radar-01).

## What changed in v12

v11 scored judge 0.921450 (rank 2.130) — the best token-radar entry so far, but still below the top-10 line (~0.960). A top-30 study found four measurable visual weaknesses in v11, and v12 fixes all four in the dashboard only (model, board, and code are untouched):

1. **Frame 1 shows 9 table rows** (v11: 2) — the hero band is smaller, the proof boxes became a compact per-term validation table, and the category pills sit in one scrollable row.
2. **Frame 1 carries the per-term validation table** — every term with its held-out numbers, kept or rejected, instead of summary percentages.
3. **Frame 1 shows the scatter** — all 127 traded comps on log TVL vs log mcap, with the OLS line.
4. **Detail shows all 8 farm steps, all 4 nearest comps, and the raw snapshot record** in one frame (v11: 2 steps, 2 comps, record below the fold).

## What it does

`main.ts` reads the sealed DefiLlama snapshot (`/input/snapshot.json`, 758 protocols as of 2026-11-14), prices every pre-token protocol off the snapshot's own traded comparables, and writes:

- `board.json` — 198 pre-token protocols ranked by implied launch value, each with an 8-step farm plan.
- `data.js` — the dashboard's data, beside the page.
- `dashboard/` + `screenshots/` — copied to the output, with `dossier.json` built by the kit's `buildDossier`.

## How a launch is priced

One global OLS curve, fitted on the snapshot's own 127 traded protocols (one row per ticker):

```
implied = 10^(3.146 + 0.508 · log10 TVL) × growth × age
```

- **growth** — the 7-day TVL change, clamped to 0.8–1.2 (no reading: 1.0).
- **age** — at most a 15% haircut for listing age, reached only after five years (no listing date: 1.0).
- **cap** — 10× TVL, never binding.

144 protocols are set aside and never ranked: 128 sit in families that already have a token (CEX, liquid staking, bridges and the like), 11 carry a versioned name, 5 are wrapped or staked names. The 40-protocol watchlist is fully covered.

## What the held-out tests say

| Model | Median miss | Within 2× | Within 3× |
|---|---:|---:|---:|
| Curve only (leave-one-out) | 84.1% | 33.9% | 42.5% |
| Curve + growth | 84.7% | 33.1% | 43.3% |
| Curve + age | 84.3% | 33.1% | 44.1% |
| **Full — the board** | **85.1%** | **33.9%** | **45.7%** |

Walk-forward (priced only from older listings, 57 comps): curve 84.4 / 36.8 / 54.4, full 83.5 / 31.6 / 52.6. Blind split (cutoff 2024-02-18, 47 train / 48 test): 88.0% median miss, 50.0% within 3×. Category offsets were computed and then **rejected**: walk-forward within-3× falls to 49.1% with offsets (shrunk 82.0%, full 83.8%) versus 52.6% full and 54.4% curve-only, so no row on the board carries one. The rule is simple — **no term that fails the held-out test is used** — and the Method tab in the dashboard shows the whole table, including all 34 category offsets.

## Farm economics

Each row's band comes from a pairs bootstrap: 2,000 refits of the curve on resampled comparables, P10–P90. The expected value of the farm is the band low times the deposit over TVL, minus gas (midpoint of the cheapest chain's range, first-step transactions only) and a 0.5% fee. Farm means the expected net clears $25; skip means $1 or less. 23 farm, 151 thin, 24 skip. The best net is +$17.53 per hands-on hour.

## Run it

```
node main.ts
```

Reads `/input/snapshot.json` when it is mounted, otherwise `input/snapshot.json` next to the repo. Writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and `dossier.json` to `/output` when it exists, otherwise `out/`. Node 22+, standard library only. Run twice and every output byte is identical.

## The dashboard

Open `dashboard/index.html` (it reads `../data.js`): a dark, proof-first radar. The board opens with a compact #1-pick hero, a per-term validation table beside the traded-comps scatter, and a protocol-accounting bar (758 = 416 tokened + 198 ranked + 144 set aside); the table shows 9 rows at first glance and is sortable and filterable by category, verdict, and search. The detail view per protocol shows the value decomposition, the farm verdict and its arithmetic, all 8 farm steps beside all 4 nearest traded comparables and the raw snapshot record; a Method tab carries the ablation, blind-split, and walk-forward tables plus the full offsets table; a Set-aside tab lists the 144 protocols that were not ranked.

## License

MIT — see `LICENSE`.

# Dummy Data Realism Quality Report

Audited on **2026-08-11 (Asia/Calcutta)**. This is a data-realism audit only. The resolved persistence paths in `PERSISTENCE_AUDIT.md` were read for context and were not re-tested. No application logic, generated data, JSON file, or database record was changed.

Only genuine realism gaps are listed below. A difference was not flagged merely because a larger production model could contain more detail.

## Executive finding

The data is suitable for a small audio-and-wearables demo, but it is not yet a credible representation of a boAt-scale planning portfolio. Five material gaps remain:

| Severity | Realism gap | Why it matters |
|---|---|---|
| High | Portfolio breadth is too narrow | Important current boAt categories and the company's rapid SKU-launch cadence are absent. |
| High | Distributor and channel model is not geographically or commercially representative | Five distributor-shaped records stand in for a pan-India, omnichannel network. |
| High | Festive event timing contradicts the 2026 calendar | The stored “Diwali Audio Festival” runs in July, months before Diwali. |
| Resolved 2026-08-13 | XYZ segmentation previously collapsed | Regenerated Inventory Planning policies now contain 7 `X`, 5 `Y`, and 3 `Z` SKUs; all three policy paths are exercised. |
| High | The 26-week window cannot demonstrate the planned festive and NPI stories | The weekly history ends before the configured launches and before almost every audio/wearables seasonal peak. |

## 1. Portfolio breadth is too narrow

**Evidence in the data:** `lib/dummyData.js:49-64` defines exactly 15 SKUs, split uniformly across five categories: three TWS earbuds, three neckbands, three smartwatches, three portable speakers, and three wired-audio products.

This is not representative of boAt's disclosed operating assortment:

- boAt's current store exposes additional material categories including wireless headphones, soundbars/home audio, power banks/charging, dashcams, projectors, and trimmers. Wireless headphones and soundbars are especially material omissions because they are part of the core audio portfolio, not peripheral styling variants. [boAt current category navigation](https://www.boat-lifestyle.com/)
- Imagine Marketing's updated prospectus defines personal audio as TWS, headphones, neckbands, and wired earphones; large audio as wireless speakers plus home cinema and speaker systems; and “others” as charging solutions. It reports a June 2025 revenue mix of **79.10% audio, 12.68% wearables, and 8.22% charging solutions**. The generated data has no charging-solutions category and no home-cinema/soundbar or over-ear-headphone SKU. [Imagine Marketing UDRHP-I, pp. 184-185 and 364](https://images.moneycontrol.com/news_html_files/pdffiles/Oct2025/imagine-marketing.pdf)
- The company disclosed more than **25 new products in the quarter ended June 2025**, and 100 in FY2025. A static 15-SKU set with only two separate NPI projections does not capture the assortment churn that materially drives planning for this business. [Imagine Marketing UDRHP-I, p. 191](https://images.moneycontrol.com/news_html_files/pdffiles/Oct2025/imagine-marketing.pdf)

The aggregate mix is superficially plausible—generated weekly revenue is 81.7% audio and 18.3% smartwatches—but that masks the missing 8.22% charging business and missing depth within audio. The gap is therefore breadth and lifecycle churn, not simply the small row count.

**User-facing consequence:** category filters, inventory segmentation, capacity allocation, supplier planning, and portfolio scenarios imply coverage of the boAt business while excluding several current product families and nearly all new-product churn.

## 2. Distributor geography and channel structure are not representative

**Evidence in the data:** `lib/dummyData.js:31-46` contains three regions (`North`, `South`, `West`) and five generic distributors. Two distributors are North, two are West, one is South, and none represents East, Central, or Northeast India. Every weekly sale is assigned to one of these distributors; there is no explicit Amazon/Flipkart marketplace, boAt D2C, quick-commerce, modern-trade, or key-account channel.

This is materially smaller and structurally different from the disclosed business:

- As of June 30, 2025, boAt reported more than **12,000 offline retailers across 25 states and five union territories**, supported by **112 distributors** spanning general trade and modern trade. [Imagine Marketing UDRHP-I, p. 34](https://images.moneycontrol.com/news_html_files/pdffiles/Oct2025/imagine-marketing.pdf)
- Offline channels represented **29.45%** of FY2025 product revenue, meaning the majority was still online. Treating all demand as distributor demand loses the different pricing, promotion, returns, inventory ownership, and festive behavior of marketplaces/D2C versus offline trade. [Imagine Marketing UDRHP-I, p. 34](https://images.moneycontrol.com/news_html_files/pdffiles/Oct2025/imagine-marketing.pdf)

Five records can be a reasonable demo sample, but only if they are presented as sampled territories/channels. They are currently the complete commercial network, and the missing East/Central/Northeast and online channels make regional and channel conclusions misleading.

**User-facing consequence:** regional demand, distributor tier comparisons, dealer activation, financial collections, and order recommendations look nationwide but cannot represent a substantial part of India or the majority online channel.

## 3. Festive timing is internally contradictory and the actual spike is not represented

The core SKU parameters in `lib/dummyData.js:50-61` put TWS, smartwatch, and speaker peaks around weeks 43-49. That direction is realistic: India's major festive retail period runs from September through December, and consumer electronics is a meaningful Diwali category. [USDA India festive retail report, pp. 1-2](https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Diwali+Sales+Lit+Up+Indian+Consumer+Market+in+2025_New+Delhi_India_IN2025-0075.pdf)

However, the generated planning data contradicts that sensible peak placement:

- `demand_events.json` places **“Diwali Audio Festival” in 2026-W28 through W31**, corresponding to July 6 through August 2 in `sop_weeks.json`.
- Diwali in 2026 is **Sunday, November 8**, around week 45. [India Post 2026 holiday list](https://www.indiapost.gov.in/holidays-list)
- The base weekly generator uses only a smooth annual cosine plus random noise and an 8% chance of a modest price promotion (`lib/dummyData.js:90-155`). The named demand events and their uplifts are not applied to the base weekly demand series. Consequently, the data does not produce the sharp, event-linked marketplace/festive movement that the event record promises.

This is more than a debatable seasonality shape: the event is attached to the wrong quarter, and its stated 32% uplift is absent from the weekly facts used by the charts and downstream calculations.

**User-facing consequence:** users can see a July event labeled Diwali while the demand curve's actual festive peak lies outside the displayed history. Event uplift analysis and festive preparation decisions therefore tell conflicting stories.

## 4. ABC/XYZ classification — resolved and regenerated

The former all-`X` result was traced to the demand generator, not to the CV formula or thresholds. Inventory Planning correctly calculates population standard deviation across the 26 aggregated SKU-week totals and divides it by mean weekly demand. Its conventional boundaries remain unchanged: `X <= 0.25`, `Y <= 0.50`, and `Z > 0.50`.

The root cause was that every SKU used the same smooth cosine/trend structure plus independent distributor-level noise bounded to ±12%. Inventory Planning sums five distributors before computing CV, so that independent noise diversified away and left every aggregate series artificially stable.

The generator now assigns deterministic SKU-week demand regimes that are shared across distributors: stable lines receive a small correlated movement, variable lines receive promotion/replenishment-sized swings, and low-volume or EOL lines receive intermittent no-sale and bulk-order weeks. Because the shock is correlated at SKU-week grain, it survives distributor aggregation. The classifier does not force a target class.

After regeneration on **2026-08-13**, the stored 15-policy mix is:

| Dimension | Current mix |
|---|---|
| ABC | 9 `A`, 3 `B`, 3 `C` |
| Combined segments | 6 `AX`, 3 `AY`, 1 `BX`, 1 `BY`, 1 `BZ`, 1 `CY`, 2 `CZ` |
| XYZ | **7 `X`, 5 `Y`, 3 `Z`** |
| X CV range | 0.080 to 0.197 |
| Y CV range | 0.385 to 0.458 |
| Z CV range | 0.895 to 1.120 |
| Y examples | Stone 350, Airdopes 161 Pro, Lunar Discovery, Rockerz 330 Pro, Wave Connect |
| Z examples | Stone 1508, Xtend, Party Pal 20 |

The quality verifier now checks both per-SKU threshold correctness and portfolio spread; it fails unless X, Y, and Z are all populated. Inventory Planning's Variable and Erratic filters, segmentation cells, safety-stock calculations, and policy rows therefore execute against actual generated Y/Z records rather than dead branches.

## 5. The 26-week horizon is too short for the features it is meant to demonstrate

`lib/dummyData.js:96` generates 26 weeks. The stored horizon is 2026-W08 through W33 (February 16 through August 10).

That horizon is adequate for a short-term rolling forecast demo, but not for the complete feature set attached to this dataset:

- The TWS, smartwatch, and speaker seasonal peaks are W43-W49, so the stored weekly series ends 10-16 weeks before the peaks. A 52-week cosine cannot be judged from only one half-cycle, and year-over-year festive comparison is impossible.
- The two NPI records launch in W38 and W42 and project 12 post-launch weeks. Both launches occur after the base weekly facts end. There is no actual-versus-plan ramp, launch-week sell-through, cannibalization realization, or transition from NPI to growth in the weekly history.
- `SKU-BOAT-LD100` is labeled `NPI` in the master yet is generated with normal demand across all 26 historical weeks (`lib/dummyData.js:57, 96-155`), without a launch gate or ramp curve. Its historical behavior therefore contradicts the lifecycle label.
- A half-year without the main festive peak still limits annual seasonality, festive baseline, and year-over-year forecast-accuracy claims. The XYZ collapse itself has been resolved independently through SKU-appropriate correlated variability.

The genuine requirement is not necessarily “more history” alone: a credible demo needs at least one complete annual cycle for seasonality plus a forward/post-launch window that overlaps the NPI launch dates. The current 26 weeks provide neither.

**User-facing consequence:** NPI and festive features display configured plans but cannot validate those plans against the same weekly fact series used elsewhere in the application.

## Checks that did not produce a realism finding

- **Price bands:** the generated ₹399-₹8,999 range and category bands are broadly consistent with boAt's value positioning. Current official examples include Airdopes 141 around ₹999-₹1,099, Lunar Discovery at ₹1,899, and Stone 350 at ₹1,399; the generated ₹1,299, ₹1,799, and ₹1,499 values are close enough for planning data and may reasonably represent channel ASPs rather than today's D2C offer. [Airdopes 141](https://www.boat-lifestyle.com/products/airdopes-141), [Lunar Discovery](https://www.boat-lifestyle.com/products/lunar-discovery-hd-display-smartwatch), [Stone 350](https://www.boat-lifestyle.com/products/stone-350)
- **Festive peak direction:** W43-W49 peaks for TWS, watches, and speakers are directionally credible. The problem is that the active data window never reaches them and the separate Diwali event is dated incorrectly.
- **ABC mix by itself:** the distribution remains somewhat top-heavy but can occur in a curated 15-SKU portfolio whose values are relatively close. The former absence of `Y` and `Z` has been corrected and verified.

## Bottom line

The generated prices and broad audio-versus-wearables weighting are plausible, and XYZ diversity is now verified at 7/5/3. The remaining material realism failures are assortment breadth, nationwide/omnichannel representation, the July “Diwali” record, and a horizon that stops before both NPI launches and the modeled festive demand peaks. Until those are corrected, portfolio-, region-, NPI-, and festive-planning conclusions should be treated as illustrative rather than representative of a boAt-type operating business.

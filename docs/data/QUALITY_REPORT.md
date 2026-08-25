# Dummy Data Realism Quality Report

Re-audited on **2026-08-14 (Asia/Calcutta)** after expanding and regenerating the deterministic demo dataset. This report distinguishes presentation-sized realism from production-scale completeness: the catalog is deliberately curated so it remains practical to demonstrate.

## Executive finding

Four original realism findings are now resolved in the generated JSON and configured MongoDB collections. The separate 26-week history limitation remains open.

| Original finding | Status | Stored verification |
|---|---|---|
| Portfolio breadth was limited to 15 SKUs | **Resolved 2026-08-14** | 21 selling SKUs across seven categories, with budget/mid/premium ladders in the core TWS, wearable, and audio families |
| Five distributors did not support nationwide claims | **Resolved 2026-08-14** | Eight distributors across North, South, West, East, Central, and Northeast; every record has `regionId`, headquarters city, and state coverage |
| Festive-event timing was unverified or contradictory | **Resolved 2026-08-14** | Ten canonical `demand_events`; Republic Day, Holi, IPL, Summer, Prime Day, Independence Day, Dussehra/Diwali, and year-end windows align with the 2026 calendar |
| XYZ segmentation previously collapsed | **Resolved 2026-08-14, reverified after expansion** | 21 policies: 9 `X`, 8 `Y`, and 4 `Z`; all three variability paths remain populated |
| The operational history is only 26 weeks | **Open** | The planning calendar is 157 weeks, but historical actuals still cover 26 operational weeks |

## 1. Portfolio breadth — resolved with a presentation-sized expansion

The generator now contains **21 selling SKUs**, up from 15. Six additions use the existing `SKU-BOAT-*` identity, lifecycle, deterministic variability, and seeded-demand conventions; no parallel generation pattern was introduced.

| Category | SKU count | Demonstrable price ladder |
|---|---:|---|
| TWS Earbuds | 5 | ₹899, ₹1,299, ₹1,999, ₹2,499 |
| Neckbands | 3 | ₹999, ₹1,299, ₹1,499 |
| Smartwatches | 4 | ₹1,799, ₹3,299, ₹4,999 |
| Portable Speakers | 3 | ₹1,499, ₹5,999, ₹8,999 |
| Wired Audio | 3 | ₹399, ₹599, ₹699 |
| Wireless Headphones | 2 | ₹1,499, ₹3,999 |
| Soundbars | 1 | ₹7,999 home-audio anchor |

The added presentation products are Airdopes Alpha, Nirvana Ion, Rockerz 450, Nirvana 751 ANC, Lunar Embrace, and Aavante Bar 2400. This broadens TWS, headphones, wearables, and home audio without turning the demo into an unmanageable full assortment.

The mix is directionally consistent with Imagine Marketing's disclosed emphasis on personal audio, large audio, and wearables, while remaining a curated sample rather than a claim that 21 records represent the full commercial catalog. [Imagine Marketing prospectus](https://images.moneycontrol.com/news_html_files/pdffiles/Oct2025/imagine-marketing.pdf)

**Verification:** `sop_skus` contains 21 unique IDs and seven categories in both `output/` and MongoDB.

## 2. Distributor geography — resolved

The generator now contains **eight distributor records** with real geographic attributes instead of merely increasing the count.

| Distributor | Region | Headquarters | Representative coverage |
|---|---|---|---|
| DST-001 / DST-003 | North | Delhi / Jaipur | Delhi, Haryana, Punjab, UP, Rajasthan, Uttarakhand, Himachal Pradesh |
| DST-002 / DST-005 | West | Mumbai / Ahmedabad | Maharashtra, Goa, Gujarat |
| DST-004 | South | Bengaluru | Karnataka, Tamil Nadu, Kerala, Telangana, Andhra Pradesh |
| DST-006 | East | Kolkata | West Bengal, Odisha, Bihar, Jharkhand |
| DST-007 | Central | Nagpur | Madhya Pradesh, Chhattisgarh, Vidarbha |
| DST-008 | Northeast | Guwahati | Assam and the other seven Northeast states including Sikkim |

Each canonical row now carries `region`, `regionId`, `headquartersCity`, `primaryStates`, and `coverageType`. The same eight distributors propagate into 4,368 SKU-distributor-week facts, 168 listings, 168 channel-inventory norms, eight integration records, 80 dealers, and downstream planning entities.

The records are explicitly a sampled territorial network, not a claim to reproduce boAt's entire disclosed distributor base. The sample now supports nationwide regional cuts without omitting East, Central, or Northeast India.

**Verification:** `sop_distributors` contains eight IDs, six distinct regions, and zero records missing required geography tags in both generated output and MongoDB.

## 3. Indian promotional seasonality — resolved

The canonical event calendar was checked against dated 2026 sources and corrected at ISO-week grain.

| Canonical event | Stored weeks | Evidence and decision |
|---|---|---|
| Republic Day Audio Sale | W03–W04 | Corrected from W04–W05; Amazon's 2026 sale began January 16, within W03. [Amazon India](https://www.aboutamazon.in/news/retail/amazon-great-republic-day-sale-2026) |
| Holi Colour & Sound Sale | W09–W10 | Added; Holi was March 4, 2026, in W10, with one lead-in week. [Government 2026 calendar](https://www.aptel.gov.in/sites/default/files/uploads/Calender%20Updated_2%20conv.pdf) |
| IPL Entertainment Season | W13–W22 | Added; the season ran from March 28 through the May 24 league close, followed by playoffs. [BCCI/IPL first phase](https://www.iplt20.com/news/4249/bcci-announces-schedule-for-first-phase-of-tata-ipl-2026), [official schedule](https://documents.iplt20.com/bcci/documents/1774332251856_1773233174530_TATA-IPL-Schedule-2026.pdf) |
| Summer Audio Days | W19–W20 | Moved from W16–W18; Amazon's Great Summer Sale began May 8 in W19. [Amazon India](https://www.aboutamazon.in/news/retail/amazon-great-summer-sale) |
| E-commerce Prime Days | W27–W28 | Corrected from W29–W30; Prime Day ran July 4–6 across W27–W28. [Amazon India](https://www.aboutamazon.in/news/amazon-prime/prime-day-2026) |
| Independence Day Sale | W32–W33 | Retained; the 2026 Great Freedom Sale began August 7 and Independence Day was August 15. [Amazon India](https://www.aboutamazon.in/news/retail/amazon-great-freedom-sale) |
| Festive Marketplace / Dussehra | W40–W44 | Retained as late-September build and October campaign; Dussehra was October 20 in W43. [India Post holiday list](https://www.indiapost.gov.in/holidays-list) |
| Diwali Audio Festival | W45–W47 | Retained after the earlier July defect had already been corrected; Diwali was November 8 in W45. [India Post holiday list](https://www.indiapost.gov.in/holidays-list) |
| Year-end Gifting | W51–W52 | Retained as the Christmas/year-end gifting and clearance window. |

Event magnitudes remain deterministic demo assumptions, but their relative intensity is deliberate: IPL is a modest 10% scoped uplift, Holi 14%, Republic Day 18%, Independence Day 20%, and Diwali 34%. Canonical `upliftShape`, `stackingGroup`, caps, SKU/category scope, and channel/region scope remain intact and are applied to generated demand.

**Verification:** MongoDB contains the ten expected `demand_events` with exact week ranges; Holi and IPL are present, and the corrected Republic Day, Summer, and Prime Day ranges match the generated JSON.

## 4. ABC/XYZ segmentation — resolved and reverified

FIX-A was rerun after expansion. Classes continue to be calculated from generated consumption value and coefficient of variation; the generator does not assign the final class directly.

| Dimension | Stored 21-policy mix |
|---|---|
| ABC | **13 A, 4 B, 4 C** |
| XYZ | **9 X, 8 Y, 4 Z** |
| Combined segments | 7 AX, 6 AY, 2 BX, 1 BY, 1 BZ, 1 CY, 3 CZ |

The six new products contribute stable, variable, and intermittent profiles, so the expansion produced a more varied portfolio rather than simply adding X-class volume. `migrate_xyz_segmentation.js` now derives expected row counts from the generated SKU, distributor, and week collections instead of retaining the former 15 × 5 constants.

**Verification:** the migration updated 4,368 `sop_weekly` facts and 21 `inventory_policies`; a direct MongoDB query returned `X=9`, `Y=8`, and `Z=4`.

## 5. Remaining limitation: 26-week operational history

The expansion intentionally did not restyle or inflate the history window. `sop_weekly` still provides 26 actual weeks while `sop_planning_weeks` supplies a 157-week planning calendar. Future work can add at least one full annual actual cycle if the presentation needs realized festive and NPI year-over-year comparisons.

## Bottom line

The demo is now materially more representative without becoming unwieldy: 21 recognizable products, seven categories, eight geographically credible distributor samples, and a source-checked Indian promotional calendar. Stored ABC/XYZ policies remain diverse at 13/4/4 and 9/8/4. Only the separately documented historical-depth limitation remains open.

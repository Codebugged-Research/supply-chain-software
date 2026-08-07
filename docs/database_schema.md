# Supply Planning System: Business Schema Specification

**Role:** Principal Supply Chain Data Architect  
**Scope:** Complete enterprise business schema specification for all 18 approved collections across 8 Supply Planning domains.  
**Strict Compliance:** Zero code generation, zero collection additions, zero collection deletions, exact property preservation.

---

## DOMAIN 1 — Product

### 1. `product_master`
*Primary business catalog defining physical and logical SKU attributes.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System-generated immutable primary key. |
| `skuCode` | String | Yes | Regex `^[A-Z0-9_-]{3,30}$` | Unique Stock Keeping Unit code | `"SKU-FG-1001"` | None | Unique Index | None | Primary business key; immutable once transacted. |
| `skuName` | String | Yes | Length 3–150 chars | Full product commercial name | `"Smart LED TV 55 Inch"` | None | None | None | Descriptive name for UI and reporting. |
| `shortName` | String | No | Max length 50 chars | Abbreviated SKU name | `"SmartTV 55"` | `null` | None | None | Used for mobile apps and compressed tabular reports. |
| `brand` | String | Yes | Min length 2 chars | Commercial brand umbrella | `"Lava"` | None | Compound Index | None | Grouping attribute for macro portfolio analytics. |
| `category` | String | Yes | Non-empty string | Highest product category | `"Electronics"` | None | Compound Index | None | Top-level aggregation bucket for demand consolidation. |
| `subCategory` | String | Yes | Non-empty string | Secondary category tag | `"Televisions"` | None | Compound Index | None | Mid-level hierarchy filter for inventory segmentation. |
| `productFamily` | String | No | String | Related platform family | `"Display Series"` | `null` | None | None | Identifies shared platform components in MRP explosion. |
| `productSeries` | String | No | String | Generation or design series | `"Z-Series 2026"` | `null` | None | None | Used for NPI and phase-in/phase-out planning. |
| `modelNumber` | String | No | Alphanumeric | Manufacturer model code | `"LV-55-4K"` | `null` | None | None | Maps internal SKU to vendor commercial model numbers. |
| `color` | String | No | String | Product color variant | `"Midnight Black"` | `null` | None | None | Aesthetic variant attribute for FG items. |
| `variant` | String | No | String | Technical configuration | `"128GB / 8GB RAM"` | `null` | None | None | Spec differentiation descriptor. |
| `technologyGeneration` | String | No | Enum: `["5G","4G","OLED","LED","GEN3"]` | Tech stack generation | `"OLED-4K"` | `null` | None | None | Used for tech migration and cannibalization models. |
| `replacementSku` | String | No | Valid `skuCode` format | Superseding SKU code | `"SKU-FG-1002"` | `null` | None | `product_master` | Required when `lifecycleStage` is `"EOL"`. |
| `barcode` | String | No | Regex `^\d{12,13}$` | EAN-13 / UPC Barcode | `"8901234567890"` | `null` | Sparse Unique | None | Must be globally unique if assigned. |
| `hsnCode` | String | Yes | 4 to 8 digit numeric string | Harmonized System Code | `"852872"` | None | None | None | Statutory requirement for customs and GST. |
| `unitOfMeasure` | String | Yes | Enum: `["EA","KG","LTR","BOX","PALLET"]` | Base stock unit of measure | `"EA"` | `"EA"` | None | None | Standard UOM for all inventory balances and MRP netting. |
| `lifecycleStage` | String | Yes | Enum: `["NPI","GROWTH","MATURE","DECLINE","EOL"]` | Lifecycle phase | `"GROWTH"` | `"GROWTH"` | None | None | Controls forecast engine weighting and safety stock buffer. |
| `launchDate` | Date | Yes | Valid ISO Date | Market launch date | `2025-01-15` | Current Date | None | None | Must be `<= plannedEOLDate`. |
| `plannedEOLDate` | Date | No | Valid ISO Date | Planned End-of-Life date | `2028-12-31` | `null` | None | None | Triggers phase-out alerts if current date > EOL. |
| `warrantyMonths` | Number | No | Integer 0 to 120 | Warranty duration | `24` | `12` | None | None | Warranty reserve planning parameter. |
| `status` | String | Yes | Enum: `["ACTIVE","INACTIVE","DISCONTINUED"]` | Master operational status | `"ACTIVE"` | `"ACTIVE"` | Compound Index | None | Only `"ACTIVE"` SKUs are processed by MRP engines. |
| `createdAt` | Date | Yes | ISO Timestamp | Document creation timestamp | `2026-01-01T10:00:00Z` | `now()` | None | None | System timestamp; immutable. |
| `updatedAt` | Date | Yes | ISO Timestamp | Document update timestamp | `2026-07-28T17:00:00Z` | `now()` | None | None | Updated on any field modification. |

---

### 2. `product_planning`
*Planning parameters and replenishment rules driving MRP runs.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `skuCode` | String | Yes | Foreign key to `product_master` | Target SKU identifier | `"SKU-FG-1001"` | None | Unique Index | `product_master` | 1:1 strict mapping with `product_master`. |
| `abcClass` | String | Yes | Enum: `["A","B","C"]` | Value-based inventory class | `"A"` | `"B"` | Compound Index | None | Driven by 80/15/5 revenue/volume distribution. |
| `xyzClass` | String | Yes | Enum: `["X","Y","Z"]` | Demand variability class | `"X"` | `"Y"` | Compound Index | None | X=Low variability, Z=High variability; adjusts safety stock. |
| `planningStrategy` | String | Yes | Enum: `["MTS","MTO","ATO","ETO"]` | Supply fulfillment strategy | `"MTS"` | `"MTS"` | None | None | Dictates whether forecast or customer orders trigger MRP. |
| `planningPriority` | Number | Yes | Integer 1 to 100 | Priority rank during supply shortages | `1` | `50` | None | None | Lower values get inventory allocation precedence. |
| `planningFenceDays` | Number | Yes | Integer >= 0 | System freeze window (days) | `14` | `7` | None | None | MRP engine cannot alter planned orders within this window. |
| `demandTimeFenceDays` | Number | Yes | Integer >= 0 | Forecast override window (days) | `7` | `3` | None | None | Inside this window, firm customer orders replace forecast. |
| `safetyStockDays` | Number | Yes | Decimal >= 0 | Target safety stock in days of supply | `15.0` | `10.0` | None | None | Used to compute dynamic dynamic safety stock targets. |
| `reorderPointUnits` | Number | Yes | Integer >= 0 | Reorder point stock trigger level | `500` | `0` | None | None | Minimum inventory level that triggers replenishment order. |
| `reorderQuantity` | Number | Yes | Integer > 0 | Standard reorder batch size | `1000` | `1` | None | None | Fixed order quantity for batch replenishment. |
| `minimumOrderQuantity` | Number | Yes | Integer > 0 | Minimum acceptable order batch | `250` | `1` | None | None | Hard minimum for any generated planned production/PO. |
| `maximumInventoryUnits` | Number | No | Integer > `reorderPointUnits` | Max warehouse holding ceiling | `5000` | `null` | None | None | Generates overstock alerts in `supply_constraints`. |
| `targetServiceLevel` | Number | Yes | Decimal 80.0 to 99.9 | Service fill rate target (%) | `98.5` | `95.0` | None | None | Inputs directly into statistical safety stock formula. |
| `forecastConsumptionMethod` | String | Yes | Enum: `["FORWARD","BACKWARD","BOTH"]` | Direction for forecast netting | `"BOTH"` | `"BOTH"` | None | None | Determines how open orders consume weekly forecasts. |
| `plannerName` | String | No | Non-empty string | Assigned planner individual | `"Rajesh Kumar"` | `null` | Compound Index | None | Person responsible for resolving exceptions. |
| `plannerGroup` | String | Yes | String code | Operational planning group | `"PLN-GRP-ELE"` | `"DEFAULT"` | Compound Index | None | Dashboard queue assignment key. |
| `planningCalendar` | String | Yes | Enum: `["5_DAY","6_DAY","7_DAY"]` | Operational weekly calendar | `"6_DAY"` | `"6_DAY"` | None | None | Defines working days available for lead time netting. |

---

### 3. `product_pricing`
*Financial cost baselines and valuation parameters.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `skuCode` | String | Yes | Foreign key to `product_master` | Target SKU identifier | `"SKU-FG-1001"` | None | Compound Unique | `product_master` | Compound unique index with `effectiveFrom`. |
| `standardCost` | Number | Yes | Decimal >= 0 | Standard accounting cost per UOM | `120.50` | `0.00` | None | None | Valuation baseline for financial inventory balance. |
| `manufacturingCost` | Number | Yes | Decimal >= 0 | Internal direct production cost | `95.00` | `0.00` | None | None | BOM component cost + direct routing labor. |
| `landedCost` | Number | Yes | Decimal >= 0 | Total cost including freight & tariffs | `135.20` | `0.00` | None | None | Purchase price + freight + customs duties. |
| `transferPrice` | Number | No | Decimal >= 0 | Inter-company transfer price | `145.00` | `null` | None | None | Used for inter-plant or cross-border stock movements. |
| `mrp` | Number | Yes | Decimal > `standardCost` | Maximum Retail Price | `299.00` | `0.00` | None | None | Statutory maximum consumer price tag. |
| `averageSellingPrice` | Number | Yes | Decimal > 0 | Realized net selling price | `220.00` | `0.00` | None | None | Used to compute projected revenue in `supply_plan`. |
| `targetMarginPercent` | Number | Yes | Decimal 0.0 to 100.0 | Target gross profit margin % | `35.5` | `20.0` | None | None | Minimum acceptable commercial margin. |
| `currency` | String | Yes | ISO 4217 3-letter code | Currency code | `"INR"` | `"INR"` | None | None | Base functional currency for financial evaluations. |
| `effectiveFrom` | Date | Yes | Valid ISO Date | Date price becomes effective | `2026-01-01` | Current Date | Compound Unique | None | Active price selected where `effectiveFrom <= planDate`. |

---

### 4. `product_logistics`
*Physical dimensions, weight, packaging hierarchy, and handling constraints.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `skuCode` | String | Yes | Foreign key to `product_master` | Target SKU identifier | `"SKU-FG-1001"` | None | Unique Index | `product_master` | 1:1 strict mapping with `product_master`. |
| `netWeightKg` | Number | Yes | Decimal > 0 | Net weight per unit (kg) | `1.25` | `0.0` | None | None | Weight without primary packaging. |
| `grossWeightKg` | Number | Yes | Decimal > `netWeightKg` | Gross unit weight (kg) | `1.45` | `0.0` | None | None | Used for freight gross tonnage calculation. |
| `productLengthCm` | Number | Yes | Decimal > 0 | Single unit length (cm) | `25.0` | `0.0` | None | None | Unit physical length. |
| `productWidthCm` | Number | Yes | Decimal > 0 | Single unit width (cm) | `15.0` | `0.0` | None | None | Unit physical width. |
| `productHeightCm` | Number | Yes | Decimal > 0 | Single unit height (cm) | `10.0` | `0.0` | None | None | Unit physical height. |
| `productVolume` | Number | Yes | Decimal > 0 | Volume in cubic meters (m³) | `0.00375` | `0.0` | None | None | Calculated as `(L*W*H)/1,000,000` or specified. |
| `cartonQuantity` | Number | Yes | Integer >= 1 | Units per master carton | `24` | `1` | None | None | Master carton pack factor. |
| `cartonLength` | Number | Yes | Decimal > 0 | Carton length (cm) | `60.0` | `0.0` | None | None | Carton dimension for truckload packing. |
| `cartonWidth` | Number | Yes | Decimal > 0 | Carton width (cm) | `40.0` | `0.0` | None | None | Carton dimension for truckload packing. |
| `cartonHeight` | Number | Yes | Decimal > 0 | Carton height (cm) | `30.0` | `0.0` | None | None | Carton dimension for truckload packing. |
| `cartonWeight` | Number | Yes | Decimal > 0 | Master carton gross weight (kg) | `36.5` | `0.0` | None | None | Total weight per full master carton. |
| `palletQuantity` | Number | Yes | Integer >= `cartonQuantity` | Total units per pallet | `480` | `1` | None | None | Pallet layer and height capacity unit count. |
| `stackLimit` | Number | Yes | Integer 1 to 20 | Stacking limit (cartons/pallets) | `5` | `3` | None | None | Maximum vertical stacking allowed for storage safety. |
| `fragile` | Boolean | Yes | Boolean | Fragile item flag | `false` | `false` | None | None | Triggers protective packaging & insurance flag. |
| `hazardousMaterial` | Boolean | Yes | Boolean | Hazmat material flag | `false` | `false` | Compound Index | None | Requires specialized certified storage facilities. |
| `storageCondition` | String | Yes | Enum: `["AMBIENT","COLD_STORAGE","HAZMAT","SECURE_VAULT"]` | Environmental storage class | `"AMBIENT"` | `"AMBIENT"` | Compound Index | None | Determines node allocation feasibility in `warehouse_master`. |

---

## DOMAIN 2 — Supply Network

### 5. `plant_master`
*Manufacturing plant locations, shift capacity, and operational calendars.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `plantCode` | String | Yes | Regex `^[A-Z0-9_-]{3,10}$` | Unique plant location code | `"PLANT-NOIDA"` | None | Unique Index | None | Business key for factory facilities. |
| `plantName` | String | Yes | Length 3–100 chars | Plant facility name | `"Noida Electronics Plant"` | None | None | None | Descriptive name. |
| `country` | String | Yes | ISO 2-letter country code | Country code | `"IN"` | `"IN"` | Compound Index | None | Geographic jurisdiction. |
| `state` | String | Yes | Non-empty string | State / Province | `"Uttar Pradesh"` | None | None | None | Regional location tag. |
| `city` | String | Yes | Non-empty string | City location | `"Noida"` | None | None | None | City location tag. |
| `timezone` | String | Yes | IANA Timezone string | Operational timezone | `"Asia/Kolkata"` | `"Asia/Kolkata"` | None | None | Used to adjust shift start/end times in MRP. |
| `workingDays` | Number | Yes | Integer 1 to 7 | Operating days per week | `6` | `6` | None | None | Defines factory operating week calendar. |
| `workingShifts` | Number | Yes | Integer 1 to 3 | Operating shifts per day | `2` | `2` | None | None | Defines daily capacity availability window. |
| `dailyCapacity` | Number | Yes | Integer > 0 | Aggregate daily plant capacity (units) | `50000` | `0` | None | None | Plant-level upper limit for daily aggregate output. |
| `weeklyCapacity` | Number | Yes | Integer >= `dailyCapacity` | Aggregate weekly capacity (units) | `300000` | `0` | None | None | Calculated as `dailyCapacity * workingDays`. |
| `status` | String | Yes | Enum: `["ACTIVE","MAINTENANCE","INACTIVE"]` | Operational plant status | `"ACTIVE"` | `"ACTIVE"` | Compound Index | None | Inactive/Maintenance plants cannot receive planned orders. |

---

### 6. `warehouse_master`
*Distribution centers, warehouses, and storage capacity parameters.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `warehouseCode` | String | Yes | Regex `^[A-Z0-9_-]{3,10}$` | Unique warehouse code | `"WH-DELHI-01"` | None | Unique Index | None | Business primary key for warehouse nodes. |
| `warehouseName` | String | Yes | Length 3–100 chars | Warehouse facility name | `"North Delhi Main DC"` | None | None | None | Full facility name. |
| `warehouseType` | String | Yes | Enum: `["CENTRAL_DC","REGIONAL_DC","PLANT_WH","3PL"]` | Facility type classification | `"CENTRAL_DC"` | `"REGIONAL_DC"` | Compound Index | None | Dictates replenishment tier in distribution network. |
| `country` | String | Yes | ISO 2-letter code | Country code | `"IN"` | `"IN"` | None | None | Geographic country location. |
| `state` | String | Yes | Non-empty string | State / Province | `"Delhi"` | None | None | None | State location. |
| `city` | String | Yes | Non-empty string | City location | `"New Delhi"` | None | None | None | City location. |
| `capacityUnits` | Number | Yes | Positive integer > 0 | Total storage capacity (units/pallets) | `100000` | `0` | None | None | Hard upper bound for stock holding calculations. |
| `storageCost` | Number | Yes | Decimal >= 0 | Holding cost per unit per day | `0.50` | `0.00` | None | None | Used in optimization solvers for holding cost penalty. |
| `status` | String | Yes | Enum: `["ACTIVE","FULL","INACTIVE"]` | Operational warehouse status | `"ACTIVE"` | `"ACTIVE"` | Compound Index | None | When status is `"FULL"`, no inbound planned purchase routed. |

---

### 7. `supplier_master`
*Vendor master details, default lead times, and performance ratings.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `supplierCode` | String | Yes | Regex `^[A-Z0-9_-]{3,15}$` | Unique supplier vendor code | `"SUP-GLOBAL-01"` | None | Unique Index | None | Business key for commercial vendors. |
| `supplierName` | String | Yes | Length 3–150 chars | Legal supplier corporate name | `"Global Electronics Ltd"` | None | None | None | Full vendor commercial name. |
| `country` | String | Yes | ISO 2-letter code | Supplier country location | `"TW"` | None | None | None | Used for international import lead-time calculations. |
| `city` | String | Yes | Non-empty string | Supplier city location | `"Taipei"` | None | None | None | Vendor dispatch origin location. |
| `contactPerson` | String | No | String | Primary account representative | `"Chen Wei"` | `null` | None | None | Operational vendor point of contact. |
| `rating` | Number | Yes | Decimal 1.0 to 5.0 | Supplier performance rating | `4.8` | `3.0` | Compound Index | None | Tier 1 vendors prioritised in auto-sourcing engine. |
| `qualityScore` | Number | Yes | Decimal 0.0 to 100.0 | Quality acceptance score (%) | `99.2` | `90.0` | None | None | Defect rate indicator affecting safety stock calculation. |
| `onTimeDelivery` | Number | Yes | Decimal 0.0 to 100.0 | Historical OTD fulfillment % | `95.5` | `85.0` | None | None | OTD failure increases effective supplier lead time. |
| `defaultLeadTimeDays` | Number | Yes | Integer > 0 | Default baseline lead time (days) | `30` | `14` | None | None | Fallback lead time if SKU mapping missing. |
| `status` | String | Yes | Enum: `["APPROVED","BLACK_LISTED","UNDER_REVIEW"]` | Commercial vendor status | `"APPROVED"` | `"APPROVED"` | Compound Index | None | Only `"APPROVED"` vendors can be issued POs. |

---

### 8. `customer_channel_master`
*Sales channel hierarchy, target inventory cover, and fulfillment priority.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `channelCode` | String | Yes | Regex `^[A-Z0-9_-]{2,10}$` | Unique channel identifier | `"CH-AMAZON"` | None | Unique Index | None | Primary key for demand fulfillment channels. |
| `channelName` | String | Yes | Length 2–100 chars | Commercial channel name | `"Amazon E-Commerce"` | None | None | None | Full channel display name. |
| `channelType` | String | Yes | Enum: `["ECOMMERCE","MODERN_TRADE","GENERAL_TRADE","EXPORTS"]` | Commercial channel category | `"ECOMMERCE"` | `"GENERAL_TRADE"` | Compound Index | None | Categorizes demand stream characteristics. |
| `priority` | Number | Yes | Integer 1 to 10 | Order allocation priority | `1` | `5` | Compound Index | None | Priority 1 channels get stock allocation first in shortage. |
| `serviceLevel` | Number | Yes | Decimal 80.0 to 99.9 | Channel target fill rate (%) | `99.0` | `95.0` | None | None | Channel-specific service level SLA. |
| `defaultInventoryDays` | Number | Yes | Integer >= 0 | Target channel inventory buffer (days) | `14` | `7` | None | None | Target channel forward coverage days. |
| `status` | String | Yes | Enum: `["ACTIVE","INACTIVE"]` | Commercial status of channel | `"ACTIVE"` | `"ACTIVE"` | None | None | Inactive channels excluded from consensus forecast netting. |

---

## DOMAIN 3 — Mapping Collections

### 9. `supplier_product_mapping`
*Sourcing matrix mapping SKUs to vendors with pricing, lead time, and MOQs.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `supplierCode` | String | Yes | Foreign key to `supplier_master` | Supplier identification code | `"SUP-GLOBAL-01"` | None | Unique Compound | `supplier_master` | Foreign key referencing active supplier. |
| `skuCode` | String | Yes | Foreign key to `product_master` | SKU identification code | `"SKU-FG-1001"` | None | Unique & Sourcing Compound | `product_master` | Foreign key referencing active SKU. |
| `supplierSku` | String | No | String | Supplier's internal SKU code | `"TW-PART-9981"` | `null` | None | None | Used on printed Purchase Orders. |
| `leadTimeDays` | Number | Yes | Integer > 0 | Purchasing lead time (days) | `21` | `14` | None | None | Specific lead time for MRP purchase order offset. |
| `minimumOrderQuantity` | Number | Yes | Integer > 0 | Minimum order quantity (MOQ) | `500` | `1` | None | None | MRP rounds planned POs up to this minimum. |
| `orderMultiple` | Number | Yes | Integer > 0 | Lot size multiple | `100` | `1` | None | None | MRP rounds planned PO increments to this batch multiple. |
| `purchasePrice` | Number | Yes | Decimal > 0 | Contracting unit purchase price | `45.50` | `0.00` | None | None | Unit cost used for PO financial valuation. |
| `preferredSupplier` | Boolean | Yes | Boolean | Primary vendor flag for SKU | `true` | `false` | Compound Index | None | MRP selects `preferredSupplier = true` vendor first. |
| `maximumSupplyCapacity` | Number | Yes | Integer > 0 | Monthly capacity limit (units) | `50000` | `999999` | None | None | Caps total PO allocation to vendor per month. |
| `status` | String | Yes | Enum: `["ACTIVE","SUSPENDED"]` | Mapping operational status | `"ACTIVE"` | `"ACTIVE"` | Compound Index | None | Only `"ACTIVE"` mappings evaluated by MRP. |

---

### 10. `plant_product_mapping`
*Manufacturing qualification matrix mapping SKUs to plant production lines.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `plantCode` | String | Yes | Foreign key to `plant_master` | Plant identification code | `"PLANT-NOIDA"` | None | Unique Compound | `plant_master` | Must reference valid active plant. |
| `skuCode` | String | Yes | Foreign key to `product_master` | SKU identification code | `"SKU-FG-1001"` | None | Unique Compound | `product_master` | Must reference valid active SKU. |
| `productionLine` | String | Yes | String code | Designated assembly line | `"LINE-OLED-01"` | None | Unique Compound | None | Line-level routing assignment. |
| `dailyCapacity` | Number | Yes | Integer > 0 | Line daily capacity (units) | `2000` | `0` | None | None | Upper capacity limit per 24 hours on line. |
| `weeklyCapacity` | Number | Yes | Integer >= `dailyCapacity` | Line weekly capacity (units) | `12000` | `0` | None | None | Calculated as `dailyCapacity * plant workingDays`. |
| `productionRate` | Number | Yes | Decimal > 0 | Output rate (units per hour) | `150.0` | `10.0` | None | None | Used for finite routing shop-floor scheduling. |
| `status` | String | Yes | Enum: `["QUALIFIED","UNDER_QUALIFICATION","QUALIFIED_BACKUP"]` | Line qualification status | `"QUALIFIED"` | `"QUALIFIED"` | Compound Index | None | Only `"QUALIFIED"` lines selected for production. |

---

## DOMAIN 4 — Inventory

### 11. `inventory`
*Real-time stock state, batch tracking, and inventory status breakdown.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `skuCode` | String | Yes | Foreign key to `product_master` | SKU identifier | `"SKU-FG-1001"` | None | Unique & DC Compound | `product_master` | Target SKU identifier. |
| `warehouseCode` | String | No | Foreign key to `warehouse_master` | Storage DC location | `"WH-DELHI-01"` | `null` | Unique & DC Compound | `warehouse_master` | Mandatory if `plantCode` is null. |
| `plantCode` | String | No | Foreign key to `plant_master` | Factory storage location | `"PLANT-NOIDA"` | `null` | Unique Compound | `plant_master` | Mandatory if `warehouseCode` is null. |
| `batchNumber` | String | Yes | Regex `^[A-Z0-9_-]{3,30}$` | Production/receipt batch number | `"BAT-202607-001"` | `"DEFAULT"` | Unique Compound | None | Enables FEFO/FIFO batch tracking. |
| `availableQty` | Number | Yes | Integer >= 0 | Unrestricted stock available for sale/MRP | `1500` | `0` | Compound Index | None | Primary stock quantity used in MRP inventory netting. |
| `reservedQty` | Number | Yes | Integer >= 0 | Stock allocated to firm orders | `200` | `0` | None | None | Stock committed; not available for new MRP netting. |
| `blockedQty` | Number | Yes | Integer >= 0 | Quarantined / damaged stock | `50` | `0` | None | None | Excluded from available inventory balance. |
| `inTransitQty` | Number | Yes | Integer >= 0 | Stock currently in transit between nodes | `300` | `0` | None | None | Inbound stock scheduled to arrive within lead time. |
| `qualityInspectionQty` | Number | Yes | Integer >= 0 | Stock pending QA clearance | `100` | `0` | None | None | Stock awaiting lab clearance before moving to available. |
| `openingQty` | Number | Yes | Integer >= 0 | Period start opening balance | `2000` | `0` | None | None | Snapshot start quantity. |
| `closingQty` | Number | Yes | Integer >= 0 | Current calculated closing balance | `2150` | `0` | None | None | Formula: `available + reserved + blocked + QA`. |
| `lastUpdated` | Date | Yes | ISO Timestamp | Last WMS/ERP sync timestamp | `2026-07-28T16:30:00Z` | `now()` | Single Key Index | None | Used for CDC sync audit and stale stock detection. |

---

## DOMAIN 5 — Manufacturing

### 12. `bom_master`
*Bill of Materials component explosion linkages and usage ratios.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `parentSku` | String | Yes | Foreign key to `product_master` | Parent assembly SKU | `"SKU-FG-1001"` | None | Unique Compound | `product_master` | Parent SKU must exist and be an assembly. |
| `componentSku` | String | Yes | Foreign key to `product_master` | Raw material / Component SKU | `"SKU-RM-5002"` | None | Unique & Reverse Compound | `product_master` | Component SKU cannot equal `parentSku` (no cycles). |
| `quantity` | Number | Yes | Decimal > 0 | Component quantity required per parent | `2.5` | `1.0` | None | None | Quantity consumed per 1 unit of parent SKU output. |
| `unitOfMeasure` | String | Yes | Enum: `["EA","KG","LTR","MTR"]` | Component UOM | `"EA"` | `"EA"` | None | None | Must match component SKU's `unitOfMeasure`. |
| `scrapPercent` | Number | Yes | Decimal 0.0 to 50.0 | Expected material loss percentage | `2.0` | `0.0` | None | None | MRP inflates component requirement by `(1 + scrap/100)`. |
| `isOptional` | Boolean | Yes | Boolean | Optional component flag | `false` | `false` | None | None | Optional items excluded from standard MRP explosion. |
| `effectiveFrom` | Date | Yes | Valid ISO Date | Engineering effectivity start date | `2026-01-01` | Current Date | Unique Compound | None | BOM line valid if `effectiveFrom <= planDate`. |
| `effectiveTo` | Date | No | Valid ISO Date | Engineering effectivity end date | `2027-12-31` | `null` | None | None | If populated, BOM line invalid if `planDate > effectiveTo`. |

---

### 13. `production_orders`
*Factory work order schedule tracking planned vs produced quantities.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `productionOrderNo` | String | Yes | Regex `^PO-[A-Z0-9]{8,15}$` | Unique work order number | `"PO-202607-0089"` | None | Unique Index | None | Business primary key for work orders. |
| `skuCode` | String | Yes | Foreign key to `product_master` | Manufactured SKU | `"SKU-FG-1001"` | None | Plant & SKU Compound | `product_master` | Target SKU to be manufactured. |
| `plantCode` | String | Yes | Foreign key to `plant_master` | Manufacturing plant facility | `"PLANT-NOIDA"` | None | Plant Compound | `plant_master` | Producing facility location. |
| `plannedQty` | Number | Yes | Integer > 0 | Targeted manufacturing quantity | `1000` | `0` | None | None | Ordered output batch size. |
| `producedQty` | Number | Yes | Integer >= 0 | Actual completed quantity | `750` | `0` | None | None | Completed quantity posted from MES/ERP. |
| `startDate` | Date | Yes | Valid ISO Date | Scheduled start timestamp | `2026-08-01T06:00:00Z` | Current Date | Plant Compound | None | Manufacturing scheduled commencement date. |
| `endDate` | Date | Yes | Valid ISO Date >= `startDate` | Scheduled completion timestamp | `2026-08-03T18:00:00Z` | Current Date | SKU Compound | None | Scheduled completion date for MRP receipt netting. |
| `status` | String | Yes | Enum: `["PLANNED","RELEASED","IN_PROGRESS","COMPLETED","CANCELLED"]` | Order execution status | `"RELEASED"` | `"PLANNED"` | Plant & SKU Compound | None | Status `"COMPLETED"` updates `inventory` and closes order. |

---

## DOMAIN 6 — Procurement

### 14. `purchase_orders`
*Vendor purchase order lines tracking open inbound supply pipeline.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `poNumber` | String | Yes | Regex `^PUR-[A-Z0-9]{8,15}$` | Unique purchase order number | `"PUR-202607-0412"` | None | Unique Compound | None | Business key for purchasing transactions. |
| `supplierCode` | String | Yes | Foreign key to `supplier_master` | Vendor code | `"SUP-GLOBAL-01"` | None | Vendor Compound | `supplier_master` | Purchasing vendor. |
| `skuCode` | String | Yes | Foreign key to `product_master` | Ordered raw material / component SKU | `"SKU-RM-5002"` | None | Unique & SKU Compound | `product_master` | Foreign key referencing target SKU. |
| `orderedQty` | Number | Yes | Integer > 0 | Total ordered quantity | `5000` | `0` | None | None | Must comply with vendor MOQ and multiples. |
| `receivedQty` | Number | Yes | Integer >= 0 | Total received quantity at DC | `2000` | `0` | None | None | Quantity received via GRN (Goods Receipt Note). |
| `expectedDeliveryDate` | Date | Yes | Valid ISO Date | Promised delivery date | `2026-08-10` | Current Date | Vendor & SKU Compound | None | Scheduled inbound receipt date used in MRP netting. |
| `status` | String | Yes | Enum: `["DRAFT","CONFIRMED","PARTIALLY_RECEIVED","CLOSED","CANCELLED"]` | PO line status | `"CONFIRMED"` | `"DRAFT"` | Vendor & SKU Compound | None | Open POs (`orderedQty - receivedQty`) act as scheduled receipts. |

---

## DOMAIN 7 — Demand Planning (Read-Only Input)

### 15. `consensus_forecast`
*Unconstrained consensus demand plan feeding MRP gross demand.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `skuCode` | String | Yes | Foreign key to `product_master` | Target SKU identifier | `"SKU-FG-1001"` | None | Unique & Week Compound | `product_master` | Foreign key referencing active SKU. |
| `location` | String | Yes | Valid plantCode or warehouseCode | Target demand node | `"WH-DELHI-01"` | None | Unique Compound | `warehouse_master` / `plant_master` | Node where demand is anticipated. |
| `week` | String | Yes | Format `YYYY-Www` (e.g. `2026-W31`) | Calendar planning week bucket | `"2026-W31"` | None | Unique & Week Compound | None | Time bucket key for MRP horizon explosion. |
| `forecastQty` | Number | Yes | Integer >= 0 | Gross forecast demand quantity | `1200` | `0` | None | None | Baseline gross demand input for MRP netting engine. |
| `forecastVersion` | String | Yes | Format `vX.Y` | Version tag | `"v1.0"` | `"v1.0"` | Unique Compound | None | Approved baseline forecast version identifier. |
| `approvedBy` | String | Yes | Email / Username string | S&OP approving officer | `"vp.supplychain@company.com"` | None | None | None | Governance compliance audit tag. |
| `approvedDate` | Date | Yes | Valid ISO Date | Approval timestamp | `2026-07-25T14:00:00Z` | Current Date | None | None | Read-only once approved. |

---

## DOMAIN 8 — Supply Planning Outputs

### 16. `supply_plan`
*Time-phased MRP projected balance sheet and generated planned orders.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `skuCode` | String | Yes | Foreign key to `product_master` | Target SKU identifier | `"SKU-FG-1001"` | None | Unique & Shortage Compound | `product_master` | Target SKU. |
| `week` | String | Yes | Format `YYYY-Www` | Calendar week bucket | `"2026-W31"` | None | Unique & Plant/WH Compound | None | Planning time bucket. |
| `plantCode` | String | No | Foreign key to `plant_master` | Planned production facility | `"PLANT-NOIDA"` | `null` | Unique & Plant Compound | `plant_master` | Mandatory if `plannedProduction > 0`. |
| `warehouseCode` | String | No | Foreign key to `warehouse_master` | Target distribution center | `"WH-DELHI-01"` | `null` | Unique & WH Compound | `warehouse_master` | Mandatory if inventory/purchase projected. |
| `forecastQty` | Number | Yes | Integer >= 0 | Net demand forecast for week | `1200` | `0` | None | None | Net forecast consumed in this bucket. |
| `availableInventory` | Number | Yes | Integer | Opening projected stock balance | `800` | `0` | None | None | Formula: `projectedInventory[week-1]`. |
| `plannedProduction` | Number | Yes | Integer >= 0 | Recommended manufacturing orders | `500` | `0` | Plant Compound | None | Direct output of MRP factory line capacity run. |
| `plannedPurchase` | Number | Yes | Integer >= 0 | Recommended vendor orders | `0` | `0` | WH Compound | None | Direct output of MRP vendor MOQ/Lead Time run. |
| `projectedInventory` | Number | Yes | Integer | Ending projected stock balance | `100` | `0` | None | None | Formula: `available + plannedProd + plannedPur - forecast`. |
| `supplyGap` | Number | Yes | Integer >= 0 | Unmet stock shortage quantity | `0` | `0` | Shortage Compound | None | Calculated when `projectedInventory < safetyStockUnits`. |
| `serviceLevel` | Number | Yes | Decimal 0.0 to 100.0 | Calculated fill rate % | `100.0` | `100.0` | None | None | Projected service level fulfillment for bucket. |
| `planningStatus` | String | Yes | Enum: `["FEASIBLE","CONSTRAINED","SHORTAGE"]` | Plan feasibility status | `"FEASIBLE"` | `"FEASIBLE"` | Shortage Compound | None | `"SHORTAGE"` status generates `supply_constraints` entry. |
| `generatedAt` | Date | Yes | ISO Timestamp | Execution timestamp | `2026-07-28T17:00:00Z` | `now()` | None | None | MRP run execution timestamp. |

---

### 17. `supply_constraints`
*Exception and bottleneck log generated during MRP feasibility runs.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `skuCode` | String | Yes | Foreign key to `product_master` | Affected SKU identifier | `"SKU-FG-1001"` | None | SKU & Severity Compound | `product_master` | Affected SKU. |
| `constraintType` | String | Yes | Enum: `["SUPPLIER_DELAY","CAPACITY","INVENTORY","MATERIAL_SHORTAGE","WAREHOUSE_FULL","TRANSPORTATION_DELAY"]` | Exception type classification | `"CAPACITY"` | None | Root Cause Compound | None | Standard constraint category. |
| `constraintSource` | String | Yes | String code | Source node/vendor/line | `"PLANT-NOIDA / LINE-OLED-01"` | None | Root Cause Compound | None | Location or entity causing bottleneck. |
| `severity` | String | Yes | Enum: `["CRITICAL","HIGH","MEDIUM","LOW"]` | Impact severity level | `"CRITICAL"` | `"MEDIUM"` | Severity Compound | None | Triggers planner alert thresholds in UI dashboard. |
| `description` | String | Yes | Max 500 chars | Detailed exception explanation | `"Plant Noida line capacity exceeded by 200 units in 2026-W31"` | None | None | None | Human-readable explanation. |
| `recommendedAction` | String | Yes | Max 500 chars | Engine recommended resolution | `"Shift 200 units to backup line LINE-OLED-02 or pull forward"` | None | None | None | Actionable recommendation for planner. |
| `resolved` | Boolean | Yes | Boolean | Resolution status flag | `false` | `false` | Severity & SKU & Root Cause Compound | None | Planner sets to `true` upon taking action. |
| `createdAt` | Date | Yes | ISO Timestamp | Exception log creation timestamp | `2026-07-28T17:00:00Z` | `now()` | Severity Compound | None | System creation timestamp. |

---

### 18. `what_if_scenarios`
*Simulation scenario header capturing assumptions and generated plan linkage.*

| Field | Datatype | Required | Validation | Description | Example | Default | Indexes | Reference Collection | Business Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Valid ObjectId | Unique document identifier | `60d5ec49f1a2c...` | Auto | Primary Key | None | System primary key. |
| `scenarioName` | String | Yes | Length 3–100 chars | Unique simulation scenario name | `"Q3 Demand Surge +20%"` | None | Single Key Index | None | Name identifying simulation run. |
| `description` | String | No | Max 500 chars | Scenario objective description | `"Simulating 20% demand hike across OLED TVs in North region"` | `null` | None | None | Descriptive narrative of test assumptions. |
| `createdBy` | String | Yes | User email / ID | Author planner email | `"planner.noida@company.com"` | None | User Compound | None | Scenario owner user account. |
| `assumptionType` | String | Yes | Enum: `["DEMAND_SURGE","SUPPLIER_SHUTDOWN","CAPACITY_DROP","LEAD_TIME_SPIKE"]` | Primary simulation lever | `"DEMAND_SURGE"` | None | None | None | Categorizes what-if parameter modification. |
| `assumptionValue` | Number | Yes | Decimal (e.g. +20.0 or -50.0) | Numerical modifier value | `20.0` | `0.0` | None | None | Percentage or absolute delta applied to baseline. |
| `generatedSupplyPlanId` | String | Yes | Foreign key string matching `supply_plan` batch | Link to generated plan output | `"PLAN-BATCH-20260728-99"` | None | Unique Link Index | `supply_plan` | References `supply_plan` dataset generated by scenario. |
| `createdAt` | Date | Yes | ISO Timestamp | Scenario run timestamp | `2026-07-28T17:05:00Z` | `now()` | User Compound | None | System creation timestamp. |

---
*Specification complete for all 18 collections.*

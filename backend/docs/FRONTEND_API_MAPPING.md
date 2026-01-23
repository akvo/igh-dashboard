# Frontend API Mapping

This document provides frontend engineers with the exact GraphQL queries, response structures, and UI mappings needed to implement the Global Portfolio Overview dashboard.

**GraphQL Endpoint**: `http://localhost:4000/`

---

## Table of Contents

1. [KPI Cards](#kpi-cards)
2. [Scale of Innovation (Bubble Chart)](#scale-of-innovation-bubble-chart)
3. [Geographic Distribution (Map)](#geographic-distribution-map)
4. [Portfolio by Health Area (Stacked Bar)](#portfolio-by-health-area-stacked-bar)
5. [Cross-pipeline Analytics (Temporal)](#cross-pipeline-analytics-temporal)
6. [Filter Options](#filter-options)

---

## KPI Cards

Three summary cards at the top of the dashboard.

### Query

```graphql
query KPICards {
  portfolioKPIs {
    totalDiseases
    totalCandidates
    approvedProducts
  }
}
```

### Response

```json
{
  "data": {
    "portfolioKPIs": {
      "totalDiseases": 215,
      "totalCandidates": 8581,
      "approvedProducts": 0
    }
  }
}
```

### UI Mapping

| Field | Card Title | Display Format |
|-------|------------|----------------|
| `totalDiseases` | "Number of diseases" | Integer (e.g., "215") |
| `totalCandidates` | "Total number of candidates" | Integer with locale formatting (e.g., "8,581") |
| `approvedProducts` | "Approved products" | Integer (e.g., "0") |

### Notes
- All values are non-negative integers
- Use `toLocaleString()` for large numbers

---

## Scale of Innovation (Bubble Chart)

Bubble chart showing candidate distribution across global health areas.

### Query

```graphql
query BubbleChart {
  globalHealthAreaSummaries {
    global_health_area
    candidateCount
    diseaseCount
    productCount
  }
}
```

### Response

```json
{
  "data": {
    "globalHealthAreaSummaries": [
      {
        "global_health_area": "Neglected disease",
        "candidateCount": 3611,
        "diseaseCount": 112,
        "productCount": 7
      },
      {
        "global_health_area": "Sexual & reproductive health",
        "candidateCount": 2719,
        "diseaseCount": 49,
        "productCount": 7
      },
      {
        "global_health_area": "Emerging infectious disease",
        "candidateCount": 2233,
        "diseaseCount": 53,
        "productCount": 5
      }
    ]
  }
}
```

### UI Mapping

| Field | Chart Attribute | Usage |
|-------|-----------------|-------|
| `global_health_area` | Bubble label / legend | Category name |
| `candidateCount` | Bubble size | Primary metric |
| `diseaseCount` | Tooltip | Secondary metric |
| `productCount` | Tooltip | Secondary metric |

### Notes
- Always returns exactly 3 items (one per health area)
- Use `candidateCount` for bubble radius calculation
- Color coding suggested:
  - Neglected disease: Blue
  - Sexual & reproductive health: Pink/Magenta
  - Emerging infectious disease: Orange/Yellow

---

## Geographic Distribution (Map)

Choropleth map with tabs for different location perspectives.

### Query

```graphql
query GeographicMap($scope: String!) {
  geographicDistribution(location_scope: $scope) {
    country_key
    country_name
    iso_code
    candidateCount
  }
}
```

### Variables

```json
{
  "scope": "Trial Location"
}
```

### Tab → Query Variable Mapping

| Tab Label | `location_scope` value |
|-----------|------------------------|
| "Location of clinical trials" | `"Trial Location"` |
| "Location of development" | `"Developer Location"` |
| "Target countries" | `"Target Country"` |

### Response (Trial Location)

```json
{
  "data": {
    "geographicDistribution": [
      {
        "country_key": 50,
        "country_name": "South Africa",
        "iso_code": "49",
        "candidateCount": 11
      },
      {
        "country_key": 54,
        "country_name": "Tanzania",
        "iso_code": "53",
        "candidateCount": 11
      },
      {
        "country_key": 29,
        "country_name": "Kenya",
        "iso_code": "28",
        "candidateCount": 9
      }
    ]
  }
}
```

### UI Mapping

| Field | Map Attribute | Usage |
|-------|---------------|-------|
| `country_name` | Tooltip title | Display on hover |
| `iso_code` | Map region ID | **Use for matching GeoJSON features** |
| `candidateCount` | Fill color intensity | Choropleth shading |

### Notes
- `iso_code` is used for matching map regions. Ensure your GeoJSON uses the same code system
- Some countries may have `null` iso_code - handle gracefully
- Typical count: 50+ countries for Trial Location, fewer for Developer Location

### Getting Available Location Scopes

```graphql
query GetLocationScopes {
  locationScopes
}
```

Response:
```json
{
  "data": {
    "locationScopes": [
      "Developer Location",
      "Target Country",
      "Trial Location"
    ]
  }
}
```

---

## Portfolio by Health Area (Stacked Bar)

Stacked bar chart showing phase distribution filtered by health area.

### Query (All Health Areas)

```graphql
query PhaseDistribution {
  phaseDistribution {
    global_health_area
    phase_name
    sort_order
    candidateCount
  }
}
```

### Query (Filtered by Health Area)

```graphql
query PhaseDistributionFiltered($healthArea: String!) {
  phaseDistribution(global_health_area: $healthArea) {
    global_health_area
    phase_name
    sort_order
    candidateCount
  }
}
```

Variables:
```json
{
  "healthArea": "Neglected disease"
}
```

### Query (Filtered by Product)

```graphql
query PhaseDistributionByProduct($productKey: Int!) {
  phaseDistribution(product_key: $productKey) {
    global_health_area
    phase_name
    sort_order
    candidateCount
  }
}
```

### Response

```json
{
  "data": {
    "phaseDistribution": [
      {
        "global_health_area": "Emerging infectious disease",
        "phase_name": "Discovery",
        "sort_order": 10,
        "candidateCount": 15
      },
      {
        "global_health_area": "Emerging infectious disease",
        "phase_name": "Preclinical",
        "sort_order": 25,
        "candidateCount": 205
      },
      {
        "global_health_area": "Emerging infectious disease",
        "phase_name": "Phase I",
        "sort_order": 40,
        "candidateCount": 111
      },
      {
        "global_health_area": "Emerging infectious disease",
        "phase_name": "Phase II",
        "sort_order": 50,
        "candidateCount": 88
      },
      {
        "global_health_area": "Emerging infectious disease",
        "phase_name": "Phase III",
        "sort_order": 60,
        "candidateCount": 85
      }
    ]
  }
}
```

### UI Mapping

| Field | Chart Attribute | Usage |
|-------|-----------------|-------|
| `global_health_area` | Bar group / X-axis | Group bars by health area |
| `phase_name` | Stack segment / Legend | Label for each segment |
| `sort_order` | Segment order | **Sort phases by this value** |
| `candidateCount` | Segment height | Numeric value |

### Phase Sort Order Reference

| sort_order | phase_name |
|------------|------------|
| 10 | Discovery |
| 20 | Primary and secondary screening and optimisation |
| 25 | Preclinical |
| 30 | Development |
| 36 | Early development (concept and research) |
| 37 | Early development (feasibility and planning) |
| 40 | Phase I |
| 50 | Phase II |
| 60 | Phase III |
| 72 | Late development (design and development) |
| 75 | Late development (clinical validation and launch readiness) |
| 80 | Regulatory filing |
| 85 | PQ listing and regulatory approval |
| 90 | Phase IV |

### Notes
- Always sort phases by `sort_order` ascending (early → late stages)
- Not all phases appear for all health areas
- Suggested color scheme: gradient from light (early) to dark (late phases)

---

## Cross-pipeline Analytics (Temporal)

Temporal stacked bar chart showing how the portfolio evolved over time.

### Query

```graphql
query TemporalAnalysis($years: [Int!]) {
  temporalSnapshots(years: $years) {
    year
    phase_name
    sort_order
    candidateCount
  }
}
```

Variables:
```json
{
  "years": [2023, 2024]
}
```

### Response

```json
{
  "data": {
    "temporalSnapshots": [
      {
        "year": 2023,
        "phase_name": "Discovery",
        "sort_order": 10,
        "candidateCount": 61
      },
      {
        "year": 2023,
        "phase_name": "Preclinical",
        "sort_order": 25,
        "candidateCount": 388
      },
      {
        "year": 2023,
        "phase_name": "Phase I",
        "sort_order": 40,
        "candidateCount": 265
      },
      {
        "year": 2024,
        "phase_name": "Discovery",
        "sort_order": 10,
        "candidateCount": 15
      },
      {
        "year": 2024,
        "phase_name": "Preclinical",
        "sort_order": 25,
        "candidateCount": 204
      }
    ]
  }
}
```

### UI Mapping

| Field | Chart Attribute | Usage |
|-------|-----------------|-------|
| `year` | X-axis | Group by year |
| `phase_name` | Stack segment / Legend | Label for each segment |
| `sort_order` | Segment order | **Sort phases by this value** |
| `candidateCount` | Segment height | Numeric value |

### Getting Available Years

```graphql
query GetAvailableYears {
  availableYears
}
```

Response:
```json
{
  "data": {
    "availableYears": [2015, 2019, 2021, 2023, 2024, 2025]
  }
}
```

### Notes
- Use `availableYears` to populate year selector/checkboxes
- Pass selected years in the `years` array parameter
- If `years` is omitted or empty, returns all available years
- Data may not exist for all years - handle empty results gracefully

---

## Filter Options

Queries for populating filter dropdowns.

### Products Dropdown

```graphql
query GetProducts {
  products {
    product_key
    product_name
  }
}
```

Response (abbreviated):
```json
{
  "data": {
    "products": [
      { "product_key": 31, "product_name": "Vaccines" },
      { "product_key": 30, "product_name": "Drugs" },
      { "product_key": 34, "product_name": "Diagnostics" },
      { "product_key": 17, "product_name": "Diagnosis" }
    ]
  }
}
```

### All Filter Options (Combined)

```graphql
query FilterOptions {
  products {
    product_key
    product_name
  }
  availableYears
  locationScopes
}
```

Response:
```json
{
  "data": {
    "products": [
      { "product_key": 31, "product_name": "Vaccines" },
      { "product_key": 30, "product_name": "Drugs" }
    ],
    "availableYears": [2015, 2019, 2021, 2023, 2024, 2025],
    "locationScopes": ["Developer Location", "Target Country", "Trial Location"]
  }
}
```

### Notes
- `product_key` is used as the filter value in `phaseDistribution(product_key: $key)`
- Sort products alphabetically by `product_name` for better UX
- Some `product_name` values may be duplicates (e.g., "Other") - use `product_key` as the unique identifier

---

## Data Transformation Examples

### React Hook Example (KPIs)

```typescript
function useKPIs() {
  const { data, loading, error } = useQuery(gql`
    query KPICards {
      portfolioKPIs {
        totalDiseases
        totalCandidates
        approvedProducts
      }
    }
  `);

  return {
    loading,
    error,
    kpis: data?.portfolioKPIs ? [
      { label: "Number of diseases", value: data.portfolioKPIs.totalDiseases },
      { label: "Total candidates", value: data.portfolioKPIs.totalCandidates.toLocaleString() },
      { label: "Approved products", value: data.portfolioKPIs.approvedProducts },
    ] : []
  };
}
```

### Transforming Phase Distribution for Chart Library

```typescript
function transformForStackedBar(data: PhaseDistributionRow[]) {
  // Group by health area
  const grouped = data.reduce((acc, row) => {
    if (!acc[row.global_health_area]) {
      acc[row.global_health_area] = {};
    }
    acc[row.global_health_area][row.phase_name] = row.candidateCount;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  // Get unique phases sorted by sort_order
  const phases = [...new Set(data.map(r => r.phase_name))]
    .sort((a, b) => {
      const orderA = data.find(r => r.phase_name === a)?.sort_order ?? 0;
      const orderB = data.find(r => r.phase_name === b)?.sort_order ?? 0;
      return orderA - orderB;
    });

  return {
    categories: Object.keys(grouped),
    series: phases.map(phase => ({
      name: phase,
      data: Object.keys(grouped).map(area => grouped[area][phase] || 0)
    }))
  };
}
```

---

## Error Handling

All queries may return errors in the `errors` array:

```json
{
  "data": null,
  "errors": [
    {
      "message": "Database connection failed",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["portfolioKPIs"]
    }
  ]
}
```

Handle gracefully by:
1. Checking for `errors` array in response
2. Displaying user-friendly error message
3. Providing retry functionality

---

## Fixtures

Test fixtures are available at `tests/fixtures/*.json` for development without backend:

| File | Query |
|------|-------|
| `portfolioKPIs.json` | `portfolioKPIs` |
| `globalHealthAreaSummaries.json` | `globalHealthAreaSummaries` |
| `geographicDistribution-trials.json` | `geographicDistribution(location_scope: "Trial Location")` |
| `geographicDistribution-dev.json` | `geographicDistribution(location_scope: "Developer Location")` |
| `phaseDistribution.json` | `phaseDistribution` |
| `phaseDistribution-filtered.json` | `phaseDistribution(global_health_area: "Neglected disease")` |
| `temporalSnapshots.json` | `temporalSnapshots` |
| `filterOptions.json` | Combined: `products`, `availableYears`, `locationScopes` |

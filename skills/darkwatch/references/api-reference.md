# Voidly API Reference

Base URL: `https://api.voidly.ai`

## Public Endpoints (no auth required)

### Censorship Index
```
GET /data/censorship-index.json
```
Returns censorship rankings for 200 countries with scores, risk tiers, and trends.

### Country Data
```
GET /data/country/{code}
```
Detailed censorship profile for a single country. Example: `/data/country/IR`

### Incidents
```
GET /data/incidents?limit=10&country=IR
```
ML-classified censorship incidents. Returns: id, country, title, severity, type, confidence, sources.

### Incident Detail
```
GET /data/incidents/{id}
```
Full incident with evidence. Supports hash ID or readable ID (e.g., `IR-2026-0150`).

### Incident Stats
```
GET /data/incidents/stats
```
Total counts, severity breakdown, top countries, growth metrics.

### 7-Day Forecast
```
GET /v1/forecast/{country}/7day
```
XGBoost shutdown risk prediction. Returns daily risk scores and key drivers.

### Service Accessibility
```
GET /v1/accessibility/check?domain=twitter.com&country=IR
```
Real-time check: is a domain accessible in a country?

### ISP Risk Index
```
GET /v1/isp/index?country=IR
```
Composite censorship scores per ISP. Methods, blocked categories, domain counts.

### Platform Risk
```
GET /v1/platform/{platform}/risk
```
Per-platform risk scores. Platforms: whatsapp, telegram, twitter, facebook, etc.

## Data Coverage

- 200 countries
- 1,574 verified incidents
- 46,115 evidence items
- 2.2B+ underlying OONI measurements
- Sources: OONI, CensoredPlanet, IODA, Voidly Network
- ML classifier: 99.8% F1 (GradientBoosting)
- Updated every 6 hours
- License: CC BY 4.0

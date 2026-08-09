# Storm Chase Quality Index (CQI) v1

The Storm Chase Quality Index (CQI) is a county-level map designed to evaluate how favorable a location is for seeing, reaching, and tracking a tornado, assuming a tornado is occurring there.

CQI evaluates chase quality, not tornado frequency.

## Public web map

The public map is hosted with GitHub Pages and uses Leaflet for interactive county rendering.

### Public files

- `index.html` — map page
- `style.css` — visual styling and mobile layout
- `map-protected.js` — map behavior, interaction, and protected API requests
- `data/counties-public.geojson` — county geometry and public category information only
- `data/states.geojson` — state outlines

Exact CQI scores, national rankings, and component scores are not stored in this repository. They are served county-by-county through a protected backend.

## Copyright and permitted use

**Storm Chase Quality Index (CQI) © 2026 Tucker Weather. All rights reserved.**

The CQI scoring dataset, derived scores, methodology, map presentation, and associated original materials may not be reproduced, redistributed, republished, sold, incorporated into another product or service, or presented as another party's work without prior written permission from Tucker Weather.

Public access to this repository and web map does not grant an open-source license or permission to reuse CQI materials beyond ordinary viewing and personal reference.

Third-party geographic boundaries, libraries, and source datasets remain subject to their respective licenses and terms.

## Notes

- The map uses Leaflet from a public CDN.
- Exact county scores and component values are retrieved from the CQI API only when requested.
- CQI measures the quality of the chase environment, not tornado frequency.

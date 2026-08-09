# CQI v1 Web Map

This folder is ready to publish with GitHub Pages.

## Files

- `index.html` — map page
- `style.css` — visual styling and mobile layout
- `map.js` — map behavior, legend, hover, and county details
- `data/counties.geojson` — simplified CQI county data
- `data/states.geojson` — state outlines
- `.nojekyll` — tells GitHub Pages to serve the files directly

## Publish on GitHub Pages

1. Create a new **public** GitHub repository, preferably named `cqi-map`.
2. Upload every file and folder from this package to the root of the repository.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and the `/ (root)` folder.
6. Save and wait for GitHub to publish the site.

The URL will normally be:

`https://YOUR-USERNAME.github.io/cqi-map/`

## Embed in Squarespace

Add a Code block and paste:

```html
<div style="width:100%; height:780px;">
  <iframe
    src="https://YOUR-USERNAME.github.io/cqi-map/"
    title="Interactive Storm Chase Quality Index map"
    loading="lazy"
    style="width:100%; height:100%; border:0; display:block;"
    allowfullscreen>
  </iframe>
</div>
```

Replace `YOUR-USERNAME` with your GitHub username.

## Notes

- No paid map service or tile provider is used.
- City labels can be added later as a separate layer.
- The map uses Leaflet from a public CDN.
- CQI measures the quality of the chase environment, not tornado frequency.

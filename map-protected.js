const CATEGORIES = [
  { num: 9, name: "Elite",       range: "0.820–1.000", color: "#007D0B" },
  { num: 8, name: "Excellent",   range: "0.770–0.820", color: "#589D3D" },
  { num: 7, name: "Great",       range: "0.710–0.770", color: "#90BE67" },
  { num: 6, name: "Solid",       range: "0.640–0.710", color: "#C7DE92" },
  { num: 5, name: "Decent",      range: "0.570–0.640", color: "#FFFFBF" },
  { num: 4, name: "Subpar",      range: "0.500–0.570", color: "#FCCD96" },
  { num: 3, name: "Rough",       range: "0.420–0.500", color: "#F29B70" },
  { num: 2, name: "Terrible",    range: "0.330–0.420", color: "#E4654B" },
  { num: 1, name: "Treacherous", range: "0.000–0.330", color: "#D2192A" },
];

const API_BASE = "https://cqi-api.tjantico.workers.dev";

const map = L.map("map", {
  zoomControl: true,
  attributionControl: true,
  minZoom: 5,
  maxZoom: 10,
  zoomSnap: 0.5,
  wheelPxPerZoomLevel: 60,
  preferCanvas: true,
});

map.attributionControl.setPrefix(false);
map.attributionControl.addAttribution(
  "CQI © Tucker Weather | Boundaries: U.S. Census Bureau"
);

map.createPane("countiesPane");
map.getPane("countiesPane").style.zIndex = 400;

map.createPane("statesPane");
map.getPane("statesPane").style.zIndex = 450;
map.getPane("statesPane").style.pointerEvents = "none";

const countyRenderer = L.canvas({
  pane: "countiesPane",
  padding: 0.5,
});

const loading = document.getElementById("loading");
const details = document.getElementById("details");
const detailsContent = document.getElementById("details-content");
const legend = document.getElementById("legend");
const legendToggle = document.getElementById("legend-toggle");

let countyLayer;
let stateBorderLayer;
let nationalBounds;
let selectedCountyLayer = null;
let activeCountyRequest = null;

// Cache exact scores already requested during this page session.
// This reduces API usage when a visitor clicks the same county again.
const countyScoreCache = new Map();

function number(value, digits = 3) {
  return Number(value).toFixed(digits);
}

function countyStyle(feature) {
  return {
    pane: "countiesPane",
    renderer: countyRenderer,
    fillColor: feature.properties.category_color,
    fillOpacity: 1,
    color: "#000000",
    opacity: 1.00,
    weight: 0.45,
  };
}

function restoreOverlayOrder(hoveredLayer = null) {
  if (stateBorderLayer) {
    stateBorderLayer.bringToFront();
  }

  if (
    hoveredLayer &&
    hoveredLayer !== selectedCountyLayer
  ) {
    hoveredLayer.bringToFront();
  }

  if (selectedCountyLayer) {
    selectedCountyLayer.bringToFront();
  }
}

function hoverStyle(layer) {
  layer.setStyle({
    color: "#1E88E5",
    weight: 3.0,
    opacity: 1,
  });

  layer.bringToFront();
  restoreOverlayOrder(layer);
}

function selectedStyle(layer) {
  layer.setStyle({
    color: "#1E88E5",
    weight: 4.5,
    opacity: 1,
  });

  restoreOverlayOrder();
}

function clearSelection() {
  details.classList.remove("open");

  if (activeCountyRequest) {
    activeCountyRequest.abort();
    activeCountyRequest = null;
  }

  const previousSelection = selectedCountyLayer;
  selectedCountyLayer = null;

  if (previousSelection && countyLayer) {
    countyLayer.resetStyle(previousSelection);
  }

  restoreOverlayOrder();
}

function componentRow(name, value) {
  const percentage = Math.max(
    0,
    Math.min(100, Number(value) * 100)
  );

  return `
    <div class="component-row">
      <span class="component-name">${name}</span>

      <div class="component-track" aria-hidden="true">
        <div
          class="component-fill"
          style="width:${percentage}%"
        ></div>
      </div>

      <span class="component-value">${number(value)}</span>
    </div>
  `;
}

function showDetailsLoading(properties) {
  detailsContent.innerHTML = `
    <h2 class="county-title">${properties.county_state}</h2>

    <div class="category-badge">
      <span
        class="category-dot"
        style="background:${properties.category_color}"
      ></span>

      ${properties.category_name} · ${properties.category_range}
    </div>

    <div class="empty-state">
      <strong>Loading CQI details…</strong>
    </div>
  `;

  details.classList.add("open");
}

function showDetailsError(properties, message) {
  detailsContent.innerHTML = `
    <h2 class="county-title">${properties.county_state}</h2>

    <div class="category-badge">
      <span
        class="category-dot"
        style="background:${properties.category_color}"
      ></span>

      ${properties.category_name} · ${properties.category_range}
    </div>

    <div class="empty-state">
      <strong>CQI details unavailable</strong>
      <span>${message}</span>
    </div>
  `;

  details.classList.add("open");
}

function showDetails(properties) {
  detailsContent.innerHTML = `
    <h2 class="county-title">${properties.county_state}</h2>

    <div class="category-badge">
      <span
        class="category-dot"
        style="background:${properties.category_color}"
      ></span>

      ${properties.category_name} · ${properties.category_range}
    </div>

    <div class="score-summary">
      <div class="summary-box">
        <span class="summary-label">CQI score</span>
        <span class="summary-value">
          ${number(properties.cqi_final, 4)}
        </span>
      </div>

      <div class="summary-box">
        <span class="summary-label">National rank</span>
        <span class="summary-value">
          #${Number(properties.national_rank).toLocaleString()}
        </span>
      </div>
    </div>

    <div class="component-list">
      ${componentRow("Open land", properties.open_land_score)}
      ${componentRow("Terrain", properties.terrain_score)}
      ${componentRow("Roads", properties.road_score)}
      ${componentRow("Population", properties.pop_score)}
      ${componentRow("Radar", properties.radar_score)}
    </div>
  `;

  details.classList.add("open");
}

async function loadCountyDetails(feature, layer) {
  const properties = feature.properties;
  const geoid = String(properties.GEOID).padStart(5, "0");

  showDetailsLoading(properties);

  if (countyScoreCache.has(geoid)) {
    showDetails({
      ...properties,
      ...countyScoreCache.get(geoid),
    });
    return;
  }

  if (activeCountyRequest) {
    activeCountyRequest.abort();
  }

  const controller = new AbortController();
  activeCountyRequest = controller;

  try {
    const response = await fetch(
      `${API_BASE}/county/${encodeURIComponent(geoid)}`,
      {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(
          "Too many requests. Please wait a moment and try again."
        );
      }

      throw new Error(
        `Request failed (${response.status}).`
      );
    }

    const privateScores = await response.json();

    countyScoreCache.set(geoid, privateScores);

    // Only update the panel if this county is still selected.
    if (selectedCountyLayer === layer) {
      showDetails({
        ...properties,
        ...privateScores,
      });
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    console.error(error);

    if (selectedCountyLayer === layer) {
      showDetailsError(
        properties,
        error.message || "Please try again."
      );
    }
  } finally {
    if (activeCountyRequest === controller) {
      activeCountyRequest = null;
    }
  }
}

function onEachCounty(feature, layer) {
  layer.options.bubblingMouseEvents = false;

  layer.on({
    mouseover: () => {
      if (layer !== selectedCountyLayer) {
        hoverStyle(layer);
      }
    },

    mouseout: () => {
      if (layer !== selectedCountyLayer) {
        countyLayer.resetStyle(layer);
        restoreOverlayOrder();
      }
    },

    click: event => {
      if (event.originalEvent) {
        L.DomEvent.stopPropagation(event.originalEvent);
      }

      if (
        selectedCountyLayer &&
        selectedCountyLayer !== layer
      ) {
        countyLayer.resetStyle(selectedCountyLayer);
      }

      selectedCountyLayer = layer;
      selectedStyle(layer);
      loadCountyDetails(feature, layer);
    },
  });
}

function buildLegend() {
  const container = document.getElementById("legend-items");

  container.innerHTML = CATEGORIES.map(category => `
    <div class="legend-row">
      <span
        class="legend-swatch"
        style="background:${category.color}"
      ></span>

      <span class="legend-name">${category.name}</span>
      <span class="legend-range">${category.range}</span>
    </div>
  `).join("");
}

async function loadMap() {
  try {
    const [countyResponse, stateResponse] = await Promise.all([
      fetch("data/counties-public.geojson?v=1"),
      fetch("data/states.geojson"),
    ]);

    if (!countyResponse.ok || !stateResponse.ok) {
      throw new Error("Map data could not be downloaded.");
    }

    const [countyData, stateData] = await Promise.all([
      countyResponse.json(),
      stateResponse.json(),
    ]);

    countyLayer = L.geoJSON(countyData, {
      pane: "countiesPane",
      renderer: countyRenderer,
      smoothFactor: 0,
      bubblingMouseEvents: false,
      style: countyStyle,
      onEachFeature: onEachCounty,
    }).addTo(map);

    stateBorderLayer = L.geoJSON(stateData, {
      pane: "countiesPane",
      renderer: countyRenderer,
      smoothFactor: 0,
      interactive: false,
      bubblingMouseEvents: false,
      style: {
        fill: false,
        color: "#000000",
        opacity: 1,
        weight: 1.5,
      },
    }).addTo(map);

    nationalBounds = countyLayer.getBounds();

    map.fitBounds(nationalBounds, {
      padding: [8, 8],
    });

    restoreOverlayOrder();
    loading.classList.add("hidden");
  } catch (error) {
    console.error(error);

    loading.innerHTML = `
      <div>
        <strong>The CQI map could not load.</strong><br>
        <span style="font-weight:400">
          Refresh the page or try again shortly.
        </span>
      </div>
    `;
  }
}

document
  .getElementById("reset-view")
  .addEventListener("click", event => {
    event.stopPropagation();

    if (nationalBounds) {
      map.fitBounds(nationalBounds, {
        padding: [8, 8],
      });
    }
  });

document
  .getElementById("close-details")
  .addEventListener("click", event => {
    event.stopPropagation();
    clearSelection();
  });

legendToggle.addEventListener("click", event => {
  event.stopPropagation();

  const collapsed = legend.classList.toggle("collapsed");

  legendToggle.setAttribute(
    "aria-expanded",
    String(!collapsed)
  );
});

map.on("click", clearSelection);

buildLegend();
loadMap();

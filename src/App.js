import mapboxgl from 'mapbox-gl';
import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from '@material-ui/core/styles';
import Hidden from '@material-ui/core/Hidden';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import LogoOverlay from './LogoOverlay';
import IconButton from '@material-ui/core/Button';
import { Home } from '@material-ui/icons';  
import Omnibox from './Omnibox';
import { getAllCategories } from './common';
import CONFIG from './config.json';
import { fetchMapData } from './data-loader';
import { THEME } from './Theme';
import insightLogo from './img/insight-white.png';
import './App.css';

const COMPANIES_SOURCE = 'companies';
const MAPS = CONFIG['maps'];
const POINT_LAYER = 'energy-companies-point-layer';
// testing if desktop change is key to pages rebuilding
// = process.env.REACT_APP_MAPBOX_API_TOKEN;
// mapboxgl.accessToken
mapboxgl.accessToken=''

function getPopupContent(props) {
  const categoryInfo = ['tax1', 'tax2', 'tax3']
    .map(k => props[k])
    .filter(s => s).join(" | ");
  return `
    <div class="popup" style = "color: 626262">
      <h3 class="company-name">
        <a href=${props['website']} style="color: 02346d" target="blank">${props['company']}</a>
      </h3>
      
      City: <span class="city-info">${props['city']}</span><br />

    </div>`;
}

function clearPopups() {
  var popUps = document.getElementsByClassName('mapboxgl-popup');
  // Check if there is already a popup on the map and if so, remove it
  // This prevents multiple popups in the case of overlapping circles
  if (popUps[0]) popUps[0].remove();
}

function displayPopup(map, feature) {
  const coordinates = feature.geometry.coordinates.slice();
  clearPopups();
  new mapboxgl.Popup({})
    .setLngLat(coordinates)
    .setHTML(getPopupContent(feature.properties))
    .setMaxWidth("600px")
    .addTo(map);
}

function displayClusterPopup(map, features) {
  const coordinates = features[0].geometry.coordinates.slice();
  clearPopups();

  const content = getClusterPopupContent(features);

  new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "400px", // Adjust width as necessary
      anchor: 'bottom'   // Adjust anchor as necessary
  })
  .setLngLat(coordinates)
  .setHTML(content)
  .addTo(map);
}

function getClusterPopupContent(features) {
  const city = features[0].properties.city;

  // Map over the features and create hyperlinks for each company
  const companyLinks = features.map(feature => {
      const companyName = feature.properties.company;
      const website = feature.properties.website;
      return `<a href="${website}" style="color: 02346d" target="_blank">${companyName}</a>`;
  });
  
  return `
      <div class="popup" style="color: 626262; max-height: 300px; overflow-y: scroll;">
        City: <span class="city-info">${city}</span><br />
        ${companyLinks.join('<br />')}
      </div>`;
}

function populateMapData(map, mapId, mapData) {
  map.setCenter(MAPS[mapId].center);
  map.setZoom(1);

  mapData.then(data => {
    // map.addSource(COMPANIES_SOURCE, {
    //   type: 'geojson',
    //   data: data['geojson'],
    // });
    map.addSource(COMPANIES_SOURCE, {
      type: 'geojson',
      data: data['geojson'],
      cluster: true,
      clusterMaxZoom: 12, // 
      clusterRadius: 40, // Radius of each cluster when clustering points
    });

    

    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: COMPANIES_SOURCE,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6',
          100,
          '#f1f075',
          750,
          '#f28cb1'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          100,
          30,
          750,
          40
        ]
      }
    });

    // cluster count
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: COMPANIES_SOURCE,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    // unclustered points
    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: COMPANIES_SOURCE,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#11b4da',
        'circle-radius': 4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'unclustered-point', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'unclustered-point', () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('mouseenter', POINT_LAYER, (e) => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', POINT_LAYER, () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('click', POINT_LAYER, e => displayPopup(map, e.features[0]));


    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const clusterId = features[0].properties.cluster_id;
      const currentZoom = map.getZoom();
  
      if (currentZoom < 10) {  // Assuming 10 is the max zoom level
          map.getSource(COMPANIES_SOURCE).getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return;
  
              // Zoom into the cluster
              map.easeTo({
                  center: features[0].geometry.coordinates,
                  zoom: zoom
              });
          });
        } else {  // if at max zoom level
          map.getSource(COMPANIES_SOURCE).getClusterLeaves(clusterId, Infinity, 0, (err, aFeatures) => {
              if (err) throw err;
      
              displayClusterPopup(map, aFeatures);
          });
      }
  });
    
    // event listener for clicking on unclustered points
    map.on('click', 'unclustered-point', e => displayPopup(map, e.features[0]));

    map.flyTo({
      center: MAPS[mapId].flyTo,
      zoom: MAPS[mapId].flyToZoom || 1,
      speed: 0.5,
    });
  });
}

const getUrlFragment = () => window.location.hash.replace('#', '');

function useUrlFragment(fragment, callback) {
  useEffect(() => {
    window.location.hash = '#' + fragment;
    const handleHashChange = () => {
      callback(getUrlFragment());
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    }
  });
}

function getInitialMapId() {
  let initialMapId = getUrlFragment();
  if (MAPS.hasOwnProperty(initialMapId)) {
    return initialMapId;
  }
  return CONFIG['defaultMapId'];
}

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
  },
  mainContent: {
    flexGrow: 1,
    position: 'relative',
  },
  mapContainer: {
    height: '100vh',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#333',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 0,
    pointerEvents: 'none',
  },
  mapOverlayInner: {
    display: 'block',
    position: 'relative',
    height: '100%',
    width: '100%',
    margin: 0,
    padding: 0,
  },
  mainControlOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 0,
    margin: 0,
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'row',
  },
  insightLogoContainer: {
    padding: 8,
  },
  titleAndSearch: {
    padding: '4px 8px',
  },
  mapTitle: {
    color: '#fff',
    padding: '4px 0px',
    marginBottom: 4,
  },
  resetViewButton: {
    position: 'absolute',
    bottom: 73,
    right: 4.5,
    minWidth: 30,
    maxWidth: 30,
    height: 31,
  }
}));

export default function App() {
  const classes = useStyles();

  const [thisMap, setThisMap] = useState(null);
  const [selectedMapId, setSelectedMapId] = useState(getInitialMapId());
  const [taxonomy, setTaxonomy] = useState([]);
  const [companiesGeojson, setCompaniesGeojson] = useState({});
  const [selectedCategories, setSelectedCategories] = useState(new Set([]));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  function handleSelectAllCategories(txnomy) {
    // takes argument instead of using taxonomy directly because taxonomy
    // state update can lag behind
    setSelectedCategories(getAllCategories(txnomy));
  }

  function handleSelectCompany(e) {
    const selectedCompany = companiesGeojson.features[e.idx];
    displayPopup(thisMap, selectedCompany);
    thisMap.flyTo({
      center: selectedCompany.geometry.coordinates,
      zoom: 1,
    });
  }

  function handleSelectMap(mapId) {
    if (mapId !== selectedMapId) {
      clearPopups();
      thisMap.removeLayer(POINT_LAYER);
      thisMap.removeSource(COMPANIES_SOURCE);
      setSelectedMapId(mapId);
      setMobileDrawerOpen(false);
      let mapData = fetchMapData(mapId);
      mapData.then(setUpMap);
      populateMapData(thisMap, mapId, mapData);
      handleSelectAllCategories(taxonomy);
    }
  }


  function handleReset() {
    // called when reset button is clicked
    thisMap.flyTo({
      center: MAPS[selectedMapId].flyTo,
      zoom: MAPS[selectedMapId].flyToZoom || 8,
    });
  }

  function setUpMap(data) {
    setTaxonomy(data['taxonomy']);
    setCompaniesGeojson(data['geojson']);
    // initially select all categories
    handleSelectAllCategories(data['taxonomy']);
  }

  function initMap() {
    let map = new mapboxgl.Map({
      container: "map-container",
      style: 'mapbox://styles/mapbox/dark-v10',
      attributionControl: false,
      center: MAPS[selectedMapId].center,
      zoom: 1,
      minZoom: 1,
      maxZoom: 10,
    });
    let mapData = fetchMapData(selectedMapId);
    mapData.then(setUpMap);

    map.on('load', () => {
      // map.addControl(new mapboxgl.FullscreenControl(), 'bottom-right');
      // map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      populateMapData(map, selectedMapId, mapData);
    });
    setThisMap(map);
  }

  

  useEffect(() => {
    if (!thisMap) {
      initMap();
    }

    if (thisMap) {
      if (thisMap.getLayer(POINT_LAYER)) {
        var filters = ["any"];
        // If ANY of the 3 taxonomies for a company are selected, it should be
        // displayed on the map.
        [1, 2, 3].forEach(i => {
          var filter = ["in", `tax${i}sanitized`];
          selectedCategories.forEach(category => filter.push(category));
          filters.push(filter);
        });
        thisMap.setFilter(POINT_LAYER, filters);
      }
    }
  });

  useUrlFragment(selectedMapId, urlFragment => {
    if (MAPS.hasOwnProperty(urlFragment)) {
      handleSelectMap(urlFragment);
    }
  });

  return (
    <ThemeProvider theme={THEME}>
      <div className={classes.root}>
        <main className={classes.mainContent}>
          <div id="map-container" className={classes.mapContainer} />
          <LogoOverlay selectedMapId={selectedMapId} />
          <div className={classes.resetViewButton} >
            <IconButton variant="contained" color="white" className={classes.resetViewButton} aria-label="reset view" onClick={() => { handleReset() }} >
              <Home />
            </IconButton>
          </div>
          <div className={classes.mapOverlay}>
            <div className={classes.mapOverlayInner}>
              <div className={classes.mainControlOverlay}>
                <Hidden smDown implementation="css">
                  <div className={classes.insightLogoContainer}>
                    <img src={insightLogo} alt="aes insight logo" height="80" />
                  </div>
                </Hidden>
                <div className={classes.titleAndSearch}>
                  <div className={classes.mapTitle}>
                    <Typography variant="h1">{MAPS[selectedMapId].title}</Typography>
                  </div>
                  <Omnibox
                    companies={companiesGeojson.features}
                    onSelectCompany={handleSelectCompany}
                    onOpenMobileDrawer={() => setMobileDrawerOpen(true)} />
                  </div>
              </div>
              <LogoOverlay selectedMapId={selectedMapId} />
            </div>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}


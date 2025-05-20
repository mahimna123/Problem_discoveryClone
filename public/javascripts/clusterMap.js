console.log('Cluster map initialization started');

// Create a GeoJSON source from campgrounds
const geojson = {
    type: 'FeatureCollection',
    features: campgrounds.map(campground => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: campground.geometry.coordinates
        },
        properties: {
            title: campground.title,
            location: campground.location,
            id: campground._id
        }
    }))
};

// Initialize the map
const clusterMap = new maplibregl.Map({
    container: 'cluster-map',
    style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerApiKey}`,
    center: [78.9629, 20.5937],
    zoom: 4
});

// Add navigation controls
clusterMap.addControl(new maplibregl.NavigationControl());

// Add the source and layers when the map loads
clusterMap.on('load', () => {
    // Add the source
    clusterMap.addSource('campgrounds', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
    });

    // Add the cluster layer
    clusterMap.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'campgrounds',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': [
                'step',
                ['get', 'point_count'],
                '#51bbd6',
                10, '#f1f075',
                30, '#f28cb1'
            ],
            'circle-radius': [
                'step',
                ['get', 'point_count'],
                20,
                10, 30,
                30, 40
            ]
        }
    });

    // Add the cluster count layer
    clusterMap.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'campgrounds',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
        }
    });

    // Add the unclustered point layer
    clusterMap.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'campgrounds',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': '#11b4da',
            'circle-radius': 8,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
        }
    });

    // Add click handlers for clusters
    clusterMap.on('click', 'clusters', (e) => {
        const features = clusterMap.queryRenderedFeatures(e.point, {
            layers: ['clusters']
        });
        const clusterId = features[0].properties.cluster_id;
        clusterMap.getSource('campgrounds').getClusterExpansionZoom(
            clusterId,
            (err, zoom) => {
                if (err) return;

                clusterMap.easeTo({
                    center: features[0].geometry.coordinates,
                    zoom: zoom
                });
            }
        );
    });

    // Add click handlers for individual points
    clusterMap.on('click', 'unclustered-point', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const { title, location } = e.features[0].properties;

        new maplibregl.Popup()
            .setLngLat(coordinates)
            .setHTML(`<h3>${title}</h3><p>${location}</p>`)
            .addTo(clusterMap);
    });

    // Change the cursor to a pointer when the mouse is over the clusters
    clusterMap.on('mouseenter', 'clusters', () => {
        clusterMap.getCanvas().style.cursor = 'pointer';
    });
    clusterMap.on('mouseleave', 'clusters', () => {
        clusterMap.getCanvas().style.cursor = '';
    });
});
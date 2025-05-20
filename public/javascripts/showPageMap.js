console.log('showPageMap.js loaded');
console.log('Campground data:', window.campground);
console.log('MapTiler API Key:', window.maptilerApiKey);
console.log('Geometry object:', window.campground.geometry);

function initMap() {
    console.log('initMap function called');
    
    if (!window.campground.geometry || !window.campground.geometry.coordinates) {
        console.error('Campground coordinates are missing. Full campground data:', window.campground);
        return;
    }

    const [lng, lat] = window.campground.geometry.coordinates;
    console.log('Map coordinates:', { lng, lat });

    try {
        console.log('Attempting to create map...');
        const singleCampgroundMap = new maplibregl.Map({
            container: 'map',
            style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${window.maptilerApiKey}`,
            center: [lng, lat],
            zoom: 10
        });

        singleCampgroundMap.on('load', () => {
            console.log('Map loaded successfully');
            new maplibregl.Marker()
                .setLngLat([lng, lat])
                .setPopup(
                    new maplibregl.Popup({ offset: 25 })
                        .setHTML(`<h3>${window.campground.title}</h3><p>${window.campground.location}</p>`)
                )
                .addTo(singleCampgroundMap);
        });

        singleCampgroundMap.on('error', (e) => {
            console.error('Map error:', e);
        });
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

initMap();
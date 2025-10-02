const map = new maplibregl.Map({
	container: 'map',
	style: 'https://tiles.openfreemap.org/styles/bright',
	center: [27.5590, 53.9006],
	zoom: 6,
})

map.on('load', () => {
	map.addSource('belarus', {
		type: 'geojson',
		data: '/geo/custom.geo.json',
	})

	map.addLayer({
		id: 'belarus-fill',
		type: 'fill',
		source: 'belarus',
		layout: {},
		paint: {
			'fill-color': '#f28cb1',
			'fill-opacity': 0.4,
		},
	})

	map.addLayer({
		id: 'belarus-outline',
		type: 'line',
		source: 'belarus',
		layout: {},
		paint: {
			'line-color': '#e55e5e',
			'line-width': 2,
		},
	})
})


map.addControl(new maplibregl.NavigationControl())
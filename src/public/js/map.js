document.addEventListener('DOMContentLoaded', async () => {
	const map = new maplibregl.Map({
		container: 'map',
		style: 'https://tiles.openfreemap.org/styles/bright',
		center: [27.559, 53.9006],
		zoom: 6,
	})

	map.addControl(new maplibregl.NavigationControl())

	const response = await fetch('/students/geoJson')
	const json = await response.json()
	const studentsGeoJSON = json.data

	map.on('load', () => {
		map.addSource('students', {
			type: 'geojson',
			data: studentsGeoJSON,
		})

		map.addLayer({
			id: 'students-points',
			type: 'circle',
			source: 'students',
			paint: {
				'circle-radius': 6,
				'circle-color': '#007cbf',
				'circle-stroke-width': 2,
				'circle-stroke-color': '#fff',
			},
		})

		map.on('click', 'students-points', e => {
			const coordinates = e.features[0].geometry.coordinates.slice()
			const { name, faculty } = e.features[0].properties

			new maplibregl.Popup()
				.setLngLat(coordinates)
				.setHTML(`<strong>${name}</strong><p>${faculty}</p>`)
				.addTo(map)
		})

		map.on('mouseenter', 'students-points', () => {
			map.getCanvas().style.cursor = 'pointer'
		})
		map.on('mouseleave', 'students-points', () => {
			map.getCanvas().style.cursor = ''
		})

		map.addLayer({
			id: 'students-heatmap',
			type: 'heatmap',
			source: 'students',
			paint: {
				'heatmap-weight': 1,

				'heatmap-radius': ['interpolate', 
					['linear'], 
					['zoom'],
					4, 10,  
					6, 25, 
					10, 50  
				],

				'heatmap-color': [
					'interpolate',
					['linear'],
					['heatmap-density'],
					0, 'rgba(33,102,172,0)',
					0.2, 'rgb(103,169,207)',
					0.4, 'rgb(209,229,240)',
					0.6, 'rgb(253,219,199)',
					0.8, 'rgb(239,138,98)',
					1, 'rgb(178,24,43)',
				],

				'heatmap-intensity': [
					'interpolate',
					['linear'],
					['zoom'],
					4, 0.8,
					6, 1.5,
					10, 3
				],

				'heatmap-opacity': [
					'interpolate',
					['linear'],
					['zoom'],
					4, 1,
					10, 0.7
				],
			},
		})

		map.setLayoutProperty('students-points', 'visibility', 'visible')
		map.setLayoutProperty('students-heatmap', 'visibility', 'none')

		document.getElementById('btnHeat').addEventListener('click', () => {
			map.setLayoutProperty('students-points', 'visibility', 'none')
			map.setLayoutProperty('students-heatmap', 'visibility', 'visible')			
		})
		document.getElementById('btnPoints').addEventListener('click', () => {
			map.setLayoutProperty('students-points', 'visibility', 'visible')
			map.setLayoutProperty('students-heatmap', 'visibility', 'none')			
		})
	})
})

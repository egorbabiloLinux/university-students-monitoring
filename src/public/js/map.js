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
	})
})

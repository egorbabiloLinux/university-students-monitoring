async function loadStudentsData(url) {
    	const res = await fetch(url)

		if (!res.ok) throw new Error('Ошибка при получении данных')

		const data = await res.json()
		if (data.error) throw new Error(data.msg || 'Ошибка на сервере')

        return data
}

function colorByGradeGap(value) {
	const normalized = Math.min(3, value)
	const adjusted = 1 - Math.exp(-2 * normalized) 

	const r = Math.round(255 * adjusted)
	const g = Math.round(255 * (1 - adjusted))
	return `rgb(${r},${g},0)`
}

function colorByRiskProbability(value) {
    const adjusted = 1 - Math.exp(-4 * value)

	const r = Math.round(255 * adjusted)
	const g = Math.round(255 * (1 - adjusted))
	return `rgb(${r},${g},0)`
}

function colorBySocialRisk(value) {
	const r = Math.round(255 * value)
	const g = Math.round(255 * (1 - value))
	return `rgb(${r},${g},0)`
}

function colorByNormalizedGap(value) {
	const r = Math.round(255 * (1 - value))
	const g = Math.round(255 * value)
	return `rgb(${r},${g},0)`
}

function colorByImprovementProbability(value) {
	const r = Math.round(255 * (1 - value))
	const g = Math.round(255 * value)
	return `rgb(${r},${g},0)`
}


function renderStudents(data, minAvg) {
	const tbody = document.querySelector('#studentsTable tbody')
	tbody.innerHTML = ''

	const theadTr = document.querySelector('#studentsTable thead tr')
	theadTr.innerHTML = `
    <th>Имя</th>
    <th>Факультет</th>
    <th>Группа</th>
    <th>Средний балл</th>
    <th>Стипендия</th>
    <th>Нехватка баллов</th>
    <th>Вероятность потери стипендии</th>
    <th>Соц. риск</th>
    <th>Нормализованная нехватка баллов</th>
    <th>Вероятность достижения порогового значения</th>
    `

	data.students.forEach(s => {
		const tr = document.createElement('tr')

		const alpha = Math.min(0.6, Math.max(0, s.riskProbability))
		const bgColor = `rgba(255, 0, 0, ${alpha})`

		tr.style.backgroundColor = bgColor

		tr.innerHTML = `
                <td>${s.lastName} ${s.firstName}</td>
                <td>${s.faculty}</td>
                <td>${s.group}</td>
                <td>${s.avgGrade.toFixed(1)}</td>
                <td>${s.scholarship ?? '—'}</td>
                <td>${s.gradeGap.toFixed(1)}</td>
                <td>${s.riskProbability.toFixed(1)}</td>
                <td>${s.socialRisk}</td>
                <td>${s.normalizedGap.toFixed(2)}</td>
                <td>${s.improvementProbability.toFixed(2)}</td>
            `

		tbody.appendChild(tr)

		const cells = tr.children

		cells[5].style.color = colorByGradeGap(s.gradeGap)
		cells[6].style.color = colorByRiskProbability(s.riskProbability)
		cells[7].style.color = colorBySocialRisk(s.socialRisk)
		cells[8].style.color = colorByNormalizedGap(s.normalizedGap)
		cells[9].style.color = s.avgGrade < minAvg ? colorByImprovementProbability(s.improvementProbability) : ''
	})
}

function getStabilityColor(value) {
	// value 0..1: зелёный (хорошо) -> красный (плохо)
	const r = Math.round(255 * (1 - value))
	const g = Math.round(255 * value)
	return `rgb(${r},${g},0)`
}

function getLossColor(value) {
	// value 0..1: красный (плохо) -> зелёный (хорошо)
	const r = Math.round(255 * value)
	const g = Math.round(255 * (1 - value))
	return `rgb(${r},${g},0)`
}

function renderAnalysis(data) {
	const tbody = document.querySelector('#analysisTable tbody')
	tbody.innerHTML = ''

	const theadTr = document.querySelector('#analysisTable thead tr')
	theadTr.innerHTML = `
    <th>Отфильтровано студентов</th>
    <th>Экономия бюджета на стипендиях</th>
    <th>Доля студентов с высокой вероятностью улучшения</th>
    <th>Индекс устойчивости системы</th>
    <th>Индекс потерь качества</th>
    `

	const tr = document.createElement('tr')

	tr.innerHTML = `
    <td>${data.deprivedPercentage.toFixed(1)}</td>
    <td>${data.paymentsReduction.toFixed(2)}</td>
    <td>${data.improvementProbabilityShare.toFixed(2)}</td>
    <td id="stabilityCell">${data.stabilityIndex.toFixed(5)}</td>
    <td id="lossCell">${data.avgLossIndex.toFixed(5)}</td>
    `

	tbody.appendChild(tr)

	const stabilityCell = document.getElementById('stabilityCell')
	const lossCell = document.getElementById('lossCell')

	stabilityCell.style.color = getStabilityColor(data.stabilityIndex)
	lossCell.style.color = getLossColor(data.avgLossIndex)
}

let histogramImprovementChart = null
let histogramRiskChart = null

function buildHistogram(data, bucketsCount = 10) {
	// Создаем bucketsCount корзин (диапазонов) от 0 до 1
	const buckets = Array(bucketsCount).fill(0)
	const bucketSize = 1 / bucketsCount

	data.forEach(value => {
		let idx = Math.floor(value / bucketSize)
		if (idx === bucketsCount) idx = bucketsCount - 1 // крайнее значение 1 попадает в последний бакет
		buckets[idx]++
	})

	// Метки для оси X (диапазоны)
	const labels = []
	for (let i = 0; i < bucketsCount; i++) {
		const from = (i * bucketSize).toFixed(2)
		const to = ((i + 1) * bucketSize).toFixed(2)
		labels.push(`${from}–${to}`)
	}

	return { labels, buckets }
}

function renderHistograms(students) {
	// Данные для вероятности достижения порога
	const improvementData = students.map(s => s.improvementProbability)
	const { labels: impLabels, buckets: impBuckets } =
		buildHistogram(improvementData)

	// Данные для вероятности потери стипендии
	const riskData = students.map(s => s.riskProbability)
	const { labels: riskLabels, buckets: riskBuckets } = buildHistogram(riskData)

	const ctxImp = document
		.getElementById('histogramImprovement')
		.getContext('2d')
	const ctxRisk = document.getElementById('histogramRisk').getContext('2d')

	if (histogramImprovementChart) histogramImprovementChart.destroy()
	if (histogramRiskChart) histogramRiskChart.destroy()

	histogramImprovementChart = new Chart(ctxImp, {
		type: 'bar',
		data: {
			labels: impLabels,
			datasets: [
				{
					label: 'Количество студентов',
					data: impBuckets,
					backgroundColor: 'rgba(75, 192, 192, 0.7)',
				},
			],
		},
		options: {
			scales: {
				y: {
					beginAtZero: true,
					title: { display: true, text: 'Студенты' },
				},
				x: {
					title: { display: true, text: 'Вероятность достижения порога' },
				},
			},
		},
	})

	histogramRiskChart = new Chart(ctxRisk, {
		type: 'bar',
		data: {
			labels: riskLabels,
			datasets: [
				{
					label: 'Количество студентов',
					data: riskBuckets,
					backgroundColor: 'rgba(255, 99, 132, 0.7)',
				},
			],
		},
		options: {
			scales: {
				y: {
					beginAtZero: true,
					title: { display: true, text: 'Студенты' },
				},
				x: {
					title: { display: true, text: 'Вероятность потери стипендии' },
				},
			},
		},
	})
}

document.addEventListener('DOMContentLoaded', async () => {
    document.querySelector('#results h3').style.display = 'none'
	const data = await loadStudentsData('/analysis/studentsAvgLimit?hasScholarship=true')

    const theadTr = document.querySelector('#studentsTable thead tr')
	theadTr.innerHTML = `
    <th>Имя</th>
    <th>Факультет</th>
    <th>Группа</th>
    <th>Средний балл</th>
    <th>Стипендия</th>
    `
    
    const tbody = document.querySelector('#studentsTable tbody')
    tbody.innerHTML = ''

    data.students.forEach(s => {
        const tr = document.createElement('tr')

        tr.innerHTML = `
                <td>${s.lastName} ${s.firstName}</td>
                <td>${s.faculty}</td>
                <td>${s.group}</td>
                <td>${s.avgGrade.toFixed(1)}</td>
                <td>${s.scholarship ?? '—'}</td>
            `

        tbody.appendChild(tr)
    })
})

document.getElementById('analyzeBtn').addEventListener('click', async () => {
	const minAvg = document.getElementById('minAvg').value
	const errorBox = document.getElementById('error')
	const results = document.getElementById('results')
    const resultsTitle = document.querySelector('#results h3')

	errorBox.style.display = 'none'
	results.style.display = 'none'
    resultsTitle.style.display = 'none'

	if (!minAvg) {
		errorBox.textContent = 'Введите значение минимального среднего балла'
		errorBox.style.display = 'block'
		return
	}

	try {
        const url = `/analysis/studentsAvgLimit?minAvg=${minAvg}&hasScholarship=true`
        const data = await loadStudentsData(url)

        renderStudents(data, minAvg)

        renderAnalysis(data)

        renderHistograms(data.students)

		results.style.display = 'block'
        resultsTitle.style.display = 'block'
	} catch (err) {
		errorBox.textContent = err.message
		errorBox.style.display = 'block'
	}
})

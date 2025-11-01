async function renderStudents(url) {
    const res = await fetch(url)

    if (!res.ok) {
        console.error('Ошибка при загрузке данных', res.statusText)
        return
    }

    const data = await res.json()

    const tbody = document.querySelector('#studentsTable tbody')
    tbody.innerHTML = ''

    data.students.forEach(s => {
        const tr = document.createElement('tr')
        tr.setAttribute('data-bs-toggle', 'tooltip')
        tr.setAttribute('title', s.reason)

        tr.innerHTML = `
            <td>${s.lastName} ${s.firstName}</td>
            <td>${s.faculty}</td>
            <td>${s.group}</td>
            <td>${s.avgGrade !== null && s.avgGrade !== undefined ? s.avgGrade.toFixed(1) : '—'}</td>
            <td><strong>${s.riskIndex}</strong></td>
        `

        tbody.appendChild(tr)
    })

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(el => new bootstrap.Tooltip(el))
}

document.addEventListener('DOMContentLoaded', async () => {
    renderStudents('/analysis/studentsRisk')
})

document.getElementById('filterForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    const formData = new FormData(e.target)
    const params = new URLSearchParams(formData).toString()

    renderStudents(`/analysis/studentsRisk?${params}`)
})

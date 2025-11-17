let currentCalculationData = null

function showMessage(text, isError = false) {
    const messageEl = document.getElementById('message')
    messageEl.textContent = text
    messageEl.className = `message ${isError ? 'error' : 'success'} show`
    
    setTimeout(() => {
        messageEl.classList.remove('show')
    }, 5000)
}

function getScholarshipTypeLabel(type) {
    const labels = {
        'excellent': 'Отличная',
        'good': 'Хорошая',
        'base': 'Базовая',
        'social': 'Социальная',
        'none': 'Нет'
    }
    return labels[type] || type
}

function getScholarshipTypeColor(type) {
    const colors = {
        'excellent': '#28a745',
        'good': '#17a2b8',
        'base': '#007bff',
        'social': '#ffc107',
        'none': '#6c757d'
    }
    return colors[type] || '#6c757d'
}

async function calculateScholarships() {
    const minGrade = document.getElementById('minGrade').value
    const baseScholarship = document.getElementById('baseScholarship').value
    const excellentCoefficient = document.getElementById('excellentCoefficient').value
    const goodCoefficient = document.getElementById('goodCoefficient').value
    const faculty = document.getElementById('facultyFilter').value
    const group = document.getElementById('groupFilter').value

    if (!minGrade || !baseScholarship) {
        showMessage('Заполните все обязательные поля', true)
        return
    }

    try {
        const response = await fetch('/scholarshipCalculation/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                minGrade,
                baseScholarship,
                excellentCoefficient,
                goodCoefficient,
                faculty: faculty || undefined,
                group: group || undefined,
                applyChanges: 'false'
            })
        })

        const result = await response.json()

        if (result.error) {
            showMessage(result.msg || 'Ошибка при расчете стипендий', true)
            return
        }

        currentCalculationData = result.data
        renderResults(result.data)
        document.getElementById('applyBtn').classList.remove('hidden-button')
        document.getElementById('resultsContainer').classList.remove('hidden-container')
        showMessage('Расчет выполнен успешно')

    } catch (error) {
        console.error('Error calculating scholarships:', error)
        showMessage('Ошибка при расчете стипендий', true)
    }
}

function renderResults(data) {
    const summaryDiv = document.getElementById('summaryContainer')
    const tableDiv = document.getElementById('resultsTable')

    summaryDiv.innerHTML = `
        <div class="report-summary-grid">
            <div class="summary-card">
                <h4>Общая информация</h4>
                <p><strong>Всего студентов:</strong> ${data.summary.total}</p>
                <p><strong>Получат стипендию:</strong> ${data.summary.willGetScholarship}</p>
                <p><strong>Потеряют стипендию:</strong> ${data.summary.willLoseScholarship}</p>
                <p><strong>Изменения:</strong> ${data.summary.willChange}</p>
            </div>
            <div class="summary-card">
                <h4>Финансовые показатели</h4>
                <p><strong>Текущая сумма:</strong> ${data.summary.currentAmount.toLocaleString('ru-RU')} руб.</p>
                <p><strong>Новая сумма:</strong> ${data.summary.totalAmount.toLocaleString('ru-RU')} руб.</p>
                <p><strong>Разница:</strong> <span style="color: ${data.summary.difference >= 0 ? '#28a745' : '#dc3545'}">${data.summary.difference >= 0 ? '+' : ''}${data.summary.difference.toLocaleString('ru-RU')} руб.</span></p>
            </div>
            <div class="summary-card">
                <h4>Параметры расчета</h4>
                <p><strong>Мин. балл:</strong> ${data.parameters.minGrade}</p>
                <p><strong>Базовая стипендия:</strong> ${data.parameters.baseScholarship} руб.</p>
                <p><strong>Коэф. отличников:</strong> ${data.parameters.excellentCoefficient}</p>
                <p><strong>Коэф. хорошистов:</strong> ${data.parameters.goodCoefficient}</p>
            </div>
        </div>
    `

    let table = `
        <table class="students-analysis-table">
            <thead>
                <tr>
                    <th>ФИО</th>
                    <th>Факультет</th>
                    <th>Группа</th>
                    <th>Средний балл</th>
                    <th>Текущая стипендия</th>
                    <th>Рассчитанная стипендия</th>
                    <th>Тип</th>
                    <th>Изменение</th>
                </tr>
            </thead>
            <tbody>
    `

    data.results.forEach(result => {
        const changeIcon = result.willChange ? '⚠️' : '✓'
        const changeColor = result.willChange ? '#ffc107' : '#28a745'
        const typeColor = getScholarshipTypeColor(result.scholarshipType)
        
        table += `
            <tr style="${result.willChange ? 'background-color: rgba(255, 193, 7, 0.1);' : ''}">
                <td>${result.lastName} ${result.firstName}</td>
                <td>${result.faculty}</td>
                <td>${result.group}</td>
                <td>${result.avgGrade}</td>
                <td>${result.currentScholarship > 0 ? result.currentScholarship.toLocaleString('ru-RU') + ' руб.' : 'Нет'}</td>
                <td style="color: ${typeColor}; font-weight: bold;">${result.calculatedScholarship > 0 ? result.calculatedScholarship.toLocaleString('ru-RU') + ' руб.' : 'Нет'}</td>
                <td><span style="color: ${typeColor}">${getScholarshipTypeLabel(result.scholarshipType)}</span></td>
                <td style="color: ${changeColor}">${changeIcon}</td>
            </tr>
        `
    })

    table += `
            </tbody>
        </table>
    `

    tableDiv.innerHTML = table
}

async function applyChanges() {
    if (!currentCalculationData) {
        showMessage('Сначала выполните расчет', true)
        return
    }

    if (currentCalculationData.summary.willChange === 0) {
        showMessage('Нет изменений для применения', true)
        return
    }

    if (!confirm(`Применить изменения для ${currentCalculationData.summary.willChange} студентов?`)) {
        return
    }

    const minGrade = document.getElementById('minGrade').value
    const baseScholarship = document.getElementById('baseScholarship').value
    const excellentCoefficient = document.getElementById('excellentCoefficient').value
    const goodCoefficient = document.getElementById('goodCoefficient').value
    const faculty = document.getElementById('facultyFilter').value
    const group = document.getElementById('groupFilter').value

    try {
        const response = await fetch('/scholarshipCalculation/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                minGrade,
                baseScholarship,
                excellentCoefficient,
                goodCoefficient,
                faculty: faculty || undefined,
                group: group || undefined,
                applyChanges: 'true'
            })
        })

        const result = await response.json()

        if (result.error) {
            showMessage(result.msg || 'Ошибка при применении изменений', true)
            return
        }

        showMessage(`Изменения применены для ${result.data.summary.willChange} студентов`)
        
        setTimeout(() => {
            calculateScholarships()
        }, 1000)

    } catch (error) {
        console.error('Error applying changes:', error)
        showMessage('Ошибка при применении изменений', true)
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('calculateBtn').addEventListener('click', calculateScholarships)
    document.getElementById('applyBtn').addEventListener('click', applyChanges)
})


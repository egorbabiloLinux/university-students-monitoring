let currentReportData = null

function showMessage(text, isError = false) {
    const messageEl = document.getElementById('message')
    messageEl.textContent = text
    messageEl.className = `message ${isError ? 'error' : 'success'} show`
    
    setTimeout(() => {
        messageEl.classList.remove('show')
    }, 5000)
}

async function generateReport() {
    const startDate = document.getElementById('startDate').value
    const endDate = document.getElementById('endDate').value
    
    if (!startDate || !endDate) {
        showMessage('Укажите период для отчета', true)
        return
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showMessage('Дата начала не может быть позже даты окончания', true)
        return
    }
    
    try {
        const params = new URLSearchParams()
        params.append('startDate', startDate)
        params.append('endDate', endDate)
        
        const response = await fetch(`/reports/generate?${params.toString()}`)
        const result = await response.json()
        
        if (result.error) {
            showMessage(result.msg || 'Ошибка при генерации отчета', true)
            return
        }
        
        currentReportData = result.data
        renderReport(result.data)
        document.getElementById('exportBtn').classList.remove('hidden-button')
        document.getElementById('reportContainer').classList.remove('hidden-container')
        showMessage('Отчет успешно сгенерирован')
        
    } catch (error) {
        console.error('Error generating report:', error)
        showMessage('Ошибка при генерации отчета', true)
    }
}

function renderReport(data) {
    const container = document.getElementById('reportContainer')
    const summaryDiv = document.getElementById('reportSummary')
    const tablesDiv = document.getElementById('reportTables')
    
    container.classList.remove('hidden-container')

    summaryDiv.innerHTML = `
        <div class="report-summary-grid">
            <div class="summary-card">
                <h4>Общая информация</h4>
                <p><strong>Период:</strong> ${data.period.start} - ${data.period.end}</p>
                <p><strong>Всего студентов:</strong> ${data.summary.totalStudents}</p>
                <p><strong>Средний балл:</strong> ${data.summary.avgGradeAll}</p>
            </div>
            <div class="summary-card">
                <h4>По статусам</h4>
                <p><strong>Активные:</strong> ${data.summary.statusStats.active}</p>
                <p><strong>Выпускники:</strong> ${data.summary.statusStats.graduated}</p>
                <p><strong>Отчисленные:</strong> ${data.summary.statusStats.expelled}</p>
            </div>
            <div class="summary-card">
                <h4>По стипендиям</h4>
                <p><strong>Со стипендией:</strong> ${data.summary.scholarshipStats.withScholarship}</p>
                <p><strong>Без стипендии:</strong> ${data.summary.scholarshipStats.withoutScholarship}</p>
                <p><strong>Социальная стипендия:</strong> ${data.summary.scholarshipStats.socialScholarship}</p>
            </div>
            <div class="summary-card">
                <h4>Социальное положение</h4>
                <p><strong>Потеря кормильца:</strong> ${data.summary.socialStatusStats.lostBreadwinner}</p>
                <p><strong>Гос. поддержка:</strong> ${data.summary.socialStatusStats.stateSupport}</p>
                <p><strong>Сироты:</strong> ${data.summary.socialStatusStats.orphan}</p>
                <p><strong>Инвалиды:</strong> ${data.summary.socialStatusStats.disabled}</p>
            </div>
        </div>
    `
    
    // Таблица по факультетам
    let facultyTable = `
        <h4>Статистика по факультетам</h4>
        <table class="students-analysis-table">
            <thead>
                <tr>
                    <th>Факультет</th>
                    <th>Всего</th>
                    <th>Активные</th>
                    <th>Выпускники</th>
                    <th>Отчисленные</th>
                    <th>Со стипендией</th>
                    <th>Средний балл</th>
                </tr>
            </thead>
            <tbody>
    `
    
    data.facultyStats.forEach(faculty => {
        facultyTable += `
            <tr>
                <td>${faculty.faculty}</td>
                <td>${faculty.total}</td>
                <td>${faculty.active}</td>
                <td>${faculty.graduated}</td>
                <td>${faculty.expelled}</td>
                <td>${faculty.withScholarship}</td>
                <td>${faculty.avgGrade}</td>
            </tr>
        `
    })
    
    facultyTable += `
            </tbody>
        </table>
    `

    let groupTable = `
        <h4>Распределение по группам</h4>
        <table class="students-analysis-table">
            <thead>
                <tr>
                    <th>Группа</th>
                    <th>Количество студентов</th>
                </tr>
            </thead>
            <tbody>
    `
    
    data.groupStats.forEach(group => {
        groupTable += `
            <tr>
                <td>${group.group}</td>
                <td>${group.count}</td>
            </tr>
        `
    })
    
    groupTable += `
            </tbody>
        </table>
    `
    
    let regionTable = `
        <h4>Географическое распределение</h4>
        <table class="students-analysis-table">
            <thead>
                <tr>
                    <th>Регион</th>
                    <th>Количество студентов</th>
                </tr>
            </thead>
            <tbody>
    `
    
    data.regionStats.forEach(region => {
        regionTable += `
            <tr>
                <td>${region.region}</td>
                <td>${region.count}</td>
            </tr>
        `
    })
    
    regionTable += `
            </tbody>
        </table>
    `
    
    tablesDiv.innerHTML = facultyTable + groupTable + regionTable
}

function exportToExcel() {
    if (!currentReportData) {
        showMessage('Сначала сгенерируйте отчет', true)
        return
    }
    
    let csv = 'Отчет по контингенту вуза\n'
    csv += `Период: ${currentReportData.period.start} - ${currentReportData.period.end}\n\n`
    
    csv += 'Сводная информация\n'
    csv += `Всего студентов,${currentReportData.summary.totalStudents}\n`
    csv += `Средний балл,${currentReportData.summary.avgGradeAll}\n`
    csv += `Активные,${currentReportData.summary.statusStats.active}\n`
    csv += `Выпускники,${currentReportData.summary.statusStats.graduated}\n`
    csv += `Отчисленные,${currentReportData.summary.statusStats.expelled}\n\n`
    
    csv += 'Статистика по факультетам\n'
    csv += 'Факультет,Всего,Активные,Выпускники,Отчисленные,Со стипендией,Средний балл\n'
    currentReportData.facultyStats.forEach(faculty => {
        csv += `${faculty.faculty},${faculty.total},${faculty.active},${faculty.graduated},${faculty.expelled},${faculty.withScholarship},${faculty.avgGrade}\n`
    })
    
    csv += '\nРаспределение по группам\n'
    csv += 'Группа,Количество студентов\n'
    currentReportData.groupStats.forEach(group => {
        csv += `${group.group},${group.count}\n`
    })
    
    csv += '\nГеографическое распределение\n'
    csv += 'Регион,Количество студентов\n'
    currentReportData.regionStats.forEach(region => {
        csv += `${region.region},${region.count}\n`
    })
    
    csv += '\nСписок студентов\n'
    csv += 'ФИО,Факультет,Группа,Год поступления,Статус,Средний балл,Стипендия,Социальное положение,Регион,Город\n'
    currentReportData.students.forEach(student => {
        csv += `${student.lastName} ${student.firstName},${student.faculty},${student.group},${student.admissionYear},${student.status},${student.avgGrade},${student.hasScholarship ? 'Да' : 'Нет'},${student.socialStatus},${student.region},${student.city}\n`
    })
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `отчет_контингент_${currentReportData.period.start}_${currentReportData.period.end}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    showMessage('Отчет экспортирован в CSV')
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('generateBtn').addEventListener('click', generateReport)
    document.getElementById('exportBtn').addEventListener('click', exportToExcel)
})


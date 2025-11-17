const SocialFlags = {
    LOST_BREADWINNER: 0x01,
    STATE_SUPPORT: 0x02,
    ORPHAN: 0x04,
    DISABLED: 0x08,
}

function getSelectedSocialStatus() {
    let status = 0
    
    if (document.getElementById('statusLostBreadwinner').checked) {
        status |= SocialFlags.LOST_BREADWINNER
    }
    if (document.getElementById('statusStateSupport').checked) {
        status |= SocialFlags.STATE_SUPPORT
    }
    if (document.getElementById('statusOrphan').checked) {
        status |= SocialFlags.ORPHAN
    }
    if (document.getElementById('statusDisabled').checked) {
        status |= SocialFlags.DISABLED
    }
    
    return status
}

function decodeSocialStatus(status) {
    const flags = []
    if (status & SocialFlags.LOST_BREADWINNER) flags.push('Потеря кормильца')
    if (status & SocialFlags.STATE_SUPPORT) flags.push('Государственная поддержка')
    if (status & SocialFlags.ORPHAN) flags.push('Сирота')
    if (status & SocialFlags.DISABLED) flags.push('Инвалид')
    return flags.length > 0 ? flags.join(', ') : 'Нет'
}

function showMessage(text, isError = false) {
    const messageEl = document.getElementById('message')
    messageEl.textContent = text
    messageEl.className = `message ${isError ? 'error' : 'success'} show`
    
    setTimeout(() => {
        messageEl.classList.remove('show')
    }, 5000)
}

async function loadStudents() {
    const faculty = document.getElementById('facultyFilter').value
    const group = document.getElementById('groupFilter').value
    const socialStatus = getSelectedSocialStatus()
    
    const params = new URLSearchParams()
    if (faculty) params.append('faculty', faculty)
    if (group) params.append('group', group)
    if (socialStatus > 0) params.append('socialStatus', socialStatus)
    
    try {
        const response = await fetch(`/socialScholarship/getStudentsForSocialScholarship?${params.toString()}`)
        const data = await response.json()
        
        if (data.error) {
            showMessage(data.msg || 'Ошибка при загрузке студентов', true)
            return
        }
        
        renderStudents(data.students)
        
        updateFilters(data.faculties, data.groups, data.selected)
        
    } catch (error) {
        console.error('Error loading students:', error)
        showMessage('Ошибка при загрузке студентов', true)
    }
}

function updateFilters(faculties, groups, selected) {
    const facultySelect = document.getElementById('facultyFilter')
    const groupSelect = document.getElementById('groupFilter')
    
    const currentFaculty = facultySelect.value
    facultySelect.innerHTML = '<option value="">Все факультеты</option>'
    faculties.forEach(faculty => {
        const option = document.createElement('option')
        option.value = faculty
        option.textContent = faculty
        if (selected.faculty === faculty || currentFaculty === faculty) {
            option.selected = true
        }
        facultySelect.appendChild(option)
    })
    
    const currentGroup = groupSelect.value
    groupSelect.innerHTML = '<option value="">Все группы</option>'
    groups.forEach(group => {
        const option = document.createElement('option')
        option.value = group
        option.textContent = group
        if (selected.group === group || currentGroup === group) {
            option.selected = true
        }
        groupSelect.appendChild(option)
    })
}

function renderStudents(students) {
    const tbody = document.getElementById('studentsTableBody')
    tbody.innerHTML = ''
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-table-message">Студенты не найдены</td></tr>'
        return
    }
    
    students.forEach(student => {
        const tr = document.createElement('tr')
        tr.innerHTML = `
            <td>
                <input type="checkbox" class="student-checkbox" value="${student._id}">
            </td>
            <td>${student.lastName} ${student.firstName}</td>
            <td>${student.faculty}</td>
            <td>${student.group}</td>
            <td>${student.socialStatusText || decodeSocialStatus(student.socialStatus || 0)}</td>
            <td>
                <span class="status-badge ${student.hasScholarship ? 'has-scholarship' : 'no-scholarship'}">
                    ${student.hasScholarship ? 'Есть' : 'Нет'}
                </span>
            </td>
        `
        tbody.appendChild(tr)
    })
    
    updateSelectAllHandler()
}

function getSelectedStudentIds() {
    const checkboxes = document.querySelectorAll('.student-checkbox:checked')
    return Array.from(checkboxes).map(cb => cb.value)
}

async function bulkUpdateScholarship(action) {
    const selectedIds = getSelectedStudentIds()
    
    if (selectedIds.length === 0) {
        showMessage('Выберите хотя бы одного студента', true)
        return
    }
    
    const socialStatus = action === 'assign' ? getSelectedSocialStatus() : undefined
    
    if (action === 'assign' && socialStatus === 0) {
        if (!confirm('Вы не выбрали социальное положение. Назначить стипендию без указания социального положения?')) {
            return
        }
    }
    
    const confirmMessage = action === 'assign' 
        ? `Назначить социальную стипендию ${selectedIds.length} студентам?`
        : `Снять социальную стипендию у ${selectedIds.length} студентов?`
    
    if (!confirm(confirmMessage)) {
        return
    }
    
    try {
        const response = await fetch('/socialScholarship/bulkUpdateSocialScholarship', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                studentIds: selectedIds,
                action: action,
                socialStatus: socialStatus > 0 ? socialStatus : undefined
            })
        })
        
        const data = await response.json()
        
        if (data.error) {
            showMessage(data.msg || 'Ошибка при обновлении стипендий', true)
            return
        }
        
        showMessage(data.msg || 'Операция выполнена успешно')
        
        setTimeout(() => {
            loadStudents()
        }, 1000)
        
    } catch (error) {
        console.error('Error updating scholarship:', error)
        showMessage('Ошибка при обновлении стипендий', true)
    }
}

function updateSelectAllHandler() {
    const selectAll = document.getElementById('selectAll')
    const checkboxes = document.querySelectorAll('.student-checkbox')
    
    const newSelectAll = selectAll.cloneNode(true)
    selectAll.parentNode.replaceChild(newSelectAll, selectAll)
    
    newSelectAll.addEventListener('change', function() {
        checkboxes.forEach(cb => {
            cb.checked = this.checked
        })
    })
    
    checkboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            const allChecked = Array.from(checkboxes).every(c => c.checked)
            newSelectAll.checked = allChecked
        })
    })
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('filterBtn').addEventListener('click', loadStudents)
    
    document.getElementById('assignBtn').addEventListener('click', () => {
        bulkUpdateScholarship('assign')
    })
    
    document.getElementById('removeBtn').addEventListener('click', () => {
        bulkUpdateScholarship('remove')
    })
    
    loadStudents()
})


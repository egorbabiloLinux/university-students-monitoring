const Student = require('../models/student')
const logger = require('../logger')

function calculateRisk(student) {
	const avgGrade = student.avgGrade

	let risk = (10 - avgGrade) * 10
	let reasons = []

	if (avgGrade < 5) reasons.push('Низкая успеваемость')

	const s = student.socialStatus || 0
	if (s & 0x01 || s & 0x02 || s & 0x04 || s & 0x08) {
		reasons.push('Социальные факторы')
		risk += 15
	}

	return {
		riskIndex: Math.round(risk),
		reason: reasons.join(', ') || 'Нет проблем',
	}
}

exports.createStudentsControllers = function() {
    return {
        geojson: async (req, res) => {
            let response
            try {
                logger.info(`${req.method} ${req.url}`)
                const students = await Student.find({})
                geoJson = {
                    type: 'FeatureCollection',
                    features: students.map(student => ({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: student.hometown.location.coordinates
                        },
                        properties: {
                            name: `${student.firstName} ${student.lastName}`,
                            faculty: student.faculty
                        }
                    }))
                }
                response = {
                    error: false, 
                    data: geoJson
                }
                logger.info('Students geo sent')
                res.status(200).json(response)
            } catch(err) {
                response = {
                    error: true, 
                    msg: 'Internal server error'
                }
                logger.error({ response, err }, 'Failed to send students geo')
                res.status(500).json(response)
            }
        },
        studentsRisk: async (req, res) => {
            try {
                const { faculty, group } = req.query
                const query = {}    

                if (faculty) {
                    query.faculty = faculty
                }
                if (group) {
                    query.group = group
                }

                logger.info({ query }, `${req.method} ${req.url}`)

                const students = await Student.find(query).lean()

                const enriched = students.map(s => ({
                    ...s,
                    ...calculateRisk(s),
                }))

                enriched.sort((a, b) => b.riskIndex - a.riskIndex)

                const faculties = [...new Set(students.map(s => s.faculty))].sort()
                const groups = [...new Set(students.map(s => s.group))].sort(
                    (a, b) => a - b
                )

                response = {
                    error: false,
                    students: enriched,
                    faculties,
                    groups,
                    selected: { faculty, group },
                }

                logger.info(`Risk dashboard sent`)
                res.status(200).json(response)
            } catch (err) {
                response = {
                    error: true,
                    msg: 'Internal server error'
                }
                logger.error({response, err}, 'Failed to send risk dashboard')
                res.status(500).json(response)
            }
		},
        studentsAvgLimit: async (req, res) => {
            try {
                const { minAvg, hasScholarship } = req.query
                const query = {}

                if (minAvg) {
                    query.avgGrade = { $gt: Number(minAvg) }
                }
                if (hasScholarship !== undefined) {
                    query.hasScholarship = hasScholarship === 'true'
                }

                logger.info({ query }, `${req.method} ${req.url}`)

                const sortedStudents = await Student.find(query).lean()

                const totalStudents = await Student.find({hasScholarship: true}).lean()
                totalStudents.sort((a, b) => b.avgGrade - a.avgGrade)

                const deprivedPercentage = (1 - sortedStudents.length / totalStudents.length) * 100

                function countScholarships(students) {
                    return students.map(s => Number(s.scholarShip) || 0).reduce((a, b) => a + b, 0)
                }

                const allPayments = countScholarships(totalStudents)
                const leftPayments = countScholarships(sortedStudents)
                const paymentsReduction = allPayments - leftPayments

                function calculateSocialRisk(socialStatus) {
                    const riskWeights = {
                        0x01: 0.3,
                        0x02: 0.5,
                        0x04: 0.7, 
                        0x08: 1.0,
                    }

                    let maxRisk = 0

                    for (const [bitStr, weight] of Object.entries(riskWeights)) {
                        const bit = parseInt(bitStr)
                        if ((socialStatus & bit) !== 0) {
                            maxRisk = Math.max(maxRisk, weight)
                        }
                    }

                    return maxRisk
                }

                const maxGap = Math.max(...totalStudents.map(s => minAvg - s.avgGrade))

                function calculateMetrics(s) {
                    const gradeGap = Math.max(0, minAvg - s.avgGrade)
                    const normalizedGap = Math.max(0, Math.min(1, 1 - gradeGap / maxGap));
                    const socialRisk = calculateSocialRisk(s.socialStatus)
                    return  {
                        gradeGap: gradeGap,
                        riskProbability: Math.max(0, Math.min(1, (minAvg - s.avgGrade) / 2)),
                        socialRisk: socialRisk,
                        normalizedGap: normalizedGap,
                        improvementProbability: gradeGap > 0 ? normalizedGap * (1 - socialRisk) : 0,
                    }
				}

                const enriched = totalStudents.map(s => ({
                    ...s,
                    ...calculateMetrics(s),
                }))
                enriched.sort((a, b) => b.avgGrade - a.avgGrade)
                
                const deprivedStudents = enriched.filter(s => s.avgGrade < minAvg)
                const highImprovementCount = deprivedStudents.filter(s => s.improvementProbability > 0.7).length
                const improvementProbabilityShare = deprivedStudents.length ? highImprovementCount / deprivedStudents.length : 0
                const EPS = 0.05
                const stabilityIndex = (1 - deprivedPercentage / 100) * Math.sqrt(improvementProbabilityShare + EPS)
                const avgLossIndex = deprivedStudents.reduce((sum, s) => {
                    const diff = Math.max(0, minAvg - s.avgGrade)
                    return sum + (diff / minAvg) 
                }, 0) / deprivedStudents.length

                response = {
                    error: false,
                    students: enriched,
                    deprivedPercentage: deprivedPercentage,
                    paymentsReduction: paymentsReduction,
                    improvementProbabilityShare: improvementProbabilityShare * 100,
                    stabilityIndex: stabilityIndex,
                    avgLossIndex: avgLossIndex,
                }
                logger.info({ deprivedPercentage, paymentsReduction }, 'Students info sent')
                res.set('Cache-Control', 'no-store')

                res.status(200).json(response)
            } catch(err) {
                response = {
                    error: true, 
                    msg: 'Internal server error'
                }
                logger.error({response, err}, 'Failed to send students')
                res.status(500).json(response)
            }
        },
        getStudentsForSocialScholarship: async (req, res) => {
            try {
                const { faculty, group, socialStatus } = req.query
                const query = {}

                if (faculty) {
                    query.faculty = faculty
                }
                if (group) {
                    query.group = Number(group)
                }

                logger.info({ query, socialStatus }, `${req.method} ${req.url}`)

                let students = await Student.find(query).lean()

                if (socialStatus !== undefined && socialStatus !== '' && socialStatus !== 0) {
                    const statusValue = Number(socialStatus)
                    students = students.filter(student => {
                        const studentStatus = student.socialStatus || 0
                        return (studentStatus & statusValue) !== 0
                    })
                }

                const faculties = [...new Set(students.map(s => s.faculty))].sort()
                const groups = [...new Set(students.map(s => s.group))].sort(
                    (a, b) => a - b
                )

                function decodeSocialStatus(status) {
                    const flags = []
                    if (status & 0x01) flags.push('Потеря кормильца')
                    if (status & 0x02) flags.push('Государственная поддержка')
                    if (status & 0x04) flags.push('Сирота')
                    if (status & 0x08) flags.push('Инвалид')
                    return flags.length > 0 ? flags.join(', ') : 'Нет'
                }

                const enriched = students.map(s => ({
                    ...s,
                    socialStatusText: decodeSocialStatus(s.socialStatus || 0),
                }))

                const response = {
                    error: false,
                    students: enriched,
                    faculties,
                    groups,
                    selected: { faculty: faculty || '', group: group || '', socialStatus: socialStatus || '' },
                }

                logger.info(`Students for social scholarship sent`)
                res.status(200).json(response)
            } catch (err) {
                const response = {
                    error: true,
                    msg: 'Internal server error'
                }
                logger.error({response, err}, 'Failed to send students for social scholarship')
                res.status(500).json(response)
            }
        },
        bulkUpdateSocialScholarship: async (req, res) => {
            try {
                const { studentIds, action, socialStatus } = req.body

                if (!Array.isArray(studentIds) || studentIds.length === 0) {
                    return res.status(400).json({
                        error: true,
                        msg: 'Список студентов не может быть пустым'
                    })
                }

                if (!['assign', 'remove'].includes(action)) {
                    return res.status(400).json({
                        error: true,
                        msg: 'Неверное действие. Используйте "assign" или "remove"'
                    })
                }

                logger.info({ studentIds, action, socialStatus }, `${req.method} ${req.url}`)

                // let updateQuery = {}
                // if (action === 'assign') {
                //     // Назначить социальную стипендию
                //     updateQuery = {
                //         hasScholarship: true,
                //         socialStatus: socialStatus !== undefined ? Number(socialStatus) : { $exists: true }
                //     }
                // } else {
                //     // Снять социальную стипендию
                //     updateQuery = {
                //         hasScholarship: false
                //     }
                // }

                if (action === 'assign' && socialStatus !== undefined) {
                    const result = await Student.updateMany(
                        { _id: { $in: studentIds } },
                        { 
                            $set: { 
                                hasScholarship: true,
                                socialStatus: Number(socialStatus)
                            } 
                        }
                    )
                    
                    const response = {
                        error: false,
                        msg: `Социальная стипендия назначена ${result.modifiedCount} студентам`,
                        modifiedCount: result.modifiedCount
                    }
                    logger.info({ modifiedCount: result.modifiedCount }, 'Social scholarship assigned')
                    res.status(200).json(response)
                } else if (action === 'remove') {
                    const result = await Student.updateMany(
                        { _id: { $in: studentIds } },
                        { $set: { hasScholarship: false } }
                    )
                    
                    const response = {
                        error: false,
                        msg: `Социальная стипендия снята у ${result.modifiedCount} студентов`,
                        modifiedCount: result.modifiedCount
                    }
                    logger.info({ modifiedCount: result.modifiedCount }, 'Social scholarship removed')
                    res.status(200).json(response)
                } else {
                    const result = await Student.updateMany(
                        { _id: { $in: studentIds } },
                        { $set: { hasScholarship: true } }
                    )
                    
                    const response = {
                        error: false,
                        msg: `Стипендия назначена ${result.modifiedCount} студентам`,
                        modifiedCount: result.modifiedCount
                    }
                    logger.info({ modifiedCount: result.modifiedCount }, 'Scholarship assigned')
                    res.status(200).json(response)
                }
            } catch (err) {
                const response = {
                    error: true,
                    msg: 'Internal server error'
                }
                logger.error({response, err}, 'Failed to update social scholarship')
                res.status(500).json(response)
            }
        },
        generateContingentReport: async (req, res) => {
            try {
                const { startDate, endDate } = req.query

                const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1)
                const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), 11, 31)
                
                logger.info({ startDate: start, endDate: end }, `${req.method} ${req.url}`)

                const allStudents = await Student.find({}).lean()

                function decodeSocialStatus(status) {
                    const flags = []
                    if (status & 0x01) flags.push('Потеря кормильца')
                    if (status & 0x02) flags.push('Государственная поддержка')
                    if (status & 0x04) flags.push('Сирота')
                    if (status & 0x08) flags.push('Инвалид')
                    return flags.length > 0 ? flags.join(', ') : 'Нет'
                }

                const studentsInPeriod = allStudents.filter(student => {
                    const admissionYear = student.admissionYear || new Date().getFullYear()
                    const studentYear = new Date(admissionYear, 0, 1)
                    return studentYear >= start && studentYear <= end
                })

                const facultyStats = {}
                studentsInPeriod.forEach(student => {
                    const faculty = student.faculty || 'Не указан'
                    if (!facultyStats[faculty]) {
                        facultyStats[faculty] = {
                            total: 0,
                            active: 0,
                            graduated: 0,
                            expelled: 0,
                            withScholarship: 0,
                            avgGrade: 0,
                            totalAvgGrade: 0
                        }
                    }
                    facultyStats[faculty].total++
                    if (student.status === 'active') facultyStats[faculty].active++
                    if (student.status === 'graduated') facultyStats[faculty].graduated++
                    if (student.status === 'expelled') facultyStats[faculty].expelled++
                    if (student.hasScholarship) facultyStats[faculty].withScholarship++
                    if (student.avgGrade) {
                        facultyStats[faculty].totalAvgGrade += student.avgGrade
                    }
                })

                Object.keys(facultyStats).forEach(faculty => {
                    const stats = facultyStats[faculty]
                    if (stats.total > 0 && stats.totalAvgGrade > 0) {
                        stats.avgGrade = (stats.totalAvgGrade / stats.total).toFixed(2)
                    } else {
                        stats.avgGrade = '0.00'
                    }
                })

                const statusStats = {
                    active: studentsInPeriod.filter(s => s.status === 'active').length,
                    graduated: studentsInPeriod.filter(s => s.status === 'graduated').length,
                    expelled: studentsInPeriod.filter(s => s.status === 'expelled').length
                }

                const scholarshipStats = {
                    withScholarship: studentsInPeriod.filter(s => s.hasScholarship).length,
                    withoutScholarship: studentsInPeriod.filter(s => !s.hasScholarship).length,
                    socialScholarship: studentsInPeriod.filter(s => {
                        const status = s.socialStatus || 0
                        return (status & 0x01) || (status & 0x02) || (status & 0x04) || (status & 0x08)
                    }).length
                }

                const socialStatusStats = {
                    lostBreadwinner: studentsInPeriod.filter(s => (s.socialStatus || 0) & 0x01).length,
                    stateSupport: studentsInPeriod.filter(s => (s.socialStatus || 0) & 0x02).length,
                    orphan: studentsInPeriod.filter(s => (s.socialStatus || 0) & 0x04).length,
                    disabled: studentsInPeriod.filter(s => (s.socialStatus || 0) & 0x08).length,
                    none: studentsInPeriod.filter(s => !(s.socialStatus || 0)).length
                }

                const groupStats = {}
                studentsInPeriod.forEach(student => {
                    const group = student.group || 0
                    if (!groupStats[group]) {
                        groupStats[group] = 0
                    }
                    groupStats[group]++
                })

                const regionStats = {}
                studentsInPeriod.forEach(student => {
                    const region = student.hometown?.region || 'Не указан'
                    if (!regionStats[region]) {
                        regionStats[region] = 0
                    }
                    regionStats[region]++
                })

                const totalStudents = studentsInPeriod.length
                const avgGradeAll = studentsInPeriod
                    .filter(s => s.avgGrade)
                    .reduce((sum, s) => sum + s.avgGrade, 0) / studentsInPeriod.filter(s => s.avgGrade).length || 0

                const reportData = {
                    period: {
                        start: start.toISOString().split('T')[0],
                        end: end.toISOString().split('T')[0]
                    },
                    summary: {
                        totalStudents,
                        avgGradeAll: avgGradeAll.toFixed(2),
                        statusStats,
                        scholarshipStats,
                        socialStatusStats
                    },
                    facultyStats: Object.keys(facultyStats).map(faculty => ({
                        faculty,
                        ...facultyStats[faculty]
                    })),
                    groupStats: Object.keys(groupStats).map(group => ({
                        group: Number(group),
                        count: groupStats[group]
                    })).sort((a, b) => a.group - b.group),
                    regionStats: Object.keys(regionStats).map(region => ({
                        region,
                        count: regionStats[region]
                    })).sort((a, b) => b.count - a.count),
                    students: studentsInPeriod.map(s => ({
                        _id: s._id,
                        lastName: s.lastName,
                        firstName: s.firstName,
                        faculty: s.faculty,
                        group: s.group,
                        admissionYear: s.admissionYear,
                        status: s.status,
                        avgGrade: s.avgGrade || 0,
                        hasScholarship: s.hasScholarship,
                        socialStatus: decodeSocialStatus(s.socialStatus || 0),
                        region: s.hometown?.region || 'Не указан',
                        city: s.hometown?.city || 'Не указан'
                    }))
                }

                const response = {
                    error: false,
                    data: reportData
                }

                logger.info({ totalStudents, faculties: Object.keys(facultyStats).length }, 'Contingent report generated')
                res.status(200).json(response)
            } catch (err) {
                const response = {
                    error: true,
                    msg: 'Internal server error'
                }
                logger.error({response, err}, 'Failed to generate contingent report')
                res.status(500).json(response)
            }
        },
        calculateScholarships: async (req, res) => {
            try {
                const { 
                    minGrade, 
                    baseScholarship, 
                    excellentCoefficient, 
                    goodCoefficient,
                    faculty,
                    group,
                    applyChanges
                } = req.body

                const minGradeNum = Number(minGrade) || 5.0
                const baseScholarshipNum = Number(baseScholarship) || 2000
                const excellentCoeff = Number(excellentCoefficient) || 1.5
                const goodCoeff = Number(goodCoefficient) || 1.2

                logger.info({ minGrade: minGradeNum, baseScholarship: baseScholarshipNum, excellentCoeff, goodCoeff, faculty, group, applyChanges }, `${req.method} ${req.url}`)

                const query = { status: 'active' }
                if (faculty) query.faculty = faculty
                if (group) query.group = Number(group)

                const students = await Student.find(query).lean()

                const results = students.map(student => {
                    const avgGrade = student.avgGrade || 0
                    let scholarship = 0
                    let hasScholarship = false
                    let scholarshipType = 'none'

                    if (avgGrade >= minGradeNum) {
                        hasScholarship = true
                        
                        if (avgGrade >= 9.0) {
                            scholarship = Math.round(baseScholarshipNum * excellentCoeff)
                            scholarshipType = 'excellent'
                        } else if (avgGrade >= 7.0) {
                            scholarship = Math.round(baseScholarshipNum * goodCoeff)
                            scholarshipType = 'good'
                        } else {
                            scholarship = baseScholarshipNum
                            scholarshipType = 'base'
                        }

                        const socialStatus = student.socialStatus || 0
                        if ((socialStatus & 0x01) || (socialStatus & 0x02) || (socialStatus & 0x04) || (socialStatus & 0x08)) {
                            scholarship = Math.round(scholarship * 1.3)
                            scholarshipType = 'social'
                        }
                    }

                    return {
                        _id: student._id,
                        lastName: student.lastName,
                        firstName: student.firstName,
                        faculty: student.faculty,
                        group: student.group,
                        avgGrade: avgGrade.toFixed(2),
                        currentScholarship: student.scholarShip || 0,
                        currentHasScholarship: student.hasScholarship || false,
                        calculatedScholarship: scholarship,
                        calculatedHasScholarship: hasScholarship,
                        scholarshipType,
                        willChange: (student.hasScholarship !== hasScholarship) || (student.scholarShip !== scholarship)
                    }
                })

                const summary = {
                    total: results.length,
                    willGetScholarship: results.filter(r => r.calculatedHasScholarship).length,
                    willLoseScholarship: results.filter(r => r.currentHasScholarship && !r.calculatedHasScholarship).length,
                    willChange: results.filter(r => r.willChange).length,
                    totalAmount: results.reduce((sum, r) => sum + r.calculatedScholarship, 0),
                    currentAmount: results.reduce((sum, r) => sum + r.currentScholarship, 0),
                    difference: results.reduce((sum, r) => sum + (r.calculatedScholarship - r.currentScholarship), 0)
                }

                if (applyChanges === 'true') {
                    const updates = results.filter(r => r.willChange)
                    
                    for (const result of updates) {
                        await Student.updateOne(
                            { _id: result._id },
                            {
                                $set: {
                                    hasScholarship: result.calculatedHasScholarship,
                                    scholarShip: result.calculatedScholarship
                                }
                            }
                        )
                    }

                    logger.info({ updated: updates.length }, 'Scholarships updated')
                }

                const response = {
                    error: false,
                    data: {
                        summary,
                        results,
                        parameters: {
                            minGrade: minGradeNum,
                            baseScholarship: baseScholarshipNum,
                            excellentCoefficient: excellentCoeff,
                            goodCoefficient: goodCoeff
                        }
                    }
                }

                res.status(200).json(response)
            } catch (err) {
                const response = {
                    error: true,
                    msg: 'Internal server error'
                }
                logger.error({response, err}, 'Failed to calculate scholarships')
                res.status(500).json(response)
            }
        },
        getStudentsForScholarshipCalculation: async (req, res) => {
            try {
                const students = await Student.find({ status: 'active' }).lean()
                const faculties = [...new Set(students.map(s => s.faculty))].sort()
                const groups = [...new Set(students.map(s => s.group))].sort()

                const response = {
                    error: false,
                    faculties,
                    groups
                }

                res.status(200).json(response)
            } catch (err) {
                const response = {
                    error: true,
                    msg: 'Internal server error'
                }
                logger.error({response, err}, 'Failed to get students for calculation')
                res.status(500).json(response)
            }
        }
    }
}
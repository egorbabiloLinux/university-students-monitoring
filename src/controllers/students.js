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
                    return students.map(s => Number(s.scholarship) || 0).reduce((a, b) => a + b, 0)
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
        }
    }
}
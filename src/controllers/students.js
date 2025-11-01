const Student = require('../models/student')
const logger = require('../logger')

function calculateRisk(student) {
	const grades = Object.values(student.grades || {})
	const avgGrade = grades.length
		? grades.reduce((a, b) => a + b, 0) / grades.length
		: 0

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
                const { avg, hasScholarship } = req.params
                const query = {}

                logger.info({ query }, `${req.method} ${req.url}`)

                if (avg) {
                    query.avg = avg
                }
                if (hasScholarship !== undefined) {
                    query.hasScholarship = hasScholarship === 'true'
                }

                const students =  await Student.find(query).lean()

                response = {
                    error: false,
                    students: students,
                }
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
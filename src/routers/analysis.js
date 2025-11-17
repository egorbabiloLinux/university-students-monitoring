const express = require('express')
const router = express.Router()
const checkRole = require('../middleware/checkRole')
const User = require('../models/user')
const { USER_ROLES } = User
const { createStudentsControllers } = require('../controllers/students')
const Student = require('../models/student')
const logger = require('../logger')

const studentsControllers = createStudentsControllers()

// Все авторизованные пользователи могут просматривать аналитику
router.get('/riskDashboard', checkRole(USER_ROLES.TEACHER, USER_ROLES.DEANERY, USER_ROLES.ADMIN), async (req, res) => {
	try {
		const students = await Student.find({}).lean()
		const faculties = [...new Set(students.map(s => s.faculty))].sort()
		const groups = [...new Set(students.map(s => s.group))].sort()

		res.render('riskDashboard', {
		title: 'Students dashboard',
		faculties,
		groups,
		selected: { faculty: '', group: '' },
	})
	} catch (err) {
		logger.error(err)
		res.status(500).send('Internal Server Error')
	}
})

router.get('/scholarshipAnalysis', checkRole(USER_ROLES.TEACHER, USER_ROLES.DEANERY, USER_ROLES.ADMIN), async(req, res) => {
	try {
		const students = await Student.find({}).lean()
		const faculties = [...new Set(students.map(s => s.faculty))].sort()
		const groups = [...new Set(students.map(s => s.group))].sort()

		res.render('scholarshipAnalysisDashboard', {
		title: 'Scholarship dashboard',
		faculties,
		groups,
		selected: { faculty: '', group: '' },
		})
	} catch (err) {
		logger.error(err)
		res.status(500).send('Internal Server Error')
	}
})

router.get('/studentsRisk', checkRole(USER_ROLES.TEACHER, USER_ROLES.DEANERY, USER_ROLES.ADMIN), studentsControllers.studentsRisk)
router.get('/studentsAvgLimit', checkRole(USER_ROLES.TEACHER, USER_ROLES.DEANERY, USER_ROLES.ADMIN), studentsControllers.studentsAvgLimit)

module.exports = router
const express = require('express')
const router = express.Router()
const checkAuth = require('../middleware/authMiddleware')
const { createStudentsControllers } = require('../controllers/students')
const Student = require('../models/student')
const logger = require('../logger')

const studentsControllers = createStudentsControllers()

router.get('/riskDashboard'/*, checkAuth*/, async (req, res) => {
	try {
		const students = await Student.find({}).lean()
		const faculties = [...new Set(students.map(s => s.faculty))].sort()
		const groups = [...new Set(students.map(s => s.group))].sort()

		res.render('riskDashboard', {
		title: 'Students dashboard',
		students,
		faculties,
		groups,
		selected: { faculty: '', group: '' },
	})
	} catch (err) {
		logger.error(err)
		res.status(500).send('Internal Server Error')
	}
})

router.get('/studentsRisk', studentsControllers.studentsRisk)

module.exports = router
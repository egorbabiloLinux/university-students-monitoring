const express = require('express')
const router = express.Router()
const checkRole = require('../middleware/checkRole')
const User = require('../models/user')
const { USER_ROLES } = User
const { createStudentsControllers } = require('../controllers/students')
const Student = require('../models/student')
const logger = require('../logger')

const studentsControllers = createStudentsControllers()

router.get('/', checkRole(USER_ROLES.DEANERY, USER_ROLES.ADMIN), async (req, res) => {
	try {
		const students = await Student.find({ status: 'active' }).lean()
		const faculties = [...new Set(students.map(s => s.faculty))].sort()
		const groups = [...new Set(students.map(s => s.group))].sort()

		res.render('scholarshipCalculation', {
			title: 'Расчет стипендий',
			faculties,
			groups,
			selected: { faculty: '', group: '' },
		})
	} catch (err) {
		logger.error(err)
		res.status(500).send('Internal Server Error')
	}
})

router.get('/getStudents', checkRole(USER_ROLES.DEANERY, USER_ROLES.ADMIN), studentsControllers.getStudentsForScholarshipCalculation)
router.post('/calculate', checkRole(USER_ROLES.DEANERY, USER_ROLES.ADMIN), studentsControllers.calculateScholarships)

module.exports = router


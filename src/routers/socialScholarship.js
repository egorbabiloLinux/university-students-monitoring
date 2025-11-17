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
		const students = await Student.find({}).lean()
		const faculties = [...new Set(students.map(s => s.faculty))].sort()
		const groups = [...new Set(students.map(s => s.group))].sort()

		res.render('socialScholarshipManagement', {
			title: 'Массовое управление социальной стипендией',
			faculties,
			groups,
			selected: { faculty: '', group: '', socialStatus: '' },
		})
	} catch (err) {
		logger.error(err)
		res.status(500).send('Internal Server Error')
	}
})

router.get('/getStudentsForSocialScholarship', checkRole(USER_ROLES.DEANERY, USER_ROLES.ADMIN), studentsControllers.getStudentsForSocialScholarship)
router.post('/bulkUpdateSocialScholarship', checkRole(USER_ROLES.DEANERY, USER_ROLES.ADMIN), studentsControllers.bulkUpdateSocialScholarship)

module.exports = router


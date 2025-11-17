const express = require('express')
const router = express.Router()
const checkRole = require('../middleware/checkRole')
const User = require('../models/user')
const { USER_ROLES } = User
const { createStudentsControllers } = require('../controllers/students')
const logger = require('../logger')

const studentsControllers = createStudentsControllers()

router.get('/', checkRole(USER_ROLES.DEANERY, USER_ROLES.ADMIN), async (req, res) => {
	try {
		const currentYear = new Date().getFullYear()
		const startDate = `${currentYear}-01-01`
		const endDate = `${currentYear}-12-31`

		res.render('contingentReport', {
			title: 'Отчет по контингенту вуза',
			startDate,
			endDate,
		})
	} catch (err) {
		logger.error(err)
		res.status(500).send('Internal Server Error')
	}
})

router.get('/generate', checkRole(USER_ROLES.DEANERY, USER_ROLES.ADMIN), studentsControllers.generateContingentReport)

module.exports = router


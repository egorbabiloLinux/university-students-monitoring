const express = require('express')
const router = express.Router()
const checkRole = require('../middleware/checkRole')
const User = require('../models/user')
const { USER_ROLES } = User
const { createStudentsControllers } = require('../controllers/students')

const studentsControllers = createStudentsControllers()
router.get('/geoJson', checkRole(USER_ROLES.TEACHER, USER_ROLES.DEANERY, USER_ROLES.ADMIN), studentsControllers.geojson)

module.exports = router
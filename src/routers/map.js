const express = require('express')
const router = express.Router()
const checkRole = require('../middleware/checkRole')
const User = require('../models/user')
const { USER_ROLES } = User

router.get('/', checkRole(USER_ROLES.TEACHER, USER_ROLES.DEANERY, USER_ROLES.ADMIN), (req, res) => {
	res.render('map', { title: 'Map' })
});

module.exports = router
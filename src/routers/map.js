const express = require('express')
const router = express.Router()
const checkAuth = require('../middleware/authMiddleware')

router.get('/', checkAuth, (req, res) => {
	res.render('map', { title: 'Map' })
});

module.exports = router
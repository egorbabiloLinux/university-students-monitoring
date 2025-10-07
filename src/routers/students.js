const express = require('express')
const router = express.Router()
const { createStudentsControllers } = require('../controllers/students')

const studentsControllers = createStudentsControllers()

router.get('/geoJson', studentsControllers.geojson)

module.exports = router
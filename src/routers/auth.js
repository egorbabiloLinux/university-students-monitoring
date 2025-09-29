const express = require('express')
const router = express.Router()
const { createUserControllers } = require('../controllers/users')

const userControllers = createUserControllers()

router.post('/register', userControllers.register)
router.post('/login', userControllers.login)
router.delete('/logout', userControllers.logout)

module.exports = router
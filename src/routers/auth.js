const express = require('express')
const router = express.Router()
const User = require('../models/user')
const { createUserControllers } = require('../controllers/users')

module.exports = function() {
    const userControllers = createUserControllers()

    router.post('/register', userControllers.register)
    router.post('/login', userControllers.login)
    router.delete('/logout', userControllers.logout)

    return router
}
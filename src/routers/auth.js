const express = require('express')
const router = express.Router()
const User = require('../models/user')
const { createUserControllers } = require('../controllers/users')

module.exports = function(app) {
    const db = app.locals.db
    const user = new User(db)
    const userControllers = createUserControllers(user)

    router.post('/register', userControllers.register)
    router.post('/login', userControllers.login)
    router.delete('/logout', userControllers.logout)

    return router
}
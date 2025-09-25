const validator  = require('validator')
const logger = require('../logger').logger

exports.createUserControllers = function(user) {
    return {
        register: async (req, res) => {
            const email = req.body.email
            const password = req.body.password
            const confirmationPassword = req.body.confirmationPassword
            const stayOnline = req.body.stayOnline

            if (
                !validator.isEmail(email) ||
                !validator.isLength(email, { min: 6, max: 64 }) ||
                !password ||
                password.length < 6 ||
                password !== confirmationPassword
            ) {
                res.status(400).json({
                    error: true,
                    msg: 'Check your',
                })

                return
            }

            try {
                const id = await user.create(email, password)
                
                req.session.authorized = true
                req.session.user_id = id
                req.session.email = email
                req.session.createdAt = new Date()

                if (stayOnline) {
                    req.session.maxAge = 30 * 24 * 60 * 60 * 1000
                } else {
                    req.session.cookie.expires = false
                }
                res.status(200).json({
					error: false,
					msg: 'Success register email: ' + email,
					user: { id, email },
				})
            } catch (err) {
                logger.error({ err: err, email: email }, 'Failed to register user')
                res.status(400).json({
                    error: true,
                    msg: 'Failed to register user'
                })
            }
        },
        login: async (req, res) => {
            const email = req.body.email
            const password = req.body.password
            const stayOnline = req.body.stayOnline

            try {
                const { canLogin, id } = await user.check(email, password)
                if (!canLogin) {
                    res.status(400).json({
                        error: true,
                        msg: 'Check your email or password',
                    })
                    return
                }

                req.session.authorized = true
                req.session.user_id = id
                req.session.email = email

                if (stayOnline) {
					req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000
				} else {
					req.session.cookie.expires = false
				}

                res.status(200).json({
                    error: false,
                    msg: 'Success login email: ' + email,
                    user: { id, email }
                })
            } catch (err) {
                logger.error({ err: err, email: email }, 'Failed to login user')
                res.status(401).json({
					error: true,
					msg: 'Failed to login user',
				})
            }
        },
        logout: async (req, res) => {
            if (!req.session.authorized) {
                res.status(400).json({
                    error: true,
                    msg: 'You are not loggined',
                })
                return
            }

            req.session.destroy((err) => {
                if (err) {
                    logger.error({ err }, 'Session destroy error')
                    res.status(500).json({
                        error: true,
                        msg: 'Logout failed'
                    })
                }

                res.clearCookie('connect.sid')
                res.status(200).json({
                    error: false,
                    msg: 'Logout successfully'
                })
            })
        }
    }
}
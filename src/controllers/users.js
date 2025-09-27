const validator  = require('validator')
const { logger } = require('../logger')

exports.createUserControllers = function(user) {
    return {
        register: async (req, res) => {
            let response;
            const email = req.body.email
            const password = req.body.password
            const confirmationPassword = req.body.confirmationPassword
            const stayOnline = req.body.stayOnline
            const sessionID = req.sessionID
            const meta = { sessionID, email, password, confirmationPassword, stayOnline }

            logger.info({ meta }, `${req.method} ${req.url}`)

            if (
                !validator.isEmail(email) ||
                !validator.isLength(email, { min: 6, max: 64 }) ||
                !password ||
                password.length < 6 ||
                password !== confirmationPassword
            ) {
                response = {
					error: true,
					msg: 'Check your credentials',
				}
                logger.warn({ response }, 'Validation failed on register')
                res.status(400).json(response)

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

                response = {
					error: false,
					msg: 'Success register email: ' + email,
					user: { id, email },
				}
                logger.info({ response }, 'Register success')
                res.status(200).json(response)
            } catch (err) {
                response = {
                    error: true,
                    msg: 'Failed to register user'
                }
                logger.error({ response, err }, 'Failed to register user')
                res.status(400).json(response)
            }
        },
        login: async (req, res) => {
            let response
            const email = req.body.email
            const password = req.body.password
            const stayOnline = req.body.stayOnline
            const sessionID = req.sessionID
            const meta = { sessionID, email, password, stayOnline }

            logger.info({ meta }, `${req.method} ${req.url}`)

            try {
                const { canLogin, id } = await user.check(email, password)
                if (!canLogin) {
                    response = {
                        error: true,
                        msg: 'Check your email or password',
                    }
                    logger.info({response}, 'User can not login')
                    res.status(400).json(response)
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

                response = {
                    error: false,
                    msg: 'Success login email: ' + email,
                    user: { id, email }
                }
                res.status(200).json(response)
            } catch (err) {
                response = {
					error: true,
					msg: 'Failed to login user',
				}
                logger.error({ response, err }, 'Failed to login user')
                res.status(401).json(response)
            }
        },
        logout: async (req, res) => {
            let response
            const sessionID = req.sessionID
			const meta = { sessionID }

            logger.info({ meta }, `${req.method} ${req.url}`)

            if (!req.session.authorized) {
                response = {
                    error: true,
                    msg: 'You are not loggined',
                }
                logger.info({ response }, 'User are no loginned')
                res.status(400).json(response)
                return
            }

            req.session.destroy((err) => {
                if (err) {
                    response = {
                        error: true,
                        msg: 'Logout failed'
                    }
                    logger.error({ response, err }, 'Session destroy error')
                    res.status(500).json(response)

                    return
                }

                response = {
                    error: false,
                    msg: 'Logout successfully'
                }
                res.clearCookie('connect.sid')
                res.status(200).json(response)
            })
        }
    }
}
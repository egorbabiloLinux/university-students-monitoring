const validator  = require('validator')
const logger = require('../logger')
const User = require('../models/user')
const { USER_ROLES } = User

// router.post(
// 	'/register',
// 	check('email')
// 		.isEmail()
// 		.withMessage('Enter a valid email address')
// 		.normalizeEmail(),
// 	check('first_name')
// 		.not()
// 		.isEmpty()
// 		.withMessage('You first name is required')
// 		.trim()
// 		.escape(),
// 	check('last_name')
// 		.not()
// 		.isEmpty()
// 		.withMessage('You last name is required')
// 		.trim()
// 		.escape(),
// 	check('password')
// 		.notEmpty()
// 		.isLength({ min: 8 })
// 		.withMessage('Must be at least 8 chars long'),
// 	Validate,
// 	Register
// )

exports.createUserControllers = function() {
    return {
        register: async (req, res) => {
            let response;
            const { email, password, confirmationPassword, role, stayOnline } = req.body
            const sessionID = req.sessionID
            const meta = { sessionID, email, password, confirmationPassword, role, stayOnline }

            logger.info({ meta }, `${req.method} ${req.url}`)

            let userRole = USER_ROLES.TEACHER
            if (role !== undefined && role !== null) {
                const roleNum = parseInt(role)
                const validRoles = [USER_ROLES.ADMIN, USER_ROLES.DEANERY, USER_ROLES.TEACHER]
                if (validRoles.includes(roleNum)) {
                    userRole = roleNum
                } else {
                    response = {
                        error: true,
                        msg: 'Invalid role selected',
                    }
                    logger.warn({ response }, 'Invalid role on register')
                    res.status(400).json(response)
                    return
                }
            }

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
                const newUser = new User({email, password, role: userRole})

                const existingUser = await User.findOne({ email })
                if (existingUser) {
                    response = {
                        error: true,
                        msg: 'User already exists'
                    }
                    logger.error({ response }, 'Failed to register user')
                    res.status(400).json(response)
                    return
                }

                const savedUser = await newUser.save()
                const id = savedUser._id
                
                req.session.authorized = true
                req.session.user_id = id
                req.session.email = email
                req.session.role = savedUser.role
                req.session.createdAt = new Date()

                if (stayOnline) {
                    req.session.maxAge = 30 * 24 * 60 * 60 * 1000
                } else {
                    req.session.cookie.expires = false
                }

                const{role, ...user_data} = savedUser._doc
                response = {
					error: false,
					msg: 'Success register email: ' + email,
					data: user_data,
				}
                logger.info({ response }, 'Register success')
                res.status(200).json(response)
            } catch (err) {
                response = {
                    error: true,
                    msg: 'Internal storage error'
                }
                logger.error({ response, err }, 'Failed to register user')
                res.status(500).json(response)
            }
        },
        login: async (req, res) => {
            let response
            const { email, password, stayOnline } = req.body
            const sessionID = req.sessionID
            const meta = { sessionID, email, password, stayOnline }

            logger.info({ meta }, `${req.method} ${req.url}`)

            try {
                const user = await User.check(email, password)
                if (!user.emailCheck) {
                    response = {
                        error: true,
                        msg: 'Check your email or password',
                    }
                    logger.error({response}, 'User can not login')
                    res.status(400).json(response)
                    return
                }

                req.session.authorized = true
                req.session.user_id = user._id
                req.session.email = email
                req.session.role = user.role

                if (stayOnline) {
					req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000
				} else {
					req.session.cookie.expires = false
				}

                const { role, ...user_data } = user._doc
                response = {
                    error: false,
                    msg: 'Success login email: ' + email,
                    data: user_data
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
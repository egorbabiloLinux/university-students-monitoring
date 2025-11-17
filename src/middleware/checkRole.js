const User = require('../models/user')
const { USER_ROLES } = User

function checkRole(...allowedRoles) {
    return async (req, res, next) => {
        if (!req.session || !req.session.authorized) {
            if (req.headers['content-type']?.includes('application/json') || req.xhr) {
                return res.status(401).json({
                    error: true,
                    msg: 'User is not authorized'
                })
            }
            return res.redirect('/')
        }

        let userRole = req.session.role
        
        if (!userRole) {
            try {
                const user = await User.findById(req.session.user_id)
                if (user) {
                    userRole = user.role
                    req.session.role = userRole
                } else {
                    if (req.headers['content-type']?.includes('application/json') || req.xhr) {
                        return res.status(401).json({
                            error: true,
                            msg: 'User not found'
                        })
                    }
                    return res.redirect('/')
                }
            } catch (err) {
                if (req.headers['content-type']?.includes('application/json') || req.xhr) {
                    return res.status(500).json({
                        error: true,
                        msg: 'Failed to verify user role'
                    })
                }
                return res.redirect('/')
            }
        }

        if (userRole === USER_ROLES.ADMIN || allowedRoles.includes(userRole)) {
            req.user = req.user || {}
            req.user.role = userRole
            return next()
        }

        if (req.headers['content-type']?.includes('application/json') || req.xhr) {
            return res.status(403).json({
                error: true,
                msg: 'Access denied. Insufficient permissions.'
            })
        }
        
        return res.status(403).send('Access denied. Insufficient permissions.')
    }
}

module.exports = checkRole


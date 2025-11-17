const logger = require('../logger')

module.exports = function verify(req, res, next) {
    const session = req.session
    if (!req.session || !req.session.authorized) {
        return res.status(401).json({
            error: true,
            msg: 'User is not authorized'
        })
    }

    if (session.maxAge) {
        const now = Date.now()
        const sessionStart = new Date(session.createdAt).getTime()
        if (now - sessionStart > session.maxAge) {
            req.session.destroy(err => {
                if (err) logger.error({err}, 'Failed to destroy session token')
            })
            return res.status(401).json({
                error: true,
                msg: 'Session expired'
            })
        }
    }

    req.user = {
        id: session.user_id,
        email: session.email,
        role: session.role,
    }

    next()
}
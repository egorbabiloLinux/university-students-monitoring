const { checkout } = require("../routers/map")

function checkAuth(req, res, next) {
    if (req.session && req.session.authorized) {
        next()
    } else {
        res.redirect('/')
    }
}

module.exports = checkAuth
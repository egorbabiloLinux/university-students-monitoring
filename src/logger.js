const pino = require('pino')
const pinoHttp = require('pino-http')

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: { colorize: true },
    }
})

const httpLogger = pinoHttp({
	logger,
	serializers: {
		req: req => ({
			method: req.method,
			url: req.url,
            ...req.extra
		}),
		res: res => ({
			statusCode: res.statusCode,
			...res.extra
		}),
	},
	customSuccessMessage: (req, res) => {
		return `msg: ${ req.msgForLogger ?? 'undefined' }`
	},
	customErrorMessage: (req, res, err) => {
		return `msg: ${ req.msgForLogger ?? err.message }`
	},
})

module.exports = { logger, httpLogger }
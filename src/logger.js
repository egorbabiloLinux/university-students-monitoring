const pino = require('pino')
const pinoHttp = require('pino-http')

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: { colorize: true },
    }
})

module.exports = logger
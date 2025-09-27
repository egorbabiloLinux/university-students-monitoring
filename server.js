const express = require('express')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const methodOverride = require('method-override')
const app = express()
const port = process.env.PORT || 3000

const MongoStore = require('connect-mongo')
const { dbSettings } = require('./src/config/config')
const routers = require('./src/routers')

global.saldo = 'fewfwef352tFRWEQF'
const controllers = require('./src/controllers')

const { logger } = require('./src/logger')

app.set('views', __dirname + '/src/views')
app.set('view engine', 'ejs')

app.use(cookieParser())
app.use(
	session({
		secret: 'fegwegwe',
		resave: false,
		saveUninitialized: true,
		store: MongoStore.create({
			mongoUrl: dbSettings.url,
            ttl: dbSettings.ttl
		}),
		cookie: { path: '/', httpOnly: true, maxAge: 1000 * 60 * 60 * 24 },
	})
)

app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(methodOverride())
app.use(express.static(__dirname + '/src/public'))

app.get('/', routers.index); //ПЕРЕДЕЛАТЬ

// app.get('/auth', routers.auth.getLogin)

(async() => {
try {
	app.locals.db = await controllers.db.start(dbSettings)

	const authRouters = require('./src/routers/auth')(app)
	app.use('/auth', authRouters)

	app.listen(port, () => {
		logger.info(`Server is running at http://localhost:${port}`)
	})
} catch (err) {
	logger.error({err}, 'Error connecting to DB')
	process.exit(1)
}
})();

//ЗАКРЫВАТЬ СОЕДИНЕНИЕ
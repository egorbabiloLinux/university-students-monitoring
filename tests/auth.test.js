const request = require('supertest')
const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const { MongoClient } = require('mongodb')
const authRoutes = require('../src/routers/auth')
const { dbSettings } = require('../src/config/config')

describe('Auth API', () => {
	let app
	let db
	let connection
	let server

	beforeAll(async () => {
		connection = await MongoClient.connect(dbSettings.url)
		db = connection.db(dbSettings.dbName)

		app = express()

		app.use(express.json())
		app.use(express.urlencoded({ extended: true }))

		app.use(
			session({
				secret: 'test-secret',
				resave: false,
				saveUninitialized: false,
				store: MongoStore.create({
					mongoUrl: dbSettings.url,
					ttl: dbSettings.ttl,
				}),
				cookie: { secure: false },
			})
		)

		app.locals.db = db
		const authRouter = require('../src/routers/auth')(app)
		app.use('/auth', authRouter)

		server = app.listen(0)
	})

	afterAll(async () => {
		await server.close()
		await connection.close()
	})

	beforeEach(async () => {
		await db.collection('users').deleteMany({})
		await db.collection('sessions').deleteMany({})
		await db.collection('stayOnlineSessions').deleteMany({})
	})

	describe('POST /auth/register', () => {
		it('should register a new user successfully', async () => {
			const response = await request(app)
				.post('/auth/register')
				.send({
					email: 'test@example.com',
					password: 'password123',
					confirmationPassword: 'password123',
					stayOnline: false,
				})
				.expect(200)

			expect(response.body.error).toBe(false)
			expect(response.body.msg).toContain(
				'Success register email: test@example.com'
			)
			expect(response.body.user.id).toBeDefined()
			expect(response.body.user.email).toBe('test@example.com')

			const user = await db
				.collection('users')
				.findOne({ email: 'test@example.com' })
			expect(user).toBeDefined()
			expect(user.emailCheck).toBe(true)
		})

		it('should register with stayOnline=true and return session', async () => {
			const response = await request(app)
				.post('/auth/register')
				.send({
					email: 'test@example.com',
					password: 'password123',
					confirmationPassword: 'password123',
					stayOnline: true,
				})
				.expect(200)

			expect(response.body.error).toBe(false)
			expect(response.body.user.id).toBeDefined()

			const sessions = await db.collection('sessions').find({}).toArray()
			expect(sessions.length).toBe(1)
		})

		it('should return 400 for invalid email', async () => {
			const response = await request(app)
				.post('/auth/register')
				.send({
					email: 'invalid-email',
					password: 'password123',
					confirmationPassword: 'password123',
					stayOnline: false,
				})
				.expect(400)

			expect(response.body.error).toBe(true)
		})

		it('should return 400 for password mismatch', async () => {
			const response = await request(app)
				.post('/auth/register')
				.send({
					email: 'test@example.com',
					password: 'password123',
					confirmationPassword: 'differentpassword',
					stayOnline: false,
				})
				.expect(400)

			expect(response.body.error).toBe(true)
		})

		it('should return 400 for short password', async () => {
			const response = await request(app)
				.post('/auth/register')
				.send({
					email: 'test@example.com',
					password: '123',
					confirmationPassword: '123',
					stayOnline: false,
				})
				.expect(400)

			expect(response.body.error).toBe(true)
		})

		it('should return 400 for failed to register user', async () => {
			await request(app)
			.post('/auth/register')
			.send({
				email: 'test@example.com',
				password: 'password123',
				confirmationPassword: 'password123',
				stayOnline: false,
			})
			.expect(200)

			const response = await request(app)
				.post('/auth/register')
				.send({
					email: 'test@example.com',
					password: 'password123',
					confirmationPassword: 'password123',
					stayOnline: false,
				})
				.expect(400)

			expect(response.body.error).toBe(true)
			expect(response.body.msg).toContain('Failed to register user')

			expect(response.body.error).toBe(true)
		})
	})

	describe('POST /auth/login', () => {
		beforeEach(async () => {
			await request(app).post('/auth/register').send({
				email: 'test@example.com',
				password: 'password123',
				confirmationPassword: 'password123',
				stayOnline: false,
			})
		})

		it('should login successfully with valid credentials', async () => {
			const response = await request(app)
				.post('/auth/login')
				.send({
					email: 'test@example.com',
					password: 'password123',
					stayOnline: false,
				})
				.expect(200)

			expect(response.body.error).toBe(false)
			expect(response.body.msg).toContain(
				'Success login email: test@example.com'
			)
			expect(response.body.user.email).toBe('test@example.com')

			expect(response.headers['set-cookie']).toBeDefined()
		})

		it('should login with stayOnline=true', async () => {
			const response = await request(app)
				.post('/auth/login')
				.send({
					email: 'test@example.com',
					password: 'password123',
					stayOnline: true,
				})
				.expect(200)

			expect(response.body.error).toBe(false)
		})

		it('should return 401 for invalid password', async () => {
			const response = await request(app)
				.post('/auth/login')
				.send({
					email: 'test@example.com',
					password: 'wrongpassword',
					stayOnline: false,
				})
				.expect(401)

			expect(response.body.error).toBe(true)
		})

		it('should return 401 for non-existent user', async () => {
			const response = await request(app)
				.post('/auth/login')
				.send({
					email: 'nonexistent@example.com',
					password: 'password123',
					stayOnline: false,
				})
				.expect(401)

			expect(response.body.error).toBe(true)
		})
	})

	describe('DELETE /auth/logout', () => {
		let agent

		beforeEach(async () => {
			await request(app).post('/auth/register').send({
				email: 'test@example.com',
				password: 'password123',
				confirmationPassword: 'password123',
				stayOnline: false,
			})

			agent = request.agent(app)

			await agent.post('/auth/login').send({
				email: 'test@example.com',
				password: 'password123',
				stayOnline: false,
			})
		})

		it('should logout successfully', async () => {
			const response = await agent.delete('/auth/logout').expect(200)

			expect(response.body.error).toBe(false)
			expect(response.body.msg).toBe('Logout successfully')

			expect(response.headers['set-cookie'][0]).toContain('connect.sid=;')
		})

		it('should return 400 when logging out without being logged in', async () => {
			const response = await request(app)
				.delete('/auth/logout')
				.expect(400)

			expect(response.body.error).toBe(true)
			expect(response.body.msg).toContain('You are not loggined')
		})
	})

	describe('Session persistence', () => {
		it('should maintain session across requests', async () => {
			const agent = request.agent(app)

			await agent.post('/auth/register').send({
				email: 'test@example.com',
				password: 'password123',
				confirmationPassword: 'password123',
				stayOnline: true,
			})

			const response = await agent.post('/auth/login').send({
				email: 'test@example.com',
				password: 'password123',
				stayOnline: false,
			})

			expect(response.body.error).toBe(false)
		})
	})
})

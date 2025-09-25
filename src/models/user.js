const bcrypt = require('bcrypt')
const { secretAccessToken } = require('../config/config')
const jwt = require('jsonwebtoken')

class User {
    constructor(db) {
        this.collection = db.collection('users')
    }

    async create(email, password) {
        const existingUser = await this.collection.findOne({email: email.toLowerCase()})
        if (existingUser) {
            throw new Error('User already exists')
        }

        const hash = await bcrypt.hash(password, 10)
        const newUser = {
            email: email.toLowerCase(),
            password: hash,
            emailCheck: true,
            roles: [],
            createdAt: new Date(),
        }
        const result = await this.collection.insertOne(newUser)

        if (!result.acknowledged || result.insertedCount === 0) {
			throw new Error('Failed to create user in database')
		}

		return result.insertedId
    }

    async check(email, password) {
        const user = await this.collection.findOne({ email: email.toLowerCase() })

        if (!user) {
			throw new Error('Failed find user in database')
		}

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            throw new Error('Invalid password')
        }

        return { canLogin: user.emailCheck, id: user._id }
    }
}

module.exports = User
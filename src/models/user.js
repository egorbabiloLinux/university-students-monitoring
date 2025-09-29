const bcrypt = require('bcrypt')
const { secretAccessToken } = require('../config/config')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserSchema = mongoose.Schema(
	{
		email: {
			type: String,
			required: 'Your email is required',
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: 'Your password is required',
			select: false,
			max: 25,
		},
		role: {
			type: String,
			required: true,
			default: '0x01',
		},
		emailCheck: {
			type: Boolean,
			required: true,
			default: true,
		},
	},
	{ timestamps: true }
)

UserSchema.pre('save', async function(next) {
    const user = this;
    if (!user.isModified("password")) return next()

    try {
        const salt = await bcrypt.genSalt(10)
        this.password = await bcrypt.hash(this.password, salt)
        next()
    } catch (err) {
        next(err)
    }
})

UserSchema.statics.check = async function (email, password) {
    const user = await this.findOne({ email: email.toLowerCase()}).select('+password')

    if (!user) {
        throw new Error('Failed to find user in database')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
        throw new Error('Invalid password')
    }

    return user
}

module.exports = mongoose.model('User', UserSchema)
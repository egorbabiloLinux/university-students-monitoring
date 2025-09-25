const dotenv = require('dotenv')
dotenv.config();

const secretAccessToken = process.env.SECRET_ACCESS_TOKEN

dbSettings = {
	url: 'mongodb://localhost:27017/university',
	dbName: 'university',
	username: '', 
	password: '',
    ttl: 60*60*24
}

module.exports = { secretAccessToken, dbSettings }
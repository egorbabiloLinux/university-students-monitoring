const  { MongoClient } = require('mongodb')

exports.start = async function(settings) {
    try {
        const client = new MongoClient(settings.url)
        await client.connect()

        const db = client.db(settings.dbName || undefined)
        return db
    } catch (err) {
       throw new Error('Failed to connect MongoDB: ' + err.message)
    }
}

exports.criptPassword = function(string) {
    var crypto = require('crypto')
    return crypto.createHash('md5').update(string+global.saldo).digest("hex")
}
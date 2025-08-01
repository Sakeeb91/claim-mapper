const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')

module.exports = async () => {
  // Start MongoDB Memory Server
  const mongod = new MongoMemoryServer({
    binary: {
      version: '7.0.0',
      downloadDir: process.cwd() + '/.cache/mongodb-binaries',
    },
  })

  await mongod.start()
  const uri = mongod.getUri()

  // Store the instance for global teardown
  global.__MONGOD__ = mongod
  process.env.MONGODB_URI_TEST = uri

  // Connect to the in-memory database
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  console.log('MongoDB Memory Server started')
}
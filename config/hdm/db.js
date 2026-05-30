const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const { registerModels } = require('../../models/hdm');

let hdmConnection = null;

const connectHdmDB = async () => {
  try {
    const uri = process.env.HDM_MONGO_URI;
    if (!uri) throw new Error('HDM_MONGO_URI not defined');

    hdmConnection = mongoose.createConnection(uri);
    registerModels(hdmConnection);
    await hdmConnection.asPromise();
    logger.db('HDM Portfolio connected');
  } catch (error) {
    logger.error(`HDM: ${error.message}`);
    process.exit(1);
  }
};

const getHdmDB = () => hdmConnection;

module.exports = { connectHdmDB, getHdmDB };
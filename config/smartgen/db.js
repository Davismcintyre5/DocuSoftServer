const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const { registerModels } = require('../../models/smartgen');

let smartGenConnection = null;

const connectSmartGenDB = async () => {
  try {
    const uri = process.env.SMARTGEN_MONGO_URI;
    if (!uri) throw new Error('SMARTGEN_MONGO_URI not defined');

    smartGenConnection = mongoose.createConnection(uri);
    registerModels(smartGenConnection);
    await smartGenConnection.asPromise();
    logger.db('SmartGen connected');
  } catch (error) {
    logger.error(`SmartGen: ${error.message}`);
    process.exit(1);
  }
};

const getSmartGenDB = () => smartGenConnection;

module.exports = { connectSmartGenDB, getSmartGenDB };
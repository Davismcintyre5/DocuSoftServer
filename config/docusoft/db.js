const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.db('DocuSoft connected');
  } catch (error) {
    logger.error(`DocuSoft: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
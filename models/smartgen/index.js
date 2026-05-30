const User = require('./User');
const Template = require('./Template');
const Document = require('./Document');
const Setting = require('./Setting');

const registerModels = (connection) => {
  connection.model('SmartGenUser', User.schema);
  connection.model('SmartGenTemplate', Template.schema);
  connection.model('SmartGenDocument', Document.schema);
  connection.model('SmartGenSetting', Setting.schema);
};

module.exports = { registerModels, User, Template, Document, Setting };
const User = require('./User');
const Company = require('./Company');
const App = require('./App');
const Service = require('./Service');
const Project = require('./Project');
const Photo = require('./Photo');
const Contact = require('./Contact');
const Settings = require('./Settings');
const Backup = require('./Backup');
const BackupSettings = require('./BackupSettings');

const registerModels = (connection) => {
  connection.model('HdmUser', User.schema);
  connection.model('HdmCompany', Company.schema);
  connection.model('HdmApp', App.schema);
  connection.model('HdmService', Service.schema);
  connection.model('HdmProject', Project.schema);
  connection.model('HdmPhoto', Photo.schema);
  connection.model('HdmContact', Contact.schema);
  connection.model('HdmSettings', Settings.schema);
  connection.model('HdmBackup', Backup.schema);
  connection.model('HdmBackupSettings', BackupSettings.schema);
};

module.exports = { registerModels, User, Company, App, Service, Project, Photo, Contact, Settings, Backup, BackupSettings };
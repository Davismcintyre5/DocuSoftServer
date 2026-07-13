require('../dnsSet');

require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const APPS = {
  '1': { name: 'DocuSoft', uri: process.env.MONGODB_URI, color: '\x1b[36m' },
  '2': { name: 'SmartGen', uri: process.env.SMARTGEN_MONGO_URI, color: '\x1b[33m' },
  '3': { name: 'HDM Portfolio', uri: process.env.HDM_MONGO_URI, color: '\x1b[35m' },
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (q) => new Promise(resolve => rl.question(q, resolve));
const clear = () => console.clear();

const banner = () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║        🛠️  SERVER ADMIN CLI        ║
  ╚══════════════════════════════════════╝
  `);
};

const menu = (title, options) => {
  console.log(`\n  📋 ${title}`);
  console.log('  ───────────────────────────');
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
  console.log(`  0. Back / Exit`);
};

let connection = null;
let currentApp = null;

const connect = async (app) => {
  try {
    if (connection) await connection.close();
    connection = await mongoose.createConnection(app.uri).asPromise();
    currentApp = app;
    logger.info(`Connected to ${app.name}`);
    return true;
  } catch (error) {
    logger.error(`Failed to connect: ${error.message}`);
    return false;
  }
};

const getModel = (modelName, schemaDef) => {
  try {
    return connection.model(modelName);
  } catch {
    return connection.model(modelName, new mongoose.Schema(schemaDef, { strict: false }));
  }
};

const listCollections = async () => {
  const cols = await connection.db.listCollections().toArray();
  if (cols.length === 0) {
    console.log('  No collections found.');
    return cols;
  }
  console.log(`\n  📁 Collections in ${currentApp.name}:`);
  cols.forEach((c, i) => console.log(`  ${i + 1}. ${c.name}`));
  return cols;
};

const dropCollection = async () => {
  const cols = await listCollections();
  if (cols.length === 0) return;
  const choice = await question('\n  Enter collection number to drop (0 to cancel): ');
  if (choice === '0') return;
  const col = cols[parseInt(choice) - 1];
  if (!col) return console.log('  Invalid choice.');
  const confirm = await question(`  ⚠️  Drop "${col.name}"? This cannot be undone! (yes/no): `);
  if (confirm.toLowerCase() !== 'yes') return console.log('  Cancelled.');
  await connection.db.dropCollection(col.name);
  console.log(`  🗑️  Dropped "${col.name}"`);
};

const dropDatabase = async () => {
  console.log(`\n  ⚠️  WARNING: This will DELETE ALL DATA in ${currentApp.name}!`);
  const confirm = await question(`  Type "DELETE ${currentApp.name}" to confirm: `);
  if (confirm !== `DELETE ${currentApp.name}`) return console.log('  Cancelled.');
  await connection.db.dropDatabase();
  console.log(`  💥 ${currentApp.name} database dropped completely.`);
};

const listAdmins = async () => {
  let User;
  if (currentApp.name === 'HDM Portfolio') {
    User = getModel('HdmUser', { name: String, email: String, password: String, isAdmin: Boolean, isActive: Boolean });
    const admins = await User.find({ isAdmin: true }).select('-password');
    if (admins.length === 0) return console.log('  No admins found.');
    console.log(`\n  👤 Admins in ${currentApp.name}:`);
    admins.forEach((a, i) => console.log(`  ${i + 1}. ${a.name} (${a.email})`));
    return admins;
  } else if (currentApp.name === 'SmartGen') {
    User = getModel('SmartGenUser', { name: String, email: String, password: String, role: String, isActive: Boolean });
    const admins = await User.find({ role: 'admin' }).select('-password');
    if (admins.length === 0) return console.log('  No admins found.');
    console.log(`\n  👤 Admins in ${currentApp.name}:`);
    admins.forEach((a, i) => console.log(`  ${i + 1}. ${a.name} (${a.email})`));
    return admins;
  } else {
    User = getModel('User', { name: String, email: String, phone: String, password: String, role: String, isActive: Boolean, acceptedTerms: Boolean, acceptedPrivacy: Boolean });
    const admins = await User.find({ role: 'admin' }).select('-password');
    if (admins.length === 0) return console.log('  No admins found.');
    console.log(`\n  👤 Admins in ${currentApp.name}:`);
    admins.forEach((a, i) => console.log(`  ${i + 1}. ${a.name} (${a.email})`));
    return admins;
  }
};

const createAdmin = async () => {
  console.log('\n  ➕ Create New Admin');
  const name = await question('  Name: ');
  const email = await question('  Email: ');
  const password = await question('  Password: ');
  const hashed = await bcrypt.hash(password, 10);

  if (currentApp.name === 'HDM Portfolio') {
    const User = getModel('HdmUser', { name: String, email: String, password: String, isAdmin: Boolean, isActive: Boolean });
    await User.create({ name, email, password: hashed, isAdmin: true, isActive: true });
  } else if (currentApp.name === 'SmartGen') {
    const User = getModel('SmartGenUser', { name: String, email: String, password: String, role: String, isActive: Boolean });
    await User.create({ name, email, password: hashed, role: 'admin', isActive: true });
  } else {
    const User = getModel('User', { name: String, email: String, phone: String, password: String, role: String, isActive: Boolean, acceptedTerms: Boolean, acceptedPrivacy: Boolean });
    await User.create({ name, email, phone: '0700000000', password: hashed, role: 'admin', isActive: true, acceptedTerms: true, acceptedPrivacy: true });
  }

  console.log(`  ✅ Admin "${name}" created.`);
};

const manageAdmins = async () => {
  const admins = await listAdmins();
  if (!admins || admins.length === 0) return;
  const choice = await question('\n  Enter admin number to toggle active status (0 to cancel): ');
  if (choice === '0') return;
  const admin = admins[parseInt(choice) - 1];
  if (!admin) return console.log('  Invalid choice.');

  if (currentApp.name === 'HDM Portfolio') {
    const User = getModel('HdmUser', { name: String, email: String, password: String, isAdmin: Boolean, isActive: Boolean });
    await User.findByIdAndUpdate(admin._id, { isActive: !admin.isActive });
    console.log(`  🔄 ${admin.name} isActive: ${!admin.isActive}`);
  } else if (currentApp.name === 'SmartGen') {
    const User = getModel('SmartGenUser', { name: String, email: String, password: String, role: String, isActive: Boolean });
    await User.findByIdAndUpdate(admin._id, { isActive: !admin.isActive });
    console.log(`  🔄 ${admin.name} isActive: ${!admin.isActive}`);
  } else {
    const User = getModel('User', { name: String, email: String, phone: String, password: String, role: String, isActive: Boolean, acceptedTerms: Boolean, acceptedPrivacy: Boolean });
    await User.findByIdAndUpdate(admin._id, { isActive: !admin.isActive });
    console.log(`  🔄 ${admin.name} isActive: ${!admin.isActive}`);
  }
};

const deleteAdmin = async () => {
  const admins = await listAdmins();
  if (!admins || admins.length === 0) return;
  const choice = await question('\n  Enter admin number to delete (0 to cancel): ');
  if (choice === '0') return;
  const admin = admins[parseInt(choice) - 1];
  if (!admin) return console.log('  Invalid choice.');
  const confirm = await question(`  ⚠️  Delete "${admin.name}"? (yes/no): `);
  if (confirm.toLowerCase() !== 'yes') return console.log('  Cancelled.');

  if (currentApp.name === 'HDM Portfolio') {
    const User = getModel('HdmUser', { name: String, email: String, password: String, isAdmin: Boolean, isActive: Boolean });
    await User.findByIdAndDelete(admin._id);
  } else if (currentApp.name === 'SmartGen') {
    const User = getModel('SmartGenUser', { name: String, email: String, password: String, role: String, isActive: Boolean });
    await User.findByIdAndDelete(admin._id);
  } else {
    const User = getModel('User', { name: String, email: String, phone: String, password: String, role: String, isActive: Boolean, acceptedTerms: Boolean, acceptedPrivacy: Boolean });
    await User.findByIdAndDelete(admin._id);
  }

  console.log(`  🗑️  "${admin.name}" deleted.`);
};

const appMenu = async () => {
  while (true) {
    clear();
    banner();
    console.log(`  📱 Connected: ${currentApp.color}${currentApp.name}\x1b[0m\n`);

    menu('Manage App', [
      'List Admins',
      'Create Admin',
      'Manage Admins (toggle active)',
      'Delete Admin',
      'List Collections',
      'Drop Collection',
      '💀 Drop Entire Database',
    ]);

    const choice = await question('\n  Choose an option: ');

    clear();
    banner();
    console.log(`  📱 ${currentApp.color}${currentApp.name}\x1b[0m\n`);

    switch (choice) {
      case '1': await listAdmins(); break;
      case '2': await createAdmin(); break;
      case '3': await manageAdmins(); break;
      case '4': await deleteAdmin(); break;
      case '5': await listCollections(); break;
      case '6': await dropCollection(); break;
      case '7': await dropDatabase(); break;
      case '0': return;
      default: console.log('  Invalid option.');
    }

    if (choice !== '0') await question('\n  Press Enter to continue...');
  }
};

const main = async () => {
  while (true) {
    clear();
    banner();
    console.log('  Choose an app to manage:\n');
    Object.entries(APPS).forEach(([key, app]) => console.log(`  ${app.color}${key}. ${app.name}\x1b[0m`));
    console.log('  0. Exit');

    const choice = await question('\n  Select: ');
    if (choice === '0') break;
    if (!APPS[choice]) {
      console.log('  Invalid choice.');
      await question('\n  Press Enter to continue...');
      continue;
    }

    const connected = await connect(APPS[choice]);
    if (!connected) {
      await question('\n  Press Enter to continue...');
      continue;
    }

    await appMenu();
  }

  if (connection) await connection.close();
  console.log('\n  👋 Goodbye!\n');
  process.exit(0);
};

main();
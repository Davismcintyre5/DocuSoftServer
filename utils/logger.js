const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

const timestamp = () => {
  return new Date().toISOString();
};

const info = (message) => {
  console.log(`${colors.green}[INFO]${colors.reset} ${timestamp()} — ${message}`);
};

const warn = (message) => {
  console.warn(`${colors.yellow}[WARN]${colors.reset} ${timestamp()} — ${message}`);
};

const error = (message) => {
  console.error(`${colors.red}[ERROR]${colors.reset} ${timestamp()} — ${message}`);
};

const db = (message) => {
  console.log(`${colors.cyan}[DB]${colors.reset} ${timestamp()} — ${message}`);
};

const req = (method, url, status) => {
  const color = status >= 400 ? colors.red : status >= 300 ? colors.yellow : colors.green;
  console.log(`${colors.blue}[REQ]${colors.reset} ${timestamp()} — ${method} ${url} ${color}${status}${colors.reset}`);
};

module.exports = { info, warn, error, db, req };
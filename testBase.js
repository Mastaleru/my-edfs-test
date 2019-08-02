process.env.NO_LOGS = true;

const path = require('path');
const baseBundlesPath = path.resolve(path.join(__dirname, 'psknode/bundles'));
require(path.join(baseBundlesPath, 'pskruntime.js'));

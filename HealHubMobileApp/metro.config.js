const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// Ensure Metro resolves dependencies from this app's node_modules,
// even when the repo root is treated as a workspace root.
const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.watchFolders = [projectRoot];

config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

// Prevent Metro from walking up the directory tree looking for other node_modules.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;

#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const execa = require('execa');
// apparently violates no-extraneous require? /shrug
const debug = require('debug')('test-external');
const rimraf = require('rimraf');
const chalk = require('chalk');
const cliArgs = require('command-line-args');

const root = path.resolve(__dirname, '../');

let cliOptionsDef = [{ name: 'projectName', defaultOption: true }];
let cliOptions = cliArgs(cliOptionsDef, { stopAtFirstUnknown: true });
const externalProjectName = cliOptions.projectName;

let argv = cliOptions._unknown || [];
cliOptionsDef = [{ name: 'gitUrl', defaultOption: true }];
cliOptions = cliArgs(cliOptionsDef, { stopAtFirstUnknown: true, argv });
const gitUrl = cliOptions.gitUrl;

const cachePath = '../__external-test-cache';
const tempDir = path.join(root, cachePath);
const projectTempDir = path.join(tempDir, externalProjectName);

console.log(
  `Preparing to test external project ${externalProjectName} located at ${gitUrl} against this ember-data commit.`
);

function execCommand(command) {
  command = `cd ${projectTempDir} && ${command}`;
  return execWithLog(command, force);
}

function execWithLog(command, force) {
  debug(chalk.cyan('Executing: ') + chalk.yellow(command));
  if (debug.enabled || force) {
    return execa.sync(command, { stdio: [0, 1, 2], shell: true });
  }

  return execa.sync(command, { shell: true }).stdout;
}

if (!fs.existsSync(tempDir)) {
  debug(`Ensuring Cache Root at: ${tempDir}`);
  fs.mkdirSync(tempDir);
} else {
  debug(`Cache Root Exists at: ${tempDir}`);
}

if (fs.existsSync(projectTempDir)) {
  debug(`Cleaning Cache at: ${projectTempDir}`);
  rimraf.sync(projectTempDir);
} else {
  debug(`No pre-existing cache present at: ${projectTempDir}`);
}

// install the project
try {
  execWithLog(`git clone --depth=1 ${gitUrl} ${projectTempDir}`);
} catch (e) {
  debug(e);
  throw new Error(
    `Install of ${gitUrl} in ${projectTempDir} for external project ${externalProjectName} testing failed.`
  );
}

const packageJsonLocation = path.join(projectTempDir, 'package.json');

let smokeTestPassed = true;
let commitTestPassed = true;

try {
  debug('Running Smoke Test');
  try {
    execCommand('yarn install');
  } catch (e) {
    debug(e);
    throw new Error(`Unable to complete install of dependencies for ${externalProjectName}`);
  }
  execCommand('ember test', true);
} catch (e) {
  smokeTestPassed = false;
}

try {
  debug('Preparing Package To Run Tests Against Commit');
  insertTarballsToPackageJson(packageJsonLocation);

  // clear node_modules installed for the smoke-test
  execCommand(`rm -rf node_modules`);
  // we are forced to use yarn so that our resolutions will be respected
  // in addition to the version file link we insert otherwise nested deps
  // may bring their own ember-data
  //
  // For this reason we don't trust the lock file
  // we also can't trust the cache
  execCommand('yarn install --cache-folder=tmp/npm-cache');
} catch (e) {
  console.log(`Unable to npm install tarballs for ${externalProjectName}. Original error below:`);

  throw e;
}

try {
  debug('Running tests against validated-changeset commit');
  execCommand(`ember build`, true);
  execCommand(`ember test --path="./dist"`, true);
} catch (e) {
  commitTestPassed = false;
}

if (commitTestPassed && smokeTestPassed) {
  console.log(`${externalProjectName} tests passed`);
} else {
  console.log(`${externalProjectName} tests FAILED`);
}

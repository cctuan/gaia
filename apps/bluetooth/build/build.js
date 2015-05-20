'use strict';

/* global require, exports, dump */
var utils = require('utils');
var ConfigureDecider = require('configure/configure-decider');

var BluetoothAppBuilder = function() {
};

BluetoothAppBuilder.prototype.execute = function(options) {
  var configureDecider = new ConfigureDecider(
    options.STAGE_APP_DIR,
    'build-app_cache', {
      PROFILE_DIR: options.PROFILE_DIR,
      STAGE_DIR: options.STAGE_DIR,
      GAIA_DIR: options.GAIA_DIR,
      GAIA_OPTIMIZE: options.GAIA_OPTIMIZE
    });
  if (!configureDecider.shouldReconfig()) {
    return;
  }
  utils.log('rebuild app ');
  var optimize = 'optimize=' +
    (options.GAIA_OPTIMIZE === '1' ? 'uglify2' : 'none');
  var configFile = utils.getFile(options.APP_DIR, 'build',
    'bluetooth.build.jslike');
  var r = require('r-wrapper').get(options.GAIA_DIR);
  r.optimize([configFile.path, optimize], function() {
    dump('require.js optimize ok\n');
    configureDecider.end();
  }, function(err) {
    dump('require.js optmize failed:\n');
    dump(err + '\n');
  }, configureDecider);
};

exports.execute = function(options) {
  (new BluetoothAppBuilder()).execute(options);
};

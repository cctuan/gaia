'use strict';
var utils = require('./../utils');

var ConfigureDecider = function(path, name, currentEnvs) {
  this.name = name;
  this.path = path;
  this.cacheList = null;
  this._currentEnvs = currentEnvs;
  this._shouldReconfig = false;
  this.start();
};

// TODO: save timestamp
ConfigureDecider.prototype = {
  DEBUG: false,
  log: function() {
    if (this.DEBUG === true) {
      utils.log(JSON.stringify(arguments));
    }
  },
  start: function() {
    var self = this;
    // utils.ensureFolderExists(this.path);
    this.file = utils.getFile(this.path, this.name);
    if (this.file.exists()) {
      utils.log(this.file.path);
      this.cacheList = utils.getJSON(this.file);
      this.verifyExistingList();
    } else {
      this._shouldReconfig = true;
      utils.log('cache does not exist');
      this.cacheList = {
        envs: self._currentEnvs,
        files: {}
      };
    }
  },
  verifyExistingList: function() {
    for (var filePath in this.cacheList.files) {
      var file = utils.getFile(filePath);
      if (!file.exists()) {
        this._shouldReconfig = true;
        utils.log(filePath + ' does not exist');

        // we can remove below part if separate config and builder steps.
      } else if (file.lastModifiedTime > this.cacheList.files[filePath]) {
        this._shouldReconfig = true;
        utils.log(file.path + ' timestamp does not match original: ' +
          this.cacheList.files[filePath] + ' new: ' + file.lastModifiedTime);
        this.cacheList.files[filePath] = file.lastModifiedTime;
      } else {
        this.cacheList.files[filePath] = file.lastModifiedTime;
      }
    }
    for (var env in this.cacheList.envs) {
      var currentValue = this.cacheList.envs[env];
      if (this._currentEnvs[env] !== currentValue) {
        utils.log(env + ' is changed to ' + this._currentEnvs[env]);
        this._shouldReconfig = true;
        this.cacheList.envs[env] = this._currentEnvs[env];
      }
    }
  },
  addFileWatcher: function(filePaths) {
    if (!filePaths || filePaths.length === 0) {
      return;
    }

    filePaths.forEach(function(filePath) {
      var file = utils.getFile(filePath);
      this.cacheList.files[filePath] = file.lastModifiedTime;
    }, this);
  },
  addEnvWatcher: function(envs) {
    if (!envs) {
      return;
    }
    for (var env in envs) {
      this.cacheList.envs[env] = envs[env];
    }
  },
  
  shouldReconfig: function() {
    return this._shouldReconfig;
  },

  end: function() {
    utils.ensureFolderExists(this.file.parent);
    utils.writeContent(this.file, JSON.stringify(this.cacheList, null, 2));
  }
};

module.exports = ConfigureDecider;

/**
  Component start to config =>
  new ConfigureDecider(name, path) > start to find pairing file
  > if no create new file
  > in each config step = >addFile to watch and compare, if change or new
  > return true but continue

  > when end, write file out

 */
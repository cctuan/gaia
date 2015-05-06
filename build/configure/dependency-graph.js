'use strict';

var utils = require('utils');

/**
 * DependencyGraph module can help you to generate new build backend, you can
 * add new task, add task dependency anytime, create build backend file and
 * execute it. The output file type should be able to replace with any backend
 * like gulpfile in the future.
 *
 * @param {string} filename - assign the filename of the makeifle
 * @constructor
 */
var DependencyGraph = function(filename) {
  this.tasks = [];
  this.filename = filename || this.FILENAME;
  this.env = utils.getEnv('BUILD_CONFIG');
};

DependencyGraph.prototype = {
  FILENAME: 'output.mk',
  /**
   * Insert new task target.
   * FIXME: Currently we only support Makefile form.
   *
   * @param {string} type - type can be 'phony', 'include' and others. if we
   *                        assigh others it will generate as below:
   *                        |target|: |deps|
   *                          |commands|
   *
   *                        if we assign 'include', we assume you won't set deps
   *                        and commands and generate like below:
   *                        include |target|
   *
   *                        if we assign 'phony', it will generate as below:
   *                        .PHONY: |target|
   *                        |target|: |deps|
   *                          |commands|
   *
   * @param {string} target - the target name of the task
   * @param {string[]} deps - all the dependency, they should be targets name we
   *                          already inserted.
   * @param {string[]} commands - the command to execute in this target.
   */
  insertTask: function(type, target, deps, commands) {
    var task;
    for (var id in this.tasks) {
      if (this.tasks[id].target === target) {

        utils.log('task ' + target + ' has been already inserted.');
        task = this.tasks[id];
        return;
      }
    }
    this.tasks.push({
      type: type,
      target: target,
      deps: deps || [],
      commands: commands || []
    });
  },

  /**
   * Insert dep to target.
   * @param {string} target - the target should already be inserted, or we will
   *                          create a new phony target.
   * @param {string} dep - the new dependency to add.
   */
  insertDep: function(target, dep) {
    var task;
    for (var id in this.tasks) {
      task = this.tasks[id];
      if (task.target === target) {
        break;
      }
    }
    if (!task) {
      this.insertTask('phony', target, [dep]);
    } else if (task.deps.indexOf(dep) === -1) {
      task.deps.push(dep);
    }
  },

  /**
   * Add new command to target.
   * @param {string} target - the target should already be inserted, or we will
   *                          create a new phony target.
   * @param {string} command - the new command to add.
   */
  insertCommand: function(target, command) {
    var task;
    for (var id in this.tasks) {
      task = this.tasks[id];
      if (task.target === target) {
        break;
      }
    }
    if (!task) {
      this.insertTask('phony', target, [], [command]);
    } else {
      task.commands.push(command);
    }
  },

  /**
   * Generate new build backend file.
   * FIXME: Currently we only support Makefile form. The backend should be
   *        replaceable in the future.
   *
   * @param {string}  defaultLine - the beginning content.
   */
  genBackend: function(defaultLine) {
    var result = '#THIS IS A GENERATED FILE, PLEASE DO NOT EDIT IT#\n' +
      (defaultLine || '') + '\n';
    var outputFile = utils.getFile(this.filename);
    this.tasks.forEach(function(task) {
      if (task.type === 'phony') {
        result += '.PHONY: ' + task.target + '\n';
      }
      var depsContent = '';
      task.deps.forEach(function(dep) {
        depsContent += ' ' + dep;
      }, this);
      result += '' + task.target + ':' + depsContent + '\n';
      task.commands.forEach(function(command) {
        result += '\t' + command + '\n';
      });
      result += '\n';
    }, this);
    utils.writeContent(outputFile, result);
  },

  /**
   * Execute this build backend.
   * FIXME: Currently we only support Makefile form. The backend should be
   *        replaceable in the future.
   * @param {number} parallelNum - The number of parallel tasks to run in the
   *                               same time.
   */
  executeBackend: function(parallelNum) {
    // We use EXECUTE_BY_SCRIPT flag to identify the makefile is executed
    // by script or user.
    var envArray = ['-C', 'build_stage', '-j' + parallelNum,
      'EXECUTE_BY_SCRIPT=1'];
    var envs = {};
    // Since we'll execute make by the makefile we generated, we need to make
    // sure previous ENV has been parsed to it.
    try {
      envs = JSON.parse(this.env);
    } catch (e) {
      throw 'BUILD_CONFIG cannot be passed to JSON object';
    }
    for (var env in envs) {
      envArray.push(env + '=' + envs[env]);
    }

    var make = new utils.Commander('make');
    make.initPath(utils.getEnvPath());
    make.run(envArray, function(exitCode) {
      if (exitCode !== 0) {
        throw 'error';
      }
    });
  }
};

module.exports = DependencyGraph;

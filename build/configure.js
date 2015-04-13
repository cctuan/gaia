
// Generate and execute makefile

var utils = require('utils');

var PRE_APP_BUILD_STEPS = [
  'clean-stage-app',
  'svoperapps',
  'webapp-manifests',
  'contacts-import-services',
  'search-provider',
  'keyboard-layouts',
  'preferences',
  'settings',
  'webapp-shared',
  'copy-common-files'
];

var POST_APP_BUILD_STEPS = [
  'media-resolution',
  'post-manifest',
  'multilocale',
  'copy-build-stage-data',
  'webapp-optimize',
  'webapp-zip'
];

var Makefile = function(filename) {
  this.tasks = [];
  this.filename = filename || this.FILENAME;
  this.env = utils.getEnv('BUILD_CONFIG');
};

Makefile.prototype = {
  FILENAME: 'output.mk',

  insertTask: function(target, deps, commands, isPhony, isOther) {
    this.tasks.unshift({
      target: target,
      deps: deps,
      commands: commands,
      isPhony: isPhony,
      isOther: isOther
    })
  },

  insertDep: function(target, dep) {
    var task;
    for (var id in this.tasks) {
      task = this.tasks[id];
      if (task.target === target) {
        break;
      }
    }
    if (!task) {
      this.insertTask(target, [dep], '');
    } else if (task.deps.indexOf(dep) === -1) {
      task.deps.push(dep);
    }
  },

  genMakefile: function() {
    var result = '';
    var outputFile = utils.getFile(this.filename);
    this.tasks.forEach(function(task) {
      var depsContent = '';
      if (task.isPhony) {
        result += '.PHONY: ' + task.target + '\n';
      }
      task.deps.forEach(function(dep) {
        depsContent += ' ' + dep;
      }, this);
      if (task.isOther) {
        result += task.target + '\n\n';
      } else {
        result += '' + task.target + ':' + depsContent +
          '\n\t' + task.commands + '\n\n';
      }
    }, this);
    utils.writeContent(outputFile, result);

  },

  executeMakefile: function(target) {
    var envArray = [target];
    var envs = {};
    try {
      envs = JSON.parse(this.env);
    } catch (e) {}
    for (var env in envs) {
      envArray.push(env + '=' + envs[env]);
    }

    var make = new utils.Commander('make');
    make.initPath(utils.getEnvPath());
    make.run(envArray);
  }
};

var AppConfigureStep = function(options, appDir) {
  this.appDir = appDir;
  this.webapp = utils.getWebapp(appDir, options);
  this.name = this.webapp.sourceDirectoryName;
  this.options = options;
};

AppConfigureStep.prototype = {
  start: function() {
    var options = this.options;
    this.appDirFile = utils.getFile(this.appDir);
    this.xpcshell = utils.getEnv('XPCSHELLSDK');

    this.appOptions = utils.cloneJSON(options);
    delete this.appOptions.GAIA_APPDIRS;
    delete this.appOptions.GAIA_ALLAPPDIRS;

    this.appOptions.APP_DIR = this.appDir,
    this.appOptions.STAGE_APP_DIR = utils.joinPath(this.options.STAGE_DIR,
      this.appDirFile.leafName);
    this.appOptions.webapp = this.webapp;
    delete this.appOptions.webapp.manifest;
    delete this.appOptions.webapp.metaData;

    utils.ensureFolderExists(utils.getFile(utils.joinPath(
      this.options.GAIA_DIR, 'mks')));
    this.appMkPath = utils.joinPath(this.options.GAIA_DIR, 'mks',
      this.webapp.sourceDirectoryName + '.mk');
    this.mainMake = new Makefile(this.appMkPath);
    this.writeAppBuildConfig();
    this.genAppConfig();
    this.mainMake.genMakefile();
  },
  insertBeginDep: function(step) {
    this.depStep = step;
  },
  get appConfigData() {
    return JSON.stringify(this.appOptions)
      .replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  },
  templateCommand: function(moduleName, data) {
    return '@' + this.xpcshell + ' -f ' + this.options.GAIA_DIR +
      '/build/xpcshell-commonjs.js -e "run(\'' + moduleName + '\',\'' +
      this.appConfigData + '\');"';
  },
  writeAppBuildConfig: function() {
  },
  get lastTarget() {
    return this._preStep;
  },
  genAppConfig: function() {
    var buildFile = utils.getFile(this.appDir, 'build', 'build.js');
    if (buildFile.exists()) {
      this.mainMake.insertTask(
        this.webapp.sourceDirectoryName + '_build',
        ['post_stage'],
        this.templateCommand('build-app'),
        true
      );
    } else {
      this.mainMake.insertTask(
        this.webapp.sourceDirectoryName + '_build',
        ['post_stage'],
        '@cp -r ' + this.appDir + ' ' + this.options.STAGE_DIR,
        true
      );
    }

    if (this.depStep) {
      this.mainMake.insertDep(
        this.webapp.sourceDirectoryName + '_build',
        this.depStep
      );
    }

    this._preStep = this.webapp.sourceDirectoryName + '_build';
    POST_APP_BUILD_STEPS.forEach(function(step) {
      if (this.options.DEBUG !== '0' && step === 'webapp-zip') {
        return;
      }
      var cmd = this.templateCommand(step);
      step = this.webapp.sourceDirectoryName + '_' + step;
      this.mainMake.insertTask(
        step,
        [this._preStep],
        cmd,
        true
      );
      this._preStep = step;
    }, this);
  }
};

var ConfigureStep = function(options) {
  this.options = options;
};

ConfigureStep.prototype = {
  start: function() {
    var options = this.options;
    var commonMkPath = utils.joinPath(this.options.GAIA_DIR, 'all.mk');
    this.mainMake = new Makefile(commonMkPath);

    // TODO: we should be able to detect whether to regenerate makefile.
    this.preAppConfig();
    this.postAppConfig();
    this.mainMake.genMakefile();

    // Execute profile directly.
    this.mainMake.executeMakefile('profile');
  },
  preAppConfig: function() {
    this.mainMake.insertTask(
      this.options.STAGE_DIR,
      [],
      'mkdir -p ' + this.options.STAGE_DIR
    );
    var preStep = this.options.STAGE_DIR;
    PRE_APP_BUILD_STEPS.forEach(function(step) {
      if (this.options.BUILD_APP_NAME !== '*' && step === 'settings') {
        return;
      }
      this.mainMake.insertTask(
        step,
        [preStep],
        '@$(call $(BUILD_RUNNER),' + step + ')',
        true
      );
      preStep = step;
    }, this);
  },
  shouldBuild: function(appDir) {
    appRegExp = utils.getAppNameRegex(this.options.BUILD_APP_NAME);
    var buildAppName = this.options.BUILD_APP_NAME;
    if (buildAppName === '*') {
      return true;
    } else {
      // A workaround for bug 1093267 in order to handle callscreen's l10n
      // broken. Callscreen will generate incorrect multilocale strings if
      // build_stage/communications/dialer/locales is removed by
      // webapp-optimize. After bug 1093267 has been resolved, we're going to
      // get rid of this.
      if (buildAppName === 'callscreen' &&
          appDir.indexOf('communications') !== -1) {
        return true;
      } else {
        return utils.getAppNameRegex(this.options.BUILD_APP_NAME).test(appDir);
      }
    }
  },
  postAppConfig: function() {
    this.mainMake.insertTask(
      'post_stage',
      ['copy-common-files'],
      '',
      true
    );

    this.mainMake.insertTask(
      'profile_dir',
      [],
      '',
      true
    );

    this.options.GAIA_APPDIRS.split(' ').forEach(function(app) {
      if (!this.shouldBuild(app)) {
        return;
      }
      var appBuild = new AppConfigureStep(this.options, app);
      if (appBuild.name === 'callscreen') {
        // A workaround for bug 1093267 as above.
        appBuild.insertBeginDep('communications_app_build');
      }

      appBuild.start();
      this.mainMake.insertTask(
        'include ' + appBuild.appMkPath,
        [],
        '',
        false,
        true
      );
      this.mainMake.insertTask(
        appBuild.name + '_app_build',
        [appBuild.lastTarget],
        '@echo Building ' + appBuild.name,
        true
      );
      this.mainMake.insertDep(
        'profile_dir',
        appBuild.name + '_app_build'
      );
      
    }, this);

    this.mainMake.insertTask(
      this.options.PROFILE_FOLDER,
      [
        'profile_dir',
        'contacts',
        'extensions',
        'b2g_sdk',
        '.git/hooks/pre-commit'
      ],
      ''
    );
  }
};

function execute(options) {
  var configStep = new ConfigureStep(options);
  configStep.start();
}

exports.execute = execute;

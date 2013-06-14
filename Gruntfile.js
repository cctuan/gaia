// This is the main application configuration file.  It is a Grunt
// configuration file, which you can learn more about here:
// https://github.com/cowboy/grunt/blob/master/docs/configuring.md
//
'use strict';
module.exports = function(grunt) {

	var GAIA_DOMAIN = "gaiamobile.org";

	var DEBUG = 0,
		schema = "app://";

	var PRODUCTION = false;

	var GAIA_OPTIMIZE = false;

	var DOGFOOD = false;

	var LOCAL_DOMAINS = true;



    grunt.initConfig({

        // The clean task ensures all files are removed from the dist/ directory so
        // that no files linger from previous builds.
        clean: ["profile/"],

        // The lint task will run the build configuration and the application
        // JavaScript through JSHint and report any errors.  You can change the
        // options for this task, by reading this:
        // https://github.com/cowboy/grunt/blob/master/docs/task_lint.md
        lint: {
            files: [
                "apps/homescreen/everything.me/**/*.js",
                "apps/sms/js/*.js",
                "apps/pdfjs/content/*/*.js",
                "apps/email/js/ext/**/**/*.js",
                "apps/music/js/ext/**/**/*.js",
                "apps/homescreen/js/hiddenapps.js",
                "apps/settings/js/hiddenapps.js",
                "shared/js/**/*.js"
            ]
        },
        shell: {


        },
     



    });


    // self definition task for amazon s3 deployment
    grunt.registerMultiTask('s3deploy', 'deploy release code to amazon s3', function() {
        var done = this.async(),
            cli = process.cwd() + '/' + this.data;

        grunt.log.writeln('call deploy shell ' + cli);
        grunt.utils.spawn({
            cmd: cli
        }, function(err, result) {
            if (err) {
                grunt.log.error('Something wrong');
                done(err);
                return;
            }
            done();
        });
    });

    // implement copy task to do file copy bahavior
    grunt.registerMultiTask('rev', 'Dump git version to index title', function() {
      var cheerio = require('cheerio');
      var done = this.async();
      var fs = require('fs');
      var exec = require('child_process').exec;
      var self = this;

      var content = fs.readFileSync(self.data.file);
      if (content) {
        var $ = cheerio.load(content);
        var title = $('title').text();
        exec('git rev-parse --short=10 HEAD', function(err, out, stderr) {
          if (err) { 
            grunt.fail.warn(err);
          }
          var now = new Date();
          title = title + ' - ' + out.substr(0, 10) + ' - ' + now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDay();
          $('title').text(title);
          fs.writeFileSync(self.data.file, $.html());
          done();
        });
      } else {
        grunt.fail.warn('Index did not load correctly');
      }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jst');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.registerTask("default", ['clean']);
    
 
	grunt.registerTask("debug","generate debug mode",function(param){
		if(param) {
			DEBUG = 1;
			SCHEMA = "http://";
		}	
	});

    grunt.registerTask("stage",['default','uglify','cssmin','copy:stage','rev:stage']);
   

};
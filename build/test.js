


var utils = require('utils');
var subprocess = require('sdk/system/child_process/subprocess');
var Q = utils.Q;

function runls() {
  var p = subprocess.call({
    command: '/bin/ls',
    stdout: function(data) {console.log('success:' + data);},
    stderr: function(data) {console.log('error:' + data);}
  });
  p.wait();
}

function execute() {
  var q = Q.defer();
  q.promise.then(function() {
    runls();
  });
  q.resolve();
  // 
  //runls();
}

exports.execute = execute;

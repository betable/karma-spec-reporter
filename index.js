require('colors');

var colors = {
    skip: 36
  , fail: 31
  , pass: 32
  , stack: 90
}

var color = function(type, str) {
  return '\u001b[' + colors[type] + 'm' + str + '\u001b[0m';
}

var format_time = function(time) {
  var mins = Math.floor(time / 60000);
  var secs = (time - mins * 60000) / 1000;
  var str = secs + (secs === 1 ? ' sec' : ' secs');

  if (mins) {
    str = mins + (mins === 1 ? ' min ' : ' mins ') + str;
  }

  return str;
}

var SpecReporter = function(baseReporterDecorator, formatError) {
  baseReporterDecorator(this);

  // colorize output of BaseReporter functions
  this.USE_COLORS = true;
  this.SPEC_FAILURE = '%s %s FAILED'.red + '\n';
  this.SPEC_SLOW = '%s SLOW %s: %s'.yellow + '\n';
  this.ERROR = '%s ERROR'.red + '\n';
  this.FINISHED_ERROR = ' ERROR'.red;
  this.FINISHED_SUCCESS = ' SUCCESS'.green;
  this.FINISHED_DISCONNECTED = ' DISCONNECTED'.red;
  this.X_FAILED = ' (%d FAILED)'.red;
  this.TOTAL_SUCCESS = 'TOTAL: %d SUCCESS'.green + '\n';
  this.TOTAL_FAILED = 'TOTAL: %d FAILED, %d SUCCESS'.red + '\n';
  this.SKIPPED = 0
  this.errors = []

  this.onRunStart = function(browsers) {
    browsers.forEach(function(browser) {
      // useful properties
      browser.id;
      browser.fullName;
    });
  };

  this.onBrowserComplete = function(browser) {
    // useful properties
    var result = browser.lastResult;
    result.total;
    result.disconnected;
    result.error;
    result.failed;
    result.netTime; // in millieseconds? or microseconds?
  };

  this.onRunComplete = function(browsers, results) {
    this.write("\n\n");
    var indent = '  '

    var self = this
    browsers.forEach(function(browser) {
        self.write(indent+'Tests run using: ' + browser.name + ' in ' + format_time(browser.lastResult.totalTime) + '\n')
    })

    this.write(indent+color('pass', results.success+ ' passing') + '\n')

    if(this.SKIPPED) {
        this.write(indent+color('skip', this.SKIPPED+ ' pending') + '\n')
    }

    if(results.failed) {
        this.write(indent+color('fail', results.failed+ ' failed') + '\n')
    }

    for(var i = 0, len = this.errors.length; i < len; i++) {
        this.write('\n'+indent + (i+1) + ') ' + this.errors[i].test + '\n')
        var err = this.errors[i].error.split('\n')
        this.write(indent + '  ' + color('fail', err.shift()) + '\n')
        this.write(indent + color('stack', err.join('\n')))
    }
    this.write("\n\n");
  };

  this.currentSuite = [];
  this.writeSpecMessage = function(type) {
    return (function(browser, result) {
      var suite = result.suite
      var indent = "  ";
      suite.forEach(
        // beware, this in the context of a foreach loop is not what you expect!
        // To be sure, we bind this explicitly
        (function(value, index) {
          if (index >= this.currentSuite.length || this.currentSuite[index] != value) {
            if (index == 0) {
              this.writeCommonMsg('\n');
            }
            this.writeCommonMsg(indent + value + '\n');
            this.currentSuite = [];
          }
          indent += " ";
        }).bind(this)
      );
      this.currentSuite = suite;

      var specName = result.description;
      //TODO: add timing information
      if(type === 'success') {
          var msg = '  '  + indent + '✓'.green + " " + specName.grey, specName
      } else if(type === 'skipped') {
          var msg = '  '  + indent + color('skip','-')+ " " + color('skip', specName), specName
          this.SKIPPED++
      } else {
          var msg = '  '  + indent + color('fail', (this.errors.length+1)+')')+ " " + color('fail', specName), specName
      }

      var self = this
      result.log.forEach(function(log) {
        self.errors.push({ test: specName, error: log})
      });

      this.writeCommonMsg(msg + '\n');

      // other useful properties
      browser.id;
      browser.fullName;
      result.time;
      result.skipped;
      result.success;
    }).bind(this);
  };

  this.specSuccess = this.writeSpecMessage('success');
  this.specSkipped = this.writeSpecMessage('skipped');
  this.specFailure = this.writeSpecMessage('failed');
};

SpecReporter.$inject = ['baseReporterDecorator', 'formatError'];

module.exports = {
  'reporter:spec': ['type', SpecReporter]
};

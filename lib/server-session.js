
var fs          = require('fs');
var path        = require('path');
var xpush       = require('xpush');
var path        = require('path');
var express     = require('express');
var ParseServer = require('parse-server').ParseServer;
var bodyParser  = require('body-parser');
var cors        = require('cors');

/**
 *
 * options : {host, port, logo, home, zookeeper, redis, mongodb, app}
 */
var SessionServer = exports.SessionServer = function (options, cb) {

  if (!options || !options.port) {
    throw new Error('Both `options` and `options.port` are required.');
  }

  var parseArgs = {
    databaseURI: options.mongodb || 'mongodb://localhost:27017/stalk-messenger',
    cloud: options.cloud,
    appId: options.app || 'STALK',
    appName: options.appName ||"stalk",
    masterKey: options.master || 's3cR3T', //Add your master key here. Keep it secret!
    // ** 주의 ** cloud 에서도 사용하는 URL 에는 반드시 protocal 이 명시되어야 함.
    serverURL: options.serverURL || 'http://'+options.host+':'+options.port+options.parsePath,
    publicServerURL: options.publicServerURL || 'http://'+options.host+':'+options.port+options.parsePath,
    push: options.push
  };

  if( options.verifyUserEmails ) parseArgs['verifyUserEmails'] = options.verifyUserEmails;

  if ( options.push && options.push.ios ){
    if( !options.push.ios.production && !options.push.ios.pfx.startsWith( "/" ) ){
      parseArgs.push.ios.pfx = path.join(process.cwd(), options.push.ios.pfx );
    }
  }

  console.log('\n\n ** PARSE CONFIGURATION ** \n');
  console.log(parseArgs);

  if( options.emailAdapter ) {

    parseArgs['emailAdapter'] = options.emailAdapter;

    console.log('\n * \'emailAdapter\' is added. * \n');
    console.log(options.emailAdapter);

    for (var p in parseArgs.emailAdapter.options) {
      if( parseArgs.emailAdapter.options.hasOwnProperty(p) ) {
        if(parseArgs.emailAdapter.options[p].startsWith('file:')) {
          var _filePath = path.resolve(process.cwd(), parseArgs.emailAdapter.options[p].substr(5));
          parseArgs.emailAdapter.options[p] = fs.readFileSync(_filePath, "utf8") ||  null;
        }
      }
    }

  }
  console.log('\n');


  var api = new ParseServer(parseArgs);

  //===============EXPRESS=================
  var app = express();
  app.use( bodyParser.urlencoded({ extended: false }) ); 	// parse application/x-www-form-urlencoded
  app.use( bodyParser.json() );							              // parse application/json
  app.use( cors() );
  app.use( options.parsePath, api);

  if( typeof options.routePath === 'string') {
    var routePath = path.join(process.cwd(), options.routePath );
    require(routePath)(app);
  }

  if(options.static) app.use(options.static.path, express.static(options.static.folder));

  app.get('/ping', function(req, res) {
    res.status(200).send('pong');
  });

  //=============== Start XPUSH Session Server =================
  this.server = xpush.createSessionServer(options, cb, app);
  this.server.on('started', function (url, port) {
    console.log(url, port);
  });

};

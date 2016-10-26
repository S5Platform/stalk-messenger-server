var xpush       = require('xpush');
var path        = require('path');
var express     = require('express');
var ParseServer = require('parse-server').ParseServer;
var bodyParser  = require('body-parser');
var cors = require('cors');

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
    cloud: path.resolve(__dirname, 'cloud.js'),
    appId: options.app || 'STALK',
    appName: "S5Messenger",
    masterKey: options.master || 's3cR3T', //Add your master key here. Keep it secret!
    // @ TODO : cloud 에서도 사용하는 URL 에는 반드시 protocal 이 명시되어야 함. 이부분 어떻게 해야 할지 확인 필요!!
    serverURL: 'http://localhost:8080/parse' //options.host+':'+options.port+'/parse'
  };

  var api = new ParseServer(parseArgs);

  var staticPath = path.normalize(__dirname + '/../public');

  //===============EXPRESS=================

  var app = express();
  app.use( bodyParser.urlencoded({ extended: false }) ); 	// parse application/x-www-form-urlencoded
  app.use( bodyParser.json() );							              // parse application/json
  app.use( cors() );
  app.use('/public', express.static(staticPath));

  app.use('/parse', api);

  app.get('/test', function(req, res) {
    res.sendFile(path.join(staticPath, '/test.html'));
  });

  app.get('/', function(req, res) {
    res.status(200).send('PONG !! ');
  });

  //=============== Start XPUSH Session Server =================

  var self = this;
  this.server = xpush.createSessionServer(options, cb, app);

  this.server.on('started', function (url, port) {

    ParseServer.createLiveQueryServer(self.server);

    console.log(url, port);
  });

};

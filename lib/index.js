var SessionServer = exports.SessionServer = require('./server-session').SessionServer;
var ChannelServer = exports.ChannelServer = require('./server-channel').ChannelServer;

/**
 * Create session server
 * @name createSessionServer
 * @function createSessionServer
 */
exports.createSessionServer = function (options, cb) {
  var server;
  server = new SessionServer(options, cb);
  return server;
};

/**
 * Create channel server
 * @name createChannelServer
 * @function createChannelServer
 */
exports.createChannelServer = function (options, cb) {
  var server;
  server = new ChannelServer(options, cb);
  return server;
};

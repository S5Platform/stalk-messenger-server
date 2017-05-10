var xpush = require('xpush');
var Parse = require('parse/node');
var utils = require('./utils');

var ParseAdapter = require('./parse-adapter');

var Messages = Parse.Object.extend("Messages");
var Channels = Parse.Object.extend("Channels");
var apnProvider;
var gcmProvider;

var apn = require('apn');
var gcm = require('node-gcm');

var users = {}; // { *channel* : *user* : {} }
var backgrounds = {};

var NSP_BACKGROUND = '/background';

var ChannelServer = exports.ChannelServer = function(options, cb) {

  if (!options || !options.port) {
    throw new Error('Both `options` and `options.port` are required.');
  }

  Parse.initialize(options.app || 'STALK');
  Parse.serverURL = options.serverURL || 'http://localhost:8080/parse';

  if( options.push ){
    if( options.push.ios ){
      apnProvider = new apn.Provider(options.push.ios);
      apnProvider.topic = options.push.ios.topic;
    } else if ( options.push.android ){
      gcmProvider = new gcm.Sender(options.push.android.apiKey);
    }
  }

  var parseAdapter = new ParseAdapter( options );

  /** Test Code
  var query = new Parse.Query(Channels);
  query.equalTo("objectId", 'M4qQLiQqzX');
  parseAdapter.find( query ).then( (result)=>{
    console.log( result );
  },(err)=>{
    console.log( err );
  });

  var channel = new Channels();
  channel.id = "D3En2renjD"; // channel Id

  var user = new Parse.User();
  user.id = "m9rxYMyi0U"; // user Id

  var message = new Messages();
  message.set("channel", channel);
  message.set("user", user);
  message.set("message", "111");

  parseAdapter.create( message ).then( (result)=>{
    console.log( result );
  },(err)=>{
    console.log( err );
  });

  */

  this.server = xpush.createChannelServer(options);
  this.redisClient = this.server.sessionManager.redisClient; // @ TODO search bacground session

  var self = this;

  this.server.onConnection(function(data) {

    console.log('[CHANNEL] CONNECTED ', data);

    if (data.count == 1 || !users[data.C]) {

      if (!users[data.C]) users[data.C] = {};

      new Parse.Query(Channels).get(data.C, {
        success: (channel) => {
          channel.get("users").forEach(function(user) {
            users[data.C][user.id] = (user.id == data.U) ? data.id : null;
          });
        },
        error: function(error) {
          console.warn(error);
        }
      });

    } else {
      users[data.C][data.U] = data.id;
    }

    /*  ** DO SOMETHING after connections **
  	socket.emit('name', '[data]' );
  	socket.on('ping', function(data){
      socket.emit('message', 'pong' );
  	});
    */

  });

  this.server.onDisconnect(function(data) {

    console.log('[CHANNEL] DISCONNECTED', data);

    if (users[data.C]) {
      users[data.C][data.U] = null;
      if(data == 0) delete users[data.C];
    }

  });

  this.server.onSend(function(data, socket) {

    console.log('[CHANNEL] MESSAGE ', data, users[socket.handshake.query.C]);

    data.DT.msgid = utils.getMsgid();

    var channel = new Channels();
    channel.id = socket.handshake.query.C; // channel Id

    var user = new Parse.User();
    user.id = socket.handshake.query.U; // user Id

    var message = new Messages();
    message.set("channel", channel);
    message.set("user", user);
    if (data.DT.text) {
      message.set("message", data.DT.text);
    }
    if (data.DT.image) {
      message.set("image", data.DT.image);
    }

    parseAdapter.create( message ).then(
      (result)=>{

        socket.emit('sent', {
          tempId: data.DT._id,
          id: result.id
        });

        var _users = users[socket.handshake.query.C];
        for (key in _users) {
          if (!_users[key]) {

            if( backgrounds[key] ) {
              self.server.send({
                socketId: backgrounds[key],
                name: 'backgound-message',
                data: data,
                namespace : NSP_BACKGROUND
              });
            }else{

              self.redisClient.get("G:"+key, function(err, reply) {

                if (err) {
                  console.warn(err, reply);

                } else if (reply) {

                  console.log(reply.split('^')[0], reply.split('^')[1]);
                  self.server.send({
                    server: reply.split('^')[0],
                    socketId: reply.split('^')[1],
                    name: 'backgound-message',
                    data: data,
                    namespace : NSP_BACKGROUND
                  });
                } else {

                  var userQuery = new Parse.Query(Parse.User);
                  userQuery.equalTo("objectId", key);

                  parseAdapter.first( userQuery ).then(
                    (user) => {
                      sendPush( user );
                    },
                    (err)=>{
                      console.log( err );
                    }
                  );
                }

              });


            }

          } else {
            // do nothing ?
          }
        }
      
      },
      (error)=>{

        console.warn(error);
        socket.emit('sent', {
          tempId: data.DT._id,
          error: error
        });

      }
    );

  });

  // Add namespace for background socket connection.
  this.server.addNamespace(NSP_BACKGROUND, function(socket, next) {

    if(!socket.request._query.U){
      console.error('Parameter is not corrected. (U) : ', socket.request._query.U);
      next('Parameter is not corrected. (U) ', false);
      return;
    }

    socket.handshake.query = { U: socket.request._query.U };

    // TODO add authorization process

    next(null, true);
  }, function(socket) { // "connection"

    console.log('[BACKGROUND] Connected ', socket.id, socket.handshake.query.U);

    self.redisClient.set("G:"+socket.handshake.query.U, self.server.getServerName()+"^"+socket.id);

    backgrounds[socket.handshake.query.U] = socket.id;

    socket.on('disconnect', function() {
      console.log('[BACKGROUND] Disconnected ', socket.id, socket.handshake.query.U);
      delete backgrounds[socket.handshake.query.U];
      self.redisClient.del("G:"+socket.handshake.query.U);
    });

  });

  this.server.on('started', function(url, port) {
    console.log("Channel Server STARTED : ", url, port);
  });

  var sendPush = function( user ){

    if( user ){
      var deviceToken = user.deviceToken;
      var deviceType = user.deviceType;
      var username = user.nickName || user.username;

      if( deviceToken ){
        if( deviceType == 'ios' &&  apnProvider ){
          var note = new apn.Notification();

          note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
          note.badge = 1;
          note.alert = data.message || data.text;
          note.payload = data;
          note.topic = options.push.ios.topic;

          apnProvider.send(note, deviceToken ).then( (result) => {
            console.log( result );
          });

        } else if( deviceType == 'android' &&  gcmProvider ){

          // Prepare a message to be sent
          var message = new gcm.Message({
            data: data
          });

          // Specify which registration IDs to deliver the message to
          var regTokens = [deviceToken];

          // Actually send the message
          gcmProvider.send(message, { registrationTokens: regTokens }, function (err, result) {
            if (err) {
              console.error(err);
            } else {
              console.log(result);
            }
          });

        }
      }
    }
  }

};

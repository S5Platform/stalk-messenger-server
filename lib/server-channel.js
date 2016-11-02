var xpush = require('xpush');
var Parse = require('parse/node');
var utils = require('./utils');

var Messages = Parse.Object.extend("Messages");
var Channels = Parse.Object.extend("Channels");

var users = {};

var ChannelServer = exports.ChannelServer = function (options, cb) {

  if (!options || !options.port) {
    throw new Error('Both `options` and `options.port` are required.');
  }

  Parse.initialize(options.app || 'STALK');
  Parse.serverURL = options.serverURL || 'http://localhost:8080/parse';

  this.server = xpush.createChannelServer(options);
  this.redisClient = this.server.sessionManager.redisClient;

  this.server.onConnection(function( data ){

    console.log('** CONNECTED ** ', data);

    if ( data.count == 1 || !users[data.C] ){

      if( !users[data.C] ) users[data.C] = {};

      new Parse.Query(Channels).get( data.C, {
        success: (channel) => {
          channel.get("users").forEach(function(user) {
            users[data.C][user.id] = ( user.id == data.U ) ? data.id : null;
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

  this.server.onDisconnect(function( data ){

    console.log('** DISCONNECTED **', data);

    if( users[data.C] ) {
      delete users[data.C][data.U];
      if( Object.keys(users[data.C]).length == 0 ) delete users[data.C]
    }

  });

  this.server.onSend(function (data, socket){

    console.log('** MESSAGE **', data, users[socket.handshake.query.C]);

    data.DT.msgid = utils.getMsgid();

    var channel = new Channels();
    channel.id = socket.handshake.query.C; // channel Id

    var user = new Parse.User();
    user.id = socket.handshake.query.U; // user Id

    var message = new Messages();
    message.set("channel",  channel       );
    message.set("user",     user          );
    if( data.DT.text ){
      message.set("message",  data.DT.text  );
    }
    if( data.DT.image ){
       message.set("image",  data.DT.image  );
    }

    message.save().then(
      (result) => {

        socket.emit('sent', {
          tempId: data.DT._id,
          id: result.id
        });

        var _users = users[socket.handshake.query.C];
        for(key in _users ) {
          if( !_users[key] ) {
            console.warn(' @ TODO : messaging !!!! to user id (' + key + ')');
          }
        }

      },
      (error) => {

        console.warn(error);
        socket.emit('sent', {
          tempId: data.DT._id,
          error: error
        });

      }
    );

  });

  this.server.on('started', function (url, port){
  	console.log( "Channel Server STARTED : ", url, port );
  });

};

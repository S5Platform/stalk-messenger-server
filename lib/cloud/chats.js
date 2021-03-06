
var Chats = Parse.Object.extend("Chats");
var Channels = Parse.Object.extend("Channels");

var _addChats = function(channel, users) {

  var fnCreateChat = function ( channel, user ) {

    return new Promise((resolve, reject) => {

      var queryChats = new Parse.Query(Chats);
      queryChats.equalTo("user", user);
      queryChats.equalTo("channel", channel);
      queryChats.first().then(

        (chat) => {

          if(!chat){
            var chats = new Chats();
            chats.set("user", user);
            chats.set("channel", channel);
            chats.save().then(
              (value) => { resolve(value);  },
              (error) => { reject(error);   }
            );
          }else{
            resolve(chat);
          }
        },
        (error) => {
          reject(error);
        }
      );

    });
  };

  var fnArray = [];
  users.forEach(function(user) {
    fnArray.push(fnCreateChat(channel, user));
  });

  return new Promise((__resolve, __reject) => {

    Promise.all(fnArray).then(value => {
      __resolve(value);
    }, reason => {
      __reject(reason);
    });

  });

}

var _getChats = function(channel, user) {
  return new Promise( (resolve, reject) => {
    return new Parse.Query(Chats)
      .include('channel.users')
      .equalTo("channel", channel)
      .equalTo("user", user)
      .first({
        success: function(chat) {
          resolve(chat);
        },
        error: function(object, error) {
          console.error(error);
          reject(error);
        }
      });

  });
}

var _getChannelByKey = function(data){

  return new Promise( (resolve, reject) => {

    var channelRef = null;
    var query = new Parse.Query(Channels);

    if( typeof data.channelKey == 'string'  ){
      query.equalTo("channelKey", data.channelKey);
    } else if ( typeof data.channelKey == 'object' && data.channelKey.className )  {
      channelRef = Parse.Object.extend(data.channelKey.className);
      channelRef.id = data.channelKey.objectId;
      query.equalTo("channelKey", channelRef);
    } else if( data.users ){
      query.containsAll("users", data.users);
    }

    return query.find().then(
        (channels) => {

          var channel;
          if( channels ){

            for( var inx = 0 ; inx < channels.length ; inx++ ){
              if( ( channelRef && channelRef.id == channels[inx].get("channelKey").id  )
                 || data.channelKey == channels[inx].get("channelKey")
                 || ( channels[inx].get("users") && data.users && ( channels[inx].get("users").length == data.users.length ) ) ){
                channel = channels[inx];
                break;
              }
            }
          }

          resolve(channel);
        },
        (error) => {
          console.error(error);
          reject(error);
        }
      );
  });
};

var _getChannel = function(data) {
  return new Promise( (resolve, reject) => {

    return _getChannelByKey(data).then(
        (channel) => {

          if(!channel) {

            var newChannel = new Channels();
            newChannel.set("createdBy", data.currentUser );
            for( var inx in data.users ) {
              if( data.users[inx].id != data.currentUser.id ){
                newChannel.addUnique("users", data.users[inx]);
              }
            };

            if( data.channelKey ){
              newChannel.set("channelKey", data.channelKey);
            }

            newChannel.save().then(
              (result) => {
                resolve(result);
              },
              (error) => {
                console.error(error);
                reject(error);
              }
            );
          }else{
            resolve(channel);
          }
        },
        (error) => {
          console.error(error);
          reject(error);
        }
      );
  });
}

Parse.Cloud.define('chats-create', function(request, response) {
  Parse.Cloud.useMasterKey();

  var currentUser = request.user;
  if (!currentUser) {
    return response.error({message: 'Not logged in'});
  }

  var params = request.params;
  if (!params.id && !params.ids ) {
    return response.error({message: 'Need username for following.'});
  }

  if( params.id == currentUser.id) {
    // ParseError.VALIDATION_ERROR = 142; (Error code indicating that a Cloud Code validation failed.)
    response.error( {code: 142, message: "input param ("+params.id+") is same with current user"} );
    return;
  }

  var users = [];
  var cuser = new Parse.User();
  cuser.id = currentUser.id;
  users.push( cuser );

  if( params.id ) {
    var user = new Parse.User();
    user.id = params.id;
    users.push( user );
  } else if ( params.ids ){
    var ids = request.params.ids;

    if( Array.isArray(ids) ){
      ids.forEach(function(userId) {

        if(userId == currentUser.id) {
          console.error( "input param ("+userId+") is same with current user" );
        } else {
          var user = new Parse.User();
          user.id = userId;
          users.push(user);
        }
      });
    }
  }

  var data = {
    users:users,
    currentUser:currentUser
  }

  if( params.channelKey ){
    data.channelKey = params.channelKey;
  }

  _getChannel(data).then(

    (channel) => {

      _addChats(channel, users).then(
        (results) => {

          _getChats(channel, currentUser).then(
            (chat) => {

              response.success(chat);
            },
            (error) => {
              response.error(error);
            }
          );
        },
        (error) => {
          response.error(error);
        }
      );
    },
    (error) => {
      response.error(error);
    }

  );

});

Parse.Cloud.define('chats-add', function(request, response) {

  var currentUser = request.user;

  var ids = request.params.ids;
  var channelId =  request.params.channelId;

  var currentChannel = new Channels();
  currentChannel.id = channelId;

  var users = [];

  if (Array.isArray(ids)) {
    ids.forEach(function(userId) {

      if(userId == currentUser.id) {
        console.error( "input param ("+userId+") is same with current user" );
      } else {
        var user = new Parse.User();
        user.id = userId;
        users.push(user);
      }

    });
  } else {
    var user = new Parse.User();
    user.id = ids;
    users.push(user);
  }

  users.forEach(function(user) {
    currentChannel.addUnique("users", user);
  });

  currentChannel.save().then(
    (results) => {

      _addChats(currentChannel, users).then(
        (results) => {

          _getChats(currentChannel, currentUser).then(
            (chat) => {
              response.success(chat);
            },
            (error) => {
              response.error(error);
            }
          );
        },
        (error) => {
          response.error(error);
        }
      );

    },
    (error) => {
      response.error(error);
    }
  );
});

Parse.Cloud.define('chats-update', function(request, response) {
  var chatId =  request.params.chatId;

  var currentChat = new Chats();
  currentChat.id = chatId;
  currentChat.set( "loadedAt", new Date());
  currentChat.set( "unreadCount", 0);

  currentChat.save().then(
    (chat) => {
      response.success(chat);
    },
    (error)=>{
      response.error(error);
    }
  );

});

Parse.Cloud.define('chats-loaded', function(request, response) {
  var chatId =  request.params.chatId;

  var currentChat = new Chats();
  currentChat.id = chatId;
  currentChat.set( "loadedAt", new Date());
  currentChat.set( "unreadCount", 0);

  currentChat.save().then(
    (chat) => {
      response.success(chat);
    },
    (error)=>{
      response.error(error);
    }
  );

});

Parse.Cloud.define('chats-remove', function(request, response) {

  var currentUser = request.user;
  if (!currentUser) {
    return response.error({message: 'Not logged in'});
  }

  var params = request.params;
  if (!params.id) {
    return response.error({message: 'Need chat id for following.'});
  }

  new Parse.Query(Chats).get( params.id, {
      success: (result) => {

        if(result) {
          var channel = result.get("channel");
          var queryChannels = new Parse.Query(Channels);
          queryChannels.equalTo("objectId", channel.id);
          queryChannels.first().then(
            (channel) => {
              if(channel){
                if( channel.get("users").length > 1 ){
                  channel.remove("users", currentUser);
                }

                channel.save().then(
                  (done) => {
                    result.destroy().then(
                      (object)  => { response.success(object);  },
                      (error)   => { response.error(error);     }
                    );
                  },
                  (error) => {
                    console.log( error );
                  }
                );
              } else {
                response.error( {code: 101, message: "object doesn't exist."} );
              }
            },
            (error) => {
              console.log(error);
            }
          );
        } else {
          // ParseError.OBJECT_NOT_FOUND = 101 (Error code indicating the specified object doesn't exist.)
          response.error( {code: 101, message: "object doesn't exist."} );
        }

      },
      error: function(error) {
        console.log(error);
        response.error(error);
      }
    });

});

Parse.Cloud.define('chats-by-channelKey', function(request, response) {

  var currentUser = request.user;

  var data = {};
  data.channelKey = request.params.channelKey;

  _getChannelByKey(data).then(
    (channel) => {

      _getChats(channel, currentUser).then(
        (chat) => {
          response.success(chat);
        },
        (error) => {
          response.error(error);
        }
      );

    },
    (error) => {
      response.error(error);
    }
  );
});

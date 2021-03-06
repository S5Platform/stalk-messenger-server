var Follows = Parse.Object.extend("Follows");

Parse.Cloud.define('hello', function(req, res) {
  res.success('Hi');
});

Parse.Cloud.define('follows', function(request, response) {

  var user = request.user;
  if (!user) {
    return response.success([]);
  }

  new Parse.Query(Follows)
    .equalTo('userFrom', user)
    .include('userTo')
    .find()
    .then(
      (value) => {
        response.success(value);
      },
      (error) => { response.error(error); }
    );

});

var _addFollows = function(currentUser, userIds) {

  var fnCreateFollow = function (userId) {

    return new Promise((resolve, reject) => {

      var user = new Parse.User();
      user.id = userId;

      new Parse.Query(Follows)
        .equalTo('userFrom', currentUser)
        .equalTo('userTo', user)
        .first()
        .then(
          (result) => {

          if(!result) {
            var follow = new Follows();
            follow.set("userFrom", currentUser);
            follow.set("userTo", user);
            follow.save()
            .then(
              (value) => { resolve(value); },
              (error) => { reject(error);  }
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
  userIds.forEach(function(userId) {
    fnArray.push(fnCreateFollow(userId));
  });

  return new Promise((__resolve, __reject) => {

    Promise.all(fnArray).then(value => {
      __resolve(value);
    }, reason => {
      __reject(reason);
    });

  });

}


Parse.Cloud.define('follows-create', function(request, response) {

  var currentUser = request.user;
  if (!currentUser) {
    return response.error({message: 'Not logged in'});
  }

  var params = request.params;
  if (!params.id ) {
    return response.error({message: 'Need user id for following.'});
  }

  var userIds = params.id;
  if( Array.isArray(userIds) ){
    userIds.forEach(function(userId) {
      if(userId == currentUser.id) {
        // ParseError.VALIDATION_ERROR = 142; (Error code indicating that a Cloud Code validation failed.)
        response.error( {code: 142, message: "input param ("+params.id+") is same with current user"} );
        return;
      }
    });
  } else {
    if(userIds == currentUser.id) {
      // ParseError.VALIDATION_ERROR = 142; (Error code indicating that a Cloud Code validation failed.)
      response.error( {code: 142, message: "input param ("+params.id+") is same with current user"} );
      return;
    }

    userIds = [params.id];
  }

  _addFollows(currentUser, userIds).then(
    (results) => {
      response.success(results);
    },
    (error) => {
      response.error(error);
    }
  );
});


Parse.Cloud.define('follows-remove', function(request, response) {

  var currentUser = request.user;
  if (!currentUser) {
    return response.error({message: 'Not logged in'});
  }

  var params = request.params;
  if (!params.id) {
    return response.error({message: 'Need user id for following.'});
  }

  if(params.id == currentUser.id) {
    // ParseError.VALIDATION_ERROR = 142; (Error code indicating that a Cloud Code validation failed.)
    response.error( {code: 142, message: "input param ("+params.id+") is same with current user"} );
    return;
  }

  var user = new Parse.User();
  user.id = params.id;

  new Parse.Query(Follows)
    .equalTo('userFrom', currentUser)
    .equalTo('userTo', user)
    .first()
    .then(
      (result) => {

        if(result) {
          result.destroy().then(
            (object)  => {
              response.success(object);
            },
            (error)   => {
              response.error(error);
            }
          );
        } else {
          response.error( {code: 101, message: "object doesn't exist."} );
        }

      },
      (error) => {
        response.error(error);
      }

    );

});

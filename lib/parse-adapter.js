
var DatabaseController = require( 'parse-server/lib/Controllers/DatabaseController' );
var CacheController = require( 'parse-server/lib/Controllers/CacheController' ).default;

var FilesController =  require('parse-server/lib/Controllers/FilesController').default;

var InMemoryCacheAdapter = require( 'parse-server/lib/Adapters/Cache/InMemoryCacheAdapter').default;

var SchemaCache        = require('parse-server/lib/Controllers/SchemaCache').default;

var MongoStorageAdapter = require( 'parse-server/lib/Adapters/Storage/Mongo/MongoStorageAdapter');
var PostgresStorageAdapter = require( 'parse-server/lib/Adapters/Storage/Postgres/PostgresStorageAdapter');

var GridStoreAdapter = require( 'parse-server/lib/Adapters/Files/GridStoreAdapter').default;


var loadAdapter = require( 'parse-server/lib/Adapters/AdapterLoader' ).default;

var RestQuery = require( 'parse-server/lib/RestQuery' );
var Auth = require( 'parse-server/lib/Auth' );

function ParseAdapter(options) {

	this.options = options;

  var appId = options.appId || 'stalk-messenger'
  var databaseURI = options.mongodb || "mongodb://localhost:27017/stalk-messenger";

  var databaseAdapter = getDatabaseAdapter(databaseURI);

  const cacheControllerAdapter = loadAdapter(options.cacheAdapter, InMemoryCacheAdapter, {appId: appId});
  const cacheController = new CacheController(cacheControllerAdapter, appId);

  const databaseController = new DatabaseController(databaseAdapter, new SchemaCache(cacheController, 5000, false));
  const dbInitPromise = databaseController.performInitialization();


  var filesControllerAdapter;

  if( options.filesAdapter ){
   	filesControllerAdapter = loadAdapter(options.filesAdapter, () => {
    	return new GridStoreAdapter(databaseURI);
  	});
 	} else {
 		filesControllerAdapter = new GridStoreAdapter(databaseURI);
 	}
  const filesController = new FilesController(filesControllerAdapter, appId);

  var config = {};
  config.database = databaseController;
  config.filesController = filesController;
  config.applicationId = appId;
  this.config = config

  /** TEST CODE
  const query = {
    objectId: "FODDV8lQLE"
  };

  databaseController.find('_User', query)
  .then(users => {

    console.log( users );

  })
  .catch(err => {

    console.log( err );
    
  });

  var where = {
    objectId: "FODDV8lQLE"
  };

  var config = {};
  config.database = databaseController;
  config.filesController = filesController;
  config.applicationId = appId;
  this.config = config

	var query = new RestQuery(this.config, Auth.master(this.config), '_User', where);
	return query.execute().then(function(result){

		console.log( result );

	  if (result.results.length != 1) {
	    throw undefined;
	  }
	  return result.results[0];
	})

	  */

}

ParseAdapter.prototype.findOne = function( query ){

  var where = {};

  for( var key in query ){
  	where[key] = query[key];
  }

	var query = new RestQuery(this.config, Auth.master(this.config), query.className, where);
	return query.execute().then(function(result){
	  if (result.results.length != 1) {
	    throw undefined;
	  }
	  return result.results[0];
	});
}

ParseAdapter.prototype.find = function( query ){
	
  var where = {};

  for( var key in query ){
  	where[key] = query[key];
  }

	var query = new RestQuery(this.config, Auth.master(this.config), query.className, where);
	return query.execute().then(function(result){
	  return result.result;
	});
}

var getDatabaseAdapter = function(databaseURI, collectionPrefix, databaseOptions) {
	let protocol;
	try {
		const parsedURI = url.parse(databaseURI);
		protocol = parsedURI.protocol ? parsedURI.protocol.toLowerCase() : null;
	} catch(e) { /* */ }
	switch (protocol) {
	case 'postgres:':
		return new PostgresStorageAdapter({
			uri: databaseURI,
			collectionPrefix,
			databaseOptions
		});
	default:
		return new MongoStorageAdapter({
			uri: databaseURI,
			collectionPrefix,
			mongoOptions: databaseOptions,
		});
	}
}

module.exports = ParseAdapter;

var DatabaseController = require( 'parse-server/lib/Controllers/DatabaseController' );
var CacheController = require( 'parse-server/lib/Controllers/CacheController' ).default;

var InMemoryCacheAdapter = require( 'parse-server/lib/Adapters/Cache/InMemoryCacheAdapter').default;

var SchemaCache        = require('parse-server/lib/Controllers/SchemaCache').default;

var MongoStorageAdapter = require( 'parse-server/lib/Adapters/Storage/Mongo/MongoStorageAdapter');
var PostgresStorageAdapter = require( 'parse-server/lib/Adapters/Storage/Postgres/PostgresStorageAdapter');

var loadAdapter = require( 'parse-server/lib/Adapters/AdapterLoader' ).default;

function ParseAdapter(options) {

	this.options = options;

  var appId = options.add;
  var databaseURI = options.mongodb || "mongodb://localhost:27017/stalk-messenger";

  var databaseAdapter = getDatabaseAdapter(databaseURI);

  const cacheControllerAdapter = loadAdapter(options.cacheAdapter, InMemoryCacheAdapter, {appId: appId});
  const cacheController = new CacheController(cacheControllerAdapter, appId);

  const databaseController = new DatabaseController(databaseAdapter, new SchemaCache(cacheController, 5000, false));
  const dbInitPromise = databaseController.performInitialization();

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
  */

  this.database = databaseController;

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
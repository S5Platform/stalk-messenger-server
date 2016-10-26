# STALK SERVER

### Run session server

```
export VERBOSE=1  # logging verbose
./bin/start --session
```

### Run channel server

```
./bin/start --channel
```

### Run parse-dashboard

Install the dashboard from `npm`.

```
npm install -g parse-dashboard
```

You can launch the dashboard for an app with a single command by supplying an app ID, master key, URL, and name like this:

```
parse-dashboard --appId STALK --masterKey s3cR3T --serverURL "http://localhost:8080/parse" --appName S5Messenger
```



## using Docker container
```

# run mongodb, redis and zookeeper

docker run -d -p 27017:27017 --name mongo mongo
docker run -d -p 6379:6379 --name redis redis
docker run -d -p 2181:2181 --name zookeeper zookeeper

# build dockerfile

docker build -t s5platform/stalk-server .

# run session server

docker run  -d                                                  \
            -e TYPE=session                                     \
            -e ZOOKEEPER=zookeeper:2181                         \
            -e REDIS=redis:6379                                 \
            -e MONGODB=mongodb://mongo:27017/stalk-messenger    \
            -p 8080:8080                                        \
            --link zookeeper                                    \
            --link redis                                        \
            --link mongo                                        \
            --name session-server                               \
            s5platform/stalk-server

# run channel server

docker run  -d                                                  \
            -e TYPE=channel                                     \
            -e ZOOKEEPER=zookeeper:2181                         \
            -e REDIS=redis:6379                                 \
            -e PORT=9090                                        \
            -p 9090:9090                                        \
            --link zookeeper                                    \
            --link redis                                        \
            --name channel-server                               \
            s5platform/stalk-server

```

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

```
npm run dashboard -- --appId STALK --masterKey s3cR3T --serverURL "http://localhost:8080/parse" --appName S5Messenger
```

### using Docker container
```

# build dockerfile

docker build -t s5platform/stalk-server .

# run session server && channel server

docker run -d --name stalk -p 8000:8000 -p 8080:8080 s5platform/stalk-server /bin/bash start-stalk.sh --host 192.168.0.3
```

**Please enter your host ip after --host**

---

### Development Environment

```

// Run zookeeper (EXPOSE 2181(client) 2888(follower) 3888(election))
// https://hub.docker.com/_/zookeeper/
docker run --name zookeeper -p 2181:2181 -d zookeeper

// Run Redis (EXPOSE 6379)
// https://hub.docker.com/_/zookeeper/
docker run --name redis -p 6379:6379 -d redis

// Run MongoDB (EXPOSE 27017)
// https://hub.docker.com/_/mongo/
docker run --name mongo -p 27017:27017 -d mongo

// Run session server
npm start

// Run channel server
npm start -- --channel

// Run dashboard
// https://github.com/ParsePlatform/parse-dashboard
npm run dashboard -- --appId STALK --masterKey s3cR3T --serverURL "http://localhost:8080/parse" --appName S5Messenger

```

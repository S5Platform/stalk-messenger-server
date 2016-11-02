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

# build dockerfile

docker build -t s5platform/stalk-server .

# run session server && channel server

docker run -d --name stalk -p 8000:8000 -p 8080:8080 s5platform/stalk-server /bin/bash start-stalk.sh --host 192.168.0.3
```

**Please enter your host ip after --host**
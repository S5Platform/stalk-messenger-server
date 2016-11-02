FROM node:5

RUN mkdir -p /stalk-server

ENV STALK_HOME /stalk-server

ADD bin ${STALK_HOME}/bin
ADD lib ${STALK_HOME}/lib
ADD package.json ${STALK_HOME}/

WORKDIR $STALK_HOME
RUN npm install

ENV PORT 8080
EXPOSE $PORT

CMD ["/stalk-server/bin/start"]

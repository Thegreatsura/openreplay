const express = require('express');
const {
    socketConnexionTimeout,
    authorizer
} = require('../utils/assistHelper');
const {
    createSocketIOServer
} = require('../utils/wsServer');
const {
    onConnect
} = require('../utils/socketHandlers');
const {
    socketsListByProject,
    socketsLiveByProject,
    socketsLiveBySession,
    autocomplete
} = require('../utils/httpHandlers');
const {logger} = require('../utils/logger');

const {createAdapter} = require("@socket.io/redis-adapter");
const {createClient} = require("redis");
const REDIS_URL = (process.env.REDIS_URL || "localhost:6379").replace(/((^\w+:|^)\/\/|^)/, 'redis://');
const pubClient = createClient({url: REDIS_URL});
pubClient.on("error", (error) => logger.error(`Pub redis client error : ${error}`));
const subClient = pubClient.duplicate();
subClient.on("error", (error) => logger.error(`Sub redis client error : ${error}`));
logger.info(`Using Redis: ${REDIS_URL}`);

const wsRouter = express.Router();
wsRouter.get(`/sockets-list/:projectKey/autocomplete`, autocomplete); // autocomplete
wsRouter.get(`/sockets-list/:projectKey/:sessionId`, socketsListByProject); // is_live
wsRouter.get(`/sockets-live/:projectKey/autocomplete`, autocomplete); // not using
wsRouter.get(`/sockets-live/:projectKey`, socketsLiveByProject);
wsRouter.post(`/sockets-live/:projectKey`, socketsLiveByProject); // assist search
wsRouter.get(`/sockets-live/:projectKey/:sessionId`, socketsLiveBySession); // session_exists, get_live_session_by_id

let io;
module.exports = {
    wsRouter,
    start: (server, prefix) => {
        io = createSocketIOServer(server, prefix);
        io.use(async (socket, next) => await authorizer.check(socket, next));
        io.on('connection', (socket) => onConnect(socket));

        logger.info("WS server started");

        socketConnexionTimeout(io);

        Promise.all([pubClient.connect(), subClient.connect()])
            .then(() => {
                io.adapter(createAdapter(pubClient, subClient,
                    {requestsTimeout: parseInt(process.env.REDIS_REQUESTS_TIMEOUT) || 10000}));
                logger.info("> redis connected.");
            })
            .catch((err) => {
                logger.error(`redis connection error: ${err}`);
                process.exit(2);
            });
    },
    handlers: {
        socketsListByProject,
        socketsLiveByProject,
        socketsLiveBySession,
        autocomplete
    }
};
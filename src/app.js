const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config();
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const { authenticateToken } = require('./utils/auth');
const indexRouter = require('./routers/index');
const authRouter = require('./routers/auth');
const profileRouter = require('./routers/profile');
const friendRouter = require('./routers/friend');
const messageRouter = require('./routers/message');
const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

const connectWithRetry = async () => {
    console.log('MongoDB connection with retry');
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        setTimeout(connectWithRetry, 5000);
    }
};

connectWithRetry();

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(authenticateToken);

app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/', profileRouter);
app.use('/', friendRouter);
app.use('/', messageRouter);

// Socket.io 객체를 앱에 추가
app.set('socketio', io);

io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // 사용자 온라인 상태 업데이트
    socket.on('user online', async (shortId) => {
        try {
            await User.findOneAndUpdate({ shortId }, { isOnline: true, socketId: socket.id });
            console.log(`User ${shortId} is online`);
        } catch (error) {
            console.error('Error updating user online status:', error);
        }
    });

    // 방에 입장
    socket.on('join room', (roomId) => {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
    });

    // 채팅 메시지 수신 및 저장
    socket.on('chat message', async (msg) => {
        const roomId = msg.roomId;
        const messageData = {
            roomId: roomId,
            text: msg.text,
            senderId: msg.senderId,
            senderNickname: msg.senderNickname,
            senderAvatar: msg.senderAvatar, // 프로필 이미지 추가
            timestamp: new Date()
        };

        try {
            const message = new Message(messageData);
            await message.save();
            io.to(roomId).emit('chat message', { ...msg, socketId: socket.id });
            console.log(`Message received in room ${roomId}: ${JSON.stringify(msg)}`);
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    // 사용자 로그아웃 처리
    socket.on('logout', async (shortId) => {
        try {
            await User.findOneAndUpdate({ shortId }, { isOnline: false });
            console.log(`User ${shortId} is offline`);
            socket.broadcast.emit('friend offline', shortId); // 친구에게 오프라인 상태 전송
        } catch (error) {
            console.error('Error updating user offline status:', error);
        }
    });

    // 연결 해제 처리
    socket.on('disconnect', async () => {
        try {
            const user = await User.findOneAndUpdate({ socketId: socket.id }, { isOnline: false });
            if (user) {
                console.log(`User ${user.shortId} disconnected`);
                socket.broadcast.emit('friend offline', user.shortId); // 친구에게 오프라인 상태 전송
            }
        } catch (error) {
            console.error('Error handling disconnect:', error);
        }
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
});

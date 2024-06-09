const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticateToken } = require('../utils/auth');

// 메시지 저장 라우터
router.post('/messages', authenticateToken, async (req, res) => {
    try {
        const { roomId, text } = req.body;
        const sender = await User.findById(req.user.id);

        const message = new Message({
            roomId,
            text,
            senderId: sender._id,
            senderNickname: sender.nickname,
            senderAvatar: sender.avatarUrl, // 프로필 이미지 추가
            timestamp: new Date() // 보낸 시간 추가
        });

        await message.save();
        res.status(201).json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Error sending message' });
    }
});

// 메시지 조회 라우터
router.get('/messages/:roomId', authenticateToken, async (req, res) => {
    const { roomId } = req.params;
    try {
        const messages = await Message.find({ roomId }).sort('timestamp');
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

module.exports = router;

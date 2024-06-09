const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    roomId: { type: String, required: true },
    text: { type: String, required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderNickname: { type: String, required: true },
    senderAvatar: { type: String, required: true }, // 프로필 이미지 추가
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;

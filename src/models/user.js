const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const shortid = require('shortid');

const userSchema = new mongoose.Schema({
    googleId: { type: String, required: false },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    nickname: { type: String, required: true },
    avatarUrl: { type: String, default: '/uploads/default-avatar.png' },
    lastNicknameChange: { type: Date, default: null },
    shortId: { type: String, default: shortid.generate },
    selectedTheme: { type: String, default: 'light-theme' },
    loginRecords: { type: [Date], default: [] },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isOnline: { type: Boolean, default: false },
    socketId: { type: String, default: null } // 추가
});

// 비밀번호 암호화
userSchema.pre('save', async function (next) {
    if (this.isModified('password') || this.isNew) {
        if (this.password) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }
    }
    next();
});

// 비밀번호 비교 메서드
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;

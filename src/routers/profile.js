const express = require('express');
const multer = require('multer');
const User = require('../models/User');
const { authenticateToken } = require('../utils/auth');

const router = express.Router();

function maskEmail(email) {
    const [localPart, domain] = email.split('@');
    const maskedLocalPart = localPart.slice(0, 2) + '****';
    const maskedDomain = domain.split('.').map((part, index) => index === 0 ? '****' : part).join('.');
    return `${maskedLocalPart}@${maskedDomain}`;
}

function maskUsername(username) {
    return username.slice(0, 2) + '****';
}

router.get('/profile', authenticateToken, async (req, res) => {
    if (!res.locals.user) {
        return res.status(401).redirect('/login');
    }

    try {
        const user = res.locals.user;
        const maskedEmail = maskEmail(user.email);
        const maskedUsername = maskUsername(user.username);

        res.render('profile', {
            user: { ...user.toObject(), email: maskedEmail, username: maskedUsername }
        });
    } catch (error) {
        res.status(500).json({ message: '프로필 로드 중 오류가 발생했습니다.' });
    }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

router.post('/update', upload.single('avatar'), async (req, res) => {
    try {
        const { userId, nickname, selectedTheme } = req.body;
        const avatar = req.file ? `/uploads/${req.file.filename}` : null;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if nickname has changed
        const isNicknameChanged = nickname && nickname !== user.nickname;

        if (isNicknameChanged) {
            // Check if the new nickname already exists
            const existingUser = await User.findOne({ nickname: nickname });
            if (existingUser) {
                return res.status(400).json({ message: '중복된 닉네임입니다. 다른 닉네임을 사용해주세요.' });
            }

            // Check if nickname has been changed before
            if (user.lastNicknameChange) {
                return res.status(400).json({ message: '닉네임은 한 번만 변경할 수 있습니다.' });
            }

            user.nickname = nickname;
            user.lastNicknameChange = Date.now(); // Set the lastNicknameChange date
        }

        if (avatar) {
            user.avatarUrl = avatar;
        } else if (!user.avatarUrl) {
            user.avatarUrl = '/uploads/default-avatar.png';
        }

        // Update selected theme
        if (selectedTheme) {
            user.selectedTheme = selectedTheme;
        }

        await user.save();

        // Socket.io를 사용하여 프로필 업데이트 이벤트 전송
        const io = req.app.get('socketio'); // io 객체 가져오기
        io.emit('profileUpdated', { userId: userId, avatarUrl: user.avatarUrl });

        res.json({ avatar: user.avatarUrl, nickname: user.nickname, lastNicknameChange: user.lastNicknameChange, selectedTheme: user.selectedTheme });
    } catch (error) {
        console.error('Error updating profile:', error); // 오류 로그 추가
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/clear-activity-log', authenticateToken, async (req, res) => {
    try {
        const user = res.locals.user;
        user.loginRecords = [];
        await user.save();
        res.status(200).json({ message: '활동 내역이 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: '활동 내역 삭제 중 오류가 발생했습니다.' });
    }
});

router.post('/check-nickname', async (req, res) => {
    const { nickname, currentNickname } = req.body;
    if (nickname === currentNickname) {
        return res.status(200).json({ available: true });
    }

    const nicknameExists = await User.findOne({ nickname });
    if (nicknameExists) {
        return res.status(400).json({ message: '중복된 닉네임입니다. 다른 닉네임을 사용해주세요.' });
    }
    res.status(200).json({ available: true });
});

module.exports = router;

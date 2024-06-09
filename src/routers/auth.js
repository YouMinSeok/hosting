const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const { 
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    checkEmail,
    checkUsername
} = require('../utils/auth');

const router = express.Router();

router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    async (req, res) => {
        let user = req.user;
        if (!user) {
            return res.status(400).send('User not authenticated');
        }

        // Ensure user is a Mongoose document before updating
        user = await User.findById(user._id);
        user.loginRecords.push(new Date());
        await user.save();

        const accessToken = generateAccessToken({ userId: user._id, username: user.username, email: user.email });
        const refreshToken = generateRefreshToken({ userId: user._id, username: user.username, email: user.email });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        res.redirect(`/?nickname=${encodeURIComponent(user.nickname)}&avatarUrl=${encodeURIComponent(user.avatarUrl || '/uploads/default-avatar.png')}`);
    }
);

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).send('사용자 이름이 잘못되었습니다.');
        }

        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).send('비밀번호가 잘못되었습니다.');
        }

        user.loginRecords.push(new Date());
        await user.save();

        const accessToken = generateAccessToken({ userId: user._id, username: user.username, email: user.email, nickname: user.nickname });
        const refreshToken = generateRefreshToken({ userId: user._id, username: user.username, email: user.email, nickname: user.nickname });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        req.session.nickname = user.nickname;
        req.session.avatarUrl = user.avatarUrl || '/uploads/default-avatar.png';

        res.json({ nickname: user.nickname, avatarUrl: user.avatarUrl || '/uploads/default-avatar.png' });
    } catch (error) {
        res.status(500).send('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
});

router.post('/token', (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ message: '리프레시 토큰이 없습니다.' });
    }

    try {
        const user = verifyRefreshToken(refreshToken);
        const newAccessToken = generateAccessToken({ userId: user.userId, username: user.username, email: user.email });

        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.status(200).json({ message: '토큰이 갱신되었습니다.', accessToken: newAccessToken });
    } catch (error) {
        res.status(401).json({ message: '유효하지 않은 리프레시 토큰입니다.' });
    }
});

router.post('/register', async (req, res) => {
    const { username, email, password, nickname } = req.body;

    const emailExists = await checkEmail(email);
    if (emailExists) {
        return res.status(400).json({ message: '중복된 이메일 주소입니다. 다른 이메일 주소를 사용해주세요.' });
    }

    const usernameExists = await checkUsername(username);
    if (usernameExists) {
        return res.status(400).json({ message: '중복된 사용자 이름입니다. 다른 사용자 이름을 사용해주세요.' });
    }

    const nicknameExists = await User.findOne({ nickname });
    if (nicknameExists) {
        return res.status(400).json({ message: '중복된 닉네임입니다. 다른 닉네임을 사용해주세요.' });
    }

    if (password.length < 8 || password.length > 12) {
        return res.status(400).json({ message: '비밀번호는 8자 이상 12자 이하여야 합니다.' });
    }

    try {
        const user = new User({ username, email, password, nickname });
        await user.save();

        const accessToken = generateAccessToken({ userId: user._id, username: user.username, email: user.email, nickname: user.nickname });
        const refreshToken = generateRefreshToken({ userId: user._id, username: user.username, email: user.email, nickname: user.nickname });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.json({ 
            message: '회원가입이 성공적으로 완료되었습니다.', 
            nickname: user.nickname, 
            avatarUrl: user.avatarUrl || '/uploads/default-avatar.png',
            accessToken, 
            refreshToken 
        });
    } catch (error) {
        res.status(500).json({ message: '사용자 등록 중 오류가 발생했습니다: ' + error.message });
    }
});

router.post('/check-email', async (req, res) => {
    const { email } = req.body;
    const emailExists = await checkEmail(email);
    if (emailExists) {
        return res.status(400).json({ message: '중복된 이메일 주소입니다. 다른 이메일 주소를 사용해주세요.' });
    }
    res.status(200).json({ available: true });
});

router.post('/check-username', async (req, res) => {
    const { username } = req.body;
    const usernameExists = await checkUsername(username);
    if (usernameExists) {
        return res.status(400).json({ message: '중복된 사용자 이름입니다. 다른 사용자 이름을 사용해주세요.' });
    }
    res.status(200).json({ available: true });
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

router.get('/logout', (req, res, next) => {
    req.logout(err => {
        if (err) {
            return next(err);
        }
        req.session.destroy((err) => {
            if (err) {
                return next(err);
            }
            res.clearCookie('connect.sid');
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            res.redirect('/');
        });
    });
});

module.exports = router;
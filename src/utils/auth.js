const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const jwtSecret = process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

function generateAccessToken(payload) {
    return jwt.sign(payload, jwtSecret, { expiresIn: '15m' });
}

function generateRefreshToken(payload) {
    return jwt.sign(payload, jwtRefreshSecret, { expiresIn: '7d' });
}

function verifyAccessToken(token) {
    return jwt.verify(token, jwtSecret);
}

function verifyRefreshToken(token) {
    return jwt.verify(token, jwtRefreshSecret);
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = new User({
          googleId: profile.id,
          username: profile.emails[0].value.split('@')[0],
          email: profile.emails[0].value,
          nickname: profile.displayName || profile.emails[0].value.split('@')[0],
          avatarUrl: profile.photos[0].value
        });
        await user.save();
      } else {
        // Ensure user is a Mongoose document before updating
        user = await User.findById(user._id);
        user.loginRecords.push(new Date());
        await user.save();
      }

      const jwtPayload = { userId: user._id, username: user.username, email: user.email };
      const accessToken = generateAccessToken(jwtPayload);
      const refreshToken = generateRefreshToken(jwtPayload);
      done(null, { ...user.toObject(), accessToken, refreshToken });
    } catch (err) {
      done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    authenticateToken: async (req, res, next) => {
        const token = req.cookies.accessToken;
        if (!token) {
            res.locals.user = null;
            return next();
        }
        try {
            const decoded = verifyAccessToken(token);
            const user = await User.findById(decoded.userId);
            res.locals.user = user;
            next();
        } catch (error) {
            res.locals.user = null;
            next();
        }
    },
    checkEmail: async (email) => {
        const existingUser = await User.findOne({ email });
        return !!existingUser;
    },
    checkUsername: async (username) => {
        const existingUser = await User.findOne({ username });
        return !!existingUser;
    },
    checkNickname: async (nickname) => {
        const existingUser = await User.findOne({ nickname });
        return !!existingUser;
    }
};

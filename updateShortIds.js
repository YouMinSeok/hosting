const mongoose = require('mongoose');
const shortid = require('shortid');
const User = require('./models/User'); // User 모델 경로를 적절히 수정

require('dotenv').config();

const connectWithRetry = async () => {
    console.log('MongoDB connection with retry');
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        setTimeout(connectWithRetry, 5000);
    }
};

const updateShortIds = async () => {
    await connectWithRetry();

    try {
        const users = await User.find({ shortId: { $exists: false } });

        for (const user of users) {
            user.shortId = shortid.generate();
            await user.save();
            console.log(`Updated user ${user._id} with shortId ${user.shortId}`);
        }

        console.log('All users updated with shortId');
        process.exit(0);
    } catch (err) {
        console.error('Error updating users with shortId:', err);
        process.exit(1);
    }
};

updateShortIds();

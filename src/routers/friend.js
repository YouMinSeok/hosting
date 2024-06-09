const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');

router.get('/friends', friendController.getFriendPage);
router.post('/api/friends/request', friendController.sendFriendRequest);
router.post('/api/friends/accept', friendController.acceptFriendRequest);
router.post('/api/friends/decline', friendController.declineFriendRequest);

module.exports = router;

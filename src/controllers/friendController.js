const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

exports.getFriendPage = async (req, res) => {
    try {
        const user = res.locals.user;
        console.log("Logged in user:", user);
        const friends = await User.find({ _id: { $in: user.friends } });
        const friendRequests = await FriendRequest.find({ recipient: user._id, status: 'pending' }).populate('requester');

        res.render('friend', { user, friends, friendRequests });
    } catch (error) {
        console.error("Error loading friend page:", error);
        res.status(500).json({ message: '친구 페이지 로드 중 오류가 발생했습니다.' });
    }
};

exports.sendFriendRequest = async (req, res) => {
    try {
        let { shortId } = req.body;
        const currentUserId = res.locals.user._id;
        console.log("Received shortId:", shortId);

        // 입력값 양 끝의 공백 제거
        shortId = shortId.trim();

        // 대소문자 구분 없이 shortId 비교
        const recipient = await User.findOne({ shortId: { $regex: new RegExp(`^${shortId}$`, 'i') } });
        console.log("Recipient:", recipient);

        if (!recipient) {
            console.error("Error: 사용자 찾을 수 없습니다.");
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        if (recipient._id.equals(currentUserId)) {
            console.error("Error: 자신을 친구로 추가할 수 없습니다.");
            return res.status(400).json({ message: '자신을 친구로 추가할 수 없습니다.' });
        }

        // 이미 친구인 경우 확인
        const currentUser = await User.findById(currentUserId);
        if (currentUser.friends.includes(recipient._id)) {
            console.error("Error: 이미 추가된 친구입니다.");
            return res.status(400).json({ message: '이미 추가된 친구입니다.' });
        }

        const existingRequest = await FriendRequest.findOne({
            requester: currentUserId,
            recipient: recipient._id,
            status: 'pending'
        });

        if (existingRequest) {
            console.error("Error: 이미 친구 요청을 보냈습니다.");
            return res.status(400).json({ message: '이미 친구 요청을 보냈습니다.' });
        }

        const friendRequest = new FriendRequest({
            requester: currentUserId,
            recipient: recipient._id,
            status: 'pending'
        });

        await friendRequest.save();
        console.log("친구 요청을 보냈습니다.");
        res.status(200).json({ message: '친구 요청을 보냈습니다.' });
    } catch (error) {
        console.error("Error sending friend request:", error);
        res.status(500).json({ message: '친구 요청 중 오류가 발생했습니다.' });
    }
};

exports.acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.body;
        const request = await FriendRequest.findById(requestId);

        if (!request || request.status !== 'pending') {
            return res.status(404).json({ message: '친구 요청을 찾을 수 없습니다.' });
        }

        request.status = 'accepted';
        await request.save();

        const requester = await User.findById(request.requester);
        const recipient = await User.findById(request.recipient);

        requester.friends.push(recipient._id);
        recipient.friends.push(requester._id);

        await requester.save();
        await recipient.save();

        res.status(200).json({ message: '친구 요청을 수락했습니다.' });
    } catch (error) {
        console.error("Error accepting friend request:", error);
        res.status(500).json({ message: '친구 요청 수락 중 오류가 발생했습니다.' });
    }
};

exports.declineFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.body;
        const request = await FriendRequest.findById(requestId);

        if (!request || request.status !== 'pending') {
            return res.status(404).json({ message: '친구 요청을 찾을 수 없습니다.' });
        }

        request.status = 'declined';
        await request.save();

        res.status(200).json({ message: '친구 요청을 거부했습니다.' });
    } catch (error) {
        console.error("Error declining friend request:", error);
        res.status(500).json({ message: '친구 요청 거부 중 오류가 발생했습니다.' });
    }
};

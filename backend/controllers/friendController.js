const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');

// io is injected by server.js to allow socket emissions from controllers
let _io = null;
exports.setIo = (io) => { _io = io; };

exports.sendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (receiverId === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot send request to yourself' });

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: 'User not found' });

    const existing = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: receiverId },
        { sender: receiverId, receiver: req.user._id }
      ]
    });
    if (existing) return res.status(400).json({ message: 'Request already exists' });

    const alreadyFriends = req.user.friends.includes(receiverId);
    if (alreadyFriends) return res.status(400).json({ message: 'Already friends' });

    const request = await FriendRequest.create({ sender: req.user._id, receiver: receiverId });
    await request.populate('sender', 'username email avatar');
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.respondRequest = async (req, res) => {
  try {
    const { requestId, action } = req.body;
    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.receiver.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Unauthorized' });

    if (action === 'accept') {
      request.status = 'accepted';
      await request.save();
      await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
      await User.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });
      // Notify sender in real-time that their request was accepted
      if (_io) {
        const { onlineUsers } = require('../socket/socketHandler');
        const senderSocketId = onlineUsers && onlineUsers.get(request.sender.toString());
        if (senderSocketId) {
          _io.to(senderSocketId).emit('friend_request_accepted', { acceptedBy: req.user._id });
        }
      }
    } else {
      request.status = 'rejected';
      await request.save();
    }
    res.json({ message: `Request ${action}ed`, request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({ receiver: req.user._id, status: 'pending' })
      .populate('sender', 'username email avatar');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('friends', 'username email avatar isOnline lastSeen');
    res.json(user.friends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        { isVerified: true },
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    }).select('username email avatar isOnline').limit(10);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

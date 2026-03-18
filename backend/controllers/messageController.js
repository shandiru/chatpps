const Message = require('../models/Message');
const User = require('../models/User');
const { encrypt, decrypt } = require('../utils/encryption');

/**
 * Decrypt a message document's content field (returns plain object).
 */
function decryptMessage(msg) {
  const obj = msg.toObject ? msg.toObject() : { ...msg };
  obj.content = decrypt(obj.content);
  if (obj.replyTo && obj.replyTo.content) {
    obj.replyTo = { ...obj.replyTo, content: decrypt(obj.replyTo.content) };
  }
  return obj;
}

// GET /api/messages/:friendId — full conversation
exports.getMessages = async (req, res) => {
  try {
    const { friendId } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: friendId },
        { sender: friendId, receiver: req.user._id }
      ]
    })
    .populate('replyTo', 'content sender')
    .populate('sender', 'username avatar')
    .sort({ createdAt: 1 });

    // Mark as read
    await Message.updateMany(
      { sender: friendId, receiver: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json(messages.map(decryptMessage));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/messages — send a message
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content, replyTo } = req.body;
    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      content: encrypt(content),
      replyTo: replyTo || null
    });
    await message.populate('sender', 'username avatar');
    await message.populate('replyTo', 'content sender');
    res.status(201).json(decryptMessage(message));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/messages/unread — unread counts per sender
exports.getUnreadCounts = async (req, res) => {
  try {
    const counts = await Message.aggregate([
      { $match: { receiver: req.user._id, isRead: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } }
    ]);
    const result = {};
    counts.forEach(c => { result[c._id.toString()] = c.count; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/messages/poll/:friendId?since=<ISO_TIMESTAMP>
// Polling endpoint — returns only NEW messages since given timestamp.
// Frontend calls this every 3s with setInterval instead of WebSocket.
exports.pollMessages = async (req, res) => {
  try {
    const { friendId } = req.params;
    const since = req.query.since ? new Date(req.query.since) : new Date(0);

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: friendId },
        { sender: friendId, receiver: req.user._id }
      ],
      createdAt: { $gt: since }
    })
    .populate('replyTo', 'content sender')
    .populate('sender', 'username avatar')
    .sort({ createdAt: 1 });

    // Auto mark as read
    await Message.updateMany(
      { sender: friendId, receiver: req.user._id, isRead: false, createdAt: { $gt: since } },
      { isRead: true, readAt: new Date() }
    );

    res.json(messages.map(decryptMessage));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/messages/poll-status?since=<ISO_TIMESTAMP>
// Polls for: new messages (any friend), online status changes, friend requests.
// Used by frontend setInterval to replace ALL socket events.
exports.pollStatus = async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 5000);

    // New incoming messages since last poll
    const newMessages = await Message.find({
      receiver: req.user._id,
      createdAt: { $gt: since }
    })
    .populate('sender', 'username avatar')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: 1 });

    // Unread counts
    const unreadAgg = await Message.aggregate([
      { $match: { receiver: req.user._id, isRead: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } }
    ]);
    const unreadCounts = {};
    unreadAgg.forEach(c => { unreadCounts[c._id.toString()] = c.count; });

    // Online status of friends
    const user = await User.findById(req.user._id).populate('friends', 'username isOnline lastSeen');
    const onlineStatuses = (user.friends || []).map(f => ({
      userId: f._id,
      isOnline: f.isOnline,
      lastSeen: f.lastSeen
    }));

    res.json({
      newMessages: newMessages.map(decryptMessage),
      unreadCounts,
      onlineStatuses,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

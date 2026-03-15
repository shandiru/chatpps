const Message = require('../models/Message');
const { encrypt, decrypt } = require('../utils/encryption');

/**
 * Decrypt a message document's content field in-place (non-mutating — returns a plain object).
 * Also decrypts nested replyTo.content if present.
 */
function decryptMessage(msg) {
  const obj = msg.toObject ? msg.toObject() : { ...msg };
  obj.content = decrypt(obj.content);
  if (obj.replyTo && obj.replyTo.content) {
    obj.replyTo = { ...obj.replyTo, content: decrypt(obj.replyTo.content) };
  }
  return obj;
}

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

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content, replyTo } = req.body;
    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      content: encrypt(content),   // ← encrypted before save
      replyTo: replyTo || null
    });
    await message.populate('sender', 'username avatar');
    await message.populate('replyTo', 'content sender');
    res.status(201).json(decryptMessage(message));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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

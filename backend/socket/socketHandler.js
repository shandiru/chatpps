const jwt = require('jsonwebtoken');
const { encrypt, decrypt } = require('../utils/encryption');
const User = require('../models/User');
const Message = require('../models/Message');

const onlineUsers = new Map(); // userId -> socketId

const init = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);

    // Update online status
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    io.emit('user_online', { userId, isOnline: true });

    console.log(`User ${userId} connected`);

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content, replyTo } = data;
        const message = await Message.create({
          sender: userId,
          receiver: receiverId,
          content: encrypt(content),   // encrypted before saving to DB
          replyTo: replyTo || null
        });
        await message.populate('sender', 'username avatar');
        await message.populate('replyTo', 'content sender');

        // Decrypt content before sending over socket
        const msgObj = message.toObject();
        msgObj.content = decrypt(msgObj.content);
        if (msgObj.replyTo && msgObj.replyTo.content) {
          msgObj.replyTo = { ...msgObj.replyTo, content: decrypt(msgObj.replyTo.content) };
        }

        // Emit decrypted message to sender & receiver
        socket.emit('new_message', msgObj);
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('new_message', msgObj);
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Typing indicators
    socket.on('typing', ({ receiverId, isTyping }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing', { senderId: userId, isTyping });
      }
    });

    // Friend request notification — receiver gets real-time alert
    socket.on('friend_request_sent', ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('friend_request_received', { senderId: userId });
      }
    });

    // Mark messages read
    socket.on('mark_read', async ({ senderId }) => {
      await Message.updateMany(
        { sender: senderId, receiver: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messages_read', { readBy: userId });
      }
    });

    socket.on('disconnect', async () => {
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      io.emit('user_online', { userId, isOnline: false });
      console.log(`User ${userId} disconnected`);
    });
  });
};

module.exports = init;
module.exports.onlineUsers = onlineUsers;

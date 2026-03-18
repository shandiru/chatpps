const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  getMessages,
  sendMessage,
  getUnreadCounts,
  pollMessages,
  pollStatus
} = require('../controllers/messageController');

// Polling endpoints (replaces WebSocket)
router.get('/poll-status', auth, pollStatus);          // global status poll (messages + online + unread)
router.get('/poll/:friendId', auth, pollMessages);     // per-chat new messages poll

// Standard REST
router.get('/unread', auth, getUnreadCounts);
router.get('/:friendId', auth, getMessages);
router.post('/', auth, sendMessage);

module.exports = router;

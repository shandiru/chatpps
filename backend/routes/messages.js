const router = require('express').Router();
const auth = require('../middleware/auth');
const { getMessages, sendMessage, getUnreadCounts } = require('../controllers/messageController');

router.get('/unread', auth, getUnreadCounts);
router.get('/:friendId', auth, getMessages);
router.post('/', auth, sendMessage);

module.exports = router;

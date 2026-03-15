const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  sendRequest, respondRequest, getPendingRequests, getFriends, searchUsers
} = require('../controllers/friendController');

router.post('/request', auth, sendRequest);
router.post('/respond', auth, respondRequest);
router.get('/pending', auth, getPendingRequests);
router.get('/', auth, getFriends);
router.get('/search', auth, searchUsers);

module.exports = router;

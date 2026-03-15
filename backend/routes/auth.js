const router = require('express').Router();
const { register, verifyEmail, login, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.get('/verify-email', verifyEmail);
router.post('/login', login);
router.get('/me', auth, getMe);

module.exports = router;

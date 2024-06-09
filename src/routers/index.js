const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('index', { user: res.locals.user });
});

router.get('/about', (req, res) => {
    res.render('about', { user: res.locals.user });
});

router.get('/login', (req, res) => {
    res.render('login', { user: null });
});

router.get('/register', (req, res) => {
    res.render('register', { user: null });
});

// Add routes for privacy policy and terms of service
router.get('/privacy-policy', (req, res) => {
    res.render('privacy-policy');
});

router.get('/terms-of-service', (req, res) => {
    res.render('terms-of-service');
});

module.exports = router;

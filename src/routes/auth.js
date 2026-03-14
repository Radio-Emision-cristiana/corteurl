const express = require('express');
const router = express.Router();

// Login page
router.get('/login', (req, res) => {
  const authenticated = req.cookies.authenticated;
  if (authenticated === 'true') {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
});

// Login handler
router.post('/login', (req, res) => {
  const { pin } = req.body;
  const validPin = process.env.AUTH_PIN || '198823';

  if (pin === validPin) {
    res.cookie('authenticated', 'true', {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    });
    return res.redirect('/dashboard');
  }

  res.render('login', { error: 'PIN inválido. Intenta de nuevo.' });
});

// Logout
router.get('/logout', (req, res) => {
  res.clearCookie('authenticated');
  res.redirect('/login');
});

module.exports = router;

require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const authRoutes = require('./routes/auth');
const linkRoutes = require('./routes/links');
const redirectRoutes = require('./routes/redirect');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make BASE_URL available to all views
app.locals.baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;

// Root route - redirect to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Routes
app.use('/', authRoutes);
app.use('/dashboard', linkRoutes);
app.use('/', redirectRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { error: 'Error interno del servidor' });
});

// Start server
app.listen(PORT, () => {
  console.log(`PinLink ejecutándose en el puerto ${PORT}`);
});

module.exports = app;

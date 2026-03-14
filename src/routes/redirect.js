const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Redirect slug to original URL
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  // Skip if it's a static file or API route
  if (slug.includes('.') || slug.startsWith('api')) {
    return res.status(404).send('Not found');
  }

  try {
    const link = await prisma.link.findUnique({
      where: { slug: slug.toLowerCase() }
    });

    if (!link) {
      return res.status(404).render('404');
    }

    // Increment click count (async, don't wait)
    prisma.link.update({
      where: { id: link.id },
      data: { clicks: link.clicks + 1 }
    }).catch(console.error);

    // Redirect with 301 (permanent) for SEO
    res.redirect(301, link.originalUrl);
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).render('404');
  }
});

module.exports = router;

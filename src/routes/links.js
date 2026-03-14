const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { customAlphabet } = require('nanoid');

const prisma = new PrismaClient();
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

// Middleware de autenticación
const requireAuth = (req, res, next) => {
  if (req.cookies.authenticated !== 'true') {
    return res.redirect('/login');
  }
  next();
};

// Función para obtener la URL base (personalizable con dominio propio)
function getBaseUrl(req) {
  // Si hay un dominio personalizado configurado, usarlo
  if (process.env.CUSTOM_DOMAIN) {
    return `https://${process.env.CUSTOM_DOMAIN}`;
  }
  // Otherwise use the request protocol and host
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
}

// Dashboard - List all links
router.get('/', requireAuth, async (req, res) => {
  try {
    const links = await prisma.link.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const baseUrl = getBaseUrl(req);

    res.render('dashboard', {
      links: links.map(link => ({
        ...link,
        shortUrl: `${baseUrl}/${link.slug}`
      })),
      customDomain: process.env.CUSTOM_DOMAIN || null,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Error fetching links:', error);
    res.render('dashboard', {
      links: [],
      customDomain: process.env.CUSTOM_DOMAIN || null,
      error: 'Error al cargar los enlaces',
      success: null
    });
  }
});

// Create short URL
router.post('/', requireAuth, async (req, res) => {
  const { url, alias } = req.body;
  const baseUrl = getBaseUrl(req);

  try {
    // Validate URL
    if (!url) {
      const links = await prisma.link.findMany({ orderBy: { createdAt: 'desc' } });
      return res.render('dashboard', {
        links: links.map(link => ({ ...link, shortUrl: `${baseUrl}/${link.slug}` })),
        customDomain: process.env.CUSTOM_DOMAIN || null,
        error: 'La URL es requerida',
        success: null
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      const links = await prisma.link.findMany({ orderBy: { createdAt: 'desc' } });
      return res.render('dashboard', {
        links: links.map(link => ({ ...link, shortUrl: `${baseUrl}/${link.slug}` })),
        customDomain: process.env.CUSTOM_DOMAIN || null,
        error: 'URL inválida. Incluye el protocolo (https://)',
        success: null
      });
    }

    let slug;

    if (alias && alias.trim()) {
      // Validate alias format
      const aliasRegex = /^[a-zA-Z0-9-_]+$/;
      if (!aliasRegex.test(alias)) {
        const links = await prisma.link.findMany({ orderBy: { createdAt: 'desc' } });
        return res.render('dashboard', {
          links: links.map(link => ({ ...link, shortUrl: `${baseUrl}/${link.slug}` })),
          customDomain: process.env.CUSTOM_DOMAIN || null,
          error: 'El alias solo puede contener letras, números, guiones y guiones bajos',
          success: null
        });
      }

      // Check if alias exists
      const existingLink = await prisma.link.findUnique({
        where: { slug: alias }
      });

      if (existingLink) {
        const links = await prisma.link.findMany({ orderBy: { createdAt: 'desc' } });
        return res.render('dashboard', {
          links: links.map(link => ({ ...link, shortUrl: `${baseUrl}/${link.slug}` })),
          customDomain: process.env.CUSTOM_DOMAIN || null,
          error: 'El alias ya está en uso. Elige otro.',
          success: null
        });
      }

      slug = alias;
    } else {
      // Generate unique random slug
      let attempts = 0;
      do {
        slug = nanoid(6);
        const existing = await prisma.link.findUnique({ where: { slug } });
        if (!existing) break;
        attempts++;
      } while (attempts < 10);
    }

    // Create the link
    const newLink = await prisma.link.create({
      data: {
        originalUrl: url,
        slug: slug.toLowerCase()
      }
    });

    const links = await prisma.link.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.render('dashboard', {
      links: links.map(link => ({
        ...link,
        shortUrl: `${baseUrl}/${link.slug}`
      })),
      customDomain: process.env.CUSTOM_DOMAIN || null,
      error: null,
      success: `¡URL acortada exitosamente! ${baseUrl}/${newLink.slug}`
    });

  } catch (error) {
    console.error('Error creating link:', error);
    const links = await prisma.link.findMany({ orderBy: { createdAt: 'desc' } });
    res.render('dashboard', {
      links: links.map(link => ({ ...link, shortUrl: `${baseUrl}/${link.slug}` })),
      customDomain: process.env.CUSTOM_DOMAIN || null,
      error: 'Error al crear el enlace',
      success: null
    });
  }
});

// Delete link
router.post('/delete/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const baseUrl = getBaseUrl(req);

  try {
    await prisma.link.delete({
      where: { id: parseInt(id) }
    });

    const links = await prisma.link.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.render('dashboard', {
      links: links.map(link => ({
        ...link,
        shortUrl: `${baseUrl}/${link.slug}`
      })),
      customDomain: process.env.CUSTOM_DOMAIN || null,
      error: null,
      success: 'Enlace eliminado'
    });
  } catch (error) {
    console.error('Error deleting link:', error);
    const links = await prisma.link.findMany({ orderBy: { createdAt: 'desc' } });
    res.render('dashboard', {
      links: links.map(link => ({ ...link, shortUrl: `${baseUrl}/${link.slug}` })),
      customDomain: process.env.CUSTOM_DOMAIN || null,
      error: 'Error al eliminar el enlace',
      success: null
    });
  }
});

module.exports = router;

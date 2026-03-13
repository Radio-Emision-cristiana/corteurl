require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de PostgreSQL (Neon)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Código de acceso
const ACCESS_CODE = process.env.ACCESS_CODE || '198823';

// Middleware de autenticación
const checkAuth = (req, res, next) => {
    const authCode = req.headers['x-access-code'];
    if (authCode !== ACCESS_CODE) {
        return res.status(401).json({ error: 'Código de acceso inválido' });
    }
    next();
};

// Inicialización de base de datos
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS config (
                id SERIAL PRIMARY KEY,
                domain_name VARCHAR(255) NOT NULL DEFAULT 'tu-app.onrender.com',
                alias VARCHAR(100) NOT NULL DEFAULT 'm3u',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS m3u_urls (
                id SERIAL PRIMARY KEY,
                user_name VARCHAR(100) NOT NULL,
                original_url TEXT NOT NULL,
                mirror_slug VARCHAR(100) UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT true,
                last_check TIMESTAMP,
                status VARCHAR(50) DEFAULT 'pending',
                channel_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        const configExists = await pool.query('SELECT COUNT(*) FROM config');
        if (parseInt(configExists.rows[0].count) === 0) {
            await pool.query(`INSERT INTO config (domain_name, alias) VALUES ('tu-app.onrender.com', 'm3u')`);
        }
        console.log('✅ Base de datos inicializada');
    } catch (error) {
        console.error('❌ Error DB:', error.message);
    }
}

// Login
app.post('/api/login', (req, res) => {
    const { code } = req.body;
    if (code === ACCESS_CODE) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Código incorrecto' });
    }
});

// Configuración
app.get('/api/config', checkAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM config ORDER BY id LIMIT 1');
        res.json(result.rows[0] || { domain_name: '', alias: 'm3u' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/config', checkAuth, async (req, res) => {
    try {
        const { domain_name, alias } = req.body;
        const result = await pool.query(
            `UPDATE config SET domain_name = $1, alias = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = (SELECT id FROM config ORDER BY id LIMIT 1) RETURNING *`,
            [domain_name, alias]
        );
        if (result.rows.length === 0) {
            const insert = await pool.query(
                'INSERT INTO config (domain_name, alias) VALUES ($1, $2) RETURNING *',
                [domain_name, alias]
            );
            res.json(insert.rows[0]);
        } else {
            res.json(result.rows[0]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// URLs M3U
app.get('/api/urls', checkAuth, async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT * FROM m3u_urls ORDER BY created_at DESC';
        let params = [];
        if (search) {
            query = 'SELECT * FROM m3u_urls WHERE LOWER(user_name) LIKE LOWER($1) ORDER BY created_at DESC';
            params = [`%${search}%`];
        }
        const result = await pool.query(query, params);
        const config = await pool.query('SELECT * FROM config ORDER BY id LIMIT 1');
        const cfg = config.rows[0] || { domain_name: '', alias: 'm3u' };
        const urls = result.rows.map(url => ({
            ...url,
            mirror_url: `https://${cfg.domain_name}/${cfg.alias}/${url.mirror_slug}.m3u`
        }));
        res.json(urls);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/urls', checkAuth, async (req, res) => {
    try {
        const { user_name, original_url } = req.body;
        const mirror_slug = uuidv4().substring(0, 12);
        const result = await pool.query(
            `INSERT INTO m3u_urls (user_name, original_url, mirror_slug) VALUES ($1, $2, $3) RETURNING *`,
            [user_name, original_url, mirror_slug]
        );
        const config = await pool.query('SELECT * FROM config ORDER BY id LIMIT 1');
        const cfg = config.rows[0];
        res.json({
            ...result.rows[0],
            mirror_url: `https://${cfg.domain_name}/${cfg.alias}/${mirror_slug}.m3u`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/urls/:id', checkAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM m3u_urls WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/urls/:id/check', checkAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM m3u_urls WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrada' });
        const url = result.rows[0];
        let status = 'offline', channelCount = 0;
        try {
            const response = await axios.get(url.original_url, { timeout: 10000 });
            if (response.status === 200) {
                status = 'online';
                const matches = response.data.match(/#EXTINF/g);
                channelCount = matches ? matches.length : 0;
            }
        } catch (e) { status = 'offline'; }
        await pool.query(
            `UPDATE m3u_urls SET status = $1, channel_count = $2, last_check = CURRENT_TIMESTAMP WHERE id = $3`,
            [status, channelCount, req.params.id]
        );
        res.json({ status, channel_count: channelCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/urls/:id/download', checkAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM m3u_urls WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrada' });
        const url = result.rows[0];
        const response = await axios.get(url.original_url, { timeout: 30000 });
        res.setHeader('Content-Type', 'application/x-mpegurl');
        res.setHeader('Content-Disposition', `attachment; filename="${url.user_name}.m3u"`);
        res.send(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PROXY M3U (URL ESPEJO)
app.get('/:alias/:slug.m3u', async (req, res) => {
    try {
        const { alias, slug } = req.params;
        const config = await pool.query('SELECT * FROM config ORDER BY id LIMIT 1');
        const cfg = config.rows[0];
        if (cfg && cfg.alias !== alias) {
            return res.status(404).send('#EXTM3U\n# URL no encontrada');
        }
        const result = await pool.query('SELECT * FROM m3u_urls WHERE mirror_slug = $1', [slug]);
        if (result.rows.length === 0) {
            return res.status(404).send('#EXTM3U\n# URL no encontrada');
        }
        const url = result.rows[0];
        if (!url.is_active) {
            return res.status(403).send('#EXTM3U\n# URL desactivada');
        }
        const response = await axios.get(url.original_url, { timeout: 30000, responseType: 'text' });
        res.setHeader('Content-Type', 'application/x-mpegurl; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(response.data);
    } catch (error) {
        res.status(500).send('#EXTM3U\n# Error al obtener la lista');
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 M3U Monitor en puerto ${PORT}`);
    });
});

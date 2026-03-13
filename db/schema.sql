-- Esquema de base de datos para M3U Monitor
-- Ejecutar en Neon PostgreSQL

-- Tabla de configuración global
CREATE TABLE IF NOT EXISTS config (
    id SERIAL PRIMARY KEY,
    domain_name VARCHAR(255) NOT NULL DEFAULT 'tu-app.onrender.com',
    alias VARCHAR(100) NOT NULL DEFAULT 'm3u',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de URLs M3U
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
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_user_name ON m3u_urls(user_name);
CREATE INDEX IF NOT EXISTS idx_mirror_slug ON m3u_urls(mirror_slug);

-- Insertar configuración inicial
INSERT INTO config (domain_name, alias)
VALUES ('tu-app.onrender.com', 'm3u')
ON CONFLICT DO NOTHING;

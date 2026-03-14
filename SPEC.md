# PinLink - Acortador de URLs con PIN

## 1. Project Overview

**Project Name:** PinLink
**Type:** Full-stack Web Application
**Core Functionality:** Acortador de URLs seguro con autenticación PIN de 6 dígitos y personalización de aliases
**Target Users:** Uso personal o equipo interno

---

## 2. UI/UX Specification

### Layout Structure

**Login View:**
- Card centrado en pantalla
- Campo de entrada PIN (máscara)
- Botón deSubmit
- Diseño limpio y minimalista

**Dashboard View:**
- Header con título y botón de logout
- Sección principal con formulario de acortamiento
- Lista de URLs acortadas previamente
- Diseño responsive (mobile-first)

### Visual Design

**Color Palette:**
- Background: `#0f172a` (Dark slate)
- Card Background: `#1e293b` (Slate 800)
- Primary Accent: `#06b6d4` (Cyan 500)
- Secondary: `#64748b` (Slate 500)
- Success: `#22c55e` (Green 500)
- Error: `#ef4444` (Red 500)
- Text Primary: `#f8fafc` (Slate 50)
- Text Secondary: `#94a3b8` (Slate 400)

**Typography:**
- Font: 'Outfit', sans-serif (Google Fonts)
- Headings: 700 weight
- Body: 400 weight

**Visual Effects:**
- Smooth transitions (0.2s ease)
- Subtle shadows on cards
- Hover effects on buttons
- Success/error feedback animations

### Components

1. **PIN Input Component**
   - Input type="password"
   - Auto-focus en carga
   - Maxlength: 6
   - Solo números

2. **URL Shortener Form**
   - Input URL larga (required)
   - Input alias personalizado (optional)
   - Botón de Submit con loading state

3. **Link Card**
   - URL original (truncada)
   - URL acortada (clickeable)
   - Botón copiar al portapapeles
   - Contador de clics

---

## 3. Technical Architecture

### Stack
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** Neon (PostgreSQL)
- **ORM:** Prisma
- **Frontend:** HTML + CSS + Vanilla JS (EJS for SSR)
- **Deployment:** Render

### Database Schema (Prisma)

```prisma
model Link {
  id          Int      @id @default(autoincrement())
  originalUrl String
  slug        String   @unique
  clicks      Int      @default(0)
  createdAt   DateTime @default(now())
}
```

### Environment Variables (Render)
- `DATABASE_URL`: Neon connection string
- `AUTH_PIN`: 198823
- `BASE_URL`: Production URL
- `PORT`: 3000
- `SESSION_SECRET`: Random string

---

## 4. Functionality Specification

### Authentication
- PIN fijo: 198823
- Sesión basada en cookies
- Middleware de protección de rutas

### URL Shortening
1. Validar URL proporcionada
2. Si hay alias personalizado:
   - Verificar disponibilidad
   - Crear si está libre
3. Si no hay alias:
   - Generar slug aleatorio de 6 caracteres
   - Verificar unicidad
4. Guardar en base de datos
5. Retornar URL短

### Redirection
- Endpoint: GET /:slug
- Incrementar contador de clics
- Redirect 301 a URL original

---

## 5. Acceptance Criteria

- [ ] Login con PIN 198823 funciona correctamente
- [ ] Dashboard protegido sin autenticación
- [ ] URLs se acortan correctamente
- [ ] Alias personalizados funcionan
- [ ] Alias duplicados muestran error
- [ ] Redirección funciona correctamente
- [ ] Contador de clics incrementa
- [ ] Deploy en Render exitoso
- [ ] Variables de entorno configuradas

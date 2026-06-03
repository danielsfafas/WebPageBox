# Ironfist Boxing Gym — Product Requirements

## Original Problem Statement
Aplicación web full-stack para un gimnasio de boxeo con sitio público + panel de administración:
- Tema oscuro con acentos rojo/negro/dorado, mobile-first, glassmorfismo
- Sitio público: hero, productos, eventos, paquetes, contacto
- Panel admin (autenticado): productos, paquetes, suscriptores con seguimiento físico, pagos con código de colores, eventos, mensajes, configuración

## User Choices (Confirmed)
- Auth: JWT custom (email + password)
- Pagos: Stripe en línea + registro manual
- Mensajes de contacto: solo guardar en BD
- Almacenamiento multimedia: Base64 en MongoDB
- Admin: `admin@boxinggym.com` / `admin123`

## Architecture
- Backend: FastAPI + Motor (Mongo), `/app/backend/server.py`, prefix `/api`
- Frontend: React 19 + react-router + Tailwind + shadcn + Recharts + sonner
- DB: MongoDB, UUID strings as IDs, ISO datetime strings
- Auth: JWT Bearer in `Authorization` header, stored in localStorage
- Stripe: checkout en linea deshabilitado en este despliegue, usando registro manual y polling local

## Implemented (May 28, 2026)
### Sitio público
- [x] Layout glass-navbar + hero con fondo cinematográfico
- [x] Páginas: Inicio, Paquetes (con subscribe Stripe), Productos (filter/búsqueda/categoría/modal), Eventos (countdown), Contacto (form → BD)
- [x] `payment-success` con polling de estado

### Panel admin
- [x] Login JWT, layout con sidebar + protected routes
- [x] Dashboard: 4 métricas + Recharts bar de ingresos por paquete
- [x] CRUD Productos (imágenes base64, video clip mp4, YouTube embed, tags)
- [x] CRUD Paquetes + analítica por paquete
- [x] CRUD Suscriptores: datos, foto perfil, paquete, estado
- [x] Detalle Suscriptor: tabs Info, Progreso físico (registros + chart Recharts), Galería multimedia, Pagos
- [x] Pagos: panel con colores 🟢🟡🔴, tabla por estado, historial completo
- [x] CRUD Eventos con póster + prioridad
- [x] Mensajes (leídos/no-leídos + detalle)
- [x] Configuración (identidad, redes, moneda, logo)

### Backend
- [x] 22 endpoints `/api/*` (auth, public, admin)
- [x] Seed admin + settings on startup
- [x] Stripe checkout + status polling + webhook + transactions collection
- [x] Cálculo automático de payment_status y next_due_date

## Test Status
- Backend: **100% pass** (23/23 tests via testing_agent_v3, report: `/app/test_reports/iteration_1.json`)
- Public homepage screenshot verified
- Login API verified via curl

## Backlog / Next Tasks
### P1
- [ ] Multi-admin user management (currently single admin role)
- [ ] Partial PUT models (`Optional` fields)
- [ ] Role enforcement (`role == "admin"` check, not just authenticated)
- [ ] Email notifications (SendGrid/Resend) for contact form submissions
- [ ] Refresh token + httpOnly cookies for stronger session security

### P2
- [ ] CSV export for subscribers/payments
- [ ] Automated payment reminders (cron sending WhatsApp/SMS)
- [ ] Dashboard pagination + virtualized tables
- [ ] Object storage for media (current base64 fine for MVP)
- [ ] Public testimonials section + before/after showcase

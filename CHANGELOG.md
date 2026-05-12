# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Refactor completo de `DispositivosPage` y `ParchesPage` con mejor manejo de estados y UI
- Mejoras de routing en `App.jsx` y `vite.config.js`
- Actualización de constantes de estado de tickets (`statuses.js`)

### Fixed

- Corrección en `IaAsistentePage` y `MisTicketsPage`
- Ajustes en `DashboardController` y `AutoTaskTicketRepository`

---

## [0.5.0] - 2026-04-XX

### Added

- Integración del **Asistente IA** (chat con OpenAI) en la UI (`IaAsistentePage`)
- Backend: controladores y rutas API para el asistente IA
- Estilos globales actualizados (`global.css`)

### Changed

- Dashboard refactorizado con integración del asistente IA

---

## [0.4.0] - 2026-03-XX

### Added

- Módulos de **Dispositivos** (`DispositivosPage`), **Reportes**, **Mis Tickets** (`MisTicketsPage`) y **Parches** (`ParchesPage`)
- Integración con **Datto RMM API** para estado de dispositivos y parches
- Métricas en el Dashboard (tickets abiertos, resueltos, SLA breach)

### Fixed

- Estabilidad de la integración con la API de AutoTask

---

## [0.3.0] - 2026-02-XX

### Fixed

- Corrección en filtros de AutoTask: Resources, Companies/Contacts
- Métricas de tickets resueltos

---

## [0.2.0] - 2026-01-XX

### Fixed

- Correcciones de código y configuración de PHP/Composer
- Conexión inicial con la API de AutoTask

---

## [0.1.0] - 2025-12-XX

### Added

- Estructura inicial del proyecto (monorepo `backend/` + `frontend/`)
- Frontend React con Vite, Tailwind CSS v4, React Router, Recharts
- Backend Laravel con Clean Architecture (Domain, Application, Infrastructure, HTTP)
- Dashboard inicial con diseño HELPDEX (paleta oscura, Syne, JetBrains Mono)
- `.gitignore` y `.gitattributes`

[Unreleased]: https://github.com/key-less/titi/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/key-less/titi/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/key-less/titi/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/key-less/titi/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/key-less/titi/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/key-less/titi/releases/tag/v0.1.0

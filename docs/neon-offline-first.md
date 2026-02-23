# Neon Offline-First (Fase 1)

Esta fase no reemplaza `localStorage`/`IndexedDB`.

Objetivo:
- Mantener la app funcionando offline como ahora.
- Empezar a registrar una cola de cambios local (`sync queue`).
- Enviar esa cola a Netlify Functions (`/api/sync`) cuando activemos el modo `hybrid`.
- Persistir `patients`, `appointments` y `sessions` en Neon.

## Modo de ejecución

- `VITE_DATA_MODE=local` (por defecto): no sincroniza.
- `VITE_DATA_MODE=hybrid`: la app conserva datos locales y agrega mutaciones a una cola para sync.

## Endpoints añadidos

- `GET /api/health-neon`
  - Prueba conexión a Neon.
- `POST /api/sync`
  - Valida mutaciones.
  - Registra mutaciones en `sync_mutation_log` (idempotente).
  - Hace `upsert/delete` (soft delete) de `patients`, `appointments`, `sessions`.
- `GET /api/bootstrap`
  - Descarga `patients`, `appointments`, `sessions` desde Neon (sin registros borrados).
  - Se usa al arrancar en modo `hybrid` si el cliente no tiene datos locales guardados.

## Siguiente fase recomendada

1. Aplicar `sql/neon/schema.sql` en Neon.
2. Añadir un indicador visual de sincronización (pendientes / error / sincronizado).
3. Añadir resolución de conflictos (timestamp/última edición o merge por entidad).
4. Añadir sincronización de catálogos opcionales (`pares`, `protocolos`) si se decide.

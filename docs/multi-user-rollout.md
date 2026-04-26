# Multi-user rollout

Objetivo:
- Conservar todos los datos históricos bajo `leo`
- Dejar usuarios independientes para:
  - `leo` / `2225`
  - `cristina` / `biomag2026`
  - `testuser` / `biomag`

## Paso 1. Desplegar el código

Publica la versión que incluye:
- separación local por usuario
- sync/queue por usuario
- filtrado de Neon por `owner_username`

## Paso 2. Ejecutar migración en Neon

Ejecuta este script en tu base de datos Neon:

- [sql/neon/assign-existing-data-to-leo.sql](/Users/leonardomanzo/Library/Mobile%20Documents/com~apple~CloudDocs/IA/00.GitHub/biomagnetism-flow/sql/neon/assign-existing-data-to-leo.sql)

Efecto:
- añade `owner_username` si no existe
- asigna todos los datos antiguos a `leo`
- deja `owner_username` como obligatorio
- crea índices por propietario

## Paso 3. Verificación mínima

1. Entrar con `leo`
2. Confirmar que ve los pacientes y sesiones históricos
3. Crear un paciente nuevo
4. Cerrar sesión
5. Entrar con `cristina`
6. Confirmar que no ve datos de `leo`
7. Crear un paciente con `cristina`
8. Cerrar sesión
9. Entrar con `testuser`
10. Confirmar que empieza sin datos

## Paso 4. Prueba de no mezcla

Verificar que:
- `leo` no ve pacientes creados por `cristina`
- `cristina` no ve pacientes creados por `leo`
- sesiones y agenda también quedan aisladas

## Nota importante

Los datos históricos previos a esta migración no se pueden repartir automáticamente entre terapeutas, porque antes no existía el campo de propietario. En esta estrategia, todo lo existente queda asignado a `leo`.

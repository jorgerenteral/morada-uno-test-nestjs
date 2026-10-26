# Wookie Books API

API REST de librería (bookstore) construida con **NestJS**, TypeORM y SQLite, donde los autores publican sus aventuras y los lectores las navegan sin autenticarse. El enunciado original de la asignación está en [`docs/assignment.md`](docs/assignment.md).

## Requisitos

- Node.js 22 o superior
- npm 10 o superior

La base de datos es un archivo SQLite, así que no hace falta instalar nada más.

## Instalación

```bash
npm install
cp .env.example .env
npm run seed
```

`npm run seed` crea la base de datos con los usuarios y libros del enunciado (es idempotente, se puede repetir).

> El proyecto incluye un `.npmrc` con `legacy-peer-deps=true`, necesario para que npm resuelva los peer dependencies de Vite 8.

## Ejecución

```bash
npm run start:dev   # con recarga automática
# o
npm run build && npm run start:prod
```

La API queda disponible en `http://localhost:3000`.

### Configuración

Las variables se leen del entorno o de un archivo `.env` (ver [`.env.example`](.env.example)):

| Variable               | Descripción                                                    | Default             |
|------------------------|----------------------------------------------------------------|---------------------|
| `PORT`                 | Puerto HTTP                                                    | `3000`              |
| `DATABASE_PATH`        | Archivo SQLite                                                 | `bookstore.sqlite`  |
| `DATABASE_SYNCHRONIZE` | Crea/actualiza el esquema al arrancar                          | `true`              |
| `JWT_SECRET`           | Secreto con el que se firman los tokens (HS256)                | solo para desarrollo |
| `JWT_TTL`              | Segundos de vigencia del token                                 | `3600`              |
| `BCRYPT_ROUNDS`        | Costo del hash de contraseñas                                  | `10`                |

Con `NODE_ENV=production` la aplicación no arranca si falta `JWT_SECRET`.

### Datos semilla

| Usuario       | Contraseña       | Seudónimo    |
|---------------|------------------|--------------|
| `lohgarra`    | `rwaaaaawr`      | Lohgarra     |
| `chewbacca`   | `rrwwwgggh`      | Chewbacca    |
| `darth_vader` | `iwanttopublish` | Darth Vader  |

| ID | Título                      | Autor     | Publicado | Eliminado |
|----|-----------------------------|-----------|-----------|-----------|
| 1  | Adventures on Kashyyyk      | lohgarra  | sí        | no        |
| 2  | Life Debt: A Wookie Story   | lohgarra  | sí        | no        |
| 3  | My Draft Manuscript         | lohgarra  | no        | no        |
| 4  | Deleted Memories            | lohgarra  | sí        | sí        |
| 5  | Smuggler's Run              | chewbacca | sí        | no        |

## Pruebas

```bash
npm test            # unitarias (entidades, validación, negociación, XML)
npm run test:e2e    # pruebas de API de todos los endpoints (supertest)
npm run lint
```

Las pruebas usan SQLite en memoria y cubren autenticación, autorización, validación, borrado lógico, búsqueda y filtro por autor, la regla de Darth Vader, la negociación de formato y los datos semilla.

## Endpoints

| Método   | Ruta              | Auth | Descripción                                                  |
|----------|-------------------|------|--------------------------------------------------------------|
| `POST`   | `/auth/token`     | no   | Login con usuario/contraseña, devuelve un JWT                |
| `GET`    | `/books`          | no   | Libros publicados y no eliminados. Filtros `search` y `author` |
| `GET`    | `/books/{id}`     | no   | Detalle de un libro público                                  |
| `GET`    | `/me/books`       | sí   | Libros no eliminados del usuario (borradores y publicados)   |
| `POST`   | `/me/books`       | sí   | Crea un libro como borrador                                  |
| `GET`    | `/me/books/{id}`  | sí   | Detalle de un libro propio (opcional)                        |
| `PATCH`  | `/me/books/{id}`  | sí   | Actualiza campos, incluido `published`                       |
| `DELETE` | `/me/books/{id}`  | sí   | Borrado lógico (`deleted_at`), responde `204`                |

### Ejemplos

```bash
# Login
curl -s -X POST localhost:3000/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"username": "lohgarra", "password": "rwaaaaawr"}'
# {"access_token": "eyJ...", "token_type": "bearer"}

TOKEN=eyJ...

# Catálogo público con filtros (insensibles a mayúsculas)
curl 'localhost:3000/books?search=wookie&author=lohgarra'

# Crear un borrador y publicarlo
curl -X POST localhost:3000/me/books \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title": "My story", "description": "...", "price": "9.99"}'

curl -X PATCH localhost:3000/me/books/6 \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"published": true}'

# Formato XML
curl -H 'Accept: application/xml' localhost:3000/books/1
```

### Búsqueda y filtros

- `search`: subcadena, sin distinguir mayúsculas, contra `title` o `description`. Los comodines `%` y `_` se tratan literalmente.
- `author`: coincidencia exacta, sin distinguir mayúsculas, contra el seudónimo del autor.
- Ambos se combinan con AND.

SQLite solo normaliza mayúsculas ASCII en `LOWER()`; con otra base de datos el comportamiento depende del collation.

### Campos de un libro

Los endpoints públicos devuelven `id`, `title`, `description`, `author_pseudonym`, `cover_image_url`, `price` y `published`. Los endpoints autenticados añaden `deleted_at`. `price` siempre es un string con dos decimales (`"9.99"`).

Al crear: `title`, `description` y `price` son obligatorios; `cover_image_url` es opcional y debe ser una URL `http(s)`. `price` acepta string o número, con máximo 2 decimales. Enviar `"published": true` en el `POST` responde `400` (usa `PATCH` para publicar). Los campos desconocidos (como `author_id`) se ignoran.

### Formato de respuesta

JSON por defecto. Con el header `Accept` se negocia el formato:

| `Accept`                           | Resultado                  |
|------------------------------------|----------------------------|
| ausente, `*/*`, `application/json` | JSON                       |
| `application/xml`                  | XML                        |
| cualquier otro (p. ej. `text/csv`) | `406 Not Acceptable`       |

Se respetan los valores `q` (`application/xml;q=0.9, application/json;q=0.5` devuelve XML). Los errores siempre se devuelven en JSON, como exige el contrato de errores.

### Errores

Toda respuesta que no sea 2xx tiene este formato:

```json
{
  "error": "validation_error",
  "message": "title is required",
  "details": {
    "field": "title",
    "code": "required",
    "errors": {"title": ["title should not be empty"]}
  }
}
```

| Status | `error`              | Cuándo                                                       |
|--------|----------------------|--------------------------------------------------------------|
| 400    | `validation_error`   | Datos inválidos o faltantes                                  |
| 401    | `unauthorized`       | Credenciales inválidas, token ausente, inválido o expirado   |
| 403    | `forbidden`          | El libro no es del usuario, o Darth Vader intenta publicar   |
| 404    | `not_found`          | Libro inexistente, eliminado o (en público) no publicado     |
| 406    | `not_acceptable`     | Formato solicitado en `Accept` no soportado                  |
| 500    | `server_error`       | Error inesperado (el detalle solo se escribe en el log)      |

`details` solo aparece en errores de validación.

### Regla de Darth Vader

El usuario `darth_vader` no puede publicar libros. Cualquier `PATCH` con `"published": true` responde:

```json
{"error": "forbidden", "message": "Darth Vader is not allowed to publish on Wookie Books"}
```

Puede crear, editar, despublicar y eliminar sus borradores con normalidad.

## Decisiones de diseño

- **JWT**: tokens HS256 emitidos con `@nestjs/jwt` y verificados con `passport-jwt`. `JwtAuthGuard` rechaza con `401` los tokens ausentes, mal formados, expirados o de usuarios que ya no existen. No hay sesiones ni cookies.
- **Contraseñas**: se guardan con bcrypt (`bcryptjs`), nunca en claro.
- **Borrado lógico**: la entidad `Book` usa `@DeleteDateColumn` sobre `deleted_at`; TypeORM excluye esos libros de cualquier consulta por defecto (y devuelven `404` al accederlos directamente).
- **Autorización**: `OwnBookGuard` carga el libro de `/me/books/:id` y verifica que pertenezca al usuario. Es un guard (y no una comprobación dentro del handler) para decidirlo antes de validar el cuerpo: un tercero recibe `403` y no detalles de validación. La regla de Darth Vader vive en `BooksService.update`.
- **Errores**: `ApiExceptionFilter` convierte cualquier excepción al formato de error de la API, y la validación (`class-validator`) responde `400` con `details.field` y `details.code`.
- **Negociación de formato**: `NegotiationGuard` (global) corre antes que los guards de autenticación y rechaza con `406`; `XmlInterceptor` serializa las respuestas exitosas a XML. Las listas usan elementos `<item>` y los `null` se marcan con `nil="true"`. Los headers de navegador (`text/html,...,application/xml;q=0.9,*/*;q=0.8`) se interpretan como JSON.
- **Esquema**: `synchronize` crea las tablas al arrancar, lo que basta para esta asignación. Para producción conviene desactivarlo (`DATABASE_SYNCHRONIZE=false`) y usar migraciones.
- **Listados sin paginar**: el contrato pide un arreglo JSON, por lo que el listado devuelve todos los libros que coinciden.

## Estructura

```
src/
├── auth/                 # login, estrategia JWT, guard y @CurrentUser
├── books/                # entidad, servicio, DTOs, controladores (público y /me) y OwnBookGuard
├── common/               # filtro de errores y excepción de validación
├── config/               # configuración desde variables de entorno
├── database/             # seeds de desarrollo
├── negotiation/          # Accept, guard, interceptor y encoder XML
├── users/                # entidad y servicio de usuarios
├── app.module.ts
├── app.setup.ts          # pipes y filtros globales (compartidos con los tests)
├── main.ts
└── seed.ts               # npm run seed
test/                     # pruebas e2e y utilidades (factories, token, app de prueba)
```

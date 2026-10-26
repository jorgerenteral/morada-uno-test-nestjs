### Objetivo

Tu asignación es implementar una API REST de librería (bookstore).

### Contexto

Lohgarra, una Wookie de Kashyyyk, tiene una gran idea. Quiere construir un marketplace que le permita a ella y a sus amigos autopublicar sus aventuras y venderlas en línea a otros Wookies. Las ganancias se recolectarían y se donarían para comprar suministros médicos para un asentamiento Ewok en situación de pobreza.

### Tareas

-   Implementar una API REST que devuelva **JSON por defecto**
    -   **Bonus**: Soportar negociación del formato de respuesta vía el header `Accept`:
        -   `Accept: application/json` → JSON
        -   `Accept: application/xml` → XML
        -   Si el formato solicitado no es soportado, devolver `406 Not Acceptable`
-   Implementar un modelo de usuario personalizado con un campo de "seudónimo de autor" (author pseudonym)
-   Implementar un modelo de libro con los siguientes campos:
    -   `title` (string, requerido)
    -   `description` (text, requerido)
    -   `author` (llave foránea al modelo de usuario personalizado)
    -   `cover_image_url` (string de URL, opcional) - almacenar como URL, no como archivo subido
    -   `price` (decimal, requerido)
    -   `published` (boolean, default: false) - controla la visibilidad en los endpoints públicos
    -   `deleted_at` (datetime, nullable) - **marcador de borrado lógico (soft delete)**; cuando está definido, el libro se considera eliminado
-   Proveer un endpoint para autenticarse contra la API usando usuario/contraseña y devolver un JWT
-   Implementar la **navegación pública de libros** en `/books`:
    -   No requiere autenticación
    -   Solo GET (listado y detalle)
    -   Solo devuelve libros donde `published=true` **y** `deleted_at` es null
    -   Soportar filtrado vía parámetros de query:
        -   `search`: coincidencia de subcadena, insensible a mayúsculas/minúsculas, contra **title** o **description**
        -   `author`: coincidencia exacta, insensible a mayúsculas/minúsculas, contra el **seudónimo** del autor
    -   Ejemplos:
        -   `/books?search=adventure` devuelve libros con "adventure" en el título o la descripción
        -   `/books?author=lohgarra` devuelve solo libros con seudónimo "Lohgarra"
        -   `/books?search=wookie&author=lohgarra` aplica ambos filtros (AND)
-   Implementar los **endpoints autenticados de autor** en `/me/books`:
    -   Requiere autenticación con JWT
    -   Requeridos: `GET /me/books` (listado), `POST /me/books`, `PATCH /me/books/{id}`, `DELETE /me/books/{id}`
    -   Opcional: `GET /me/books/{id}` (detalle) - no es requerido para esta asignación
    -   `POST /me/books` crea un libro nuevo como borrador (`published=false`)
    -   `PATCH /me/books/{id}` puede actualizar campos, incluyendo establecer `published=true`
    -   `DELETE /me/books/{id}` realiza un **borrado lógico** (establece `deleted_at` con el timestamp actual)
-   Implementar pruebas de API para todos los endpoints (ver los requerimientos más abajo)

### Especificación de la API

#### Usuarios semilla (para pruebas locales/dev)

Crear los siguientes usuarios en tu base de datos de desarrollo (vía fixtures, migraciones o un management command):

| Usuario | Contraseña | Seudónimo |
|----------|----------|-----------|
| `lohgarra` | `rwaaaaawr` | Lohgarra |
| `chewbacca` | `rrwwwgggh` | Chewbacca |
| `darth_vader` | `iwanttopublish` | Darth Vader |

#### Libros semilla (para pruebas locales/dev)

Crear los siguientes libros para permitir pruebas manuales y revisión consistentes:

| ID | Título | Autor | Publicado | Eliminado |
|----|-------|--------|-----------|---------|
| 1 | "Adventures on Kashyyyk" | lohgarra | ✅ sí | no |
| 2 | "Life Debt: A Wookie Story" | lohgarra | ✅ sí | no |
| 3 | "My Draft Manuscript" | lohgarra | no (borrador) | no |
| 4 | "Deleted Memories" | lohgarra | ✅ sí | ✅ sí |
| 5 | "Smuggler's Run" | chewbacca | ✅ sí | no |

Esto permite que los revisores verifiquen de inmediato:
- `/books` devuelve los IDs 1, 2, 5 (publicados + no eliminados)
- `/books?author=lohgarra` devuelve solo los IDs 1, 2
- `/books?search=wookie` devuelve solo el ID 2
- `/me/books` (como lohgarra) devuelve los IDs 1, 2, 3 (excluye el ID 4 eliminado)

(El filtrado vía `author=lohgarra` debe ser insensible a mayúsculas/minúsculas.)

#### Autenticación

```
POST /auth/token
Request:  {"username": "lohgarra", "password": "rwaaaaawr"}
Response: {"access_token": "eyJ...", "token_type": "bearer"}
Status:   200 OK (éxito), 401 Unauthorized (credenciales inválidas)
```

#### Endpoints públicos

```
GET /books
Response: Un arreglo JSON de objetos Book (ver el esquema más abajo)
Status:   200 OK

GET /books/{id}
Response: Un solo objeto Book
Status:   200 OK, 404 Not Found (o si está eliminado/no publicado)

GET /books?search=adventure&author=lohgarra
Response: Lista filtrada de libros publicados y no eliminados que cumplan los criterios
```

**El objeto Book (endpoints públicos) DEBE incluir:**
```json
{
  "id": 1,
  "title": "Adventures on Kashyyyk",
  "description": "A thrilling tale of...",
  "author_pseudonym": "Lohgarra",
  "cover_image_url": "https://example.com/cover.jpg",
  "price": "9.99",
  "published": true
}
```

Notas:
- `cover_image_url` es un string de URL o `null`
- `price` DEBE ser un string con 2 decimales (por ejemplo, `"9.99"`) para evitar problemas de precisión de punto flotante
- Los endpoints públicos nunca exponen `deleted_at`

#### Endpoints autenticados (requieren Bearer token)

```
GET /me/books
Response: Todos los libros no eliminados del usuario autenticado (borradores y publicados)
Status:   200 OK, 401 Unauthorized

POST /me/books
Request:  {"title": "...", "description": "...", "price": "9.99", "cover_image_url": "..."}
Response: {"id": 1, "title": "...", "published": false, "deleted_at": null, ...}
Status:   201 Created, 400 Bad Request (validación), 401 Unauthorized
Notas:
- El servidor SIEMPRE debe crear los libros nuevos como borradores (`published=false`)
- Si el request incluye `"published": true`, devolver 400 Bad Request:
  {"error": "validation_error", "message": "Cannot publish on create. Use PATCH to publish."}

PATCH /me/books/{id}
Request:  {"published": true}  // o cualquier campo actualizable
Response: {"id": 1, ..., "published": true}
Status:   200 OK, 400 Bad Request, 403 Forbidden (no es el dueño), 404 Not Found

DELETE /me/books/{id}
Response: {} (cuerpo vacío)
Status:   204 No Content, 403 Forbidden (no es el dueño), 404 Not Found
Nota:     Borrado lógico - establece `deleted_at` con el timestamp actual. NO elimina de la base de datos.
          Después del borrado, el libro ya no aparece en GET /me/books ni en GET /books.
```

**El objeto Book (endpoints autenticados) DEBE incluir:**
```json
{
  "id": 1,
  "title": "Adventures on Kashyyyk",
  "description": "A thrilling tale of...",
  "author_pseudonym": "Lohgarra",
  "cover_image_url": null,
  "price": "9.99",
  "published": false,
  "deleted_at": null
}
```

#### Formato de respuesta de error

Todas las respuestas que no sean 2xx DEBEN devolver un cuerpo JSON con este formato:

```json
{
  "error": "validation_error",
  "message": "Title is required",
  "details": {"field": "title", "code": "required"}
}
```

Lineamientos:
- `error`: string legible por máquina (por ejemplo, `validation_error`, `unauthorized`, `forbidden`, `not_found`)
- `message`: resumen legible por humanos
- `details`: objeto opcional con información estructurada (errores por campo, etc.)

### Requerimientos de pruebas

Implementar pruebas de API que cubran como mínimo:

-   **Autenticación**:
    -   Un login válido devuelve un JWT
    -   Credenciales inválidas devuelven 401
    -   Token faltante o inválido devuelve 401 en endpoints protegidos
-   **Autorización**:
    -   Los usuarios no pueden modificar/eliminar libros que no les pertenecen (403)
    -   Los libros eliminados devuelven 404 en los endpoints públicos
    -   Los libros no publicados devuelven 404 en los endpoints públicos
-   **Validación**:
    -   Los campos requeridos faltantes devuelven 400 con un mensaje de error claro
    -   Intentar establecer `published=true` en el POST devuelve 400
-   **Lógica de negocio**:
    -   Borrado lógico: después del DELETE, el libro tiene `deleted_at` establecido y se excluye de todos los endpoints GET
    -   Búsqueda: devuelve solo los libros publicados y no eliminados que coincidan
    -   Filtro de autor: coincide por seudónimo (insensible a mayúsculas/minúsculas)

### Criterios de evaluación

-   **Calidad del código**: Código limpio y legible con una arquitectura sensata
-   **Diseño de la API**: Convenciones RESTful, manejo de errores consistente, códigos de estado correctos
-   **Seguridad**: Autenticación adecuada, verificaciones de autorización (los usuarios solo pueden modificar sus propios libros)
-   **Pruebas**: Cobertura de pruebas exhaustiva para el comportamiento de todos los endpoints
-   **Documentación**: README claro con instrucciones de instalación y ejecución

#### Bonus

-   **Regla de Darth Vader**: El usuario con username `darth_vader` no debe poder publicar libros.

    Publicar se define como cualquier request que resulte en `published=true`:
    -   `PATCH /me/books/{id}` con `{"published": true}`

    Cuando Darth Vader intente publicar, devolver:
    ```json
    {"error": "forbidden", "message": "Darth Vader is not allowed to publish on Wookie Books"}
    ```
    Status: 403 Forbidden

### CodeSubmit

Por favor organiza, diseña, prueba y documenta tu código como si fuera a producción, y luego sube tus cambios a la rama master. Después de haber subido tu código, puedes entregar la asignación en la página de la asignación.

Mucho éxito y feliz programación,

El equipo de MoradaUno

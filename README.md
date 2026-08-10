# Cafe Artesanal Zaruma - API + Frontend

Proyecto de venta de cafe artesanal con:

- API dinamica en Node.js + Express + MySQL
- Frontend en React + Vite
- Registro e inicio de sesion con contrasena hasheada (bcrypt)
- Catalogo protegido: solo usuarios con cuenta pueden verlo
- Carrito y registro de pedido
- Metodo de pago restringido a deposito bancario
- Boton global de WhatsApp en todas las paginas (0988062935)

## 1. Preparar base de datos

1. Ejecuta el script [Database/cafe_artesanal.sql](Database/cafe_artesanal.sql) en MySQL.
2. Verifica que la base se cree con el nombre `cafe_artesanal`.
3. Carga productos de ejemplo con [Database/seed_productos_zaruma.sql](Database/seed_productos_zaruma.sql).

## 2. Variables de entorno

1. Crea un archivo `.env` usando `.env.example`.
2. Configura tu conexion MySQL y `JWT_SECRET`.

### Conexion con Aiven (MySQL)

Puedes conectar la API a Aiven con cualquiera de estas opciones:

1. Usar host, puerto, usuario, password y base:

```env
DB_HOST=tu-host-aiven
DB_PORT=tu-puerto-aiven
DB_USER=tu-usuario-aiven
DB_PASSWORD=tu-password-aiven
DB_NAME=tu-base-aiven
DB_SSL=true
DB_SSL_MODE=require
```

2. Usar URL unica de conexion:

```env
DB_URL=mysql://usuario:password@host:puerto/base
DB_SSL=true
DB_SSL_MODE=require
```

3. Si Aiven te pide CA, agrega el certificado:

```env
DB_SSL_MODE=verify-ca
DB_SSL_CA_FILE=./certs/ca.pem
```

Notas:

- Si existe `DB_URL`, tiene prioridad sobre `DB_HOST`, `DB_USER`, etc.
- Para produccion, define `NODE_ENV=production` para no exponer detalles internos de errores.

## 3. Instalar y ejecutar en local

```bash
npm install
```

Terminal 1 (API):

```bash
npm run api
```

Terminal 2 (Frontend):

```bash
npm run dev
```

### Usar API desplegada en Render desde local

Si no vas a ejecutar la API local y quieres consumir la API en Render desde tu frontend local, define `VITE_API_URL` con la URL publica de Render:

```env
VITE_API_URL=https://cafe-artesanal.onrender.com/api
```

Luego reinicia `npm run dev` para que Vite tome la nueva variable.

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/products` (requiere token)
- `POST /api/orders` (requiere token, solo `DEPOSITO_BANCARIO`)

## Reglas implementadas

- Usuario unico (`usuarios.usuario`)
- Correo unico (`usuarios.correo`)
- Contrasena hasheada con `bcrypt`
- Validacion para impedir reutilizar una contrasena ya usada
- Restriccion de catalogo solo para usuarios autenticados
- Pago solo por deposito bancario

## Despliegue en Render

El proyecto esta listo para desplegarse como un solo servicio web en Render usando [render.yaml](render.yaml).

1. Sube este repositorio a GitHub.
2. En Render, elige **New +** > **Blueprint** y conecta el repositorio.
3. Render detectara [render.yaml](render.yaml) y creara el servicio.
4. En variables sensibles, completa al menos:

- `JWT_SECRET`
- `DB_URL` (recomendado para Aiven)
- `CLIENT_ORIGIN` con la URL publica del servicio Render (ejemplo: `https://cafe-artesanal-1.onrender.com`)

Notas de deploy:

- El frontend se compila con Vite y se sirve desde Express en el mismo servicio.
- En produccion el frontend usa `/api`, asi que no necesitas URL externa para API.
- Si no usas `DB_URL`, debes configurar `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`.

# Carnicería Lalo's · tienda virtual

Tienda completa para una carnicería mexicana, construida con Next.js App Router, React, TypeScript, Supabase y Mercado Pago Checkout Pro. Incluye catálogo, búsqueda y filtros en tiempo real, carrito persistente, autenticación, pedidos, seguimiento, administración, carga de imágenes, Analytics y una instalación SQL idempotente.

La portada puede abrirse sin credenciales en **modo demostración**. El catálogo y el carrito funcionan con datos locales; autenticación, pedidos, panel, Storage y pagos se activan al conectar los servicios.

## Funciones incluidas

- Portada responsiva con identidad visual propia, hero, beneficios, categorías, historia, contacto y horarios.
- 25 productos reales de Lalo's en cuatro categorías: res, cerdo, carne molida y pollo.
- Búsqueda por nombre/descripción, categoría, disponibilidad, destacados y orden por precio/fecha.
- Productos por kilogramo, medio kilo, pieza, paquete o charola, con variantes y límites de stock.
- Carrito lateral persistido en `localStorage`; el carrito solo se limpia cuando el pago queda confirmado.
- Registro, email/contraseña, Google OAuth, recuperación de contraseña, callback PKCE y sesión SSR.
- Rutas privadas `/pedidos`, `/pedido/[id]` y `/admin`.
- Historial, detalle, total, entrega, estados de pago y línea de avance del pedido.
- Sondeo temporal de conciliación al regresar de Mercado Pago.
- Panel admin con métricas, alta, edición y eliminación de productos, controles rápidos de stock, carga y reemplazo de imágenes, categorías y estados de pedido.
- Validación de rol admin tanto en la página como en cada endpoint administrativo.
- Checkout Pro con precios recalculados en servidor, idempotencia, `external_reference`, metadata, URLs de retorno y webhook.
- Webhook con HMAC SHA-256, comparación de tiempo constante, tolerancia contra replay y respuesta inmediata; la conciliación se ejecuta después de responder.
- Validación de monto, moneda, pedido, usuario, stock, variantes, duplicados y estados.
- Eventos GA4: `view_item`, `search`, `add_to_cart`, `remove_from_cart`, `begin_checkout` y `purchase` (cuando aplica).
- Metadata, Open Graph, favicon, navegación por teclado, estados vacíos y página 404.

## Requisitos

- Node.js 22 o superior (se probó también con Node 24).
- npm 11 o superior.
- Proyecto de Supabase.
- Aplicación de Mercado Pago para México.
- Cuenta de Google Cloud si se habilita Google OAuth.
- Proyecto de Vercel para producción.

## Inicio rápido

```bash
cd carniceria-lalos-store
npm install
copy .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`. Sin credenciales verás la tienda en modo demostración.

Comandos de verificación:

```bash
npm run typecheck
npm run lint
npm run build
npm run start
```

## Variables de entorno

Copia `.env.example` a `.env.local` y completa:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

MERCADO_PAGO_PUBLIC_URL=
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS=600

NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

Variables públicas, incluidas en el navegador:

- `NEXT_PUBLIC_SITE_URL`: URL canónica del sitio.
- `NEXT_PUBLIC_SUPABASE_URL`: URL pública del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: usa preferentemente la clave pública moderna `sb_publishable_...`; el nombre de la variable se conserva por compatibilidad. Su seguridad depende de RLS.
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: opcional, por ejemplo `G-XXXXXXXXXX`.

Variables exclusivas del servidor, nunca deben comenzar con `NEXT_PUBLIC_`:

- `SUPABASE_SERVICE_ROLE_KEY`: usa la clave secreta moderna `sb_secret_...` (o `service_role` heredada). Omite RLS y solo debe existir en el servidor.
- `MERCADO_PAGO_ACCESS_TOKEN`: credencial privada de Mercado Pago.
- `MERCADO_PAGO_WEBHOOK_SECRET`: secreto de firma de Webhooks.
- `MERCADO_PAGO_PUBLIC_URL`: URL HTTPS pública utilizada para retornos y notificaciones.
- `MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS`: ventana permitida para la marca de tiempo de la firma.

No guardes `.env.local` en Git. El `.gitignore` ya lo excluye.

## Configurar Supabase

1. Crea un proyecto desde el panel de Supabase.
2. Abre **SQL Editor → New query**.
3. Copia y ejecuta todo `supabase/schema.sql`.
4. Confirma que la consulta final devuelve seis tablas con `rls_enabled = true`.
5. Ve a **Project Settings → API Keys** y copia la URL, la clave `sb_publishable_...` y la clave `sb_secret_...` en `.env.local`. Nunca agregues la clave secreta a una variable `NEXT_PUBLIC_*`.
6. Si las tablas no aparecen por Data API, revisa **Integrations → Data API** y confirma que `public` esté expuesto. El SQL incluye los `GRANT` mínimos además de RLS.

El SQL crea:

- extensiones, enums, tablas, secuencia, restricciones e índices;
- triggers para perfiles, números de pedido y `updated_at`;
- función administrativa en el esquema no expuesto `private`;
- políticas RLS y privilegios de columna;
- bucket `product-images` con límite de 5 MB y MIME JPEG/PNG/WebP;
- datos de ejemplo idempotentes.

### Crear el primer administrador

1. Registra el usuario desde `/auth` y confirma su correo.
2. En SQL Editor identifica su correo:

```sql
select id, email from auth.users order by created_at desc;
```

3. Asigna el rol únicamente desde SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID_DEL_USUARIO';
```

4. Cierra y vuelve a iniciar sesión; visita `/admin`.

Los clientes autenticados no tienen privilegio SQL para modificar la columna `role`. El código tampoco confía en `user_metadata`; cada ruta administrativa vuelve a comprobar `profiles.role` en servidor.

### RLS y pruebas recomendadas

- Con un usuario cliente, consulta `/pedidos` y confirma que solo aparecen sus pedidos.
- Copia el ID de un pedido de otra cuenta en `/pedido/[id]`: debe responder 404.
- Intenta actualizar `profiles.role` con la clave anon: Postgres debe rechazar la columna.
- Como cliente, intenta crear/editar productos: RLS debe rechazarlo.
- Como admin, crea un producto, desactívalo y comprueba que ya no es público.
- Revisa en Supabase Advisors cualquier advertencia de seguridad/rendimiento antes de producción.

## Storage e imágenes

El bucket público `product-images` permite leer imágenes por URL, pero solo un administrador puede insertar, actualizar o eliminar objetos. La interfaz valida tipo y tamaño antes de subir; el bucket vuelve a validarlos.

Los productos de muestra utilizan URLs estables de Unsplash. Para sustituirlas:

1. Entra a `/admin`.
2. Edita un producto y selecciona una imagen JPEG, PNG o WebP de hasta 5 MB.
3. Guarda el producto.

La aplicación genera un nombre UUID, guarda la URL pública y elimina la imagen administrada anterior después de actualizar el producto. No elimina imágenes externas de Unsplash.

## Configurar Auth y Google OAuth

### URLs de Supabase Auth

En **Authentication → URL Configuration**:

- Site URL local durante desarrollo: `http://localhost:3000`.
- Redirect URL local: `http://localhost:3000/auth/callback`.
- Producción: `https://tu-dominio.com/auth/callback`.
- Para previews puedes agregar `https://*-tu-equipo.vercel.app/auth/callback`, aunque para compras se recomienda probar con un dominio estable.

En producción cambia Site URL al dominio canónico.

### Google Cloud

1. Crea o elige un proyecto en Google Cloud.
2. Configura **Google Auth Platform → Branding**, audiencia y pantalla de consentimiento.
3. Agrega los scopes `openid`, `userinfo.email` y `userinfo.profile`.
4. Crea un cliente OAuth tipo **Web application**.
5. En **Authorized JavaScript origins** agrega `http://localhost:3000` y el dominio de producción.
6. En **Authorized redirect URIs** agrega el callback que muestra Supabase, normalmente `https://TU_PROJECT_REF.supabase.co/auth/v1/callback` (no el callback de Next.js).
7. Copia Client ID y Client Secret a **Supabase → Authentication → Providers → Google** y activa el proveedor.
8. Verifica marca/dominio antes de producción para que la pantalla de consentimiento inspire confianza.

El callback de la aplicación `/auth/callback` intercambia el código PKCE y valida que el destino sea una ruta interna para evitar open redirects.

## Configurar Mercado Pago Checkout Pro

1. En Mercado Pago Developers crea una aplicación de Checkout Pro para México.
2. Usa primero el Access Token de pruebas en `MERCADO_PAGO_ACCESS_TOKEN`.
3. Despliega una preview de Vercel o usa un túnel HTTPS. Mercado Pago no admite `localhost` ni `127.0.0.1` en `back_urls`.
4. Define `MERCADO_PAGO_PUBLIC_URL=https://tu-preview-o-dominio.com`, sin ruta final.
5. En **Tus integraciones → Webhooks**, registra:

   `https://tu-dominio.com/api/mercado-pago/webhook`

6. Activa el tópico **Pagos / payment**.
7. Copia el secreto de firma a `MERCADO_PAGO_WEBHOOK_SECRET`.
8. Mantén la tolerancia en 600 segundos salvo que tu política exija una ventana menor; el servidor debe tener la hora sincronizada.

El flujo implementado es:

1. El cliente autenticado envía IDs y cantidades, nunca precios confiables.
2. El servidor vuelve a consultar producto/variante, disponibilidad, pertenencia, stock y precio.
3. Crea el pedido y sus líneas; si fallan las líneas elimina el pedido incompleto.
4. Crea una preferencia con MXN, `external_reference`, metadata, entrega, `back_urls`, `notification_url` e idempotency key.
5. El navegador va a `init_point`.
6. En el retorno, la página consulta la API de Mercado Pago; no confía en los query params.
7. El webhook verifica firma y fecha, responde 200 y concilia con la API oficial.
8. Solo se marca `paid` si ID, pedido, moneda y monto coinciden.

### Credenciales y compras de prueba

En **Tus integraciones → Cuentas de prueba** crea o usa:

- un vendedor de prueba de México;
- un comprador de prueba de México distinto al vendedor.

Mercado Pago genera usuario, contraseña y código de verificación; esos datos son sensibles aunque sean de prueba y no deben guardarse en el repositorio.

Tarjetas de prueba vigentes para México (verifica nuevamente en la documentación oficial al probar):

| Tipo | Número | CVV | Vencimiento |
|---|---:|---:|---:|
| Mastercard crédito | `5474 9254 3267 0366` | `123` | `11/30` |
| Visa crédito | `4075 5957 1648 3764` | `123` | `11/30` |

Usa `APRO` como nombre del titular para aprobado, `CONT` para pendiente y `OTHE` para rechazo general. Realiza Checkout Pro en una ventana de incógnito con el comprador de prueba; no compres con la misma cuenta que vende.

## Google Analytics 4

1. Crea un flujo web en GA4.
2. Copia el Measurement ID a `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
3. Despliega de nuevo y verifica DebugView/Realtime.

Si la variable está vacía, no se carga ningún script y los eventos se ignoran de forma segura.

## Desplegar en Vercel

1. Sube la carpeta a un repositorio Git privado o público.
2. En Vercel elige **Add New → Project → Import**.
3. Si el repositorio contiene más carpetas, usa `carniceria-lalos-store` como **Root Directory**.
4. Vercel detectará Next.js. Usa `npm run build` y no cambies el directorio de salida.
5. Agrega todas las variables de `.env.example` en **Settings → Environment Variables** para Production y Preview según corresponda.
6. Define `NEXT_PUBLIC_SITE_URL` y `MERCADO_PAGO_PUBLIC_URL` con URL HTTPS estable.
7. Despliega.
8. Actualiza Supabase Site URL/Redirect URLs, Google Authorized origins y Mercado Pago Webhook con el dominio final.
9. Vuelve a desplegar después de cambiar variables `NEXT_PUBLIC_*`, porque se insertan durante la compilación.

## Prueba completa antes de producción

1. Registra y confirma un cliente por correo.
2. Prueba login, logout, restauración de sesión y recuperación de contraseña.
3. Prueba Google OAuth y el retorno al destino original.
4. Busca un producto por nombre y descripción; combina categoría, disponibilidad, destacados y orden.
5. Agrega variantes y varios productos; recarga y confirma persistencia del carrito.
6. Intenta superar el stock y confirma el límite.
7. Elige entrega y recolección; valida campos obligatorios.
8. Inicia pago aprobado, pendiente y rechazado con credenciales/tarjetas de prueba.
9. Confirma que monto y moneda coincidan, que el webhook aparezca con HTTP 200 y que eventos repetidos no dupliquen el pago.
10. Confirma que el carrito solo se borre con pago `paid`.
11. Comprueba `/pedidos`, `/pedido/[id]`, estados y sondeo del retorno.
12. Prueba IDOR: un usuario no debe abrir el pedido de otro.
13. Como admin, crea/edita/desactiva productos, sube/reemplaza imagen y cambia estados.
14. Como cliente, intenta acceder a `/admin` y a endpoints `/api/admin/*`.
15. Revisa GA4 Realtime para búsqueda, carrito, checkout y compra.
16. Ejecuta TypeScript, ESLint y build; revisa además Lighthouse en móvil.

## Arquitectura

```text
src/
  app/
    api/                 checkout, conciliación, webhook y administración
    admin/               panel protegido
    auth/                login, alta, recuperación y callback
    pedido/[id]/          detalle y progreso
    pedidos/              historial privado
  components/            interfaz, carrito, catálogo y panel
  data/                   catálogo local de demostración
  lib/
    supabase/             clientes browser/server/admin y refresco SSR
    auth.ts               guardas de página
    api-auth.ts           guarda administrativa para endpoints
    mercado-pago.ts       API, firma, estados y conciliación
    validation.ts         esquemas Zod
  types/                  tipos de dominio
supabase/schema.sql       base, RLS, Storage y semillas
proxy.ts                  actualización de sesión y rutas privadas
```

## Solución de problemas

**La tienda dice “modo demostración”.** Reinicia `npm run dev` después de completar las dos variables públicas de Supabase.

**Google vuelve con error.** Verifica los dos callbacks distintos: Google apunta a `https://PROJECT.supabase.co/auth/v1/callback`; Supabase permite `https://TU-SITIO/auth/callback`.

**El login se pierde.** Confirma que `proxy.ts` esté presente, que las cookies no estén bloqueadas y que Site URL coincida. No uses `getSession()` como autorización de servidor.

**Storage devuelve 403.** Confirma que el perfil sea `admin`, que el archivo sea JPEG/PNG/WebP y pese menos de 5 MB. El reemplazo requiere SELECT, INSERT, UPDATE y DELETE; el SQL crea las cuatro políticas necesarias.

**Mercado Pago rechaza `back_urls`.** `MERCADO_PAGO_PUBLIC_URL` debe ser HTTPS público, sin `localhost`, sin ruta final y perteneciente al despliegue actual.

**Webhook devuelve 401.** Revisa el secreto, la URL exacta, el `x-request-id`, la sincronización de reloj y la tolerancia. No desactives la validación en producción.

**El pedido queda pendiente.** Revisa el historial de Webhooks de Mercado Pago y los logs de Vercel. El usuario también puede regresar al detalle con `payment_id`; la app conciliará temporalmente contra `/v1/payments/{id}`.

**Las tablas existen pero la API responde 404/permission denied.** Revisa Data API y los `GRANT` del SQL. RLS y privilegios son capas separadas.

## Paso a producción

- Sustituye credenciales de prueba por producción únicamente después de completar toda la lista anterior.
- Rota cualquier secreto que se haya compartido por chat, captura o commit.
- Usa un dominio estable y HTTPS.
- Configura correo SMTP propio en Supabase para entregabilidad y plantillas de marca.
- Habilita monitoreo de errores y alertas de Webhooks.
- Revisa periódicamente dependencias, Supabase Advisors y cambios de Mercado Pago.
- Define políticas comerciales reales: radio/costo de entrega, zonas, horarios, cancelación, reembolso, impuestos y privacidad.

## Fuentes oficiales útiles

- [Supabase Auth con Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [Google Login en Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Checkout Pro](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/overview)
- [Webhooks de Mercado Pago](https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks)
- [Despliegue de Next.js en Vercel](https://vercel.com/docs/frameworks/nextjs)

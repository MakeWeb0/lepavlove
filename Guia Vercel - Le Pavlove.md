# Le Pavlove · Subir la web a Vercel paso a paso

Esta guía explica cómo poner la web y su panel de administración en Vercel, conectar el dominio **lepavlove.es** y dejarlo todo listo para que el dueño edite la web con su contraseña. No hace falta saber programar: solo seguir los pasos en orden.

## Índice

0. [Antes de empezar](#0-antes-de-empezar)
1. [Instalar Node.js](#1-instalar-nodejs)
2. [Crear la cuenta de Vercel](#2-crear-la-cuenta-de-vercel)
3. [Abrir la terminal en la carpeta de la web](#3-abrir-la-terminal-en-la-carpeta-de-la-web)
4. [Conectar el ordenador con Vercel](#4-conectar-el-ordenador-con-tu-cuenta-de-vercel)
5. [Subir la web por primera vez](#5-subir-la-web-por-primera-vez)
6. [Crear el almacenamiento (Blob)](#6-crear-el-almacenamiento-donde-se-guardan-los-cambios)
7. [Publicar la versión definitiva](#7-publicar-la-versión-definitiva)
8. [Probar el panel](#8-probar-el-panel-de-administración)
9. [Conectar lepavlove.es](#9-conectar-el-dominio-lepavlovees)
10. [Uso diario y cambios futuros](#10-uso-diario-y-cambios-futuros)
11. [Si algo falla](#11-si-algo-falla)

---

## 0. Antes de empezar

Necesitas:

- Un ordenador con Windows o Mac e internet.
- La carpeta de la web (**WEB LEPAVLOVE**) en el ordenador, por ejemplo en el Escritorio.
- Un correo electrónico para crear la cuenta de Vercel.
- Acceso al sitio donde se compró el dominio **lepavlove.es** (para el paso 9).
- Unos 20 minutos.

> ⚠️ **Importante sobre el plan de Vercel:** el plan gratuito (Hobby) es solo para proyectos personales y no comerciales. Para la web de un negocio, Vercel pide el plan **Pro**. Se puede empezar en Hobby para probar y pasar a Pro desde *Settings → Billing*.

---

## 1. Instalar Node.js

Node.js es un programa que hace falta para enviar la web a Vercel. Solo se instala una vez.

1. Entra en **nodejs.org**.
2. Pulsa el botón grande de descarga que pone **LTS**.
3. Abre el archivo descargado y pulsa **Siguiente** en todo hasta terminar. No hace falta cambiar nada.

> 💡 Si ya lo tenías instalado, puedes saltar este paso.

---

## 2. Crear la cuenta de Vercel

1. Entra en **vercel.com** y pulsa **Sign Up**.
2. Elige **Continue with Email** (o con Google) y sigue los pasos.
3. Si pregunta el tipo de uso, elige el que corresponda (Hobby para probar, Pro para el negocio).

> 💡 Si el negocio ya tiene una cuenta de Vercel (por ejemplo, la de su web actual), usa esa misma cuenta. Así luego será más fácil mover el dominio.

---

## 3. Abrir la terminal en la carpeta de la web

La terminal es una ventana negra donde se escriben órdenes. Da respeto, pero solo vas a copiar y pegar.

**En Windows:**

1. Abre la carpeta **WEB LEPAVLOVE** (debes ver dentro archivos como `index.html` y `admin.html`).
2. Haz clic en la barra de arriba donde aparece la ruta de la carpeta.
3. Borra lo que pone, escribe `cmd` y pulsa **Enter**. Se abre la ventana negra ya situada en esa carpeta.

**En Mac:** clic derecho sobre la carpeta **WEB LEPAVLOVE** → **Nuevo terminal en la carpeta**.

> 💡 Para pegar en la terminal: en Windows, clic derecho; en Mac, Cmd + V. Después de pegar, pulsa **Enter**.

---

## 4. Conectar el ordenador con tu cuenta de Vercel

Pega esto en la terminal y pulsa Enter:

```bash
npx vercel login
```

1. Si pregunta *«Need to install the following packages… Ok to proceed?»*, escribe `y` y Enter.
2. Elige cómo iniciaste sesión en Vercel (con las flechas y Enter) o escribe tu correo.
3. Se abrirá el navegador o te llegará un correo: confírmalo.
4. En la terminal aparecerá un mensaje de que has iniciado sesión.

---

## 5. Subir la web por primera vez

Pega esto y pulsa Enter:

```bash
npx vercel
```

Te hará unas preguntas. Contesta así:

| Pregunta (en inglés) | Qué contestar |
|---|---|
| Set up and deploy…? | `y` y Enter |
| Which scope…? | Tu cuenta (Enter) |
| Link to existing project? | `n` y Enter |
| What's your project's name? | `lepavlove` y Enter |
| In which directory is your code located? | Enter (deja `./`) |
| Want to modify these settings? | `n` y Enter |

Al terminar verás una dirección del tipo `https://lepavlove-xxxx.vercel.app`. Es una versión de prueba: aún falta el almacenamiento.

> 💡 Si en algún momento te pregunta por un «framework», elige **Other**.

---

## 6. Crear el almacenamiento donde se guardan los cambios

Aquí se guardarán los textos, fotos y vídeos que el dueño cambie desde el panel.

1. Entra en **vercel.com** e inicia sesión.
2. Abre el proyecto **lepavlove**.
3. Ve a la pestaña **Storage**.
4. Pulsa **Create** (o **Create Database**) y elige **Blob**.
5. Ponle un nombre, por ejemplo `lepavlove-contenido`. Si pregunta por el tipo de acceso, elige **Public**. Pulsa **Create**.
6. Si te pregunta a qué proyecto conectarlo, elige **lepavlove** y marca todos los entornos (*Production*, *Preview*, *Development*). Pulsa **Connect**.

> ✅ Listo: Vercel ha añadido solo la clave `BLOB_READ_WRITE_TOKEN` al proyecto. No tienes que copiar nada.

---

## 7. Publicar la versión definitiva

Vuelve a la terminal (la misma ventana negra, en la carpeta de la web) y pega:

```bash
npx vercel --prod
```

Al terminar te dará la dirección definitiva, del tipo `https://lepavlove.vercel.app`. Ábrela: deberías ver la web.

> ⚠️ Este paso es obligatorio después de crear el almacenamiento. Sin él, el panel no puede guardar.

---

## 8. Probar el panel de administración

1. Abre la dirección de la web y añade al final `/admin.html`. Por ejemplo: `https://lepavlove.vercel.app/admin.html`
2. Debe aparecer una pantalla azul con el logo que pide la **contraseña**.
3. Escribe `lepavlove1234` y pulsa **Entrar**.
4. Abajo a la izquierda pulsa **Cambiar contraseña** y pon una nueva. **Hazlo ya:** la contraseña inicial no es segura.
5. Haz una prueba: cambia un texto, pulsa **Publicar cambios** y abre la web en otra pestaña. El cambio aparece en menos de un minuto.

> ⚠️ Si en vez de la pantalla de contraseña ves un botón que dice **«Conectar con GitHub»**, el almacenamiento no está conectado: repite los pasos 6 y 7.

---

## 9. Conectar el dominio lepavlove.es

> ⚠️ Hoy lepavlove.es muestra la web antigua. Al hacer este paso, pasará a mostrar la nueva. Hazlo cuando el dueño dé el visto bueno.

1. En vercel.com, abre el proyecto **lepavlove** → **Settings** → **Domains**.
2. Escribe `lepavlove.es` y pulsa **Add**. Si te ofrece añadir también `www.lepavlove.es`, acepta.
3. Si sale un aviso de que el dominio **ya está en uso** en otro proyecto, hay que quitarlo antes de ese otro proyecto (el de la web antigua), desde su propio *Settings → Domains*. Si ese proyecto es de otra persona, pídele que lo quite.
4. Vercel mostrará unos **registros DNS** que hay que poner donde se compró el dominio. Normalmente son:

| Tipo | Nombre / Host | Valor |
|---|---|---|
| A | `@` | el número que muestre Vercel (suele ser `76.76.21.21`) |
| CNAME | `www` | el valor que muestre Vercel (suele ser `cname.vercel-dns.com`) |

5. Entra en la web donde se compró el dominio (por ejemplo IONOS, Hostinger, GoDaddy, Arsys…) → sección **DNS** del dominio.
6. Borra los registros **A** y **CNAME** antiguos de `@` y `www`, y añade los nuevos. **No toques** los registros de correo (MX, TXT), o dejará de funcionar el email.
7. Guarda y espera. Suele tardar entre 10 minutos y unas horas. Vercel pondrá el dominio en verde cuando esté listo y activará el candado (https) solo.

> 💡 Usa siempre los valores exactos que te muestre Vercel en pantalla; los de la tabla son los habituales, pero pueden cambiar.

---

## 10. Uso diario y cambios futuros

- **Cambiar textos, precios, horario, fotos o vídeos:** desde `lepavlove.es/admin.html`. No hace falta volver a tocar Vercel ni la terminal.
- **Cambios en el diseño o el código:** modifica los archivos de la carpeta y vuelve a publicar con:

```bash
npx vercel --prod
```

> 💡 Los cambios hechos desde el panel no se pierden al volver a publicar: están guardados en el almacenamiento, no en la carpeta.

---

## 11. Si algo falla

| Lo que pasa | Qué hacer |
|---|---|
| El panel muestra «Conectar con GitHub» en vez de pedir la contraseña. | El almacenamiento no está conectado. Repite los pasos 6 y 7. |
| «Contraseña incorrecta» y no la recuerdas. | En vercel.com → proyecto → **Storage** → abre el Blob → entra en la carpeta `panel` → borra los archivos que haya. La contraseña vuelve a ser `lepavlove1234`. Entra y cámbiala. |
| «Demasiados intentos». | Espera 15 minutos y vuelve a probar. |
| «Tu sesión ha caducado». | Vuelve a escribir la contraseña. Si marcas «Recordarme», dura 30 días. |
| Un vídeo no se sube. | Usa vídeos MP4 cortos (menos de 30 segundos y menos de 40 MB). |
| La terminal dice que `npx` no existe. | Node.js no está instalado. Repite el paso 1 y abre una terminal nueva. |
| El dominio no se pone en verde. | Revisa que los registros DNS son exactamente los que indica Vercel y espera unas horas más. |

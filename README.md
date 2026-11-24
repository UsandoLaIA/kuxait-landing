# Kuxait — landing page

Sitio estático en inglés para **Kuxait LLC** (www.kuxait.com): implementación de IA en empresas + equipos de alto rendimiento. Sin framework, sin build. HTML + CSS + JS vanilla, con GSAP (ScrollTrigger) y Lenis desde CDN.

## Estructura

```
index.html              Landing (hero, approach, services, method, teams, roles, standard, formats, FAQ, contact)
terms.html              Terms & Conditions
refund-policy.html      Refund Policy
privacy-policy.html     Privacy Policy
assets/css/main.css     Sistema de diseño completo (tokens, componentes, tema claro + secciones "ink")
assets/js/field.js      Canvas del hero: partículas que pasan de ruido → orden → señal (sin dependencias)
assets/js/main.js       Smooth scroll, reveals, thesis scrubbed, tracker del método, FAQ, cursor, form
assets/img/favicon.svg  Favicon (marca: grilla 2x2 con un cuadrado en azul señal)
robots.txt              Permite todos los bots, incluidos los de IA (GPTBot, ClaudeBot, PerplexityBot, etc.)
sitemap.xml             4 URLs
llms.txt                Resumen de la empresa para motores de IA
Dockerfile + nginx.conf Para deploy en Coolify (o cualquier host de contenedores)
```

## Correr local

Cualquier servidor estático sirve. Por ejemplo:

```bash
npx serve .
# o
python -m http.server 8080
```

Abrir `http://localhost:8080`. No hace falta instalar nada.

## Deploy

**Coolify (Dockerfile):** crear una app desde este repo con build pack *Dockerfile*. Puerto 80. Dominio `www.kuxait.com` y redirect de `kuxait.com` → `www`. El `nginx.conf` ya sirve `/terms` sin `.html`, cachea assets 30 días y manda headers básicos de seguridad.

**Vercel / Netlify / Cloudflare Pages:** apuntar al root del repo, sin build command, output directory `.`.

### DNS en Cloudflare (zona kuxait.com, hoy vacía)

| Tipo  | Nombre | Contenido                          | Proxy                     |
|-------|--------|------------------------------------|---------------------------|
| A     | `@`    | IP pública del VPS donde corre Coolify | DNS only (nube gris) al inicio |
| CNAME | `www`  | `kuxait.com`                       | igual que el A            |

- La IP es la misma que tiene el registro A de `usandolaia.com` en su zona de Cloudflare (ahí se ve el origen aunque esté proxied). La API de Coolify no la expone: el servidor figura como `localhost`.
- Primero con **DNS only** para que Traefik emita el certificado Let's Encrypt. Una vez emitido, se puede prender el proxy naranja con SSL/TLS en modo **Full (strict)**.
- En Coolify: nuevo recurso desde el repo de GitHub, build pack **Dockerfile**, puerto 80, dominios `https://www.kuxait.com,https://kuxait.com`, y en la config del dominio activar la redirección de non-www a www.
- Repo: https://github.com/UsandoLaIA/kuxait-landing (público, rama `main`). App en Coolify: proyecto **Kuxait**, aplicación `kuxait-landing`, fuente Public GitHub. Después de cada `git push`, hay que apretar **Deploy** en Coolify (no hay webhook configurado).
- Deploy inicial hecho el 24/11/2026. IP del servidor: 38.242.248.93 (A `@` y CNAME `www` en Cloudflare, DNS only).

## Antes de publicar (checklist)

1. **Email**: hoy el sitio usa `hello@kuxait.com` en todas partes (footer, contacto, legales, JSON-LD, llms.txt). Si el mail real es otro, buscar y reemplazar.
2. **Legales**: ya cargados con Wyoming como estado de constitución y la oficina principal de Miami (1000 Brickell Ave, Suite 715, PMB 153). Revisar el depósito (20%) y las ventanas de cancelación de la Refund Policy: son propuestas razonables para servicios profesionales, no las de Luhod (sus legales no están publicados en luhod.com, ver nota abajo).
4. **Imagen OG**: ya generada en `assets/img/og.png` (1200×630) con la paleta del sitio y el claim "Intelligence, installed." Si cambia el claim del hero, regenerarla.
4. **Imagen OG**: las metas apuntan a `assets/img/og.png` (1200×630). Generarla con la paleta del sitio (papel #F3F2ED, tinta #0C0D10, señal #1E2BE6) y el claim "Intelligence, installed." Si no se genera, borrar las metas `og:image` / `twitter:image`.
5. **Analytics**: no hay ninguno instalado. Si se agrega, usar uno sin cookies de tracking (Plausible, Umami, Fathom) para que la Privacy Policy siga siendo cierta tal cual está.
6. **Idiomas**: la FAQ dice "Sessions run in English or Spanish". Ajustar si no aplica.

## Nota sobre los legales

Los Terms, Refund Policy y Privacy Policy se escribieron desde cero para Kuxait LLC (servicios profesionales de consultoría e implementación de IA, LLC en EE.UU., clientes internacionales, cumplimiento GDPR/CCPA a nivel razonable). Se intentó tomar los templates de luhod.com como pediste, pero el sitio no publica ninguna página legal (ni en el footer, ni en el sitemap, ni en las versiones EN/PT, ni en el portal de clientes). Si Luhod te los pasa como PDF, se pueden cruzar con estos y ajustar. **Conviene que un abogado los revise antes de publicar**, sobre todo la jurisdicción y la limitación de responsabilidad.

## Diseño

- **Dirección**: deliberadamente opuesta a usandolaia.com (que es oscura, con acento amarillo, Familjen Grotesk + Inter). Kuxait es claro, cálido, tipográfico, con un solo color de acento azul ultramar, grotesca expandida (Archivo, eje `wdth`) y monoespaciada (DM Mono) para etiquetas. Secciones oscuras alternadas (`.theme-ink`) para el método, el estándar y el contacto.
- **Hero**: el canvas es la pieza memorable. Partículas que se mueven con ruido (información dispersa), se ordenan en carriles (flujos) por un ciclo automático y también localmente alrededor del puntero, y cuando el orden es alto una parte se ilumina en azul (señal). El readout "Field state" cambia con efecto scramble. Es la tesis del método hecha visual.
- **Interacciones**: smooth scroll (Lenis), reveal de titulares por palabra, párrafo de tesis que se ilumina al scrollear, tracker sticky del método con número gigante y rail de progreso, bento con glow que sigue al puntero, anillos de cadencia que rotan a 4 velocidades y se iluminan al hover, SVGs que se dibujan al entrar, botones magnéticos, cursor custom, grano de película. Todo respeta `prefers-reduced-motion`.
- **Sin personas**: no hay fotos, nombres ni "quiénes somos". La marca habla como organización.

## Tweaks rápidos

- Colores: variables en `:root` de `main.css` (`--paper`, `--ink`, `--signal`).
- Velocidad/densidad del hero: constantes al inicio de `field.js` (`LANE`, `CYCLE`, `POINTER_R`, densidad en `resize()`).
- Copy: todo está en `index.html`, en orden de lectura. Los textos del método también están en `llms.txt` y en el JSON-LD (FAQ): si se cambia una respuesta, actualizar los tres.

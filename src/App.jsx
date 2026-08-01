import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'

function resolveApiUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL

  if (!import.meta.env.PROD) {
    return configuredUrl || 'http://localhost:4000/api'
  }

  if (configuredUrl && configuredUrl.startsWith('/')) {
    return configuredUrl
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`
  }

  return '/api'
}

const API_URL = resolveApiUrl()
const BRAND_LOGO_URL = '/imagenes/logo.png'
const CATALOG_PDF_URL = `${API_URL}/catalog/pdf`
const ADMIN_WHATSAPP_PHONE = '593988062935'

const PRODUCT_IMAGE_BY_CODE = {
  'CAF-ZAR-250G': '/imagenes/Imagen_1.jpeg',
  'CAF-ZAR-500M': '/imagenes/Imagen_2.jpeg',
  'CAF-ZAR-1KG': '/imagenes/Imagen_3.jpeg',
  'CAF-DEC-250G': '/imagenes/Imagen_4.jpeg',
  'PACK-DEG-4': '/imagenes/Imagen_5.jpeg',
  'EL-GEI-01': '/imagenes/Especial_1.jpeg',
  'EL-BOU-01': '/imagenes/Especial_2.jpeg',
  'EL-TYP-01': '/imagenes/Especial_3.jpeg',
  'ACC-COMP-01': '/imagenes/Compresa.jpg',
  'ACC-CAFETERA-01': '/imagenes/Cafetera_Prensa.jpg',
}

const PRODUCT_IMAGE_FALLBACKS = [
  '/imagenes/Imagen_1.jpeg',
  '/imagenes/Imagen_2.jpeg',
  '/imagenes/Imagen_3.jpeg',
  '/imagenes/Imagen_4.jpeg',
  '/imagenes/Imagen_5.jpeg',
  '/imagenes/Imagen_6.jpeg',
  '/imagenes/Especial_1.jpeg',
  '/imagenes/Especial_2.jpeg',
  '/imagenes/Especial_3.jpeg',
  '/imagenes/Compresa.jpg',
  '/imagenes/Cafetera_Prensa.jpg',
]

const SPECIAL_COFFEES = [
  {
    id: 'especial-geisha',
    codigo: 'EL-GEI-01',
    nombre: 'Cafe Geisha Origen El Oro',
    descripcion:
      'Notas florales, dulces y acidez balanceada para una taza suave y elegante.',
    precio: 18.9,
    presentacion: '250 g en grano',
    imagen: '/imagenes/Especial_1.jpeg',
  },
  {
    id: 'especial-bourbon',
    codigo: 'EL-BOU-01',
    nombre: 'Cafe Molido Espresso Bourbon',
    descripcion:
      'Ideal para espresso, moka y prensa francesa, con cuerpo medio y chocolate.',
    precio: 16.5,
    presentacion: '500 g molido',
    imagen: '/imagenes/Especial_2.jpeg',
  },
  {
    id: 'especial-typica',
    codigo: 'EL-TYP-01',
    nombre: 'Reserva Typica de Altura',
    descripcion:
      'Cafe de altura de Zaruma con aroma intenso y final limpio para paladares exigentes.',
    precio: 20.0,
    presentacion: '340 g premium',
    imagen: '/imagenes/Especial_3.jpeg',
  },
]

function getProductImageUrl(product, index) {
  const code = normalizeCode(product?.codigo)
  const name = normalizeText(product?.nombre)
  const category = normalizeText(product?.categoria)

  if (code && PRODUCT_IMAGE_BY_CODE[code]) {
    return PRODUCT_IMAGE_BY_CODE[code]
  }

  // Keep one visual per limited-edition family to avoid repeated wrong photos.
  if (code.startsWith('EL-GEI-') || name.includes('geisha')) {
    return '/imagenes/Especial_1.jpeg'
  }

  if (code.startsWith('EL-BOU-') || name.includes('bourbon')) {
    return '/imagenes/Especial_2.jpeg'
  }

  if (code.startsWith('EL-TYP-') || name.includes('typica')) {
    return '/imagenes/Especial_3.jpeg'
  }

  if (
    category.includes('accesor') ||
    name.includes('compresa') ||
    name.includes('prensa') ||
    name.includes('cafetera')
  ) {
    if (name.includes('compresa') || code.startsWith('ACC-COMP-')) {
      return '/imagenes/Compresa.jpg'
    }

    return '/imagenes/Cafetera_Prensa.jpg'
  }

  return PRODUCT_IMAGE_FALLBACKS[index % PRODUCT_IMAGE_FALLBACKS.length]
}

function normalizeCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getCatalogGroup(product) {
  const code = normalizeCode(product?.codigo)
  const category = normalizeText(product?.categoria)
  const name = normalizeText(product?.nombre)

  if (code.startsWith('EL-')) return 'LIMITADA'

  const isAccessory =
    category.includes('accesor') ||
    name.includes('compresa') ||
    name.includes('prensa') ||
    name.includes('cafetera') ||
    name.includes('moka')

  if (isAccessory) return 'ACCESORIOS'

  return 'ARTESANAL'
}

function getProductDescription(product) {
  const code = normalizeCode(product?.codigo)
  const existingDescription = String(product?.descripcion || '').trim()
  const name = normalizeText(product?.nombre)
  const category = normalizeText(product?.categoria)

  const descriptionByCode = {
    'CAF-ZAR-250G':
      'Cafe en grano de altura con tueste medio, aroma limpio y una taza equilibrada. Ideal para quienes quieren empezar el dia con un perfil suave, dulce y constante.',
    'CAF-ZAR-500M':
      'Cafe molido artesanal con notas de cacao, cuerpo medio y molienda lista para preparaciones rapidas. Mantiene una extraccion estable en cafetera, moka o filtro.',
    'CAF-ZAR-1KG':
      'Seleccion premium de granos de Zaruma pensada para hogares, oficinas o negocios que consumen cafe todos los dias. Ofrece mayor rendimiento sin perder frescura ni aroma.',
    'CAF-DEC-250G':
      'Perfil suave y balanceado para disfrutar cafe en la noche o en momentos de baja cafeina. Conserva sabor agradable, textura limpia y un final ligero.',
    'PACK-DEG-4':
      'Pack degustacion con cuatro presentaciones distintas para comparar sabores, intensidades y aromas. Es una buena opcion para regalo, prueba personal o clientes nuevos.',
    'EL-GEI-01':
      'Cafe Geisha de la zona de El Oro con notas florales, dulzura marcada y acidez balanceada. Es una experiencia delicada, elegante y pensada para paladares exigentes.',
    'EL-BOU-01':
      'Cafe Bourbon molido para espresso, moka y prensa francesa, con cuerpo medio, notas de chocolate y una taza redonda. Funciona bien en preparaciones intensas y aromaticas.',
    'EL-TYP-01':
      'Reserva Typica de altura con aroma intenso, final limpio y una expresion clasica del cafe de Zaruma. Recomendada para quienes buscan una taza refinada y persistente.',
    'ACC-COMP-01':
      'Compresa termica reutilizable para conservar la temperatura de bebidas durante mas tiempo. Practica, ligera y util para servicio, traslado o presentacion de cafe.',
    'ACC-CAFETERA-01':
      'Cafetera tipo prensa francesa de 600 ml para una extraccion manual simple y controlada. Ideal para preparar cafe con mas cuerpo, aroma y presencia en taza.',
  }

  if (descriptionByCode[code]) {
    return descriptionByCode[code]
  }

  if (existingDescription.length >= 90) {
    return existingDescription
  }

  if (code.startsWith('EL-') || name.includes('geisha') || name.includes('bourbon') || name.includes('typica')) {
    return `${existingDescription || 'Cafe especial de perfil premium.'} Pensado para resaltar aroma, dulzor y balance en taza.`
  }

  if (category.includes('accesor')) {
    return `${existingDescription || 'Accesorio para cafe.'} Aporta practicidad y mejora la experiencia diaria de preparacion y servicio.`
  }

  return `${existingDescription || 'Cafe artesanal seleccionado.'} Ideal para disfrutar en casa, compartir o incluir en una preparacion diaria con sabor consistente.`
}

const INITIAL_ADMIN_PRODUCT_FORM = {
  id_categoria: '',
  id_proveedor: '',
  codigo: '',
  nombre: '',
  descripcion: '',
  precio_compra: '',
  precio: '',
  stock: '',
  stock_minimo: '5',
  unidad: 'Bolsa',
  estado: 'ACTIVO',
}

const CATEGORY_ACTION_ADD = '__CATEGORY_ACTION_ADD__'
const CATEGORY_ACTION_EDIT = '__CATEGORY_ACTION_EDIT__'
const CATEGORY_ACTION_DELETE = '__CATEGORY_ACTION_DELETE__'
const MAX_COFFEE_UNITS_PER_ORDER = 6
const CART_STORAGE_KEY = 'cafe_artesanal_cart_v1'
const CART_TTL_MS = 2 * 24 * 60 * 60 * 1000
const REVIEW_SCOPE_PRODUCT = 'PRODUCT'
const REVIEW_SCOPE_APP = 'APP'

function loadCartFromStorage() {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    const savedAt = Number(parsed?.savedAt)
    const items = Array.isArray(parsed?.items) ? parsed.items : []

    if (!savedAt || Date.now() - savedAt > CART_TTL_MS) {
      window.localStorage.removeItem(CART_STORAGE_KEY)
      return []
    }

    return items
  } catch {
    return []
  }
}

function saveCartToStorage(items) {
  if (typeof window === 'undefined') return

  if (!Array.isArray(items) || items.length === 0) {
    window.localStorage.removeItem(CART_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify({
      savedAt: Date.now(),
      items,
    }),
  )
}

function isCoffeeForOrderLimit(product) {
  return getCatalogGroup(product) !== 'ACCESORIOS'
}

function normalizeReviewScope(scope) {
  return String(scope || '').trim().toUpperCase()
}

function summarizeReviews(reviews) {
  const safeReviews = Array.isArray(reviews) ? reviews : []
  const count = safeReviews.length
  const average = count
    ? safeReviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / count
    : 0

  return {
    count,
    average: Number(average.toFixed(1)),
  }
}

function formatReviewDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function ReviewStars({ rating }) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0))
  const fullStars = Math.round(safeRating)

  return <span className="review-stars" aria-label={`Calificacion ${safeRating} de 5`}>{'★'.repeat(fullStars).padEnd(5, '☆')}</span>
}

function RatingPicker({ value, onChange, label }) {
  const selectedValue = Math.max(1, Math.min(5, Number(value) || 5))

  return (
    <div className="review-field">
      <span>{label}</span>
      <div className="rating-picker" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            className={`rating-star-btn ${rating <= selectedValue ? 'active' : ''}`}
            onClick={() => onChange(String(rating))}
            aria-pressed={rating === selectedValue}
            aria-label={`${rating} estrella${rating === 1 ? '' : 's'}`}
          >
            ★
          </button>
        ))}
      </div>
      <p className="rating-picker-label">{selectedValue}/5</p>
    </div>
  )
}

function ReviewThreadList({
  reviews,
  emptyText,
  isAdmin,
  replyDrafts,
  onReplyDraftChange,
  onSubmitReply,
  replyingKey,
}) {
  return (
    <div className="review-list review-list-wide">
      {reviews.map((review) => {
        const reviewId = Number(review.id_review)
        const replyValue = replyDrafts[reviewId] ?? review.reply ?? ''
        const hasReply = String(review.reply || '').trim().length > 0
        const replyKey = `reply-${reviewId}`

        return (
          <article className="review-item" key={review.id_review}>
            <div className="review-item-head">
              <strong>{review.author_name || review.usuario || 'Cliente'}</strong>
              <span>{formatReviewDate(review.created_at)}</span>
            </div>
            <ReviewStars rating={review.rating} />
            {review.comment ? <p>{review.comment}</p> : null}
            {hasReply ? (
              <div className="review-reply-box">
                <p className="review-reply-label">Respuesta</p>
                <p className="review-reply-text">{review.reply}</p>
                <p className="review-reply-meta">
                  {review.reply_author_name || review.reply_usuario || 'Administrador'}
                  {review.reply_at ? ` · ${formatReviewDate(review.reply_at)}` : ''}
                </p>
              </div>
            ) : null}
            {isAdmin ? (
              <div className="review-reply-form">
                <textarea
                  rows="2"
                  placeholder="Responder comentario"
                  value={replyValue}
                  onChange={(event) =>
                    onReplyDraftChange(reviewId, event.target.value)
                  }
                />
                <button
                  className="btn btn-ghost review-submit-btn"
                  type="button"
                  onClick={() => onSubmitReply(reviewId, replyValue)}
                  disabled={replyingKey === replyKey}
                >
                  {replyingKey === replyKey
                    ? 'Enviando...'
                    : hasReply
                      ? 'Actualizar respuesta'
                      : 'Responder'}
                </button>
              </div>
            ) : null}
          </article>
        )
      })}

      {reviews.length === 0 ? <p className="review-empty">{emptyText}</p> : null}
    </div>
  )
}

function PasswordField({ name, value, onChange, placeholder, required = false }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="password-field">
      <input
        type={showPassword ? 'text' : 'password'}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />
      <button
        className="password-toggle-btn"
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-pressed={showPassword}
      >
        {showPassword ? 'Ocultar' : 'Mostrar'}
      </button>
    </div>
  )
}

function PlatformReviewSection({
  isAuthenticated,
  isAdmin,
  reviews,
  summary,
  draft,
  saving,
  onDraftChange,
  onSubmitReview,
  replyDrafts,
  onReplyDraftChange,
  onSubmitReply,
  replyingKey,
}) {
  return (
    <section className="card app-review-card home-review-section">
      <h3>Reseñas de nuestros clientes</h3>
      <p className="review-intro">
        <strong>Comparte tu experiencia con nuestros cafés artesanales.</strong>
      </p>
      <p className="review-intro review-intro-secondary">
        Cuéntanos qué te pareció la calidad del café, el proceso de compra, la entrega y
        nuestro servicio. Tu opinión nos ayuda a seguir ofreciendo una experiencia
        excepcional.
      </p>
      {isAuthenticated ? (
        <div className="product-review-panel">
          <RatingPicker
            label="Tu calificacion"
            value={draft.rating}
            onChange={(rating) => onDraftChange((prev) => ({ ...prev, rating }))}
          />
          <label className="review-field">
            <span>Comentario</span>
            <textarea
              rows="3"
              placeholder="Escribe cómo fue tu experiencia con la plataforma"
              value={draft.comment}
              onChange={(event) => onDraftChange((prev) => ({ ...prev, comment: event.target.value }))}
            />
          </label>
          <button
            className="btn btn-solid review-submit-btn"
            type="button"
            onClick={onSubmitReview}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Enviar comentario general'}
          </button>
        </div>
      ) : (
        <p className="status-text review-login-note">
          Inicia sesion para dejar tu comentario general sobre la plataforma.
        </p>
      )}

      <div className="review-summary-line review-summary-app">
        <ReviewStars rating={summary.average} />
        <span>
          {summary.count > 0
            ? `${summary.average}/5 · ${summary.count} reseñas`
            : 'Aún no hay reseñas'}
        </span>
      </div>

      <ReviewThreadList
        reviews={reviews}
        emptyText="Sé el primero en compartir tu experiencia y ayuda a otros amantes del café a descubrir nuestros productos."
        isAdmin={isAdmin}
        replyDrafts={replyDrafts}
        onReplyDraftChange={onReplyDraftChange}
        onSubmitReply={onSubmitReply}
        replyingKey={replyingKey}
      />
    </section>
  )
}

function countCoffeeUnits(items) {
  return items.reduce((total, item) => {
    if (!isCoffeeForOrderLimit(item)) return total
    return total + (Number(item.cantidad) || 0)
  }, 0)
}

function getPaymentMethodLabel(value) {
  if (value === 'TRANSFERENCIA_BANCARIA') {
    return 'Transferencia bancaria'
  }

  return 'Deposito bancario'
}

function mapProductToAdminForm(product) {
  return {
    id_categoria: String(product.id_categoria || ''),
    id_proveedor: String(product.id_proveedor || ''),
    codigo: product.codigo || '',
    nombre: product.nombre || '',
    descripcion: product.descripcion || '',
    precio_compra: String(product.precio_compra ?? ''),
    precio: String(product.precio ?? ''),
    stock: String(product.stock ?? ''),
    stock_minimo: String(product.stock_minimo ?? '5'),
    unidad: product.unidad || 'Bolsa',
    estado: product.estado || 'ACTIVO',
  }
}

function currency(value) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function formatOrderDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatDeliveryText(formaEntrega, direccionEntrega) {
  if (formaEntrega === 'ENTREGA_DOMICILIO') {
    return `Entrega a domicilio${direccionEntrega ? ` - ${direccionEntrega}` : ''}`
  }

  return 'Retiro en tienda física'
}

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

function WhatsAppButton() {
  const text = encodeURIComponent(
    'Hola, deseo informacion sobre cafe artesanal de Zaruma El Oro.',
  )
  return (
    <a
      className="whatsapp-float"
      href={`https://wa.me/593988062935?text=${text}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Contactar por WhatsApp al 0988062935"
      title="WhatsApp 0988062935"
    >
      WhatsApp
    </a>
  )
}

function Home({
  onPreviewImage,
  isAuthenticated,
  isAdmin,
  appReviews,
  appReviewSummary,
  appReviewDraft,
  appReviewSaving,
  onAppReviewDraftChange,
  onSubmitAppReview,
  replyDrafts,
  onReplyDraftChange,
  onSubmitReply,
  replyingKey,
}) {
  return (
    <>
      <section className="hero-home" id="sobre-nosotros">
        <div className="hero-copy">
          <p className="eyebrow">Cafe artesanal ecuatoriano</p>
          <h1>El mejor cafe, directo de la provincia de El Oro a tu taza</h1>
          <p>
            Un cafe gourmet de edicion especial, inspirado en la historia,
            tradicion y riqueza de Zaruma.
          </p>
          <div className="hero-points">
            <span>100% arabica de origen Zaruma</span>
            <span>Tostado fresco por lotes pequenos</span>
            <span>Ediciones especiales y perfil premium</span>
          </div>
          <div className="hero-cta">
            <a
              className="btn btn-solid"
              href={CATALOG_PDF_URL}
              target="_blank"
              rel="noreferrer"
              download="Catalogo_Coffe_Drink.pdf"
            >
              Descargar catalogo PDF
            </a>
            <Link className="btn btn-ghost" to="/login">
              Iniciar sesion
            </Link>
          </div>
          <div className="hero-metrics">
            <article className="metric">
              <strong>100%</strong>
              <p>Arabica</p>
            </article>
            <article className="metric">
              <strong>Origen</strong>
              <p>Zaruma</p>
            </article>
            <article className="metric">
              <strong>Edicion</strong>
              <p>Especial</p>
            </article>
          </div>
        </div>
      </section>

      <section className="location-section" id="ubicacion">
        <div className="location-copy card">
          <p className="eyebrow">Ubicacion</p>
          <h2>Visitanos en Zaruma, El Oro</h2>
          <p>
            Estamos en Zaruma, una ciudad patrimonial con tradicion cafetera.
            Puedes retirar tu pedido en tienda fisica o coordinar entrega.
          </p>
          <p>
            Referencia: Centro de Zaruma, provincia de El Oro, Ecuador.
          </p>
          <a
            className="btn btn-solid"
            href="https://www.google.com/maps/search/?api=1&query=Zaruma+El+Oro+Ecuador"
            target="_blank"
            rel="noreferrer"
          >
            Abrir en Google Maps
          </a>
        </div>

        <div className="location-map card">
          <iframe
            title="Mapa de Zaruma El Oro"
            src="https://maps.google.com/maps?q=Zaruma%20El%20Oro%20Ecuador&t=&z=15&ie=UTF8&iwloc=&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <section className="specials-section" id="cafes-especiales">
        <div className="specials-heading">
          <p className="eyebrow">Seleccion destacada</p>
          <h2>Cafes especiales con perfil premium</h2>
          <p>
            Elige entre nuestras ediciones favoritas con tueste fresco, notas
            aromaticas definidas y presentaciones listas para regalar o disfrutar.
          </p>
        </div>
        <div className="specials-grid">
          {SPECIAL_COFFEES.map((coffee) => (
            <article className="special-card" key={coffee.id}>
              <button
                type="button"
                className="special-image-btn"
                onClick={() =>
                  onPreviewImage({
                    src: coffee.imagen,
                    alt: coffee.nombre,
                  })
                }
                aria-label={`Ver imagen de ${coffee.nombre}`}
              >
                <img
                  src={coffee.imagen}
                  alt={coffee.nombre}
                  className="special-image"
                  loading="lazy"
                />
              </button>
              <div className="special-copy">
                <p className="special-label">{coffee.presentacion}</p>
                <h3>{coffee.nombre}</h3>
                <p>{coffee.descripcion}</p>
                <div className="special-foot">
                  <strong>{currency(coffee.precio)}</strong>
                  <Link
                    className="btn btn-solid"
                    to={`/catalogo?destacado=${encodeURIComponent(coffee.codigo)}`}
                  >
                    Edicion limitada
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <PlatformReviewSection
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        reviews={appReviews}
        summary={appReviewSummary}
        draft={appReviewDraft}
        saving={appReviewSaving}
        onDraftChange={onAppReviewDraftChange}
        onSubmitReview={onSubmitAppReview}
        replyDrafts={replyDrafts}
        onReplyDraftChange={onReplyDraftChange}
        onSubmitReply={onSubmitReply}
        replyingKey={replyingKey}
      />
    </>
  )
}

function Login({ onLogin, onNotify }) {
  const [form, setForm] = useState({ usuario: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No fue posible iniciar sesion')
      }
      onLogin(data)
      onNotify(`Bienvenido, ${data.user?.usuario || 'cliente'}. Sesion iniciada.`)
      navigate('/catalogo')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card auth-card">
      <h2>Iniciar sesion</h2>
      <form onSubmit={onSubmit} className="form-grid">
        <input
          name="usuario"
          placeholder="Usuario"
          value={form.usuario}
          onChange={onChange}
          required
        />
        <PasswordField
          name="password"
          placeholder="Contrasena"
          value={form.password}
          onChange={onChange}
          required
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="btn btn-solid" type="submit" disabled={loading}>
          {loading ? 'Validando...' : 'Entrar'}
        </button>
      </form>
      <p className="auth-helper">
        No tienes cuenta? <Link to="/registro">Registrate aqui</Link>
      </p>
    </section>
  )
}

function Register({ onRegister, onNotify }) {
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    telefono: '',
    correo: '',
    direccion: '',
    usuario: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No fue posible crear la cuenta')
      }
      onRegister(data)
      onNotify('Cuenta creada correctamente. Ya puedes comprar en el catalogo.')
      navigate('/catalogo')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card auth-card">
      <h2>Crear cuenta para ver el catalogo</h2>
      <form onSubmit={onSubmit} className="form-grid two-cols">
        <input
          name="nombres"
          placeholder="Nombres"
          value={form.nombres}
          onChange={onChange}
          required
        />
        <input
          name="apellidos"
          placeholder="Apellidos"
          value={form.apellidos}
          onChange={onChange}
          required
        />
        <input
          name="telefono"
          placeholder="Telefono"
          value={form.telefono}
          onChange={onChange}
        />
        <input
          type="email"
          name="correo"
          placeholder="Correo"
          value={form.correo}
          onChange={onChange}
          required
        />
        <input
          name="direccion"
          placeholder="Direccion"
          value={form.direccion}
          onChange={onChange}
        />
        <input
          name="usuario"
          placeholder="Usuario"
          value={form.usuario}
          onChange={onChange}
          required
        />
        <PasswordField
          name="password"
          placeholder="Contrasena (minimo 8 caracteres)"
          value={form.password}
          onChange={onChange}
          required
        />
        {error ? <p className="error-text span-all">{error}</p> : null}
        <button
          className="btn btn-solid span-all"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creando cuenta...' : 'Registrarme'}
        </button>
      </form>
    </section>
  )
}

function Catalog({ token, user, cartItems, onAddToCart, onNotify, onPreviewImage }) {
  const location = useLocation()
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [reviewDrafts, setReviewDrafts] = useState({})
  const [reviewSavingKey, setReviewSavingKey] = useState('')
  const [reviewReplyDrafts, setReviewReplyDrafts] = useState({})
  const [reviewReplySavingKey, setReviewReplySavingKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [adminMeta, setAdminMeta] = useState({ categorias: [], proveedores: [] })
  const [adminForm, setAdminForm] = useState(INITIAL_ADMIN_PRODUCT_FORM)
  const [editingProductId, setEditingProductId] = useState(null)
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminDeletingId, setAdminDeletingId] = useState(null)
  const [adminMessage, setAdminMessage] = useState('')
  const [catalogFilter, setCatalogFilter] = useState('TODOS')
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('TODAS')
  const [categoryAction, setCategoryAction] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryTargetId, setCategoryTargetId] = useState('')
  const [categoryEditName, setCategoryEditName] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)
  const adminFormRef = useRef(null)

  const isAdmin = String(user?.rol || '').trim().toLowerCase() === 'administrador'
  const featuredCode = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('destacado') || ''
  }, [location.search])

  const featuredCodeNormalized = useMemo(
    () => normalizeCode(featuredCode),
    [featuredCode],
  )

  const visibleCatalogBase = useMemo(() => {
    // Admin can edit from the panel, but public catalog cards should show sellable items.
    if (!isAdmin) return products
    return products.filter(
      (product) =>
        String(product.estado || '').toUpperCase() === 'ACTIVO' &&
        Number(product.stock) > 0,
    )
  }, [products, isAdmin])

  const hasFeaturedMatchVisible = useMemo(
    () =>
      featuredCodeNormalized
        ? visibleCatalogBase.some(
            (product) => normalizeCode(product.codigo) === featuredCodeNormalized,
          )
        : false,
    [visibleCatalogBase, featuredCodeNormalized],
  )

  const filterCounts = useMemo(() => {
    const counts = {
      TODOS: visibleCatalogBase.length,
      ARTESANAL: 0,
      LIMITADA: 0,
      ACCESORIOS: 0,
    }

    for (const product of visibleCatalogBase) {
      counts[getCatalogGroup(product)] += 1
    }

    return counts
  }, [visibleCatalogBase])

  const visibleProducts = useMemo(() => {
    if (catalogFilter === 'TODOS') return visibleCatalogBase
    return visibleCatalogBase.filter(
      (product) => getCatalogGroup(product) === catalogFilter,
    )
  }, [visibleCatalogBase, catalogFilter])

  const adminCategoryFilterValue = useMemo(() => {
    if (adminCategoryFilter === 'TODAS') return 'TODAS'
    const exists = adminMeta.categorias.some(
      (categoria) => String(categoria.id_categoria) === String(adminCategoryFilter),
    )
    return exists ? adminCategoryFilter : 'TODAS'
  }, [adminMeta.categorias, adminCategoryFilter])

  const categoryTargetIdValue = useMemo(() => {
    const exists = adminMeta.categorias.some(
      (categoria) => String(categoria.id_categoria) === String(categoryTargetId),
    )
    return exists ? categoryTargetId : ''
  }, [adminMeta.categorias, categoryTargetId])

  const visibleProductsByAdminCategory = useMemo(() => {
    if (!isAdmin || adminCategoryFilterValue === 'TODAS') return visibleProducts

    return visibleProducts.filter(
      (product) => String(product.id_categoria) === String(adminCategoryFilterValue),
    )
  }, [isAdmin, visibleProducts, adminCategoryFilterValue])

  const cartQuantityByProductId = useMemo(() => {
    const map = new Map()
    for (const item of cartItems) {
      map.set(item.id_producto, Number(item.cantidad) || 0)
    }
    return map
  }, [cartItems])

  const productReviewsById = useMemo(() => {
    const map = new Map()

    for (const review of reviews) {
      if (normalizeReviewScope(review.scope) !== REVIEW_SCOPE_PRODUCT) continue

      const idProducto = Number(review.id_producto)
      if (!idProducto) continue

      if (!map.has(idProducto)) {
        map.set(idProducto, [])
      }

      map.get(idProducto).push(review)
    }

    return map
  }, [reviews])

  const reviewSummaryByProductId = useMemo(() => {
    const map = new Map()

    for (const product of products) {
      const itemReviews = productReviewsById.get(Number(product.id_producto)) || []
      map.set(Number(product.id_producto), summarizeReviews(itemReviews))
    }

    return map
  }, [products, productReviewsById])

  const loadProducts = useCallback(async () => {
    const response = await fetch(`${API_URL}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'No se pudo cargar el catalogo')
    }
    setProducts(data.products)
  }, [token])

  const loadAdminMeta = useCallback(async () => {
    if (!isAdmin) return

    const metaResponse = await fetch(`${API_URL}/products/meta`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const metaData = await metaResponse.json()
    if (!metaResponse.ok) {
      throw new Error(metaData.message || 'No se pudo cargar categorias y proveedores')
    }

    setAdminMeta({
      categorias: metaData.categorias || [],
      proveedores: metaData.proveedores || [],
    })
  }, [isAdmin, token])

  const loadReviews = useCallback(async () => {
    const response = await fetch(`${API_URL}/reviews`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'No se pudieron cargar las reseñas')
    }

    const productReviews = Array.isArray(data.reviews)
      ? data.reviews.filter(
          (review) => normalizeReviewScope(review.scope) === REVIEW_SCOPE_PRODUCT,
        )
      : []

    setReviews(productReviews)
  }, [token])

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        await loadProducts()
        await loadReviews()

        if (isAdmin) {
          await loadAdminMeta()
        }
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token, isAdmin, loadProducts, loadAdminMeta, loadReviews])

  const onAdminChange = (event) => {
    const { name, value } = event.target

    if (name === 'id_categoria') {
      if (
        value === CATEGORY_ACTION_ADD ||
        value === CATEGORY_ACTION_EDIT ||
        value === CATEGORY_ACTION_DELETE
      ) {
        setCategoryAction(value)

        if (!categoryTargetIdValue && adminMeta.categorias.length > 0) {
          const firstCategory = adminMeta.categorias[0]
          setCategoryTargetId(String(firstCategory.id_categoria))
          setCategoryEditName(firstCategory.nombre)
        }

        setAdminForm((prev) => ({ ...prev, id_categoria: '' }))
        return
      }

      setCategoryAction('')
    }

    setAdminForm((prev) => ({ ...prev, [name]: value }))
  }

  const resetAdminForm = () => {
    setAdminForm(INITIAL_ADMIN_PRODUCT_FORM)
    setEditingProductId(null)
  }

  const startEditing = (product) => {
    setAdminForm(mapProductToAdminForm(product))
    setEditingProductId(product.id_producto)
    setAdminMessage('')

    window.requestAnimationFrame(() => {
      if (adminFormRef.current) {
        adminFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }

  const onAdminSubmit = async (event) => {
    event.preventDefault()
    setAdminMessage('')
    setAdminSaving(true)

    const endpoint = editingProductId
      ? `${API_URL}/products/${editingProductId}`
      : `${API_URL}/products`
    const method = editingProductId ? 'PUT' : 'POST'

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(adminForm),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar el producto')
      }

      setAdminMessage(data.message || 'Producto guardado correctamente')
      onNotify(data.message || 'Producto guardado correctamente.')
      resetAdminForm()
      await loadProducts()
    } catch (requestError) {
      setAdminMessage(requestError.message)
      onNotify(requestError.message)
    } finally {
      setAdminSaving(false)
    }
  }

  const deleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Eliminar producto ${product.nombre} (${product.codigo})? Esta accion no se puede deshacer.`,
    )
    if (!confirmed) return

    setAdminMessage('')
    setAdminDeletingId(product.id_producto)

    try {
      const response = await fetch(`${API_URL}/products/${product.id_producto}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo eliminar el producto')
      }

      if (editingProductId === product.id_producto) {
        resetAdminForm()
      }

      setAdminMessage(data.message || 'Producto eliminado correctamente')
      onNotify(data.message || 'Producto eliminado correctamente.')
      await loadProducts()
    } catch (requestError) {
      setAdminMessage(requestError.message)
      onNotify(requestError.message)
    } finally {
      setAdminDeletingId(null)
    }
  }

  const createCategory = async () => {
    const nombre = newCategoryName.trim()
    if (!nombre) {
      onNotify('Ingresa un nombre para la nueva categoria.')
      return
    }

    setCategorySaving(true)
    try {
      const response = await fetch(`${API_URL}/products/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo crear la categoria')
      }

      onNotify(data.message || 'Categoria creada correctamente.')
      setNewCategoryName('')
      await loadAdminMeta()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setCategorySaving(false)
    }
  }

  const removeCategory = async () => {
    if (!categoryTargetIdValue) {
      onNotify('Selecciona una categoria para eliminar.')
      return
    }

    const selected = adminMeta.categorias.find(
      (categoria) => String(categoria.id_categoria) === String(categoryTargetIdValue),
    )

    const confirmed = window.confirm(
      `Eliminar categoria ${selected?.nombre || ''}? Esta accion no se puede deshacer.`,
    )
    if (!confirmed) return

    setCategorySaving(true)
    try {
      const response = await fetch(
        `${API_URL}/products/categories/${categoryTargetIdValue}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo eliminar la categoria')
      }

      onNotify(data.message || 'Categoria eliminada correctamente.')
      setCategoryTargetId('')
      setCategoryEditName('')
      await loadAdminMeta()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setCategorySaving(false)
    }
  }

  const updateCategory = async () => {
    const nombre = categoryEditName.trim()
    if (!categoryTargetIdValue) {
      onNotify('Selecciona una categoria para editar.')
      return
    }

    if (!nombre) {
      onNotify('Ingresa el nuevo nombre de la categoria.')
      return
    }

    setCategorySaving(true)
    try {
      const response = await fetch(
        `${API_URL}/products/categories/${categoryTargetIdValue}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ nombre }),
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo actualizar la categoria')
      }

      onNotify(data.message || 'Categoria actualizada correctamente.')
      await loadAdminMeta()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setCategorySaving(false)
    }
  }

  const onCategoryTargetChange = (value) => {
    setCategoryTargetId(value)
    const selected = adminMeta.categorias.find(
      (categoria) => String(categoria.id_categoria) === String(value),
    )
    setCategoryEditName(selected?.nombre || '')
  }

  const handleAddToCart = (product) => {
    const stockActual = Number(product.stock) || 0
    const cantidadEnCarrito = cartQuantityByProductId.get(product.id_producto) || 0
    const restante = Math.max(stockActual - cantidadEnCarrito, 0)

    if (restante <= 0) {
      onNotify(`Ya no hay stock disponible para ${product.nombre}.`)
      return
    }

    onAddToCart(product)
    const nuevoRestante = Math.max(restante - 1, 0)
    onNotify(`${product.nombre} se registro en el carrito. Quedan ${nuevoRestante}.`)
  }

  const updateProductReviewDraft = (productId, field, value) => {
    setReviewDrafts((prev) => ({
      ...prev,
      [productId]: {
        rating: '5',
        comment: '',
        ...(prev[productId] || {}),
        [field]: value,
      },
    }))
  }

  const submitReview = async ({ scope, idProducto = null, draft, key }) => {
    const rating = Number(draft?.rating)

    if (!rating || rating < 1 || rating > 5) {
      onNotify('Selecciona una calificacion entre 1 y 5.')
      return
    }

    setReviewSavingKey(key)

    try {
      const response = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scope,
          id_producto: idProducto,
          rating,
          comment: '',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar la reseña')
      }

      onNotify(data.message || 'Reseña guardada correctamente.')
      if (scope === REVIEW_SCOPE_PRODUCT && idProducto) {
        setReviewDrafts((prev) => ({
          ...prev,
          [idProducto]: { rating: '5', comment: '' },
        }))
      }

      await loadReviews()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setReviewSavingKey('')
    }
  }

  const submitReviewReply = async (idReview, reply) => {
    const replyText = String(reply || '').trim()

    if (!replyText) {
      onNotify('Escribe una respuesta.')
      return
    }

    const replyKey = `reply-${idReview}`
    setReviewReplySavingKey(replyKey)

    try {
      const response = await fetch(`${API_URL}/reviews/${idReview}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reply: replyText }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar la respuesta')
      }

      onNotify(data.message || 'Respuesta guardada correctamente.')
      setReviewReplyDrafts((prev) => ({ ...prev, [idReview]: replyText }))
      await loadReviews()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setReviewReplySavingKey('')
    }
  }

  if (loading) {
    return <p className="status-text">Cargando catalogo...</p>
  }

  if (error) {
    return <p className="error-text">{error}</p>
  }

  if (products.length === 0) {
    return (
      <section>
        <p className="status-text">
          No hay productos disponibles. Carga productos en la base de datos para
          empezar.
        </p>
        {featuredCode ? (
          <p className="status-text featured-banner-warning">
            El cafe destacado <strong>{featuredCode}</strong> no esta disponible por
            ahora. Prueba con otro producto cuando el catalogo tenga stock.
          </p>
        ) : null}
      </section>
    )
  }

  return (
    <section>
      <h2>Catalogo de cafe artesanal</h2>
      {featuredCode ? (
        <p className="status-text featured-banner">
          Edicion limitada seleccionada: <strong>{featuredCode}</strong>. Agregala al
          carrito para continuar con tu pedido.
        </p>
      ) : null}
      {featuredCode && !hasFeaturedMatchVisible ? (
        <p className="status-text featured-banner-warning">
          No encontramos ese codigo exacto en catalogo. Te mostramos los cafes
          disponibles para que elijas y compres.
        </p>
      ) : null}
      <div className="catalog-menu" role="tablist" aria-label="Filtros de catalogo">
        <button
          className={`catalog-menu-btn ${catalogFilter === 'TODOS' ? 'active' : ''}`}
          type="button"
          onClick={() => setCatalogFilter('TODOS')}
        >
          Todos ({filterCounts.TODOS})
        </button>
        <button
          className={`catalog-menu-btn ${catalogFilter === 'ARTESANAL' ? 'active' : ''}`}
          type="button"
          onClick={() => setCatalogFilter('ARTESANAL')}
        >
          Cafes artesanales ({filterCounts.ARTESANAL})
        </button>
        <button
          className={`catalog-menu-btn ${catalogFilter === 'LIMITADA' ? 'active' : ''}`}
          type="button"
          onClick={() => setCatalogFilter('LIMITADA')}
        >
          <span className="menu-btn-media" aria-hidden="true">
            <img src="/imagenes/Especial_1.jpeg" alt="" className="menu-btn-thumb" />
          </span>
          <span>Ediciones limitadas ({filterCounts.LIMITADA})</span>
        </button>
        <button
          className={`catalog-menu-btn ${catalogFilter === 'ACCESORIOS' ? 'active' : ''}`}
          type="button"
          onClick={() => setCatalogFilter('ACCESORIOS')}
        >
          <span className="menu-btn-media" aria-hidden="true">
            <img src="/imagenes/Compresa.jpg" alt="" className="menu-btn-thumb" />
            <img src="/imagenes/Cafetera_Prensa.jpg" alt="" className="menu-btn-thumb" />
          </span>
          <span>Accesorios ({filterCounts.ACCESORIOS})</span>
        </button>
      </div>

      {isAdmin ? (
        <>
          <section className="card admin-panel">
            <h3>{editingProductId ? 'Editar producto' : 'Agregar nuevo producto'}</h3>
            {!editingProductId ? (
              <p className="status-text admin-status">
                Si ingresas un codigo existente, el sistema sumara el stock al
                inventario automaticamente.
              </p>
            ) : null}
            <div className="admin-category-toolbar">
              <label htmlFor="admin-category-filter">Categoria para actualizar:</label>
              <select
                id="admin-category-filter"
                value={adminCategoryFilterValue}
                onChange={(event) => setAdminCategoryFilter(event.target.value)}
              >
                <option value="TODAS">Todas las categorias</option>
                {adminMeta.categorias.map((categoria) => (
                  <option key={categoria.id_categoria} value={categoria.id_categoria}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>
            <form
              ref={adminFormRef}
              className="form-grid two-cols"
              onSubmit={onAdminSubmit}
            >
            <select
              name="id_categoria"
              value={adminForm.id_categoria}
              onChange={onAdminChange}
              required
            >
              <option value="">Categoria</option>
              {adminMeta.categorias.map((categoria) => (
                <option key={categoria.id_categoria} value={categoria.id_categoria}>
                  {categoria.nombre}
                </option>
              ))}
              <option value="" disabled>
                -------- Gestion de categorias --------
              </option>
              <option value={CATEGORY_ACTION_ADD}>Registrar categoria...</option>
              <option value={CATEGORY_ACTION_EDIT}>Editar categoria...</option>
              <option value={CATEGORY_ACTION_DELETE}>Eliminar categoria...</option>
            </select>

            {categoryAction ? (
              <div className="span-all category-inline-panel">
                {categoryAction === CATEGORY_ACTION_ADD ? (
                  <>
                    <h4>Registrar categoria</h4>
                    <div className="category-inline-actions">
                      <input
                        type="text"
                        placeholder="Nombre de categoria"
                        value={newCategoryName}
                        onChange={(event) => setNewCategoryName(event.target.value)}
                      />
                      <button
                        className="btn btn-solid"
                        type="button"
                        onClick={createCategory}
                        disabled={categorySaving}
                      >
                        Guardar categoria
                      </button>
                    </div>
                  </>
                ) : null}

                {categoryAction === CATEGORY_ACTION_EDIT ? (
                  <>
                    <h4>Editar categoria</h4>
                    <div className="category-inline-actions">
                      <select
                        value={categoryTargetIdValue}
                        onChange={(event) => onCategoryTargetChange(event.target.value)}
                      >
                        <option value="">Selecciona una categoria</option>
                        {adminMeta.categorias.map((categoria) => (
                          <option
                            key={categoria.id_categoria}
                            value={categoria.id_categoria}
                          >
                            {categoria.nombre}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Nuevo nombre"
                        value={categoryEditName}
                        onChange={(event) => setCategoryEditName(event.target.value)}
                      />
                      <button
                        className="btn btn-solid"
                        type="button"
                        onClick={updateCategory}
                        disabled={categorySaving}
                      >
                        Actualizar categoria
                      </button>
                    </div>
                  </>
                ) : null}

                {categoryAction === CATEGORY_ACTION_DELETE ? (
                  <>
                    <h4>Eliminar categoria</h4>
                    <div className="category-inline-actions">
                      <select
                        value={categoryTargetIdValue}
                        onChange={(event) => onCategoryTargetChange(event.target.value)}
                      >
                        <option value="">Selecciona una categoria</option>
                        {adminMeta.categorias.map((categoria) => (
                          <option
                            key={categoria.id_categoria}
                            value={categoria.id_categoria}
                          >
                            {categoria.nombre}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-danger"
                        type="button"
                        onClick={removeCategory}
                        disabled={categorySaving}
                      >
                        Eliminar categoria
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            <select
              name="id_proveedor"
              value={adminForm.id_proveedor}
              onChange={onAdminChange}
              required
            >
              <option value="">Proveedor</option>
              {adminMeta.proveedores.map((proveedor) => (
                <option key={proveedor.id_proveedor} value={proveedor.id_proveedor}>
                  {proveedor.empresa}
                </option>
              ))}
            </select>

            <input
              name="codigo"
              placeholder="Codigo"
              value={adminForm.codigo}
              onChange={onAdminChange}
              required
            />
            <input
              name="nombre"
              placeholder="Nombre"
              value={adminForm.nombre}
              onChange={onAdminChange}
              required
            />
            <input
              name="precio_compra"
              type="number"
              step="0.01"
              min="0"
              placeholder="Precio compra"
              value={adminForm.precio_compra}
              onChange={onAdminChange}
              required
            />
            <input
              name="precio"
              type="number"
              step="0.01"
              min="0"
              placeholder="Precio venta"
              value={adminForm.precio}
              onChange={onAdminChange}
              required
            />
            <input
              name="stock"
              type="number"
              min="0"
              placeholder="Stock"
              value={adminForm.stock}
              onChange={onAdminChange}
              required
            />
            <input
              name="stock_minimo"
              type="number"
              min="0"
              placeholder="Stock minimo"
              value={adminForm.stock_minimo}
              onChange={onAdminChange}
              required
            />
            <input
              name="unidad"
              placeholder="Unidad"
              value={adminForm.unidad}
              onChange={onAdminChange}
            />
            <select name="estado" value={adminForm.estado} onChange={onAdminChange}>
              <option value="ACTIVO">ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
            </select>
            <input
              className="span-all"
              name="descripcion"
              placeholder="Descripcion"
              value={adminForm.descripcion}
              onChange={onAdminChange}
            />

            {adminMessage ? (
              <p className="span-all status-text admin-status">{adminMessage}</p>
            ) : null}

              <button className="btn btn-solid" type="submit" disabled={adminSaving}>
                {adminSaving
                  ? 'Guardando...'
                  : editingProductId
                    ? 'Actualizar producto'
                    : 'Agregar al inventario'}
              </button>
              {editingProductId ? (
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={resetAdminForm}
                >
                  Cancelar edicion
                </button>
              ) : null}
            </form>
          </section>
        </>
      ) : null}

      {visibleProductsByAdminCategory.length === 0 ? (
        <p className="status-text">No hay productos disponibles en esta seccion.</p>
      ) : null}

      <div className="product-grid">
        {visibleProductsByAdminCategory.map((product, index) => {
          const stockActual = Number(product.stock) || 0
          const cantidadEnCarrito =
            cartQuantityByProductId.get(product.id_producto) || 0
          const stockRestante = Math.max(stockActual - cantidadEnCarrito, 0)
          const esLimitada = getCatalogGroup(product) === 'LIMITADA'
          const esCafe = ['ARTESANAL', 'LIMITADA'].includes(getCatalogGroup(product))
          const productImageUrl = getProductImageUrl(product, index)
          const productReviewSummary = reviewSummaryByProductId.get(Number(product.id_producto)) || {
            count: 0,
            average: 0,
          }
          const productReviews = productReviewsById.get(Number(product.id_producto)) || []
          const currentDraft = reviewDrafts[product.id_producto] || {
            rating: '5',
            comment: '',
          }

          return (
          <article
            key={product.id_producto}
            className={`card product-card ${
              featuredCodeNormalized &&
              normalizeCode(product.codigo) === featuredCodeNormalized
                ? 'product-card-featured'
                : ''
            }`}
          >
            <button
              type="button"
              className="image-zoom-btn"
              onClick={() =>
                onPreviewImage({
                  src: productImageUrl,
                  alt: product.nombre,
                })
              }
              aria-label={`Ver imagen de ${product.nombre}`}
            >
              <img
                src={productImageUrl}
                alt={product.nombre}
                className="product-image"
                loading="lazy"
              />
            </button>
            {featuredCodeNormalized &&
            normalizeCode(product.codigo) === featuredCodeNormalized ? (
              <p className="limited-badge">Edicion limitada</p>
            ) : null}
            <p className="category-tag">{product.categoria}</p>
            <h3>{product.nombre}</h3>
            <p>{getProductDescription(product)}</p>
            <div className="review-summary-block">
              <div className="review-summary-line">
                <ReviewStars rating={productReviewSummary.average} />
                <span>
                  {productReviewSummary.count > 0
                    ? `${productReviewSummary.average}/5 · ${productReviewSummary.count} reseñas`
                    : 'Sin reseñas aun'}
                </span>
              </div>
            </div>
            <p className={`stock-text ${stockActual === 0 ? 'stock-empty' : ''}`}>
              {esLimitada ? 'Edicion limitada' : 'Disponibilidad'}: stock{' '}
              <strong>{stockActual}</strong>
            </p>
            <div className="product-review-panel">
              <RatingPicker
                label="Tu calificacion"
                value={currentDraft.rating}
                onChange={(rating) =>
                  updateProductReviewDraft(product.id_producto, 'rating', rating)
                }
              />
              <button
                className="btn btn-ghost review-submit-btn"
                type="button"
                onClick={() =>
                  submitReview({
                    scope: REVIEW_SCOPE_PRODUCT,
                    idProducto: product.id_producto,
                    draft: currentDraft,
                    key: `product-${product.id_producto}`,
                  })
                }
                disabled={reviewSavingKey === `product-${product.id_producto}`}
              >
                {reviewSavingKey === `product-${product.id_producto}`
                  ? 'Guardando...'
                  : 'Enviar reseña'}
              </button>
              <ReviewThreadList
                reviews={productReviews}
                emptyText="Aun no hay reseñas para este producto."
                isAdmin={isAdmin}
                replyDrafts={reviewReplyDrafts}
                onReplyDraftChange={(reviewId, value) =>
                  setReviewReplyDrafts((prev) => ({ ...prev, [reviewId]: value }))
                }
                onSubmitReply={submitReviewReply}
                replyingKey={reviewReplySavingKey}
              />
            </div>
            <div className="product-foot">
              <strong>{currency(Number(product.precio))}</strong>
              <div className="product-actions">
                {!isAdmin ? (
                  <button
                    className="btn btn-solid"
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    disabled={stockRestante === 0}
                  >
                    {stockRestante === 0 ? 'Sin stock' : 'Agregar'}
                  </button>
                ) : null}
                {isAdmin && esCafe ? (
                  <>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => startEditing(product)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() => deleteProduct(product)}
                      disabled={adminDeletingId === product.id_producto}
                    >
                      {adminDeletingId === product.id_producto
                        ? 'Eliminando...'
                        : 'Eliminar'}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </article>
          )
        })}
      </div>

    </section>
  )
}

function Cart({ cartItems, onChangeQuantity, onRemove }) {
  const navigate = useNavigate()
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + Number(item.precio) * Number(item.cantidad),
        0,
      ),
    [cartItems],
  )
  const coffeeUnits = useMemo(() => countCoffeeUnits(cartItems), [cartItems])

  if (cartItems.length === 0) {
    return <p className="status-text">Tu carrito esta vacio.</p>
  }

  return (
    <section className="card">
      <h2>Carrito de compras</h2>
      <p className="status-text">
        Cafes en pedido: <strong>{coffeeUnits}</strong>/{MAX_COFFEE_UNITS_PER_ORDER}
      </p>
      {cartItems.map((item) => (
        <div key={item.id_producto} className="cart-row">
          <div>
            <h3>{item.nombre}</h3>
            <p>{currency(Number(item.precio))}</p>
          </div>
          <input
            type="number"
            min="1"
            value={item.cantidad}
            onChange={(event) =>
              onChangeQuantity(item.id_producto, Number(event.target.value))
            }
          />
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => onRemove(item.id_producto)}
          >
            Quitar
          </button>
        </div>
      ))}
      <div className="summary-line">
        <strong>Total: {currency(subtotal)}</strong>
        <button className="btn btn-solid" onClick={() => navigate('/pago')}>
          Continuar a pago
        </button>
      </div>
    </section>
  )
}

function AdminPendingOrders({ token, onNotify }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingOrderId, setProcessingOrderId] = useState(null)

  const groupedOrders = useMemo(() => {
    const groups = {
      PENDIENTE: [],
      PAGADA: [],
      ANULADA: [],
    }

    for (const order of orders) {
      const status = String(order.estado || '').toUpperCase()
      if (groups[status]) {
        groups[status].push(order)
      }
    }

    return groups
  }, [orders])

  const statusSections = useMemo(
    () => [
      {
        key: 'PENDIENTE',
        title: 'En espera',
      },
      {
        key: 'PAGADA',
        title: 'Vendidos',
      },
      {
        key: 'ANULADA',
        title: 'Cancelados',
      },
    ],
    [],
  )

  const loadAdminOrders = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/orders/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo cargar pedidos del administrador')
      }
      setOrders(data.orders || [])
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [token, onNotify])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadAdminOrders()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [loadAdminOrders])

  const processOrder = async (idVenta, action) => {
    const actionName = action === 'approve' ? 'aprobar' : 'rechazar'
    const confirmed = window.confirm(
      `Deseas ${actionName} el pedido #${idVenta}?`,
    )
    if (!confirmed) return

    setProcessingOrderId(idVenta)
    try {
      const response = await fetch(`${API_URL}/orders/admin/${idVenta}/${action}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || `No se pudo ${actionName} el pedido`)
      }

      onNotify(data.message || `Pedido #${idVenta} procesado correctamente.`)
      await loadAdminOrders()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setProcessingOrderId(null)
    }
  }

  return (
    <section className="card admin-orders-panel">
      <div className="admin-orders-head">
        <h3>Pedidos del administrador por categoria</h3>
        <button className="btn btn-ghost" type="button" onClick={loadAdminOrders}>
          Recargar
        </button>
      </div>

      {loading ? <p className="status-text">Cargando pedidos...</p> : null}

      {!loading && orders.length === 0 ? (
        <p className="status-text">No hay pedidos registrados todavia.</p>
      ) : null}

      {!loading && orders.length > 0 ? (
        <div className="admin-order-sections">
          {statusSections.map((section) => {
            const sectionOrders = groupedOrders[section.key] || []
            return (
              <div key={section.key} className="admin-order-section">
                <div className="admin-order-section-head">
                  <h4>{section.title}</h4>
                  <span>{sectionOrders.length}</span>
                </div>

                {sectionOrders.length === 0 ? (
                  <p className="status-text">No hay pedidos en esta categoria.</p>
                ) : (
                  <div className="admin-order-list">
                    {sectionOrders.map((order) => (
                      <article key={order.id_venta} className="admin-order-card">
                        <div className="admin-order-title">
                          <strong>Pedido #{order.id_venta}</strong>
                          <span>{formatOrderDate(order.fecha)}</span>
                        </div>

                        <p>
                          Cliente: <strong>{order.cliente?.nombres} {order.cliente?.apellidos}</strong>
                        </p>
                        <p>Telefono: {order.cliente?.telefono || 'No registrado'}</p>
                        <p>Correo: {order.cliente?.correo || 'No registrado'}</p>
                        <p>Referencia deposito: {order.referencia_deposito || '-'}</p>
                        <p>{formatDeliveryText(order.forma_entrega, order.direccion_entrega)}</p>
                        <p>Total: {currency(Number(order.total) || 0)}</p>

                        <div className="admin-order-items">
                          <p>Items:</p>
                          <ul>
                            {(order.items || []).map((item) => (
                              <li key={`${order.id_venta}-${item.id_producto}`}>
                                {item.nombre_producto || `Producto #${item.id_producto}`} ({item.categoria_producto || 'Sin categoria'}) - Cantidad: {item.cantidad}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {section.key === 'PENDIENTE' ? (
                          <div className="admin-order-actions">
                            <button
                              className="btn btn-solid"
                              type="button"
                              disabled={processingOrderId === order.id_venta}
                              onClick={() => processOrder(order.id_venta, 'approve')}
                            >
                              {processingOrderId === order.id_venta
                                ? 'Procesando...'
                                : 'Aceptar y descontar stock'}
                            </button>
                            <button
                              className="btn btn-danger"
                              type="button"
                              disabled={processingOrderId === order.id_venta}
                              onClick={() => processOrder(order.id_venta, 'reject')}
                            >
                              Rechazar pedido
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

function Checkout({ token, user, cartItems, onOrderComplete, onNotify }) {
  const navigate = useNavigate()
  const proofImageInputRef = useRef(null)
  const [paymentMethod, setPaymentMethod] = useState('DEPOSITO_BANCARIO')
  const [proofImageName, setProofImageName] = useState('')
  const [formaEntrega, setFormaEntrega] = useState('RETIRO_TIENDA')
  const [direccionEntrega, setDireccionEntrega] = useState('')
  const [proofSent, setProofSent] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)
  const [lastPaymentMethod, setLastPaymentMethod] = useState('DEPOSITO_BANCARIO')
  const [lastDeliveryMethod, setLastDeliveryMethod] = useState('RETIRO_TIENDA')
  const [lastDeliveryAddress, setLastDeliveryAddress] = useState('')

  const total = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + Number(item.precio) * Number(item.cantidad),
        0,
      ),
    [cartItems],
  )

  const iva = useMemo(() => Number((total * 0.15).toFixed(2)), [total])
  const totalConIva = useMemo(() => Number((total + iva).toFixed(2)), [total, iva])

  const onSubmit = async (event) => {
    event.preventDefault()
    if (cartItems.length === 0) {
      setError('Agrega productos al carrito antes de pagar')
      onNotify('Tu carrito esta vacio. Agrega productos antes de pagar.')
      return
    }

    const coffeeUnits = countCoffeeUnits(cartItems)
    if (coffeeUnits > MAX_COFFEE_UNITS_PER_ORDER) {
      setError(
        `Solo puedes comprar maximo ${MAX_COFFEE_UNITS_PER_ORDER} cafes por pedido.`,
      )
      onNotify(
        `Limite excedido: maximo ${MAX_COFFEE_UNITS_PER_ORDER} cafes por pedido.`,
      )
      return
    }

    if (!proofSent) {
      setError('Debes enviar el comprobante por WhatsApp antes de registrar el pedido.')
      onNotify('Primero envia el comprobante por WhatsApp para continuar.')
      return
    }

    if (!proofImageName) {
      setError('Debes adjuntar una foto del comprobante para continuar.')
      onNotify('Adjunta una foto del comprobante antes de registrar el pedido.')
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const autoReference = `${paymentMethod}-${Date.now()}`

      const payload = {
        metodo_pago: paymentMethod,
        referencia_deposito: autoReference,
        forma_entrega: formaEntrega,
        direccion_entrega:
          formaEntrega === 'ENTREGA_DOMICILIO' ? direccionEntrega : '',
        items: cartItems.map((item) => ({
          id_producto: item.id_producto,
          cantidad: item.cantidad,
        })),
      }

      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo registrar el pedido')
      }

      setSuccess(`Pedido #${data.order.id_venta} registrado correctamente`)
      onNotify(`Pedido #${data.order.id_venta} registrado correctamente.`)
      setLastOrder(data.order)
      setLastPaymentMethod(paymentMethod)
      setLastDeliveryMethod(formaEntrega)
      setLastDeliveryAddress(direccionEntrega)
      onOrderComplete(data.order)
      setDireccionEntrega('')
      setProofSent(false)
      setProofImageName('')
      setPaymentMethod('DEPOSITO_BANCARIO')

      if (proofImageInputRef.current) {
        proofImageInputRef.current.value = ''
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  const whatsappMessage = useMemo(() => {
    if (!lastOrder) {
      return `Hola, envio mi comprobante de ${getPaymentMethodLabel(paymentMethod).toLowerCase()} para validar mi pedido en Cafe Artesanal Zaruma.`
    }

    return [
      `Hola, envio mi comprobante de ${getPaymentMethodLabel(lastPaymentMethod).toLowerCase()} para validar mi pedido.`,
      `Pedido: #${lastOrder.id_venta}`,
      `Cliente: ${user?.usuario || 'cliente'}`,
      `Metodo de pago: ${getPaymentMethodLabel(lastPaymentMethod)}`,
      `Forma de entrega: ${lastDeliveryMethod === 'ENTREGA_DOMICILIO' ? 'Entrega a domicilio' : 'Retiro en tienda física'}`,
      lastDeliveryMethod === 'ENTREGA_DOMICILIO' && lastDeliveryAddress
        ? `Direccion: ${lastDeliveryAddress}`
        : '',
      `Total depositado: ${currency(Number(lastOrder.total) || 0)}`,
      'Adjunto la foto/captura del comprobante en este chat.',
    ].filter(Boolean).join('\n')
  }, [
    lastOrder,
    paymentMethod,
    lastPaymentMethod,
    user?.usuario,
    lastDeliveryMethod,
    lastDeliveryAddress,
  ])

  const whatsappUrl = useMemo(
    () =>
      `https://wa.me/${ADMIN_WHATSAPP_PHONE}?text=${encodeURIComponent(whatsappMessage)}`,
    [whatsappMessage],
  )

  return (
    <section className="card checkout-card">
      <h2>Finalizar compra</h2>
      <div className="checkout-grid">
        <article className="checkout-panel">
          <h3>Datos de deposito</h3>
          <p>
            Metodo seleccionado: <strong>{getPaymentMethodLabel(paymentMethod)}</strong>
          </p>
          <p>Banco Pichincha - Cuenta corriente 1234567890</p>
          <p>RUC: 0190000001001 - Cafe Artesanal Zaruma</p>
          <p>IVA 15% incluido en el total.</p>
          <p>
            Subtotal: <strong>{currency(total)}</strong>
          </p>
          <p>
            IVA (15%): <strong>{currency(iva)}</strong>
          </p>
          <p>
            Total a depositar: <strong>{currency(totalConIva)}</strong>
          </p>
        </article>

        <article className="checkout-panel">
          <h3>Verificacion con COOFE DRINK</h3>
          <p>
            Registra tu pedido y luego envia el comprobante por WhatsApp para
            validarlo.
          </p>
          <p>
            COOFE DRINK aprobara la compra y despues se descontara el stock.
          </p>
          <a
            className="btn btn-whatsapp"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            Enviar comprobante por WhatsApp
          </a>
          <p className="status-text">
            Paso obligatorio: envia el comprobante antes de registrar el pedido.
          </p>
          <label className="proof-confirm-check">
            <input
              type="checkbox"
              checked={proofSent}
              onChange={(event) => setProofSent(event.target.checked)}
            />
            Ya envie mi comprobante por WhatsApp
          </label>
        </article>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <select
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
          required
        >
          <option value="DEPOSITO_BANCARIO">Deposito bancario</option>
          <option value="TRANSFERENCIA_BANCARIA">Transferencia bancaria</option>
        </select>
        <input
          ref={proofImageInputRef}
          type="file"
          accept="image/*"
          onChange={(event) =>
            setProofImageName(event.target.files?.[0]?.name || '')
          }
          required
        />
        <select
          value={formaEntrega}
          onChange={(event) => setFormaEntrega(event.target.value)}
          required
        >
          <option value="RETIRO_TIENDA">Retiro en tienda física</option>
          <option value="ENTREGA_DOMICILIO">Entrega a domicilio</option>
        </select>
        {formaEntrega === 'ENTREGA_DOMICILIO' ? (
          <input
            placeholder="Direccion de entrega"
            value={direccionEntrega}
            onChange={(event) => setDireccionEntrega(event.target.value)}
            required
          />
        ) : null}
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}

        {!lastOrder ? (
          <button
            className="btn btn-solid"
            type="submit"
            disabled={loading || !proofSent}
          >
            {loading
              ? 'Procesando...'
              : !proofSent
                ? 'Envia comprobante para continuar'
                : 'Registrar pedido'}
          </button>
        ) : (
          <button
            className="btn btn-solid"
            type="button"
            onClick={() => navigate('/catalogo')}
          >
            Seguir comprando
          </button>
        )}
      </form>

      {lastOrder ? (
        <p className="status-text checkout-next-step">
          Pedido registrado: <strong>#{lastOrder.id_venta}</strong>.
        </p>
      ) : null}
    </section>
  )
}

function statusLabelByOrderState(order) {
  if (order.estado === 'PAGADA') {
    return 'Tu pedido está listo para retirar.'
  }

  if (order.estado === 'ANULADA') {
    return 'Rechazado por admin'
  }

  return 'Pendiente de validacion del deposito'
}

function MyOrders({ token, onNotify }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingOrderId, setDeletingOrderId] = useState(null)
  const [clearingHistory, setClearingHistory] = useState(false)
  const previousStatusesRef = useRef(new Map())

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/orders/my`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar tus pedidos')
      }

      const incomingOrders = data.orders || []

      for (const order of incomingOrders) {
        const previousState = previousStatusesRef.current.get(order.id_venta)
        if (previousState && previousState !== order.estado) {
          if (order.estado === 'PAGADA') {
            onNotify(`Pedido #${order.id_venta} aprobado por COOFE DRINK. Tu pedido está listo para retirar.`)
          }

          if (order.estado === 'ANULADA') {
            onNotify(`Pedido #${order.id_venta} fue rechazado por admin.`)
          }
        }
      }

      previousStatusesRef.current = new Map(
        incomingOrders.map((order) => [order.id_venta, order.estado]),
      )

      setOrders(incomingOrders)
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [token, onNotify])

  const deleteOrder = async (idVenta) => {
    const confirmed = window.confirm(`Deseas eliminar el pedido #${idVenta}?`)
    if (!confirmed) return

    setDeletingOrderId(idVenta)
    try {
      const response = await fetch(`${API_URL}/orders/my/${idVenta}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo eliminar el pedido')
      }

      onNotify(data.message || 'Pedido eliminado correctamente.')
      await loadOrders()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setDeletingOrderId(null)
    }
  }

  const clearHistory = async () => {
    const confirmed = window.confirm(
      'Esto eliminara todo tu historial de pedidos. ¿Deseas continuar?',
    )
    if (!confirmed) return

    setClearingHistory(true)
    try {
      const response = await fetch(`${API_URL}/orders/my`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo eliminar el historial')
      }

      onNotify(data.message || 'Historial eliminado correctamente.')
      previousStatusesRef.current = new Map()
      await loadOrders()
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setClearingHistory(false)
    }
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadOrders()
    }, 0)

    const intervalId = window.setInterval(() => {
      loadOrders()
    }, 20000)

    return () => {
      window.clearTimeout(timerId)
      window.clearInterval(intervalId)
    }
  }, [loadOrders])

  return (
    <section className="card orders-card">
      <div className="orders-head">
        <h2>Mis pedidos</h2>
        <div className="orders-head-actions">
          <button className="btn btn-ghost" type="button" onClick={loadOrders}>
            Actualizar
          </button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={clearHistory}
            disabled={clearingHistory}
          >
            {clearingHistory ? 'Eliminando historial...' : 'Eliminar historial'}
          </button>
        </div>
      </div>

      {loading ? <p className="status-text">Cargando tus pedidos...</p> : null}

      {!loading && orders.length === 0 ? (
        <p className="status-text">Aun no registras pedidos.</p>
      ) : null}

      {!loading && orders.length > 0 ? (
        <div className="orders-list">
          {orders.map((order) => (
            <article key={order.id_venta} className="order-card">
              <div className="order-title">
                <strong>Pedido #{order.id_venta}</strong>
                <span>{formatOrderDate(order.fecha)}</span>
              </div>
              <p>Total: {currency(Number(order.total) || 0)}</p>
              <p>Referencia deposito: {order.referencia_deposito || '-'}</p>
              <p>{formatDeliveryText(order.forma_entrega, order.direccion_entrega)}</p>
              <p className="order-status">{statusLabelByOrderState(order)}</p>
              {order.estado === 'PENDIENTE' ? (
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={() => deleteOrder(order.id_venta)}
                  disabled={deletingOrderId === order.id_venta}
                >
                  {deletingOrderId === order.id_venta
                    ? 'Eliminando...'
                    : 'Eliminar pedido'}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function AdminInventory({ token, onNotify }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const loadInventory = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo cargar inventario')
      }
      setProducts(data.products || [])
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [token, onNotify])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadInventory()
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [loadInventory])

  return (
    <section className="card inventory-card">
      <div className="inventory-head">
        <h2>Inventario completo</h2>
        <button className="btn btn-ghost" type="button" onClick={loadInventory}>
          Actualizar
        </button>
      </div>

      {loading ? <p className="status-text">Cargando inventario...</p> : null}

      {!loading && products.length === 0 ? (
        <p className="status-text">No hay productos en inventario.</p>
      ) : null}

      {!loading && products.length > 0 ? (
        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Producto</th>
                <th>Categoria</th>
                <th>Stock</th>
                <th>Minimo</th>
                <th>Unidad</th>
                <th>Precio venta</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const stock = Number(product.stock) || 0
                const min = Number(product.stock_minimo) || 0
                const lowStock = stock <= min
                return (
                  <tr key={product.id_producto}>
                    <td>{product.codigo}</td>
                    <td>{product.nombre}</td>
                    <td>{product.categoria}</td>
                    <td className={lowStock ? 'stock-low' : ''}>{stock}</td>
                    <td>{min}</td>
                    <td>{product.unidad || 'Unidad'}</td>
                    <td>{currency(Number(product.precio) || 0)}</td>
                    <td>{product.estado}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

function AdminRevenueSummary({ token, onNotify }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const loadRevenue = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/orders/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo cargar resumen de ingresos')
      }
      setOrders(data.orders || [])
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [token, onNotify])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadRevenue()
    }, 0)

    const intervalId = window.setInterval(() => {
      loadRevenue()
    }, 20000)

    return () => {
      window.clearTimeout(timerId)
      window.clearInterval(intervalId)
    }
  }, [loadRevenue])

  const totals = useMemo(() => {
    const result = {
      ingresosConfirmados: 0,
      ventasPendientes: 0,
      ventasAnuladas: 0,
      cantidadPagadas: 0,
      cantidadPendientes: 0,
      cantidadAnuladas: 0,
    }

    for (const order of orders) {
      const total = Number(order.total) || 0
      const estado = String(order.estado || '').toUpperCase()

      if (estado === 'PAGADA') {
        result.ingresosConfirmados += total
        result.cantidadPagadas += 1
      } else if (estado === 'PENDIENTE') {
        result.ventasPendientes += total
        result.cantidadPendientes += 1
      } else if (estado === 'ANULADA') {
        result.ventasAnuladas += total
        result.cantidadAnuladas += 1
      }
    }

    return result
  }, [orders])

  return (
    <section className="card revenue-card">
      <div className="inventory-head">
        <h2>Ingresos del negocio (automatico)</h2>
        <button className="btn btn-ghost" type="button" onClick={loadRevenue}>
          Actualizar
        </button>
      </div>

      {loading ? <p className="status-text">Cargando resumen de ingresos...</p> : null}

      {!loading ? (
        <div className="revenue-grid">
          <article className="revenue-kpi">
            <p>Ingresos confirmados</p>
            <strong>{currency(totals.ingresosConfirmados)}</strong>
            <span>{totals.cantidadPagadas} pedidos pagados</span>
          </article>
          <article className="revenue-kpi">
            <p>En validacion</p>
            <strong>{currency(totals.ventasPendientes)}</strong>
            <span>{totals.cantidadPendientes} pedidos pendientes</span>
          </article>
          <article className="revenue-kpi">
            <p>Ventas anuladas</p>
            <strong>{currency(totals.ventasAnuladas)}</strong>
            <span>{totals.cantidadAnuladas} pedidos anulados</span>
          </article>
        </div>
      ) : null}
    </section>
  )
}

function SiteFooter({ onNotify }) {
  const [email, setEmail] = useState('')

  const onSubscribe = (event) => {
    event.preventDefault()

    const value = String(email || '').trim().toLowerCase()
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

    if (!isValid) {
      onNotify('Ingresa un correo valido para suscribirte.')
      return
    }

    try {
      const key = 'cafe_artesanal_subscribers'
      const raw = localStorage.getItem(key)
      const parsed = JSON.parse(raw || '[]')
      const list = Array.isArray(parsed) ? parsed : []
      const next = Array.from(new Set([...list, value]))
      localStorage.setItem(key, JSON.stringify(next))
      onNotify('Suscripcion registrada correctamente.')
      setEmail('')
    } catch {
      onNotify('Suscripcion registrada correctamente.')
      setEmail('')
    }
  }

  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <section>
          <h4>Ayuda</h4>
          <ul>
            <li><a href="/#sobre-nosotros">Preguntas y respuestas</a></li>
            <li><a href="/#ubicacion">El equipo</a></li>
            <li><a href="https://wa.me/593988062935" target="_blank" rel="noreferrer">Contacto</a></li>
            <li><a href="/catalogo">Terminos y condiciones</a></li>
          </ul>
        </section>

        <section>
          <h4>Redes sociales</h4>
          <ul className="social-links">
            <li>
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noreferrer"
                className="social-link-item"
              >
                <span className="social-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img" focusable="false">
                    <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.2c0-.9.3-1.5 1.6-1.5h1.3V5.1c-.2 0-1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V11H8v3h3.1v7h2.4Z" />
                  </svg>
                </span>
                <span>Facebook</span>
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer"
                className="social-link-item"
              >
                <span className="social-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img" focusable="false">
                    <path d="M7.8 3h8.4A4.8 4.8 0 0 1 21 7.8v8.4a4.8 4.8 0 0 1-4.8 4.8H7.8A4.8 4.8 0 0 1 3 16.2V7.8A4.8 4.8 0 0 1 7.8 3Zm-.2 2A2.6 2.6 0 0 0 5 7.6v8.8A2.6 2.6 0 0 0 7.6 19h8.8a2.6 2.6 0 0 0 2.6-2.6V7.6A2.6 2.6 0 0 0 16.4 5H7.6Zm9.1 1.3a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2.1a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Z" />
                  </svg>
                </span>
                <span>Instagram</span>
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h4>Suscribete</h4>
          <p>
            Enterate de ofertas, descuentos especiales y lanzamientos de cafe
            artesanal.
          </p>
          <form className="footer-subscribe" onSubmit={onSubscribe}>
            <input
              type="email"
              value={email}
              placeholder="tu-correo@ejemplo.com"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <button className="btn btn-solid" type="submit">Suscribirse</button>
          </form>
        </section>
      </div>

      <div className="site-footer-bottom">
        <p>© COOFFE DRINK {new Date().getFullYear()}</p>
      </div>
    </footer>
  )
}

function App() {
  const location = useLocation()
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [cartItems, setCartItems] = useState(() => loadCartFromStorage())
  const [cartToast, setCartToast] = useState('')
  const [previewImage, setPreviewImage] = useState(null)
  const [appReviews, setAppReviews] = useState([])
  const [appReviewDraft, setAppReviewDraft] = useState({ rating: '5', comment: '' })
  const [appReviewSaving, setAppReviewSaving] = useState(false)
  const [appReviewReplyDrafts, setAppReviewReplyDrafts] = useState({})
  const [appReviewReplySavingKey, setAppReviewReplySavingKey] = useState('')
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [hasNewRequestAlert, setHasNewRequestAlert] = useState(false)
  const [myOrdersPendingCount, setMyOrdersPendingCount] = useState(0)
  const [hasMyOrdersAlert, setHasMyOrdersAlert] = useState(false)
  const pendingRequestsRef = useRef(0)
  const myOrdersStatusRef = useRef(new Map())
  const myOrdersCountRef = useRef(0)
  const isAuthenticated = Boolean(token)
  const isAdmin = String(user?.rol || '').trim().toLowerCase() === 'administrador'
  const cartCount = cartItems.reduce((acc, item) => acc + Number(item.cantidad || 0), 0)

  const appReviewSummary = useMemo(() => summarizeReviews(appReviews), [appReviews])

  const refreshAppReviews = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/reviews/public`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar las reseñas')
      }

      const platformReviews = Array.isArray(data.reviews)
        ? data.reviews.filter(
            (review) => normalizeReviewScope(review.scope) === REVIEW_SCOPE_APP,
          )
        : []

      setAppReviews(platformReviews)
    } catch {
      setAppReviews([])
    }
  }, [])

  const showToast = useCallback((message) => {
    setCartToast(message)
  }, [])

  useEffect(() => {
    if (!cartToast) return

    const timerId = window.setTimeout(() => {
      setCartToast('')
    }, 2200)

    return () => window.clearTimeout(timerId)
  }, [cartToast])

  useEffect(() => {
    saveCartToStorage(cartItems)
  }, [cartItems])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refreshAppReviews()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [refreshAppReviews])

  useEffect(() => {
    if (!previewImage) return undefined

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setPreviewImage(null)
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEsc)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEsc)
    }
  }, [previewImage])

  useEffect(() => {
    async function loadSession() {
      if (!token) {
        setUser(null)
        return
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error('Sesion invalida')
        }
        setUser(data.user)
      } catch {
        localStorage.removeItem('token')
        setToken('')
        setUser(null)
      }
    }

    loadSession()
  }, [token])

  useEffect(() => {
    if (!isAdmin || !token) {
      pendingRequestsRef.current = 0
      return
    }

    let isCancelled = false

    const loadPendingRequests = async (notifyOnIncrease) => {
      try {
        const response = await fetch(`${API_URL}/orders/admin/all`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (!response.ok) return

        const allOrders = Array.isArray(data.orders) ? data.orders : []
        const pendingCount = allOrders.filter(
          (order) => String(order.estado || '').toUpperCase() === 'PENDIENTE',
        ).length

        if (isCancelled) return

        const previousCount = pendingRequestsRef.current
        if (notifyOnIncrease && pendingCount > previousCount) {
          const diff = pendingCount - previousCount
          showToast(
            diff === 1
              ? 'Notificacion: ha llegado un pedido nuevo.'
              : `Notificacion: han llegado ${diff} pedidos nuevos.`,
          )
          setHasNewRequestAlert(true)
        }

        pendingRequestsRef.current = pendingCount
        setPendingRequestsCount(pendingCount)
      } catch {
        // Keep UI stable if polling fails.
      }
    }

    loadPendingRequests(false)
    const intervalId = window.setInterval(() => {
      loadPendingRequests(true)
    }, 15000)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [isAdmin, token, showToast])

  useEffect(() => {
    if (!isAuthenticated || isAdmin || !token) {
      myOrdersStatusRef.current = new Map()
      myOrdersCountRef.current = 0
      return
    }

    let isCancelled = false

    const loadMyOrdersNotification = async (notifyOnChange) => {
      try {
        const response = await fetch(`${API_URL}/orders/my`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (!response.ok) return

        const incomingOrders = Array.isArray(data.orders) ? data.orders : []
        const pendingCount = incomingOrders.filter(
          (order) => String(order.estado || '').toUpperCase() === 'PENDIENTE',
        ).length

        if (isCancelled) return

        if (notifyOnChange) {
          let hasChange = incomingOrders.length > myOrdersCountRef.current

          if (!hasChange) {
            for (const order of incomingOrders) {
              const previousState = myOrdersStatusRef.current.get(order.id_venta)
              if (previousState && previousState !== order.estado) {
                hasChange = true
                break
              }
            }
          }

          if (hasChange) {
            setHasMyOrdersAlert(true)
            showToast('Notificacion: revisa Mis pedidos.')
          }
        }

        myOrdersCountRef.current = incomingOrders.length
        myOrdersStatusRef.current = new Map(
          incomingOrders.map((order) => [order.id_venta, order.estado]),
        )
        setMyOrdersPendingCount(pendingCount)
      } catch {
        // Keep UI stable if polling fails.
      }
    }

    loadMyOrdersNotification(false)
    const intervalId = window.setInterval(() => {
      loadMyOrdersNotification(true)
    }, 15000)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [isAuthenticated, isAdmin, token, showToast])

  const handleAuth = (data) => {
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    setMyOrdersPendingCount(0)
    setHasMyOrdersAlert(false)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken('')
    setUser(null)
    setPendingRequestsCount(0)
    setHasNewRequestAlert(false)
    setMyOrdersPendingCount(0)
    setHasMyOrdersAlert(false)
    showToast('Sesion cerrada. Tu carrito se conserva por 2 dias.')
  }

  const addToCart = (product) => {
    let limitMessage = ''

    setCartItems((prev) => {
      const isCoffee = isCoffeeForOrderLimit(product)
      if (isCoffee) {
        const currentCoffeeUnits = countCoffeeUnits(prev)
        if (currentCoffeeUnits + 1 > MAX_COFFEE_UNITS_PER_ORDER) {
          limitMessage = `Limite alcanzado: maximo ${MAX_COFFEE_UNITS_PER_ORDER} cafes por pedido.`
          return prev
        }
      }

      const found = prev.find((item) => item.id_producto === product.id_producto)
      if (found) {
        return prev.map((item) =>
          item.id_producto === product.id_producto
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        )
      }
      return [...prev, { ...product, cantidad: 1 }]
    })

    if (limitMessage) {
      showToast(limitMessage)
    }
  }

  const changeQuantity = (idProducto, cantidad) => {
    if (!cantidad || cantidad < 1) return
    const found = cartItems.find((item) => item.id_producto === idProducto)
    if (!found) return

    let nextQuantity = cantidad
    let limitMessage = ''

    if (isCoffeeForOrderLimit(found)) {
      const otherCoffeeUnits = cartItems.reduce((total, item) => {
        if (item.id_producto === idProducto) return total
        if (!isCoffeeForOrderLimit(item)) return total
        return total + (Number(item.cantidad) || 0)
      }, 0)

      const maxAllowedForItem = Math.max(
        MAX_COFFEE_UNITS_PER_ORDER - otherCoffeeUnits,
        0,
      )

      if (cantidad > maxAllowedForItem) {
        nextQuantity = Math.max(maxAllowedForItem, 1)
        limitMessage = `Limite alcanzado: maximo ${MAX_COFFEE_UNITS_PER_ORDER} cafes por pedido.`
      }
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.id_producto === idProducto
          ? { ...item, cantidad: nextQuantity }
          : item,
      ),
    )

    if (limitMessage) {
      showToast(limitMessage)
      return
    }

    showToast(`Cantidad actualizada para ${found.nombre}: ${nextQuantity}.`)
  }

  const removeFromCart = (idProducto) => {
    const found = cartItems.find((item) => item.id_producto === idProducto)
    setCartItems((prev) => prev.filter((item) => item.id_producto !== idProducto))
    if (found) {
      showToast(`${found.nombre} fue retirado del carrito.`)
    }
  }

  const openPreviewImage = useCallback((image) => {
    if (!image?.src) return
    setPreviewImage(image)
  }, [])

  const submitAppReview = async () => {
    const rating = Number(appReviewDraft?.rating)
    const comment = String(appReviewDraft?.comment || '').trim()

    if (!token) {
      showToast('Inicia sesion para enviar una reseña general.')
      return
    }

    if (!rating || rating < 1 || rating > 5) {
      showToast('Selecciona una calificacion entre 1 y 5.')
      return
    }

    if (!comment) {
      showToast('Escribe un comentario para enviar tu reseña.')
      return
    }

    setAppReviewSaving(true)

    try {
      const response = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scope: REVIEW_SCOPE_APP,
          rating,
          comment,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar la reseña')
      }

      showToast(data.message || 'Reseña guardada correctamente.')
      setAppReviewDraft({ rating: '5', comment: '' })
      await refreshAppReviews()
    } catch (requestError) {
      showToast(requestError.message)
    } finally {
      setAppReviewSaving(false)
    }
  }

  const submitAppReviewReply = async (idReview, reply) => {
    const replyText = String(reply || '').trim()

    if (!replyText) {
      showToast('Escribe una respuesta.')
      return
    }

    const replyKey = `reply-${idReview}`
    setAppReviewReplySavingKey(replyKey)

    try {
      const response = await fetch(`${API_URL}/reviews/${idReview}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reply: replyText }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar la respuesta')
      }

      showToast(data.message || 'Respuesta guardada correctamente.')
      setAppReviewReplyDrafts((prev) => ({ ...prev, [idReview]: replyText }))
      await refreshAppReviews()
    } catch (requestError) {
      showToast(requestError.message)
    } finally {
      setAppReviewReplySavingKey('')
    }
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <img
            src={BRAND_LOGO_URL}
            alt="Logo COOFFE DRINK"
            className="brand-logo brand-logo-clickable"
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              openPreviewImage({
                src: BRAND_LOGO_URL,
                alt: 'Logo COOFFE DRINK',
              })
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              event.stopPropagation()
              openPreviewImage({
                src: BRAND_LOGO_URL,
                alt: 'Logo COOFFE DRINK',
              })
            }}
          />
          <span className="brand-stack">
            <span className="brand-text">COOFFE DR!NK</span>
            <span className="brand-subtitle">Cafe artesanal de la provincia de El Oro</span>
          </span>
        </Link>
        <nav>
          <a href="/#sobre-nosotros">Sobre nosotros</a>
          <Link to="/catalogo">Catalogo</Link>
          {isAdmin ? <Link to="/inventario">Inventario</Link> : null}
          {isAdmin ? <Link to="/ingresos">Ingresos</Link> : null}
          {isAuthenticated && !isAdmin ? (
            <Link
              to="/mis-pedidos"
              className={`orders-link ${
                hasMyOrdersAlert && location.pathname !== '/mis-pedidos'
                  ? 'has-alert'
                  : ''
              }`}
            >
              Mis pedidos
              {myOrdersPendingCount > 0 ? (
                <span className="orders-badge">{myOrdersPendingCount}</span>
              ) : null}
            </Link>
          ) : null}
          {isAuthenticated && isAdmin ? (
            <Link
              to="/solicitudes"
              className={`requests-link ${
                hasNewRequestAlert && location.pathname !== '/solicitudes'
                  ? 'has-alert'
                  : ''
              }`}
            >
              Solicitudes
              {pendingRequestsCount > 0 ? (
                <span className="request-badge">{pendingRequestsCount}</span>
              ) : null}
            </Link>
          ) : null}
          {!isAuthenticated ? <Link to="/login">Iniciar sesion</Link> : null}
          {!isAuthenticated ? <Link to="/registro">Registrarse</Link> : null}
          <a href="https://wa.me/593988062935" target="_blank" rel="noreferrer">
            Contacto
          </a>
          {!isAdmin ? (
            <Link
              to={isAuthenticated ? '/carrito' : '/login'}
              className="cart-link"
              aria-label="Carrito"
              title="Carrito"
            >
              <span className="cart-link-icon" aria-hidden="true">
                &#128722;
              </span>
              {isAuthenticated && cartCount > 0 ? (
                <span className="cart-badge">{cartCount}</span>
              ) : null}
            </Link>
          ) : null}
        </nav>
        <div>
          {user ? (
            <button className="btn btn-ghost" onClick={logout} type="button">
              Salir ({user.usuario})
            </button>
          ) : null}
        </div>
      </header>

      <main className="content-wrap">
        <Routes>
          <Route
            path="/"
            element={
              <Home
                onPreviewImage={openPreviewImage}
                isAuthenticated={isAuthenticated}
                isAdmin={isAdmin}
                appReviews={appReviews}
                appReviewSummary={appReviewSummary}
                appReviewDraft={appReviewDraft}
                appReviewSaving={appReviewSaving}
                onAppReviewDraftChange={setAppReviewDraft}
                onSubmitAppReview={submitAppReview}
                replyDrafts={appReviewReplyDrafts}
                onReplyDraftChange={(reviewId, value) =>
                  setAppReviewReplyDrafts((prev) => ({ ...prev, [reviewId]: value }))
                }
                onSubmitReply={submitAppReviewReply}
                replyingKey={appReviewReplySavingKey}
              />
            }
          />
          <Route
            path="/login"
            element={<Login onLogin={handleAuth} onNotify={showToast} />}
          />
          <Route
            path="/registro"
            element={<Register onRegister={handleAuth} onNotify={showToast} />}
          />
          <Route
            path="/catalogo"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Catalog
                  token={token}
                  user={user}
                  cartItems={cartItems}
                  onAddToCart={addToCart}
                  onNotify={showToast}
                  onPreviewImage={openPreviewImage}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/carrito"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Cart
                  cartItems={cartItems}
                  onChangeQuantity={changeQuantity}
                  onRemove={removeFromCart}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pago"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Checkout
                  token={token}
                  user={user}
                  cartItems={cartItems}
                  onNotify={showToast}
                  onOrderComplete={() => setCartItems([])}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mis-pedidos"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MyOrders token={token} onNotify={showToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/solicitudes"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                {isAdmin ? (
                  <AdminPendingOrders token={token} onNotify={showToast} />
                ) : (
                  <Navigate to="/catalogo" replace />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventario"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                {isAdmin ? (
                  <AdminInventory token={token} onNotify={showToast} />
                ) : (
                  <Navigate to="/catalogo" replace />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/ingresos"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                {isAdmin ? (
                  <AdminRevenueSummary token={token} onNotify={showToast} />
                ) : (
                  <Navigate to="/catalogo" replace />
                )}
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {location.pathname === '/' ? <SiteFooter onNotify={showToast} /> : null}

      <WhatsAppButton />
      {cartToast ? <div className="cart-toast">{cartToast}</div> : null}
      {previewImage ? (
        <div
          className="image-lightbox"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewImage(null)
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa de imagen"
        >
          <button
            className="lightbox-close"
            type="button"
            onClick={() => setPreviewImage(null)}
          >
            Cerrar
          </button>
          <img src={previewImage.src} alt={previewImage.alt || 'Imagen'} className="lightbox-image" />
        </div>
      ) : null}
    </div>
  )
}

export default App

import fs from 'node:fs/promises'
import path from 'node:path'

// Store JSON de reseñas para mantener historial y conversaciones.
const storePath = path.resolve(process.cwd(), 'api', 'data', 'reviews.json')

async function ensureStoreFile() {
  // Garantiza existencia del archivo para operaciones de lectura/escritura.
  try {
    await fs.access(storePath)
  } catch {
    await fs.mkdir(path.dirname(storePath), { recursive: true })
    await fs.writeFile(storePath, '[]', 'utf8')
  }
}

async function readReviews() {
  await ensureStoreFile()
  const raw = await fs.readFile(storePath, 'utf8')

  // Fallback seguro ante JSON invalido.
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Usa created_at para ordenar respuestas y reseñas cronologicamente.
function getReviewDateMs(review) {
  const dateMs = new Date(review?.created_at || 0).getTime()
  return Number.isFinite(dateMs) ? dateMs : 0
}

async function writeReviews(reviews, options = {}) {
  // preserveExisting=true evita perder reseñas cuando llega un subset parcial.
  await ensureStoreFile()
  const { preserveExisting = true } = options
  const existing = await readReviews()
  const incoming = Array.isArray(reviews) ? reviews : []
  const incomingById = new Map(incoming.map((review) => [Number(review.id_review) || 0, review]))

  if (preserveExisting) {
    for (const existingReview of existing) {
      const existingId = Number(existingReview.id_review) || 0
      if (!existingId) continue
      if (incomingById.has(existingId)) continue
      incomingById.set(existingId, existingReview)
    }
  }

  const merged = Array.from(incomingById.values()).sort(
    (left, right) => getReviewDateMs(left) - getReviewDateMs(right),
  )

  await fs.writeFile(storePath, JSON.stringify(merged, null, 2), 'utf8')
}

export async function getAllReviews() {
  // Punto unico de lectura del store de reseñas.
  return readReviews()
}

export async function addReview(review) {
  // Genera id incremental y limpia campos para persistencia estable.
  const reviews = await readReviews()
  const nextId = reviews.reduce(
    (max, currentReview) => Math.max(max, Number(currentReview.id_review) || 0),
    0,
  )
  const normalized = {
    ...review,
    id_review: Number(review.id_review) || nextId + 1,
    id_usuario: Number(review.id_usuario),
    id_cliente: Number(review.id_cliente),
    id_producto: review.id_producto == null ? null : Number(review.id_producto),
    rating: Number(review.rating),
    scope: String(review.scope || '').trim().toUpperCase(),
    comment: String(review.comment || '').trim(),
    author_name: String(review.author_name || '').trim(),
    usuario: String(review.usuario || '').trim(),
    conversation: Array.isArray(review.conversation) ? review.conversation : [],
  }

  reviews.push(normalized)
  await writeReviews(reviews)
  return normalized
}

export async function addReviewConversationReply(idReview, replyData) {
  // Inserta respuesta en hilo de conversacion manteniendo secuencia id_reply.
  const reviews = await readReviews()
  const targetIndex = reviews.findIndex(
    (review) => Number(review.id_review) === Number(idReview),
  )

  if (targetIndex < 0) {
    return null
  }

  const currentReview = reviews[targetIndex]
  const currentConversation = Array.isArray(currentReview.conversation)
    ? currentReview.conversation
    : []
  const nextReplyId = currentConversation.reduce(
    (max, reply) => Math.max(max, Number(reply.id_reply) || 0),
    0,
  )

  const nextReply = {
    id_reply: nextReplyId + 1,
    id_usuario: Number(replyData.id_usuario),
    id_cliente: Number(replyData.id_cliente),
    usuario: String(replyData.usuario || '').trim(),
    author_name: String(replyData.author_name || '').trim() || 'Cliente',
    comment: String(replyData.comment || '').trim(),
    created_at: replyData.created_at || new Date().toISOString(),
  }

  reviews[targetIndex] = {
    ...currentReview,
    conversation: [...currentConversation, nextReply],
  }

  await writeReviews(reviews)
  return reviews[targetIndex]
}

export async function deleteReviewConversationReply(idReview, idReply) {
  // Retorna false si la respuesta no existe y null si la reseña no existe.
  const reviews = await readReviews()
  const targetIndex = reviews.findIndex(
    (review) => Number(review.id_review) === Number(idReview),
  )

  if (targetIndex < 0) {
    return null
  }

  const currentReview = reviews[targetIndex]
  const currentConversation = Array.isArray(currentReview.conversation)
    ? currentReview.conversation
    : []

  const nextConversation = currentConversation.filter(
    (reply) => Number(reply.id_reply) !== Number(idReply),
  )

  if (nextConversation.length === currentConversation.length) {
    return false
  }

  reviews[targetIndex] = {
    ...currentReview,
    conversation: nextConversation,
  }

  await writeReviews(reviews)
  return reviews[targetIndex]
}

export async function updateReviewReply(idReview, replyData) {
  // Actualiza respuesta oficial del admin dentro de la reseña.
  const reviews = await readReviews()
  const targetIndex = reviews.findIndex(
    (review) => Number(review.id_review) === Number(idReview),
  )

  if (targetIndex < 0) {
    return null
  }

  const nextReply = {
    reply: String(replyData.reply || '').trim(),
    reply_at: replyData.reply_at || new Date().toISOString(),
    reply_author_name: String(replyData.reply_author_name || '').trim(),
    reply_usuario: String(replyData.reply_usuario || '').trim(),
  }

  reviews[targetIndex] = {
    ...reviews[targetIndex],
    ...nextReply,
  }

  await writeReviews(reviews)
  return reviews[targetIndex]
}

export async function deleteReviewById(idReview) {
  // preserveExisting=false para reescribir exactamente el resultado filtrado.
  const reviews = await readReviews()
  const nextReviews = reviews.filter(
    (review) => Number(review.id_review) !== Number(idReview),
  )

  if (nextReviews.length === reviews.length) {
    return false
  }

  await writeReviews(nextReviews, { preserveExisting: false })
  return true
}

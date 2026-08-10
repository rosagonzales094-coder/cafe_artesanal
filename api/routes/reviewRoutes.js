import express from 'express'
import pool from '../db.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { ORDER_STATUS } from '../constants/orderConstants.js'
import { getOrdersByClient } from '../orderStore.js'
import {
  addReview,
  addReviewConversationReply,
  deleteReviewConversationReply,
  deleteReviewById,
  getAllReviews,
  updateReviewReply,
} from '../reviewStore.js'

const router = express.Router()
const REVIEW_SCOPES = new Set(['PRODUCT', 'APP'])

// Helpers de permisos para moderacion y borrado seguro de contenido.
function isAdminUser(user) {
  return String(user?.rol || '').trim().toLowerCase() === 'administrador'
}

function isReviewOwner(review, user) {
  const reviewUserId = Number(review?.id_usuario)
  const reviewClientId = Number(review?.id_cliente)
  const reviewUsername = String(review?.usuario || '').trim().toLowerCase()

  const userId = Number(user?.id_usuario)
  const clientId = Number(user?.id_cliente)
  const username = String(user?.usuario || '').trim().toLowerCase()

  const byUserId = reviewUserId > 0 && userId > 0 && reviewUserId === userId
  const byClientId = reviewClientId > 0 && clientId > 0 && reviewClientId === clientId
  const byUsername = Boolean(reviewUsername) && Boolean(username) && reviewUsername === username

  return byUserId || byClientId || byUsername
}

function isConversationReplyOwner(reply, user) {
  const replyUserId = Number(reply?.id_usuario)
  const replyClientId = Number(reply?.id_cliente)
  const replyUsername = String(reply?.usuario || '').trim().toLowerCase()

  const userId = Number(user?.id_usuario)
  const clientId = Number(user?.id_cliente)
  const username = String(user?.usuario || '').trim().toLowerCase()

  const byUserId = replyUserId > 0 && userId > 0 && replyUserId === userId
  const byClientId = replyClientId > 0 && clientId > 0 && replyClientId === clientId
  const byUsername = Boolean(replyUsername) && Boolean(username) && replyUsername === username

  return byUserId || byClientId || byUsername
}

function normalizeScope(value) {
  return String(value || '').trim().toUpperCase()
}

function normalizeRating(value) {
  const rating = Number(value)
  if (!Number.isFinite(rating)) {
    return null
  }

  return Math.min(5, Math.max(1, Math.round(rating)))
}

function normalizeReply(reply) {
  return String(reply || '').trim()
}

function normalizeConversationComment(comment) {
  return String(comment || '').trim()
}

async function resolveAuthor(connection, reqUser) {
  // Resuelve nombre visible del autor desde datos de cliente.
  const [rows] = await connection.query(
    `SELECT nombres, apellidos, correo
     FROM clientes
     WHERE id_cliente = ?
     LIMIT 1`,
    [reqUser.id_cliente],
  )

  const client = rows[0]
  const fullName = [client?.nombres, client?.apellidos].filter(Boolean).join(' ').trim()

  return {
    author_name: fullName || reqUser.usuario || 'Cliente',
    correo: client?.correo || reqUser.correo || '',
  }
}

router.get('/', requireAuth, async (req, res) => {
  // Lista todas las reseñas validas para usuarios autenticados.
  try {
    const reviews = await getAllReviews()
    const normalizedReviews = reviews
      .map((review) => ({
        ...review,
        scope: normalizeScope(review.scope),
        rating: Number(review.rating) || 0,
        id_producto: review.id_producto == null ? null : Number(review.id_producto),
      }))
      .filter((review) => REVIEW_SCOPES.has(review.scope))
      .sort((left, right) => {
        const leftDate = new Date(left.created_at || 0).getTime()
        const rightDate = new Date(right.created_at || 0).getTime()
        return rightDate - leftDate
      })

    return res.json({ reviews: normalizedReviews })
  } catch (error) {
    return res.status(500).json({ message: 'Error al cargar reseñas', error })
  }
})

router.get('/public', async (req, res) => {
  // Exposicion publica solo de reseñas de plataforma (scope APP).
  try {
    const reviews = await getAllReviews()
    const publicReviews = reviews
      .map((review) => ({
        ...review,
        scope: normalizeScope(review.scope),
        rating: Number(review.rating) || 0,
        id_producto: review.id_producto == null ? null : Number(review.id_producto),
      }))
      .filter((review) => review.scope === 'APP')
      .sort((left, right) => {
        const leftDate = new Date(left.created_at || 0).getTime()
        const rightDate = new Date(right.created_at || 0).getTime()
        return rightDate - leftDate
      })

    return res.json({ reviews: publicReviews })
  } catch (error) {
    return res.status(500).json({ message: 'Error al cargar reseñas publicas', error })
  }
})

router.post('/', requireAuth, async (req, res) => {
  // Crea reseña de producto o plataforma con validaciones de scope/rating.
  const scope = normalizeScope(req.body?.scope)
  const rating = normalizeRating(req.body?.rating)
  const comment = String(req.body?.comment || '').trim()
  const idProducto = req.body?.id_producto == null ? null : Number(req.body.id_producto)

  if (!REVIEW_SCOPES.has(scope)) {
    return res.status(400).json({ message: 'El tipo de reseña no es valido' })
  }

  if (!rating) {
    return res.status(400).json({ message: 'Selecciona una calificación entre 1 y 5' })
  }

  if (scope === 'APP' && !comment) {
    return res.status(400).json({ message: 'Escribe un comentario para tu reseña' })
  }

  if (scope === 'PRODUCT' && !idProducto) {
    return res.status(400).json({ message: 'Selecciona un producto válido' })
  }

  let connection

  try {
    // Solo valida producto cuando la reseña es de tipo PRODUCT.
    connection = await pool.getConnection()

    let productReviewData = {
      id_producto: null,
      product_name: null,
    }

    if (scope === 'PRODUCT') {
      const [productRows] = await connection.query(
        `SELECT p.id_producto, p.nombre
         FROM productos p
         WHERE p.id_producto = ?
         LIMIT 1`,
        [idProducto],
      )

      if (productRows.length === 0) {
        return res.status(404).json({ message: 'Producto no encontrado' })
      }

      productReviewData = {
        id_producto: Number(productRows[0].id_producto),
        product_name: productRows[0].nombre,
      }

      // Solo puede reseñar quien compró y pagó ese producto.
      const clientOrders = await getOrdersByClient(req.user.id_cliente)
      const hasPaidPurchase = clientOrders.some((order) => {
        const isPaid =
          String(order?.estado || '').trim().toUpperCase() === ORDER_STATUS.PAID
        if (!isPaid) return false

        const items = Array.isArray(order?.items) ? order.items : []
        return items.some(
          (item) => Number(item?.id_producto) === productReviewData.id_producto,
        )
      })

      if (!hasPaidPurchase) {
        return res.status(403).json({
          message:
            'Solo puedes reseñar productos que hayas comprado y pagado.',
        })
      }
    }

    const author = await resolveAuthor(connection, req.user)

    const review = await addReview({
      id_usuario: req.user.id_usuario,
      id_cliente: req.user.id_cliente,
      id_producto: productReviewData.id_producto,
      scope,
      rating,
      comment,
      author_name: author.author_name,
      usuario: req.user.usuario,
      correo: author.correo,
      product_name: productReviewData.product_name,
      created_at: new Date().toISOString(),
    })

    return res.status(201).json({
      message: 'Reseña guardada correctamente',
      review,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Error al guardar la reseña', error })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

router.post('/:idReview/reply', requireAuth, requireAdmin, async (req, res) => {
  // Respuesta oficial de Coffee Drinks sobre una reseña.
  const idReview = Number(req.params.idReview)
  const reply = normalizeReply(req.body?.reply)

  if (!idReview) {
    return res.status(400).json({ message: 'ID de reseña invalido' })
  }

  if (!reply) {
    return res.status(400).json({ message: 'Escribe una respuesta' })
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.usuario, c.nombres, c.apellidos
       FROM usuarios u
       LEFT JOIN clientes c ON c.id_cliente = u.id_cliente
       WHERE u.id_usuario = ?
       LIMIT 1`,
      [req.user.id_usuario],
    )

    const admin = rows[0]
    const adminName = [admin?.nombres, admin?.apellidos].filter(Boolean).join(' ').trim()

    const updatedReview = await updateReviewReply(idReview, {
      reply,
      reply_at: new Date().toISOString(),
      reply_author_name: adminName || req.user.usuario || 'Coffee Drinks',
      reply_usuario: admin?.usuario || req.user.usuario || 'Coffee Drinks',
    })

    if (!updatedReview) {
      return res.status(404).json({ message: 'Reseña no encontrada' })
    }

    return res.json({
      message: 'Respuesta guardada correctamente',
      review: updatedReview,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Error al guardar la respuesta', error })
  }
})

router.post('/:idReview/conversation', requireAuth, async (req, res) => {
  // Permite que usuarios continúen un hilo de conversación en la reseña.
  const idReview = Number(req.params.idReview)
  const comment = normalizeConversationComment(req.body?.comment)

  if (!idReview) {
    return res.status(400).json({ message: 'ID de reseña invalido' })
  }

  if (!comment) {
    return res.status(400).json({ message: 'Escribe una respuesta para continuar la conversacion' })
  }

  let connection

  try {
    connection = await pool.getConnection()
    const author = await resolveAuthor(connection, req.user)

    const updatedReview = await addReviewConversationReply(idReview, {
      id_usuario: req.user.id_usuario,
      id_cliente: req.user.id_cliente,
      usuario: req.user.usuario,
      author_name: author.author_name,
      comment,
      created_at: new Date().toISOString(),
    })

    if (!updatedReview) {
      return res.status(404).json({ message: 'Reseña no encontrada' })
    }

    return res.json({
      message: 'Respuesta enviada correctamente',
      review: updatedReview,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Error al responder la reseña', error })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

router.delete('/:idReview/conversation/:idReply', requireAuth, async (req, res) => {
  // Solo admin o dueño de la respuesta pueden eliminarla.
  const idReview = Number(req.params.idReview)
  const idReply = Number(req.params.idReply)

  if (!idReview || !idReply) {
    return res.status(400).json({ message: 'IDs de conversacion invalidos' })
  }

  try {
    const reviews = await getAllReviews()
    const targetReview = reviews.find(
      (review) => Number(review.id_review) === Number(idReview),
    )

    if (!targetReview) {
      return res.status(404).json({ message: 'Reseña no encontrada' })
    }

    const conversation = Array.isArray(targetReview.conversation)
      ? targetReview.conversation
      : []
    const targetReply = conversation.find(
      (reply) => Number(reply.id_reply) === Number(idReply),
    )

    if (!targetReply) {
      return res.status(404).json({ message: 'Respuesta de conversacion no encontrada' })
    }

    const isOwner = isConversationReplyOwner(targetReply, req.user)
    if (!isAdminUser(req.user) && !isOwner) {
      return res.status(403).json({ message: 'No tienes permisos para eliminar esta respuesta' })
    }

    const updatedReview = await deleteReviewConversationReply(idReview, idReply)

    if (updatedReview === false) {
      return res.status(404).json({ message: 'Respuesta de conversacion no encontrada' })
    }

    if (!updatedReview) {
      return res.status(404).json({ message: 'Reseña no encontrada' })
    }

    return res.json({
      message: 'Respuesta eliminada correctamente',
      review: updatedReview,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar la respuesta', error })
  }
})

router.delete('/:idReview', requireAuth, async (req, res) => {
  // Elimina reseña completa con control de propiedad/administración.
  const idReview = Number(req.params.idReview)

  if (!idReview) {
    return res.status(400).json({ message: 'ID de reseña invalido' })
  }

  try {
    const reviews = await getAllReviews()
    const targetReview = reviews.find(
      (review) => Number(review.id_review) === Number(idReview),
    )

    if (!targetReview) {
      return res.status(404).json({ message: 'Reseña no encontrada' })
    }

    const isOwner = isReviewOwner(targetReview, req.user)
    if (!isAdminUser(req.user) && !isOwner) {
      return res.status(403).json({ message: 'No tienes permisos para eliminar esta reseña' })
    }

    const deleted = await deleteReviewById(idReview)

    if (!deleted) {
      return res.status(404).json({ message: 'Reseña no encontrada' })
    }

    return res.json({ message: 'Reseña eliminada correctamente' })
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar la reseña', error })
  }
})

export default router

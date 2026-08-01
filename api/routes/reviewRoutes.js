import express from 'express'
import pool from '../db.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { addReview, getAllReviews, updateReviewReply } from '../reviewStore.js'

const router = express.Router()
const REVIEW_SCOPES = new Set(['PRODUCT', 'APP'])

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

async function resolveAuthor(connection, reqUser) {
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
  const scope = normalizeScope(req.body?.scope)
  const rating = normalizeRating(req.body?.rating)
  const comment = String(req.body?.comment || '').trim()
  const idProducto = req.body?.id_producto == null ? null : Number(req.body.id_producto)

  if (!REVIEW_SCOPES.has(scope)) {
    return res.status(400).json({ message: 'El tipo de reseña no es valido' })
  }

  if (!rating) {
    return res.status(400).json({ message: 'Selecciona una calificacion entre 1 y 5' })
  }

  if (scope === 'APP' && !comment) {
    return res.status(400).json({ message: 'Escribe un comentario para tu reseña' })
  }

  if (scope === 'PRODUCT' && !idProducto) {
    return res.status(400).json({ message: 'Selecciona un producto valido' })
  }

  let connection

  try {
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
      reply_author_name: adminName || req.user.usuario || 'Administrador',
      reply_usuario: admin?.usuario || req.user.usuario || 'Administrador',
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

export default router

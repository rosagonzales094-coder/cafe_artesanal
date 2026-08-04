import express from 'express'
import pool from '../db.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { ensureSellableShowcaseProducts } from '../catalogBootstrap.js'

const router = express.Router()

let productImageColumnPromise = null

async function ensureProductImageColumn() {
  if (!productImageColumnPromise) {
    productImageColumnPromise = (async () => {
      try {
        const [rows] = await pool.query(
          `SELECT COUNT(*) AS total
           FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = 'productos'
             AND COLUMN_NAME = 'imagen_url'`,
        )

        if (Number(rows[0]?.total || 0) > 0) {
          return true
        }

        await pool.query('ALTER TABLE productos ADD COLUMN imagen_url VARCHAR(255) NULL AFTER descripcion')
        return true
      } catch (error) {
        console.warn('No se pudo habilitar la columna imagen_url en productos:', error?.message)
        return false
      }
    })()
  }

  return productImageColumnPromise
}

function buildProductSelectQuery(hasImageColumn, isAdmin) {
  const imageColumn = hasImageColumn ? 'p.imagen_url,' : 'NULL AS imagen_url,'

  return `SELECT
           p.id_producto,
           p.id_categoria,
           p.id_proveedor,
           p.codigo,
           p.nombre,
           p.descripcion,
           p.precio_compra,
           p.precio_venta AS precio,
           p.stock,
           p.stock_minimo,
           p.unidad,
           p.estado,
           ${imageColumn}
           c.nombre AS categoria
         FROM productos p
         INNER JOIN categorias c ON c.id_categoria = p.id_categoria
         ${isAdmin ? '' : "WHERE p.estado = 'ACTIVO' AND p.stock > 0"}
         ORDER BY p.nombre ASC`
}

router.get('/', requireAuth, async (req, res) => {
  try {
    try {
      await ensureSellableShowcaseProducts()
    } catch (bootstrapError) {
      console.warn('No se pudo completar bootstrap de catalogo:', bootstrapError?.message)
    }

    const isAdmin = String(req.user?.rol || '').trim().toLowerCase() === 'administrador'

    const hasImageColumn = await ensureProductImageColumn()
    const query = buildProductSelectQuery(hasImageColumn, isAdmin)

    const [rows] = await pool.query(query)

    return res.json({ products: rows })
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener catalogo', error })
  }
})

router.get('/meta', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [categorias] = await pool.query(
      "SELECT id_categoria, nombre FROM categorias WHERE UPPER(estado) IN ('ACTIVO', 'ACTIVA') ORDER BY nombre ASC",
    )
    const [proveedores] = await pool.query(
      "SELECT id_proveedor, empresa FROM proveedores WHERE UPPER(estado) IN ('ACTIVO', 'ACTIVA') ORDER BY empresa ASC",
    )

    return res.json({ categorias, proveedores })
  } catch (error) {
    return res.status(500).json({ message: 'Error al cargar datos auxiliares', error })
  }
})

router.post('/categories', requireAuth, requireAdmin, async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim()

  if (!nombre) {
    return res.status(400).json({ message: 'El nombre de la categoria es obligatorio' })
  }

  try {
    const [existingRows] = await pool.query(
      'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER(?) LIMIT 1',
      [nombre],
    )

    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'La categoria ya existe' })
    }

    const [result] = await pool.query(
      "INSERT INTO categorias (nombre, descripcion, estado) VALUES (?, 'Categoria creada desde panel admin', 'ACTIVA')",
      [nombre],
    )

    return res.status(201).json({
      message: 'Categoria creada correctamente',
      categoria: {
        id_categoria: result.insertId,
        nombre,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: 'Error al crear categoria', error })
  }
})

router.delete('/categories/:idCategoria', requireAuth, requireAdmin, async (req, res) => {
  const idCategoria = Number(req.params.idCategoria)

  if (!idCategoria) {
    return res.status(400).json({ message: 'ID de categoria invalido' })
  }

  try {
    const [usageRows] = await pool.query(
      'SELECT COUNT(*) AS total FROM productos WHERE id_categoria = ?',
      [idCategoria],
    )

    if (Number(usageRows[0]?.total || 0) > 0) {
      return res.status(409).json({
        message:
          'No se puede eliminar la categoria porque tiene productos asociados. Reasigna o elimina esos productos primero.',
      })
    }

    const [result] = await pool.query('DELETE FROM categorias WHERE id_categoria = ?', [
      idCategoria,
    ])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Categoria no encontrada' })
    }

    return res.json({ message: 'Categoria eliminada correctamente' })
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar categoria', error })
  }
})

router.put('/categories/:idCategoria', requireAuth, requireAdmin, async (req, res) => {
  const idCategoria = Number(req.params.idCategoria)
  const nombre = String(req.body?.nombre || '').trim()

  if (!idCategoria) {
    return res.status(400).json({ message: 'ID de categoria invalido' })
  }

  if (!nombre) {
    return res.status(400).json({ message: 'El nuevo nombre de categoria es obligatorio' })
  }

  try {
    const [existingRows] = await pool.query(
      'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER(?) AND id_categoria <> ? LIMIT 1',
      [nombre, idCategoria],
    )

    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'Ya existe otra categoria con ese nombre' })
    }

    const [result] = await pool.query(
      'UPDATE categorias SET nombre = ? WHERE id_categoria = ?',
      [nombre, idCategoria],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Categoria no encontrada' })
    }

    return res.json({ message: 'Categoria actualizada correctamente' })
  } catch (error) {
    return res.status(500).json({ message: 'Error al actualizar categoria', error })
  }
})

function parseNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function sanitizeProductPayload(body) {
  const payload = {
    id_categoria: parseNumber(body.id_categoria),
    id_proveedor: parseNumber(body.id_proveedor),
    codigo: String(body.codigo || '').trim(),
    nombre: String(body.nombre || '').trim(),
    descripcion: String(body.descripcion || '').trim(),
    imagen_url: String(body.imagen_url || '').trim(),
    precio_compra: parseNumber(body.precio_compra),
    precio_venta: parseNumber(body.precio),
    stock: parseNumber(body.stock),
    stock_minimo: parseNumber(body.stock_minimo || 5, 5),
    unidad: String(body.unidad || '').trim(),
    estado: String(body.estado || '').trim().toUpperCase(),
  }

  return payload
}

function validateProductPayload(payload) {
  if (!payload.id_categoria || !payload.id_proveedor) {
    return 'Selecciona categoria y proveedor'
  }

  if (!payload.codigo || !payload.nombre) {
    return 'Codigo y nombre son obligatorios'
  }

  if (!payload.unidad) {
    return 'Selecciona una unidad de venta'
  }

  if (payload.estado !== 'ACTIVO' && payload.estado !== 'INACTIVO') {
    return 'Selecciona el estado del producto'
  }

  if (payload.precio_compra < 0 || payload.precio_venta < 0) {
    return 'Los precios no pueden ser negativos'
  }

  if (payload.stock < 0 || payload.stock_minimo < 0) {
    return 'Stock y stock minimo no pueden ser negativos'
  }

  return null
}

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const payload = sanitizeProductPayload(req.body)
  const validationError = validateProductPayload(payload)

  if (validationError) {
    return res.status(400).json({ message: validationError })
  }

  const hasImageColumn = await ensureProductImageColumn()
  const imageUrl = payload.imagen_url || null

  try {
    const insertColumns = [
      'id_categoria',
      'id_proveedor',
      'codigo',
      'nombre',
      'descripcion',
    ]
    const insertValues = [
      payload.id_categoria,
      payload.id_proveedor,
      payload.codigo,
      payload.nombre,
      payload.descripcion || null,
    ]

    if (hasImageColumn) {
      insertColumns.push('imagen_url')
      insertValues.push(imageUrl)
    }

    insertColumns.push(
      'precio_compra',
      'precio_venta',
      'stock',
      'stock_minimo',
      'unidad',
      'estado',
    )
    insertValues.push(
      payload.precio_compra,
      payload.precio_venta,
      payload.stock,
      payload.stock_minimo,
      payload.unidad || 'Unidad',
      payload.estado,
    )

    const [result] = await pool.query(
      `INSERT INTO productos
       (${insertColumns.join(', ')})
       VALUES (${insertColumns.map(() => '?').join(', ')})`,
      insertValues,
    )

    return res.status(201).json({
      message: 'Producto creado correctamente',
      product: {
        id_producto: result.insertId,
        ...payload,
        imagen_url: imageUrl,
        precio: payload.precio_venta,
      },
    })
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      try {
        const existingSelect = hasImageColumn
          ? `SELECT id_producto, codigo, nombre, stock, stock_minimo, precio_venta AS precio, estado, imagen_url
             FROM productos
             WHERE codigo = ?
             LIMIT 1`
          : `SELECT id_producto, codigo, nombre, stock, stock_minimo, precio_venta AS precio, estado
             FROM productos
             WHERE codigo = ?
             LIMIT 1`

        const [existingRows] = await pool.query(
          existingSelect,
          [payload.codigo],
        )

        if (existingRows.length === 0) {
          return res.status(409).json({ message: 'El codigo del producto ya existe' })
        }

        const existing = existingRows[0]
        const stockActual = Number(existing.stock) || 0
        const stockAgregar = Number(payload.stock) || 0
        const nuevoStock = stockActual + stockAgregar

        const updateAssignments = [
          'stock = ?',
          'precio_compra = ?',
          'precio_venta = ?',
          'stock_minimo = ?',
          'unidad = ?',
          'estado = ?',
        ]
        const updateValues = [
          nuevoStock,
          payload.precio_compra,
          payload.precio_venta,
          payload.stock_minimo,
          payload.unidad || 'Unidad',
          payload.estado,
        ]

        if (hasImageColumn && imageUrl) {
          updateAssignments.push('imagen_url = ?')
          updateValues.push(imageUrl)
        }

        await pool.query(
          `UPDATE productos
           SET ${updateAssignments.join(',\n               ')}
           WHERE id_producto = ?`,
          [...updateValues, existing.id_producto],
        )

        return res.status(200).json({
          message: `Inventario actualizado: se agregaron ${stockAgregar} unidades a ${existing.nombre}.`,
          product: {
            id_producto: existing.id_producto,
            codigo: existing.codigo,
            nombre: existing.nombre,
            imagen_url: existing.imagen_url || imageUrl,
            stock: nuevoStock,
            stock_minimo: payload.stock_minimo,
            precio: payload.precio_venta,
            estado: 'ACTIVO',
          },
        })
      } catch (updateError) {
        return res.status(500).json({ message: 'Error al actualizar inventario', error: updateError })
      }
    }

    return res.status(500).json({ message: 'Error al crear producto', error })
  }
})

router.put('/:idProducto', requireAuth, requireAdmin, async (req, res) => {
  const idProducto = Number(req.params.idProducto)
  if (!idProducto) {
    return res.status(400).json({ message: 'ID de producto invalido' })
  }

  const payload = sanitizeProductPayload(req.body)
  const validationError = validateProductPayload(payload)
  if (validationError) {
    return res.status(400).json({ message: validationError })
  }

  const hasImageColumn = await ensureProductImageColumn()
  const imageUrl = payload.imagen_url || null

  try {
    const updateAssignments = [
      'id_categoria = ?',
      'id_proveedor = ?',
      'codigo = ?',
      'nombre = ?',
      'descripcion = ?',
      'precio_compra = ?',
      'precio_venta = ?',
      'stock = ?',
      'stock_minimo = ?',
      'unidad = ?',
      'estado = ?',
    ]
    const updateValues = [
      payload.id_categoria,
      payload.id_proveedor,
      payload.codigo,
      payload.nombre,
      payload.descripcion || null,
      payload.precio_compra,
      payload.precio_venta,
      payload.stock,
      payload.stock_minimo,
      payload.unidad || 'Unidad',
      payload.estado,
    ]

    if (hasImageColumn) {
      updateAssignments.splice(5, 0, 'imagen_url = ?')
      updateValues.splice(5, 0, imageUrl)
    }

    const [result] = await pool.query(
      `UPDATE productos
       SET ${updateAssignments.join(',\n           ')}
       WHERE id_producto = ?`,
      [...updateValues, idProducto],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' })
    }

    return res.json({
      message: 'Producto actualizado correctamente',
      product: {
        id_producto: idProducto,
        ...payload,
        imagen_url: imageUrl,
        precio: payload.precio_venta,
      },
    })
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'El codigo del producto ya existe' })
    }

    return res.status(500).json({ message: 'Error al actualizar producto', error })
  }
})

router.delete('/:idProducto', requireAuth, requireAdmin, async (req, res) => {
  const idProducto = Number(req.params.idProducto)
  if (!idProducto) {
    return res.status(400).json({ message: 'ID de producto invalido' })
  }

  try {
    const [result] = await pool.query('DELETE FROM productos WHERE id_producto = ?', [
      idProducto,
    ])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' })
    }

    return res.json({ message: 'Producto eliminado correctamente' })
  } catch (error) {
    if (error?.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        message:
          'No se puede eliminar el producto porque tiene movimientos relacionados. Puedes dejarlo INACTIVO.',
      })
    }

    return res.status(500).json({ message: 'Error al eliminar producto', error })
  }
})

export default router

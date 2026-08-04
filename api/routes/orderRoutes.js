import express from 'express'
import pool from '../db.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import {
  deleteOrderById,
  getAllOrders,
  getOrderById,
  getOrdersByClient,
  getPendingOrders,
  upsertOrder,
} from '../orderStore.js'

const router = express.Router()
const MAX_COFFEE_UNITS_PER_ORDER = 6
const ALLOWED_PAYMENT_METHODS = ['DEPOSITO_BANCARIO', 'TRANSFERENCIA_BANCARIA']

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isCoffeeForOrderLimit(product) {
  const code = String(product?.codigo || '').trim().toUpperCase()
  const category = normalizeText(product?.categoria)

  if (code.startsWith('ACC-') || category.includes('accesor')) {
    return false
  }

  return true
}

router.post('/', requireAuth, async (req, res) => {
  const { items, metodo_pago, referencia_deposito, forma_entrega, direccion_entrega } = req.body
  const referenciaNormalizada = String(referencia_deposito || '').trim()

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Debes enviar productos para comprar' })
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(metodo_pago)) {
    return res.status(400).json({
      message: 'Método de pago inválido. Usa depósito o transferencia bancaria.',
    })
  }

  if (!['RETIRO_TIENDA', 'ENTREGA_DOMICILIO'].includes(forma_entrega)) {
    return res.status(400).json({
      message: 'Selecciona una forma de entrega válida',
    })
  }

  if (forma_entrega === 'ENTREGA_DOMICILIO' && !String(direccion_entrega || '').trim()) {
    return res.status(400).json({
      message: 'Ingresa la dirección de entrega para envío a domicilio',
    })
  }

  const ids = items.map((item) => Number(item.id_producto)).filter(Boolean)
  if (ids.length === 0) {
    return res.status(400).json({ message: 'Productos invalidos' })
  }

  let connection

  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()

    const placeholders = ids.map(() => '?').join(',')
    const [products] = await connection.query(
      `SELECT p.id_producto, p.nombre, p.precio_venta, p.codigo, c.nombre AS categoria
       FROM productos p
       INNER JOIN categorias c ON c.id_categoria = p.id_categoria
       WHERE p.id_producto IN (${placeholders})`,
      ids,
    )

    if (products.length === 0) {
      await connection.rollback()
      return res.status(400).json({ message: 'No hay productos validos para registrar' })
    }

    const productMap = new Map(products.map((p) => [p.id_producto, p]))

    let subtotal = 0
    let coffeeUnits = 0
    const pendingItems = []

    for (const item of items) {
      const product = productMap.get(Number(item.id_producto))
      const cantidad = Number(item.cantidad)

      if (!product || Number.isNaN(cantidad) || cantidad <= 0) {
        await connection.rollback()
        return res.status(400).json({ message: 'Items invalidos en la compra' })
      }

      if (isCoffeeForOrderLimit(product)) {
        coffeeUnits += cantidad
      }

      const subtotalItem = Number(product.precio_venta) * cantidad
      subtotal += subtotalItem

      pendingItems.push({
        id_producto: product.id_producto,
        cantidad,
        precio_unitario: Number(product.precio_venta),
      })
    }

    if (coffeeUnits > MAX_COFFEE_UNITS_PER_ORDER) {
      await connection.rollback()
      return res.status(400).json({
        message: `Solo puedes comprar máximo ${MAX_COFFEE_UNITS_PER_ORDER} cafés por pedido.`,
      })
    }

    const total = Number(subtotal.toFixed(2))
    const iva = Number((subtotal * 0.15).toFixed(2))
    const totalConIva = Number((subtotal + iva).toFixed(2))

    const [saleResult] = await connection.query(
      `INSERT INTO ventas (id_cliente, id_usuario, subtotal, iva, descuento, total, estado)
       VALUES (?, ?, ?, ?, 0, ?, 'PENDIENTE')`,
      [req.user.id_cliente, req.user.id_usuario, total, iva, totalConIva],
    )

    const paymentMethodName =
      metodo_pago === 'TRANSFERENCIA_BANCARIA'
        ? 'Transferencia bancaria'
        : 'Depósito bancario'
    const paymentMethodDescription =
      metodo_pago === 'TRANSFERENCIA_BANCARIA'
        ? 'Pago por transferencia a cuenta bancaria'
        : 'Pago por depósito a cuenta bancaria'

    const [paymentMethodRows] = await connection.query(
      `SELECT id_metodo FROM metodos_pago WHERE nombre = ? LIMIT 1`,
      [paymentMethodName],
    )

    let idMetodo = null
    if (paymentMethodRows.length > 0) {
      idMetodo = paymentMethodRows[0].id_metodo
    } else {
      const [methodResult] = await connection.query(
        `INSERT INTO metodos_pago (nombre, descripcion, estado)
         VALUES (?, ?, 'ACTIVO')`,
        [paymentMethodName, paymentMethodDescription],
      )
      idMetodo = methodResult.insertId
    }

    await connection.query(
      `INSERT INTO pagos (id_venta, id_metodo, monto, referencia, estado)
       VALUES (?, ?, ?, ?, 'PENDIENTE')`,
      [
        saleResult.insertId,
        idMetodo,
        totalConIva,
        referenciaNormalizada || null,
      ],
    )

    await upsertOrder({
      id_venta: saleResult.insertId,
      id_cliente: req.user.id_cliente,
      id_usuario: req.user.id_usuario,
      subtotal: total,
      iva,
      total: totalConIva,
      estado: 'PENDIENTE',
      metodo_pago: metodo_pago,
      referencia_deposito: referenciaNormalizada,
      forma_entrega,
      direccion_entrega: String(direccion_entrega || '').trim(),
      items: pendingItems,
      fecha: new Date().toISOString(),
    })

    await connection.commit()

    return res.status(201).json({
      message: 'Pedido registrado. Esperando validación del depósito.',
      order: {
        id_venta: saleResult.insertId,
        subtotal: total,
        iva,
        total: totalConIva,
        metodo_pago: paymentMethodName,
        forma_entrega,
      },
    })
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }

    return res.status(500).json({ message: 'Error al crear el pedido', error })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

router.get('/my', requireAuth, async (req, res) => {
  try {
    const orders = await getOrdersByClient(req.user.id_cliente)

    return res.json({ orders })
  } catch (error) {
    return res.status(500).json({ message: 'Error al cargar tus pedidos', error })
  }
})

router.get('/admin/sales-summary', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [admins] = await pool.query(
      `SELECT id_usuario, nombres, apellidos, correo
       FROM usuarios
       WHERE rol = 'ADMIN'`,
    )

    const adminMap = new Map(admins.map((admin) => [Number(admin.id_usuario), admin]))
    const allOrders = await getAllOrders()

    const summaryByAdmin = {}

    for (const order of allOrders) {
      const idUsuario = Number(order.id_usuario)
      const total = Number(order.total) || 0
      const subtotal = Number(order.subtotal) || 0
      const iva = Number(order.iva) || 0
      const estado = String(order.estado || '').toUpperCase()

      if (!summaryByAdmin[idUsuario]) {
        const admin = adminMap.get(idUsuario)
        summaryByAdmin[idUsuario] = {
          id_usuario: idUsuario,
          nombres: admin?.nombres || 'Desconocido',
          apellidos: admin?.apellidos || '',
          correo: admin?.correo || '',
          totalVentas: 0,
          cantidadOrdenes: 0,
          totalSubtotal: 0,
          totalIva: 0,
          totalIngreso: 0,
          ventasPorEstado: {
            PAGADA: 0,
            PENDIENTE: 0,
            ANULADA: 0,
          },
        }
      }

      summaryByAdmin[idUsuario].totalVentas += total
      summaryByAdmin[idUsuario].cantidadOrdenes += 1
      summaryByAdmin[idUsuario].totalSubtotal += subtotal
      summaryByAdmin[idUsuario].totalIva += iva

      if (estado === 'PAGADA') {
        summaryByAdmin[idUsuario].totalIngreso += total
      }

      if (Object.hasOwn(summaryByAdmin[idUsuario].ventasPorEstado, estado)) {
        summaryByAdmin[idUsuario].ventasPorEstado[estado] += 1
      }
    }

    const summary = Object.values(summaryByAdmin)
      .map((admin) => ({
        ...admin,
        totalVentas: Number(admin.totalVentas.toFixed(2)),
        totalSubtotal: Number(admin.totalSubtotal.toFixed(2)),
        totalIva: Number(admin.totalIva.toFixed(2)),
        totalIngreso: Number(admin.totalIngreso.toFixed(2)),
      }))
      .sort((a, b) => b.totalIngreso - a.totalIngreso)

    const totalesGenerales = {
      cantidadAdmins: summary.length,
      totalVentas: Number(summary.reduce((sum, admin) => sum + admin.totalVentas, 0).toFixed(2)),
      totalOrdenes: allOrders.length,
      totalIngreso: Number(summary.reduce((sum, admin) => sum + admin.totalIngreso, 0).toFixed(2)),
      ventasPromedioPorAdmin: Number(
        (summary.reduce((sum, admin) => sum + admin.totalVentas, 0) / summary.length || 0).toFixed(2),
      ),
    }

    return res.json({
      totalesGenerales,
      resumenPorAdmin: summary,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Error al generar resumen de ventas', error })
  }
})

router.get('/admin/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [clients] = await pool.query(
      `SELECT id_cliente, nombres, apellidos, telefono, correo
       FROM clientes`,
    )

    const clientMap = new Map(clients.map((client) => [Number(client.id_cliente), client]))
    const pendingOrders = await getPendingOrders()

    const orders = pendingOrders.map((order) => {
      const client = clientMap.get(Number(order.id_cliente))
      return {
        ...order,
        cliente: client
          ? {
              nombres: client.nombres,
              apellidos: client.apellidos,
              telefono: client.telefono,
              correo: client.correo,
            }
          : {
              nombres: 'Cliente',
              apellidos: '',
              telefono: '',
              correo: '',
            },
      }
    })

    return res.json({ orders })
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar pedidos pendientes', error })
  }
})

router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [clients] = await pool.query(
      `SELECT id_cliente, nombres, apellidos, telefono, correo
       FROM clientes`,
    )

    const [products] = await pool.query(
      `SELECT p.id_producto, p.nombre, c.nombre AS categoria
       FROM productos p
       LEFT JOIN categorias c ON c.id_categoria = p.id_categoria`,
    )

    const clientMap = new Map(clients.map((client) => [Number(client.id_cliente), client]))
    const productMap = new Map(
      products.map((product) => [Number(product.id_producto), product]),
    )

    const allOrders = await getAllOrders()

    const statusWeight = {
      PENDIENTE: 0,
      PAGADA: 1,
      ANULADA: 2,
    }

    const orders = allOrders
      .map((order) => {
        const client = clientMap.get(Number(order.id_cliente))
        const estado = String(order.estado || '').toUpperCase()
        const items = Array.isArray(order.items)
          ? order.items.map((item) => {
              const product = productMap.get(Number(item.id_producto))
              return {
                ...item,
                nombre_producto: product?.nombre || `Producto #${item.id_producto}`,
                categoria_producto: product?.categoria || 'Sin categoría',
              }
            })
          : []

        return {
          ...order,
          estado,
          items,
          cliente: client
            ? {
                nombres: client.nombres,
                apellidos: client.apellidos,
                telefono: client.telefono,
                correo: client.correo,
              }
            : {
                nombres: 'Cliente',
                apellidos: '',
                telefono: '',
                correo: '',
              },
        }
      })
      .sort((left, right) => {
        const leftWeight = statusWeight[left.estado] ?? 9
        const rightWeight = statusWeight[right.estado] ?? 9

        if (leftWeight !== rightWeight) {
          return leftWeight - rightWeight
        }

        const leftDate = new Date(left.fecha || 0).getTime()
        const rightDate = new Date(right.fecha || 0).getTime()
        return rightDate - leftDate
      })

    return res.json({ orders })
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar todos los pedidos', error })
  }
})

router.put('/admin/:idVenta/approve', requireAuth, requireAdmin, async (req, res) => {
  const idVenta = Number(req.params.idVenta)
  if (!idVenta) {
    return res.status(400).json({ message: 'ID de venta invalido' })
  }

  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()

    const sale = await getOrderById(idVenta)

    if (!sale) {
      await connection.rollback()
      return res.status(404).json({ message: 'Pedido no encontrado' })
    }

    if (sale.estado !== 'PENDIENTE') {
      await connection.rollback()
      return res.status(409).json({ message: 'Este pedido ya fue procesado' })
    }

    const pendingItems = Array.isArray(sale.items) ? sale.items : []

    if (pendingItems.length === 0) {
      await connection.rollback()
      return res.status(400).json({ message: 'El pedido no tiene detalle para aprobar' })
    }

    const ids = pendingItems
      .map((item) => Number(item.id_producto))
      .filter((value) => Number.isInteger(value) && value > 0)

    const placeholders = ids.map(() => '?').join(',')
    const [products] = await connection.query(
      `SELECT id_producto, nombre, precio_venta, stock
       FROM productos
       WHERE id_producto IN (${placeholders})
       FOR UPDATE`,
      ids,
    )

    if (products.length !== ids.length) {
      await connection.rollback()
      return res.status(400).json({ message: 'Uno o mas productos ya no existen' })
    }

    const productMap = new Map(products.map((product) => [product.id_producto, product]))

    for (const item of pendingItems) {
      const product = productMap.get(Number(item.id_producto))
      const cantidad = Number(item.cantidad)
      if (!product || !Number.isFinite(cantidad) || cantidad <= 0) {
        await connection.rollback()
        return res.status(400).json({ message: 'El pedido tiene items invalidos' })
      }

      if (Number(product.stock) < cantidad) {
        await connection.rollback()
        return res.status(409).json({
          message: `Stock insuficiente para aprobar: ${product.nombre}`,
        })
      }
    }

    for (const item of pendingItems) {
      const product = productMap.get(Number(item.id_producto))
      const cantidad = Number(item.cantidad)

      // Update stock directly to avoid failures caused by inconsistent DB triggers.
      const [stockUpdate] = await connection.query(
        `UPDATE productos
         SET stock = stock - ?
         WHERE id_producto = ? AND stock >= ?`,
        [cantidad, product.id_producto, cantidad],
      )

      if (stockUpdate.affectedRows === 0) {
        await connection.rollback()
        return res.status(409).json({
          message: `Stock insuficiente para aprobar: ${product.nombre}`,
        })
      }

      await connection.query(
        `INSERT INTO movimiento_inventario (id_producto, id_usuario, tipo, cantidad, motivo)
         VALUES (?, ?, 'SALIDA', ?, 'Venta aprobada')`,
        [product.id_producto, Number(req.user.id_usuario), cantidad],
      )
    }

    await connection.query(
      `UPDATE ventas
       SET estado = 'PAGADA'
       WHERE id_venta = ?`,
      [idVenta],
    )

    await connection.query(
      `UPDATE pagos
       SET estado = 'CONFIRMADO'
       WHERE id_venta = ?`,
      [idVenta],
    )

    await upsertOrder({
      ...sale,
      estado: 'PAGADA',
    })

    await connection.commit()
    return res.json({ message: 'Pedido aprobado y stock descontado correctamente' })
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }
    return res.status(500).json({ message: 'Error al aprobar pedido', error })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

router.put('/admin/:idVenta/reject', requireAuth, requireAdmin, async (req, res) => {
  const idVenta = Number(req.params.idVenta)
  if (!idVenta) {
    return res.status(400).json({ message: 'ID de venta invalido' })
  }

  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()

    const sale = await getOrderById(idVenta)

    if (!sale) {
      await connection.rollback()
      return res.status(404).json({ message: 'Pedido no encontrado' })
    }

    if (sale.estado !== 'PENDIENTE') {
      await connection.rollback()
      return res.status(409).json({ message: 'Este pedido ya fue procesado' })
    }

    await connection.query(
      `UPDATE ventas
       SET estado = 'ANULADA'
       WHERE id_venta = ?`,
      [idVenta],
    )

    await connection.query(
      `UPDATE pagos
       SET estado = 'RECHAZADO'
       WHERE id_venta = ?`,
      [idVenta],
    )

    await upsertOrder({
      ...sale,
      estado: 'ANULADA',
    })

    await connection.commit()
    return res.json({ message: 'Pedido rechazado correctamente' })
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }
    return res.status(500).json({ message: 'Error al rechazar pedido', error })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

router.delete('/my/:idVenta', requireAuth, async (req, res) => {
  const idVenta = Number(req.params.idVenta)
  if (!idVenta) {
    return res.status(400).json({ message: 'ID de venta invalido' })
  }

  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()

    const [saleRows] = await connection.query(
      `SELECT v.id_venta, v.estado, v.id_cliente, p.referencia AS referencia_pago
       FROM ventas v
       LEFT JOIN pagos p ON p.id_venta = v.id_venta
       WHERE v.id_venta = ?
       FOR UPDATE`,
      [idVenta],
    )

    if (saleRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: 'Pedido no encontrado' })
    }

    const sale = saleRows[0]
    if (Number(sale.id_cliente) !== Number(req.user.id_cliente)) {
      await connection.rollback()
      return res.status(403).json({ message: 'No puedes eliminar este pedido' })
    }

    if (sale.estado !== 'PENDIENTE') {
      await connection.rollback()
      return res.status(409).json({ message: 'Solo puedes eliminar pedidos pendientes' })
    }

    const referenciaPago = String(sale.referencia_pago || '').trim()
    if (referenciaPago) {
      await connection.rollback()
      return res.status(409).json({
        message: 'Solo puedes eliminar pedidos sin comprobante enviado',
      })
    }

    await connection.query(
      `DELETE FROM pagos
       WHERE id_venta = ?`,
      [idVenta],
    )

    await connection.query(
      `DELETE FROM ventas
       WHERE id_venta = ?`,
      [idVenta],
    )

    await deleteOrderById(idVenta)

    await connection.commit()
    return res.json({ message: 'Pedido eliminado correctamente' })
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }
    return res.status(500).json({ message: 'Error al eliminar el pedido', error })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

router.delete('/my', requireAuth, async (req, res) => {
  let connection

  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()

    const [sales] = await connection.query(
      `SELECT id_venta, estado
       FROM ventas
       WHERE id_cliente = ?
       FOR UPDATE`,
      [req.user.id_cliente],
    )

    if (sales.length === 0) {
      await connection.rollback()
      return res.json({ message: 'No tienes pedidos para eliminar' })
    }

    const ids = sales.map((sale) => Number(sale.id_venta)).filter(Boolean)
    const placeholders = ids.map(() => '?').join(',')

    const [paymentRows] = await connection.query(
      `SELECT id_venta, referencia
       FROM pagos
       WHERE id_venta IN (${placeholders})
       FOR UPDATE`,
      ids,
    )

    const paymentReferenceBySale = new Map()
    for (const row of paymentRows) {
      const id = Number(row.id_venta)
      const reference = String(row.referencia || '').trim()
      if (reference) {
        paymentReferenceBySale.set(id, true)
      }
    }

    const deletableIds = sales
      .filter((sale) => {
        const idVenta = Number(sale.id_venta)
        const isPending = String(sale.estado || '').toUpperCase() === 'PENDIENTE'
        const hasPaymentProof = paymentReferenceBySale.get(idVenta) === true
        return isPending && !hasPaymentProof
      })
      .map((sale) => Number(sale.id_venta))

    if (deletableIds.length === 0) {
      await connection.rollback()
      return res.status(409).json({
        message: 'Solo puedes eliminar pedidos pendientes sin comprobante enviado',
      })
    }

    const deletablePlaceholders = deletableIds.map(() => '?').join(',')

    await connection.query(
      `DELETE FROM detalle_venta
       WHERE id_venta IN (${deletablePlaceholders})`,
      deletableIds,
    )

    await connection.query(
      `DELETE FROM pagos
       WHERE id_venta IN (${deletablePlaceholders})`,
      deletableIds,
    )

    await connection.query(
      `DELETE FROM ventas
       WHERE id_venta IN (${deletablePlaceholders})`,
      deletableIds,
    )

    for (const idVenta of deletableIds) {
      await deleteOrderById(idVenta)
    }

    await connection.commit()
    return res.json({
      message: `Se eliminaron ${deletableIds.length} pedido(s) sin comprobante enviado.`,
    })
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }
    return res.status(500).json({ message: 'Error al eliminar historial', error })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

export default router

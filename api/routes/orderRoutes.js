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
import {
  isCoffeeForOrderLimit,
  MAX_COFFEE_UNITS_PER_ORDER,
  getDeliveryQuote,
} from '../utils/orderRules.js'
import {
  ALLOWED_PAYMENT_METHODS,
  buildCoffeeLimitValidationMessage,
  buildDeletedWithoutProofMessage,
  ORDER_MESSAGES,
  ORDER_STATUS,
  PAYMENT_METHOD,
} from '../constants/orderConstants.js'

const router = express.Router()

router.post('/', requireAuth, async (req, res) => {
  // Creacion de pedido con validaciones de pago, entrega y limite de cafes.
  const {
    items,
    metodo_pago,
    referencia_deposito,
    forma_entrega,
    direccion_entrega,
    provincia_entrega,
    ciudad_entrega,
    sector_entrega,
  } = req.body
  const referenciaNormalizada = String(referencia_deposito || '').trim()
  const provinciaEntrega = String(provincia_entrega || '').trim()
  const ciudadEntrega = String(ciudad_entrega || '').trim()
  const sectorEntrega = String(sector_entrega || '').trim()
  const direccionEntrega = String(direccion_entrega || '').trim()

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: ORDER_MESSAGES.missingItems })
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(metodo_pago)) {
    return res.status(400).json({
      message: ORDER_MESSAGES.invalidPaymentMethod,
    })
  }

  if (!['RETIRO_TIENDA', 'ENTREGA_DOMICILIO'].includes(forma_entrega)) {
    return res.status(400).json({
      message: ORDER_MESSAGES.invalidDeliveryMethod,
    })
  }

  if (
    forma_entrega === 'ENTREGA_DOMICILIO' &&
    (!provinciaEntrega || !ciudadEntrega || !sectorEntrega || !direccionEntrega)
  ) {
    return res.status(400).json({
      message: ORDER_MESSAGES.missingDeliveryAddress,
    })
  }

  const ids = items.map((item) => Number(item.id_producto)).filter(Boolean)
  if (ids.length === 0) {
    return res.status(400).json({ message: ORDER_MESSAGES.invalidProducts })
  }

  let connection

  try {
    // Transaccion para mantener consistencia entre ventas, pagos y store JSON.
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
      return res.status(400).json({ message: ORDER_MESSAGES.noValidProducts })
    }

    const productMap = new Map(products.map((p) => [p.id_producto, p]))

    let subtotal = 0
    let coffeeUnits = 0
    const pendingItems = []

    // Valida cada item y calcula subtotal acumulado.
    for (const item of items) {
      const product = productMap.get(Number(item.id_producto))
      const cantidad = Number(item.cantidad)

      if (!product || Number.isNaN(cantidad) || cantidad <= 0) {
        await connection.rollback()
        return res.status(400).json({ message: ORDER_MESSAGES.invalidItemsInOrder })
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
        message: buildCoffeeLimitValidationMessage(MAX_COFFEE_UNITS_PER_ORDER),
      })
    }

    const total = Number(subtotal.toFixed(2))
    const iva = Number((subtotal * 0.15).toFixed(2))
    const deliveryQuote = getDeliveryQuote(
      forma_entrega,
      provinciaEntrega,
      ciudadEntrega,
      sectorEntrega,
      direccionEntrega,
    )
    const costoEnvio = Number(deliveryQuote.fee || 0)
    const totalConIva = Number((subtotal + iva + costoEnvio).toFixed(2))
    const direccionEntregaCompleta =
      forma_entrega === 'ENTREGA_DOMICILIO'
        ? `${provinciaEntrega}, ${ciudadEntrega}, ${sectorEntrega}, ${direccionEntrega}`
        : ''

    const [saleResult] = await connection.query(
      `INSERT INTO ventas (id_cliente, id_usuario, subtotal, iva, descuento, total, estado)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [req.user.id_cliente, req.user.id_usuario, total, iva, totalConIva, ORDER_STATUS.PENDING],
    )

    const paymentMethodName =
      metodo_pago === PAYMENT_METHOD.BANK_TRANSFER
        ? 'Transferencia bancaria'
        : 'Depósito bancario'
    const paymentMethodDescription =
      metodo_pago === PAYMENT_METHOD.BANK_TRANSFER
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
       VALUES (?, ?, ?, ?, ?)`,
      [
        saleResult.insertId,
        idMetodo,
        totalConIva,
        referenciaNormalizada || null,
        ORDER_STATUS.PENDING,
      ],
    )

    await upsertOrder({
      id_venta: saleResult.insertId,
      id_cliente: req.user.id_cliente,
      id_usuario: req.user.id_usuario,
      subtotal: total,
      iva,
      costo_envio: costoEnvio,
      total: totalConIva,
      estado: ORDER_STATUS.PENDING,
      metodo_pago: metodo_pago,
      referencia_deposito: referenciaNormalizada,
      forma_entrega,
      provincia_entrega: provinciaEntrega,
      ciudad_entrega: ciudadEntrega,
      sector_entrega: sectorEntrega,
      direccion_entrega: direccionEntregaCompleta,
      distancia_envio: deliveryQuote.distanceLabel,
      items: pendingItems,
      fecha: new Date().toISOString(),
    })

    await connection.commit()

    return res.status(201).json({
      message: ORDER_MESSAGES.orderCreated,
      order: {
        id_venta: saleResult.insertId,
        subtotal: total,
        iva,
        costo_envio: costoEnvio,
        total: totalConIva,
        metodo_pago: paymentMethodName,
        forma_entrega,
        distancia_envio: deliveryQuote.distanceLabel,
      },
    })
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }

    return res.status(500).json({ message: ORDER_MESSAGES.orderCreateFailed, error })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

router.get('/my', requireAuth, async (req, res) => {
  // Historial del cliente autenticado.
  try {
    const orders = await getOrdersByClient(req.user.id_cliente)

    return res.json({ orders })
  } catch (error) {
    return res.status(500).json({ message: ORDER_MESSAGES.myOrdersLoadFailed, error })
  }
})

router.get('/admin/sales-summary', requireAuth, requireAdmin, async (req, res) => {
  // Resumen agregado por administrador para panel de ingresos.
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
            [ORDER_STATUS.PAID]: 0,
            [ORDER_STATUS.PENDING]: 0,
            [ORDER_STATUS.CANCELED]: 0,
          },
        }
      }

      summaryByAdmin[idUsuario].totalVentas += total
      summaryByAdmin[idUsuario].cantidadOrdenes += 1
      summaryByAdmin[idUsuario].totalSubtotal += subtotal
      summaryByAdmin[idUsuario].totalIva += iva

      if (estado === ORDER_STATUS.PAID) {
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
    return res.status(500).json({ message: ORDER_MESSAGES.salesSummaryFailed, error })
  }
})

router.get('/admin/pending', requireAuth, requireAdmin, async (req, res) => {
  // Vista enfocada en pedidos pendientes con datos de cliente enriquecidos.
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
    return res.status(500).json({ message: ORDER_MESSAGES.pendingOrdersLoadFailed, error })
  }
})

router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  // Lista completa ordenada por prioridad de estado y fecha.
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
      [ORDER_STATUS.PENDING]: 0,
      [ORDER_STATUS.PAID]: 1,
      [ORDER_STATUS.CANCELED]: 2,
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
    return res.status(500).json({ message: ORDER_MESSAGES.allOrdersLoadFailed, error })
  }
})

router.put('/admin/:idVenta/approve', requireAuth, requireAdmin, async (req, res) => {
  // Aprueba pedido: valida stock, descuenta inventario y confirma pago.
  const idVenta = Number(req.params.idVenta)
  if (!idVenta) {
    return res.status(400).json({ message: ORDER_MESSAGES.invalidSaleId })
  }

  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()

    const sale = await getOrderById(idVenta)

    if (!sale) {
      await connection.rollback()
      return res.status(404).json({ message: ORDER_MESSAGES.orderNotFound })
    }

    if (sale.estado !== ORDER_STATUS.PENDING) {
      await connection.rollback()
      return res.status(409).json({ message: ORDER_MESSAGES.orderAlreadyProcessed })
    }

    const pendingItems = Array.isArray(sale.items) ? sale.items : []

    if (pendingItems.length === 0) {
      await connection.rollback()
      return res.status(400).json({ message: ORDER_MESSAGES.orderMissingDetails })
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
      return res.status(400).json({ message: ORDER_MESSAGES.missingProductsAtApproval })
    }

    const productMap = new Map(products.map((product) => [product.id_producto, product]))

    // Doble validacion antes de descontar stock para evitar negativos.
    for (const item of pendingItems) {
      const product = productMap.get(Number(item.id_producto))
      const cantidad = Number(item.cantidad)
      if (!product || !Number.isFinite(cantidad) || cantidad <= 0) {
        await connection.rollback()
        return res.status(400).json({ message: ORDER_MESSAGES.invalidItemsAtApproval })
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
       SET estado = ?
       WHERE id_venta = ?`,
      [ORDER_STATUS.PAID, idVenta],
    )

    await connection.query(
      `UPDATE pagos
       SET estado = 'CONFIRMADO'
       WHERE id_venta = ?`,
      [idVenta],
    )

    await upsertOrder({
      ...sale,
      estado: ORDER_STATUS.PAID,
    })

    await connection.commit()
    return res.json({ message: ORDER_MESSAGES.orderApproved })
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }
    return res.status(500).json({ message: ORDER_MESSAGES.orderApproveFailed, error })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

router.put('/admin/:idVenta/reject', requireAuth, requireAdmin, async (req, res) => {
  // Rechaza pedido pendiente y actualiza estados en ventas/pagos.
  const idVenta = Number(req.params.idVenta)
  if (!idVenta) {
    return res.status(400).json({ message: ORDER_MESSAGES.invalidSaleId })
  }

  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()

    const sale = await getOrderById(idVenta)

    if (!sale) {
      await connection.rollback()
      return res.status(404).json({ message: ORDER_MESSAGES.orderNotFound })
    }

    if (sale.estado !== ORDER_STATUS.PENDING) {
      await connection.rollback()
      return res.status(409).json({ message: ORDER_MESSAGES.orderAlreadyProcessed })
    }

    await connection.query(
      `UPDATE ventas
       SET estado = ?
       WHERE id_venta = ?`,
      [ORDER_STATUS.CANCELED, idVenta],
    )

    await connection.query(
      `UPDATE pagos
       SET estado = 'RECHAZADO'
       WHERE id_venta = ?`,
      [idVenta],
    )

    await upsertOrder({
      ...sale,
      estado: ORDER_STATUS.CANCELED,
    })

    await connection.commit()
    return res.json({ message: ORDER_MESSAGES.orderRejected })
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }
    return res.status(500).json({ message: ORDER_MESSAGES.orderRejectFailed, error })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

router.delete('/my/:idVenta', requireAuth, async (req, res) => {
  // Elimina un pedido propio solo si sigue pendiente y sin comprobante.
  const idVenta = Number(req.params.idVenta)
  if (!idVenta) {
    return res.status(400).json({ message: ORDER_MESSAGES.invalidSaleId })
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
      return res.status(404).json({ message: ORDER_MESSAGES.orderNotFound })
    }

    const sale = saleRows[0]
    if (Number(sale.id_cliente) !== Number(req.user.id_cliente)) {
      await connection.rollback()
      return res.status(403).json({ message: ORDER_MESSAGES.notOwnerDeleteOrder })
    }

    if (sale.estado !== ORDER_STATUS.PENDING) {
      await connection.rollback()
      return res.status(409).json({ message: ORDER_MESSAGES.onlyPendingCanDelete })
    }

    const referenciaPago = String(sale.referencia_pago || '').trim()
    if (referenciaPago) {
      await connection.rollback()
      return res.status(409).json({
        message: ORDER_MESSAGES.onlyNoProofCanDelete,
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
    return res.json({ message: ORDER_MESSAGES.orderDeleted })
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }
    return res.status(500).json({ message: ORDER_MESSAGES.orderDeleteFailed, error })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

router.delete('/my', requireAuth, async (req, res) => {
  // Limpieza masiva de historial: solo pedidos pendientes sin comprobante.
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
      return res.json({ message: ORDER_MESSAGES.missingClientOrders })
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
        const isPending = String(sale.estado || '').toUpperCase() === ORDER_STATUS.PENDING
        const hasPaymentProof = paymentReferenceBySale.get(idVenta) === true
        return isPending && !hasPaymentProof
      })
      .map((sale) => Number(sale.id_venta))

    if (deletableIds.length === 0) {
      await connection.rollback()
      return res.status(409).json({
        message: ORDER_MESSAGES.onlyPendingNoProofBulkDelete,
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
      message: buildDeletedWithoutProofMessage(deletableIds.length),
    })
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }
    return res.status(500).json({ message: ORDER_MESSAGES.historyDeleteFailed, error })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

export default router

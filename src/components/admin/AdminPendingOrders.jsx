import { useCallback, useEffect, useMemo, useState } from 'react'
import AppButton from '../ui/AppButton'
import { ADMIN_ORDER_UI_TEXT, ORDER_STATUS } from '../../constants/orderConstants'

export default function AdminPendingOrders({
  apiUrl,
  token,
  onNotify,
  currency,
  formatOrderDate,
  formatDeliveryText,
}) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingOrderId, setProcessingOrderId] = useState(null)

  const groupedOrders = useMemo(() => {
    const groups = {
      [ORDER_STATUS.PENDING]: [],
      [ORDER_STATUS.PAID]: [],
      [ORDER_STATUS.CANCELED]: [],
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
        key: ORDER_STATUS.PENDING,
        title: 'En espera',
      },
      {
        key: ORDER_STATUS.PAID,
        title: 'Vendidos',
      },
      {
        key: ORDER_STATUS.CANCELED,
        title: 'Cancelados',
      },
    ],
    [],
  )

  const loadAdminOrders = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${apiUrl}/orders/admin/all`, {
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
  }, [apiUrl, token, onNotify])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadAdminOrders()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [loadAdminOrders])

  const processOrder = async (idVenta, action) => {
    const actionName = action === 'approve' ? 'aprobar' : 'rechazar'
    const confirmed = window.confirm(
      action === 'approve'
        ? ADMIN_ORDER_UI_TEXT.approveConfirm(idVenta)
        : ADMIN_ORDER_UI_TEXT.rejectConfirm(idVenta),
    )
    if (!confirmed) return

    setProcessingOrderId(idVenta)
    try {
      const response = await fetch(`${apiUrl}/orders/admin/${idVenta}/${action}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || ADMIN_ORDER_UI_TEXT.processOrderFailed(actionName))
      }

      onNotify(data.message || ADMIN_ORDER_UI_TEXT.processOrderSuccess(idVenta))
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
        <h3>{ADMIN_ORDER_UI_TEXT.adminOrdersTitle}</h3>
        <AppButton variant="ghost" type="button" onClick={loadAdminOrders}>
          {ADMIN_ORDER_UI_TEXT.reload}
        </AppButton>
      </div>

      {loading ? <p className="status-text">{ADMIN_ORDER_UI_TEXT.loadingOrders}</p> : null}

      {!loading && orders.length === 0 ? (
        <p className="status-text">{ADMIN_ORDER_UI_TEXT.noOrdersYet}</p>
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
                  <p className="status-text">{ADMIN_ORDER_UI_TEXT.noOrdersInSection}</p>
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
                        <p>Teléfono: {order.cliente?.telefono || ADMIN_ORDER_UI_TEXT.unregistered}</p>
                        <p>Correo: {order.cliente?.correo || ADMIN_ORDER_UI_TEXT.unregistered}</p>
                        <p>Referencia depósito: {order.referencia_deposito || '-'}</p>
                        <p>{formatDeliveryText(order.forma_entrega, order.direccion_entrega)}</p>
                        {order.forma_entrega === 'ENTREGA_DOMICILIO' ? (
                          <p>Costo del envío: {currency(Number(order.costo_envio) || 0)}</p>
                        ) : null}
                        <p>Total: {currency(Number(order.total) || 0)}</p>

                        <div className="admin-order-items">
                          <p>Items:</p>
                          <ul>
                            {(order.items || []).map((item) => (
                              <li key={`${order.id_venta}-${item.id_producto}`}>
                                {item.nombre_producto || `Producto #${item.id_producto}`} ({item.categoria_producto || ADMIN_ORDER_UI_TEXT.noCategory}) - Cantidad: {item.cantidad}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {section.key === ORDER_STATUS.PENDING ? (
                          <div className="admin-order-actions">
                            <AppButton
                              variant="solid"
                              type="button"
                              disabled={processingOrderId === order.id_venta}
                              onClick={() => processOrder(order.id_venta, 'approve')}
                            >
                              {processingOrderId === order.id_venta
                                ? ADMIN_ORDER_UI_TEXT.processing
                                : ADMIN_ORDER_UI_TEXT.approveAndDiscountStock}
                            </AppButton>
                            <AppButton
                              variant="danger"
                              type="button"
                              disabled={processingOrderId === order.id_venta}
                              onClick={() => processOrder(order.id_venta, 'reject')}
                            >
                              {ADMIN_ORDER_UI_TEXT.rejectOrder}
                            </AppButton>
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppButton from '../components/ui/AppButton'
import { ORDER_STATUS, ORDER_STATUS_LABEL, ORDER_UI_TEXT } from '../constants/orderConstants'

function statusLabelByOrderState(order) {
  if (order.estado === ORDER_STATUS.PAID) {
    return ORDER_STATUS_LABEL[ORDER_STATUS.PAID]
  }

  if (order.estado === ORDER_STATUS.CANCELED) {
    return ORDER_STATUS_LABEL[ORDER_STATUS.CANCELED]
  }

  return ORDER_STATUS_LABEL[ORDER_STATUS.PENDING]
}

function hasPaymentProofReference(order) {
  return Boolean(String(order?.referencia_deposito || '').trim())
}

function canClientDeleteOrder(order) {
  const status = String(order?.estado || '').toUpperCase()
  return status === ORDER_STATUS.PENDING && !hasPaymentProofReference(order)
}

export default function MyOrdersPage({
  apiUrl,
  token,
  onNotify,
  currency,
  formatOrderDate,
  formatDeliveryText,
}) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingOrderId, setDeletingOrderId] = useState(null)
  const [clearingHistory, setClearingHistory] = useState(false)
  const previousStatusesRef = useRef(new Map())
  const deletableOrdersCount = useMemo(
    () => orders.filter((order) => canClientDeleteOrder(order)).length,
    [orders],
  )

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/orders/my`, {
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
          if (order.estado === ORDER_STATUS.PAID) {
            onNotify(`Pedido #${order.id_venta} aprobado por COOFE DRINK. Tu pedido está listo para retirar.`)
          }

          if (order.estado === ORDER_STATUS.CANCELED) {
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
  }, [apiUrl, token, onNotify])

  const deleteOrder = async (idVenta) => {
    const confirmed = window.confirm(`Deseas eliminar el pedido #${idVenta}?`)
    if (!confirmed) return

    setDeletingOrderId(idVenta)
    try {
      const response = await fetch(`${apiUrl}/orders/my/${idVenta}`, {
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
      ORDER_UI_TEXT.clearHistoryConfirm,
    )
    if (!confirmed) return

    setClearingHistory(true)
    try {
      const response = await fetch(`${apiUrl}/orders/my`, {
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
          <AppButton variant="ghost" type="button" onClick={loadOrders}>
            Actualizar
          </AppButton>
          <AppButton
            variant="danger"
            type="button"
            onClick={clearHistory}
            disabled={clearingHistory || deletableOrdersCount === 0}
          >
            {clearingHistory ? ORDER_UI_TEXT.deletingOrders : ORDER_UI_TEXT.deleteOrdersWithoutProof}
          </AppButton>
        </div>
      </div>

      {loading ? <p className="status-text">{ORDER_UI_TEXT.loadingOrders}</p> : null}

      {!loading && orders.length === 0 ? (
        <p className="status-text">{ORDER_UI_TEXT.ordersEmpty}</p>
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
              <p>Referencia depósito: {order.referencia_deposito || '-'}</p>
              <p>{formatDeliveryText(order.forma_entrega, order.direccion_entrega)}</p>
              {order.forma_entrega === 'ENTREGA_DOMICILIO' ? (
                <p>Costo del envío: {currency(Number(order.costo_envio) || 0)}</p>
              ) : null}
              <p className="order-status">{statusLabelByOrderState(order)}</p>
              {canClientDeleteOrder(order) ? (
                <AppButton
                  variant="danger"
                  type="button"
                  onClick={() => deleteOrder(order.id_venta)}
                  disabled={deletingOrderId === order.id_venta}
                >
                  {deletingOrderId === order.id_venta
                    ? 'Eliminando...'
                    : 'Eliminar pedido'}
                </AppButton>
              ) : order.estado === ORDER_STATUS.PENDING ? (
                <p className="status-text">
                  {ORDER_UI_TEXT.orderDeleteBlockedByProof}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}

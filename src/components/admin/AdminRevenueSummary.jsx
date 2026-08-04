import { useCallback, useEffect, useMemo, useState } from 'react'
import AppButton from '../ui/AppButton'
import { ADMIN_REVENUE_UI_TEXT, ORDER_STATUS } from '../../constants/orderConstants'

export default function AdminRevenueSummary({ apiUrl, token, onNotify, currency }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const loadRevenue = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${apiUrl}/orders/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || ADMIN_REVENUE_UI_TEXT.loadFailed)
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

      if (estado === ORDER_STATUS.PAID) {
        result.ingresosConfirmados += total
        result.cantidadPagadas += 1
      } else if (estado === ORDER_STATUS.PENDING) {
        result.ventasPendientes += total
        result.cantidadPendientes += 1
      } else if (estado === ORDER_STATUS.CANCELED) {
        result.ventasAnuladas += total
        result.cantidadAnuladas += 1
      }
    }

    return result
  }, [orders])

  return (
    <section className="card revenue-card">
      <div className="inventory-head">
        <h2>{ADMIN_REVENUE_UI_TEXT.title}</h2>
        <AppButton variant="ghost" type="button" onClick={loadRevenue}>
          {ADMIN_REVENUE_UI_TEXT.refresh}
        </AppButton>
      </div>

      {loading ? <p className="status-text">{ADMIN_REVENUE_UI_TEXT.loading}</p> : null}

      {!loading ? (
        <div className="revenue-grid">
          <article className="revenue-kpi">
            <p>{ADMIN_REVENUE_UI_TEXT.confirmedIncome}</p>
            <strong>{currency(totals.ingresosConfirmados)}</strong>
            <span>{ADMIN_REVENUE_UI_TEXT.paidOrdersCount(totals.cantidadPagadas)}</span>
          </article>
          <article className="revenue-kpi">
            <p>{ADMIN_REVENUE_UI_TEXT.pendingValidation}</p>
            <strong>{currency(totals.ventasPendientes)}</strong>
            <span>{ADMIN_REVENUE_UI_TEXT.pendingOrdersCount(totals.cantidadPendientes)}</span>
          </article>
          <article className="revenue-kpi">
            <p>{ADMIN_REVENUE_UI_TEXT.canceledSales}</p>
            <strong>{currency(totals.ventasAnuladas)}</strong>
            <span>{ADMIN_REVENUE_UI_TEXT.canceledOrdersCount(totals.cantidadAnuladas)}</span>
          </article>
        </div>
      ) : null}
    </section>
  )
}

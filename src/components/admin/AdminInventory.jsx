import { useCallback, useEffect, useState } from 'react'
import AppButton from '../ui/AppButton'
import { ADMIN_INVENTORY_UI_TEXT } from '../../constants/orderConstants'

export default function AdminInventory({ apiUrl, token, onNotify, currency }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const loadInventory = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${apiUrl}/products`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || ADMIN_INVENTORY_UI_TEXT.loadFailed)
      }
      setProducts(data.products || [])
    } catch (requestError) {
      onNotify(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [apiUrl, token, onNotify])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadInventory()
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [loadInventory])

  return (
    <section className="card inventory-card">
      <div className="inventory-head">
        <h2>{ADMIN_INVENTORY_UI_TEXT.title}</h2>
        <AppButton variant="ghost" type="button" onClick={loadInventory}>
          {ADMIN_INVENTORY_UI_TEXT.refresh}
        </AppButton>
      </div>

      {loading ? <p className="status-text">{ADMIN_INVENTORY_UI_TEXT.loading}</p> : null}

      {!loading && products.length === 0 ? (
        <p className="status-text">{ADMIN_INVENTORY_UI_TEXT.empty}</p>
      ) : null}

      {!loading && products.length > 0 ? (
        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Producto</th>
                <th>Categoría</th>
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
                    <td>{product.unidad || ADMIN_INVENTORY_UI_TEXT.unitFallback}</td>
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

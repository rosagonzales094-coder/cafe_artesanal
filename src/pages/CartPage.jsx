import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppButton from '../components/ui/AppButton'

export default function CartPage({
  cartItems,
  onChangeQuantity,
  onRemove,
  onCountCoffeeUnits,
  currency,
  maxCoffeeUnits,
}) {
  const navigate = useNavigate()
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + Number(item.precio) * Number(item.cantidad),
        0,
      ),
    [cartItems],
  )
  const coffeeUnits = useMemo(
    () => onCountCoffeeUnits(cartItems),
    [cartItems, onCountCoffeeUnits],
  )

  if (cartItems.length === 0) {
    return <p className="status-text">Tu carrito está vacío.</p>
  }

  return (
    <section className="card">
      <h2>Carrito de compras</h2>
      <p className="status-text">
        Cafes en pedido: <strong>{coffeeUnits}</strong>/{maxCoffeeUnits}
      </p>
      {cartItems.map((item) => (
        <div key={item.id_producto} className="cart-row">
          <div>
            <h3>{item.nombre}</h3>
            <p>{currency(Number(item.precio))}</p>
          </div>
          <input
            type="number"
            min="1"
            value={item.cantidad}
            onChange={(event) =>
              onChangeQuantity(item.id_producto, Number(event.target.value))
            }
          />
          <AppButton
            variant="ghost"
            type="button"
            onClick={() => onRemove(item.id_producto)}
          >
            Quitar
          </AppButton>
        </div>
      ))}
      <div className="summary-line">
        <strong>Total: {currency(subtotal)}</strong>
        <AppButton variant="solid" onClick={() => navigate('/pago')}>
          Continuar a pago
        </AppButton>
      </div>
    </section>
  )
}

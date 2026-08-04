import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppButton from '../components/ui/AppButton'
import {
  buildCoffeeLimitExceededMessage,
  buildCoffeeLimitValidationMessage,
  getPaymentMethodLabel,
  ORDER_UI_TEXT,
  PAYMENT_METHOD,
} from '../constants/orderConstants'

export default function CheckoutPage({
  apiUrl,
  adminWhatsappPhone,
  token,
  user,
  cartItems,
  onOrderComplete,
  onNotify,
  onCountCoffeeUnits,
  currency,
  maxCoffeeUnits,
  getDeliveryQuote,
}) {
  const navigate = useNavigate()
  const proofImageInputRef = useRef(null)
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD.BANK_DEPOSIT)
  const [proofImageName, setProofImageName] = useState('')
  const [formaEntrega, setFormaEntrega] = useState('RETIRO_TIENDA')
  const [provinciaEntrega, setProvinciaEntrega] = useState('')
  const [ciudadEntrega, setCiudadEntrega] = useState('')
  const [sectorEntrega, setSectorEntrega] = useState('')
  const [direccionEntrega, setDireccionEntrega] = useState('')
  const [proofSent, setProofSent] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)
  const [lastPaymentMethod, setLastPaymentMethod] = useState(PAYMENT_METHOD.BANK_DEPOSIT)
  const [lastDeliveryMethod, setLastDeliveryMethod] = useState('RETIRO_TIENDA')
  const [lastDeliveryAddress, setLastDeliveryAddress] = useState('')

  const subtotalProductos = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + Number(item.precio) * Number(item.cantidad),
        0,
      ),
    [cartItems],
  )

  const iva = useMemo(
    () => Number((subtotalProductos * 0.15).toFixed(2)),
    [subtotalProductos],
  )
  const deliveryQuote = useMemo(
    () =>
      getDeliveryQuote(
        formaEntrega,
        provinciaEntrega,
        ciudadEntrega,
        sectorEntrega,
        direccionEntrega,
      ),
    [
      formaEntrega,
      provinciaEntrega,
      ciudadEntrega,
      sectorEntrega,
      direccionEntrega,
      getDeliveryQuote,
    ],
  )
  const totalConIva = useMemo(
    () => Number((subtotalProductos + iva + deliveryQuote.fee).toFixed(2)),
    [subtotalProductos, iva, deliveryQuote.fee],
  )

  const onSubmit = async (event) => {
    event.preventDefault()
    if (cartItems.length === 0) {
      setError(ORDER_UI_TEXT.addProductsBeforePay)
      onNotify(ORDER_UI_TEXT.addProductsBeforePayToast)
      return
    }

    const coffeeUnits = onCountCoffeeUnits(cartItems)
    if (coffeeUnits > maxCoffeeUnits) {
      setError(buildCoffeeLimitValidationMessage(maxCoffeeUnits))
      onNotify(buildCoffeeLimitExceededMessage(maxCoffeeUnits))
      return
    }

    if (!proofSent) {
      setError(ORDER_UI_TEXT.proofRequired)
      onNotify(ORDER_UI_TEXT.proofRequiredToast)
      return
    }

    if (!proofImageName) {
      setError(ORDER_UI_TEXT.proofImageRequired)
      onNotify(ORDER_UI_TEXT.proofImageRequiredToast)
      return
    }

    const provinciaEntregaLimpia = String(provinciaEntrega || '').trim()
    const ciudadEntregaLimpia = String(ciudadEntrega || '').trim()
    const sectorEntregaLimpio = String(sectorEntrega || '').trim()
    const direccionEntregaLimpia = String(direccionEntrega || '').trim()

    if (
      formaEntrega === 'ENTREGA_DOMICILIO' &&
      (!provinciaEntregaLimpia ||
        !ciudadEntregaLimpia ||
        !sectorEntregaLimpio ||
        !direccionEntregaLimpia)
    ) {
      setError(ORDER_UI_TEXT.addressRequired)
      onNotify(ORDER_UI_TEXT.addressRequiredToast)
      return
    }

    const direccionEntregaCompleta =
      formaEntrega === 'ENTREGA_DOMICILIO'
        ? `${provinciaEntregaLimpia}, ${ciudadEntregaLimpia}, ${sectorEntregaLimpio}, ${direccionEntregaLimpia}`
        : ''

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const autoReference = `${paymentMethod}-${Date.now()}`

      const payload = {
        metodo_pago: paymentMethod,
        referencia_deposito: autoReference,
        forma_entrega: formaEntrega,
        provincia_entrega:
          formaEntrega === 'ENTREGA_DOMICILIO' ? provinciaEntregaLimpia : '',
        ciudad_entrega:
          formaEntrega === 'ENTREGA_DOMICILIO' ? ciudadEntregaLimpia : '',
        sector_entrega:
          formaEntrega === 'ENTREGA_DOMICILIO' ? sectorEntregaLimpio : '',
        direccion_entrega:
          formaEntrega === 'ENTREGA_DOMICILIO' ? direccionEntregaLimpia : '',
        costo_envio: deliveryQuote.fee,
        items: cartItems.map((item) => ({
          id_producto: item.id_producto,
          cantidad: item.cantidad,
        })),
      }

      const response = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo registrar el pedido')
      }

      setSuccess(`Pedido #${data.order.id_venta} registrado correctamente`)
      onNotify(`Pedido #${data.order.id_venta} registrado correctamente.`)
      setLastOrder(data.order)
      setLastPaymentMethod(paymentMethod)
      setLastDeliveryMethod(formaEntrega)
      setLastDeliveryAddress(direccionEntregaCompleta)
      onOrderComplete(data.order)
      setDireccionEntrega('')
      setProvinciaEntrega('')
      setCiudadEntrega('')
      setSectorEntrega('')
      setProofSent(false)
      setProofImageName('')
      setPaymentMethod(PAYMENT_METHOD.BANK_DEPOSIT)

      if (proofImageInputRef.current) {
        proofImageInputRef.current.value = ''
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  const whatsappMessage = useMemo(() => {
    if (!lastOrder) {
      return `Hola, envío mi comprobante de ${getPaymentMethodLabel(paymentMethod).toLowerCase()} para validar mi pedido en Café Artesanal Zaruma.`
    }

    return [
      `Hola, envío mi comprobante de ${getPaymentMethodLabel(lastPaymentMethod).toLowerCase()} para validar mi pedido.`,
      `Pedido: #${lastOrder.id_venta}`,
      `Cliente: ${user?.usuario || 'cliente'}`,
      `Método de pago: ${getPaymentMethodLabel(lastPaymentMethod)}`,
      `Forma de entrega: ${lastDeliveryMethod === 'ENTREGA_DOMICILIO' ? 'Entrega a domicilio' : 'Retiro en tienda física'}`,
      lastDeliveryMethod === 'ENTREGA_DOMICILIO' && lastDeliveryAddress
        ? `Dirección: ${lastDeliveryAddress}`
        : '',
      `Total depositado: ${currency(Number(lastOrder.total) || 0)}`,
      'Adjunto la foto/captura del comprobante en este chat.',
    ].filter(Boolean).join('\n')
  }, [
    lastOrder,
    paymentMethod,
    lastPaymentMethod,
    user?.usuario,
    lastDeliveryMethod,
    lastDeliveryAddress,
    currency,
  ])

  const whatsappUrl = useMemo(
    () =>
      `https://wa.me/${adminWhatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`,
    [adminWhatsappPhone, whatsappMessage],
  )

  return (
    <section className="card checkout-card">
      <h2>Finalizar compra</h2>
      <div className="checkout-grid">
        <article className="checkout-panel">
          <h3>Datos de depósito</h3>
          <p>
            Método seleccionado: <strong>{getPaymentMethodLabel(paymentMethod)}</strong>
          </p>
          <p>Banco Pichincha - Cuenta corriente 1234567890</p>
          <p>RUC: 0190000001001 - Café Artesanal Zaruma</p>
          <p>IVA 15% incluido en el total.</p>
          <p>
            Subtotal: <strong>{currency(subtotalProductos)}</strong>
          </p>
          <p>
            IVA (15%): <strong>{currency(iva)}</strong>
          </p>
          {formaEntrega === 'ENTREGA_DOMICILIO' ? (
            <p>
              Costo del envío ({deliveryQuote.distanceLabel}):{' '}
              <strong>{currency(deliveryQuote.fee)}</strong>
            </p>
          ) : (
            <p>
              Costo del envío: <strong>{currency(0)}</strong>
            </p>
          )}
          <p>
            Total a depositar: <strong>{currency(totalConIva)}</strong>
          </p>
        </article>

        <article className="checkout-panel">
          <h3>Verificación con COOFE DRINK</h3>
          <p>
            Registra tu pedido y luego envía el comprobante por WhatsApp para
            validarlo.
          </p>
          <p>
            COOFE DRINK aprobará la compra y después se descontará el stock.
          </p>
          <a
            className="btn btn-whatsapp"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            Enviar comprobante por WhatsApp
          </a>
          <p className="status-text">
            Paso obligatorio: envía el comprobante antes de registrar el pedido.
          </p>
          <label className="proof-confirm-check">
            <input
              type="checkbox"
              checked={proofSent}
              onChange={(event) => setProofSent(event.target.checked)}
            />
            Ya envié mi comprobante por WhatsApp
          </label>
        </article>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <select
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
          required
        >
          <option value={PAYMENT_METHOD.BANK_DEPOSIT}>Depósito bancario</option>
          <option value={PAYMENT_METHOD.BANK_TRANSFER}>Transferencia bancaria</option>
        </select>
        <input
          ref={proofImageInputRef}
          type="file"
          accept="image/*"
          onChange={(event) =>
            setProofImageName(event.target.files?.[0]?.name || '')
          }
          required
        />
        <select
          value={formaEntrega}
          onChange={(event) => setFormaEntrega(event.target.value)}
          required
        >
          <option value="RETIRO_TIENDA">Retiro en tienda física</option>
          <option value="ENTREGA_DOMICILIO">Entrega a domicilio</option>
        </select>
        {formaEntrega === 'ENTREGA_DOMICILIO' ? (
          <div className="delivery-address-grid">
            <label className="delivery-field">
              Provincia
              <input
                placeholder="Ej: El Oro"
                value={provinciaEntrega}
                onChange={(event) => setProvinciaEntrega(event.target.value)}
                required
              />
            </label>
            <label className="delivery-field">
              Ciudad
              <input
                placeholder="Ej: Zaruma"
                value={ciudadEntrega}
                onChange={(event) => setCiudadEntrega(event.target.value)}
                required
              />
            </label>
            <label className="delivery-field">
              Sector
              <input
                placeholder="Ej: Centro"
                value={sectorEntrega}
                onChange={(event) => setSectorEntrega(event.target.value)}
                required
              />
            </label>
            <label className="delivery-field delivery-field-full">
              Dirección
              <input
                placeholder="Calle principal y referencia"
                value={direccionEntrega}
                onChange={(event) => setDireccionEntrega(event.target.value)}
                required
              />
            </label>
          </div>
        ) : null}
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}

        {!lastOrder ? (
          <AppButton
            variant="solid"
            type="submit"
            disabled={loading || !proofSent}
          >
            {loading
              ? 'Procesando...'
              : !proofSent
                ? 'Envía comprobante para continuar'
                : 'Registrar pedido'}
          </AppButton>
        ) : (
          <AppButton
            variant="solid"
            type="button"
            onClick={() => navigate('/catalogo')}
          >
            Seguir comprando
          </AppButton>
        )}
      </form>

      {lastOrder ? (
        <p className="status-text checkout-next-step">
          Pedido registrado: <strong>#{lastOrder.id_venta}</strong>.
        </p>
      ) : null}
    </section>
  )
}

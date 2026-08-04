export const ORDER_STATUS = {
  PENDING: 'PENDIENTE',
  PAID: 'PAGADA',
  CANCELED: 'ANULADA',
}

export const PAYMENT_METHOD = {
  BANK_DEPOSIT: 'DEPOSITO_BANCARIO',
  BANK_TRANSFER: 'TRANSFERENCIA_BANCARIA',
}

export const PAYMENT_METHOD_LABEL = {
  [PAYMENT_METHOD.BANK_DEPOSIT]: 'Depósito bancario',
  [PAYMENT_METHOD.BANK_TRANSFER]: 'Transferencia bancaria',
}

export const ORDER_STATUS_LABEL = {
  [ORDER_STATUS.PAID]: 'Tu pedido está listo para retirar.',
  [ORDER_STATUS.CANCELED]: 'Rechazado por admin',
  [ORDER_STATUS.PENDING]: 'Pendiente de validación del depósito',
}

export const ORDER_UI_TEXT = {
  emptyCart: 'Tu carrito está vacío.',
  addProductsBeforePay: 'Agrega productos al carrito antes de pagar',
  addProductsBeforePayToast: 'Tu carrito está vacío. Agrega productos antes de pagar.',
  proofRequired: 'Debes enviar el comprobante por WhatsApp antes de registrar el pedido.',
  proofRequiredToast: 'Primero envía el comprobante por WhatsApp para continuar.',
  proofImageRequired: 'Debes adjuntar una foto del comprobante para continuar.',
  proofImageRequiredToast: 'Adjunta una foto del comprobante antes de registrar el pedido.',
  addressRequired: 'Completa provincia, ciudad, sector y dirección para envío a domicilio.',
  addressRequiredToast: 'Completa todos los datos de ubicación para calcular el envío.',
  orderDeleteBlockedByProof:
    'Este pedido no se puede eliminar porque ya tiene comprobante enviado.',
  clearHistoryConfirm:
    'Solo se eliminarán pedidos pendientes sin comprobante enviado. ¿Deseas continuar?',
  ordersEmpty: 'Aún no registras pedidos.',
  loadingOrders: 'Cargando tus pedidos...',
  deletingOrders: 'Eliminando pedidos...',
  deleteOrdersWithoutProof: 'Eliminar pedidos sin comprobante',
}

export const ADMIN_ORDER_UI_TEXT = {
  adminOrdersTitle: 'Pedidos del administrador por categoría',
  reload: 'Recargar',
  loadingOrders: 'Cargando pedidos...',
  noOrdersYet: 'No hay pedidos registrados todavía.',
  noOrdersInSection: 'No hay pedidos en esta categoría.',
  unregistered: 'No registrado',
  noCategory: 'Sin categoría',
  approveConfirm: (idVenta) => `Deseas aprobar el pedido #${idVenta}?`,
  rejectConfirm: (idVenta) => `Deseas rechazar el pedido #${idVenta}?`,
  processOrderFailed: (actionName) => `No se pudo ${actionName} el pedido`,
  processOrderSuccess: (idVenta) => `Pedido #${idVenta} procesado correctamente.`,
  processing: 'Procesando...',
  approveAndDiscountStock: 'Aceptar y descontar stock',
  rejectOrder: 'Rechazar pedido',
}

export const ADMIN_INVENTORY_UI_TEXT = {
  title: 'Inventario completo',
  refresh: 'Actualizar',
  loadFailed: 'No se pudo cargar inventario',
  loading: 'Cargando inventario...',
  empty: 'No hay productos en inventario.',
  unitFallback: 'Unidad',
}

export const ADMIN_REVENUE_UI_TEXT = {
  title: 'Ingresos del negocio',
  refresh: 'Actualizar',
  loadFailed: 'No se pudo cargar resumen de ingresos',
  loading: 'Cargando resumen de ingresos...',
  confirmedIncome: 'Ingresos confirmados',
  pendingValidation: 'En validacion',
  canceledSales: 'Ventas anuladas',
  paidOrdersCount: (count) => `${count} pedidos pagados`,
  pendingOrdersCount: (count) => `${count} pedidos pendientes`,
  canceledOrdersCount: (count) => `${count} pedidos anulados`,
}

export function getPaymentMethodLabel(method) {
  return PAYMENT_METHOD_LABEL[method] || PAYMENT_METHOD_LABEL[PAYMENT_METHOD.BANK_DEPOSIT]
}

export function buildCoffeeLimitMessage(maxUnits) {
  return `Límite alcanzado: máximo ${maxUnits} cafés por pedido.`
}

export function buildCoffeeLimitExceededMessage(maxUnits) {
  return `Límite excedido: máximo ${maxUnits} cafés por pedido.`
}

export function buildCoffeeLimitValidationMessage(maxUnits) {
  return `Solo puedes comprar máximo ${maxUnits} cafés por pedido.`
}

// Estados canonicos de pedido usados en DB, API y panel admin.
export const ORDER_STATUS = {
  PENDING: 'PENDIENTE',
  PAID: 'PAGADA',
  CANCELED: 'ANULADA',
}

// Metodos de pago permitidos para crear pedidos.
export const PAYMENT_METHOD = {
  BANK_DEPOSIT: 'DEPOSITO_BANCARIO',
  BANK_TRANSFER: 'TRANSFERENCIA_BANCARIA',
}

export const ALLOWED_PAYMENT_METHODS = [
  PAYMENT_METHOD.BANK_DEPOSIT,
  PAYMENT_METHOD.BANK_TRANSFER,
]

// Mensajes centralizados para respuestas HTTP y validaciones.
export const ORDER_MESSAGES = {
  missingItems: 'Debes enviar productos para comprar',
  invalidPaymentMethod: 'Método de pago inválido. Usa depósito o transferencia bancaria.',
  invalidDeliveryMethod: 'Selecciona una forma de entrega válida',
  missingDeliveryAddress:
    'Completa provincia, ciudad, sector y dirección para envío a domicilio',
  invalidProducts: 'Productos invalidos',
  noValidProducts: 'No hay productos validos para registrar',
  invalidItemsInOrder: 'Items invalidos en la compra',
  missingClientOrders: 'No tienes pedidos para eliminar',
  orderCreated: 'Pedido registrado. Esperando validación del depósito.',
  orderCreateFailed: 'Error al crear el pedido',
  myOrdersLoadFailed: 'Error al cargar tus pedidos',
  salesSummaryFailed: 'Error al generar resumen de ventas',
  pendingOrdersLoadFailed: 'Error al listar pedidos pendientes',
  allOrdersLoadFailed: 'Error al listar todos los pedidos',
  invalidSaleId: 'ID de venta invalido',
  orderNotFound: 'Pedido no encontrado',
  orderAlreadyProcessed: 'Este pedido ya fue procesado',
  orderMissingDetails: 'El pedido no tiene detalle para aprobar',
  missingProductsAtApproval: 'Uno o mas productos ya no existen',
  invalidItemsAtApproval: 'El pedido tiene items invalidos',
  orderApproved: 'Pedido aprobado y stock descontado correctamente',
  orderApproveFailed: 'Error al aprobar pedido',
  orderRejected: 'Pedido rechazado correctamente',
  orderRejectFailed: 'Error al rechazar pedido',
  notOwnerDeleteOrder: 'No puedes eliminar este pedido',
  onlyPendingCanDelete: 'Solo puedes eliminar pedidos pendientes',
  onlyNoProofCanDelete: 'Solo puedes eliminar pedidos sin comprobante enviado',
  orderDeleted: 'Pedido eliminado correctamente',
  orderDeleteFailed: 'Error al eliminar el pedido',
  onlyPendingNoProofBulkDelete:
    'Solo puedes eliminar pedidos pendientes sin comprobante enviado',
  historyDeleteFailed: 'Error al eliminar historial',
}

// Builder para mensajes que dependen del limite configurado.
export function buildCoffeeLimitValidationMessage(maxUnits) {
  return `Solo puedes comprar máximo ${maxUnits} cafés por pedido.`
}

// Builder para respuesta de eliminacion masiva de pedidos.
export function buildDeletedWithoutProofMessage(count) {
  return `Se eliminaron ${count} pedido(s) sin comprobante enviado.`
}

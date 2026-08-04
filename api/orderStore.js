import fs from 'node:fs/promises'
import path from 'node:path'

// Store auxiliar JSON para reflejar pedidos y facilitar consultas operativas.
const storePath = path.resolve(process.cwd(), 'api', 'data', 'orders.json')

async function ensureStoreFile() {
  // Crea directorio/archivo si aun no existen.
  try {
    await fs.access(storePath)
  } catch {
    await fs.mkdir(path.dirname(storePath), { recursive: true })
    await fs.writeFile(storePath, '[]', 'utf8')
  }
}

async function readOrders() {
  await ensureStoreFile()
  const raw = await fs.readFile(storePath, 'utf8')
  // Si el JSON esta corrupto, retorna arreglo vacio para no romper la API.
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeOrders(orders) {
  await ensureStoreFile()
  await fs.writeFile(storePath, JSON.stringify(orders, null, 2), 'utf8')
}

export async function upsertOrder(order) {
  // Normaliza tipos para mantener un formato consistente entre escrituras.
  const orders = await readOrders()
  const index = orders.findIndex((item) => Number(item.id_venta) === Number(order.id_venta))
  const normalized = {
    ...order,
    id_venta: Number(order.id_venta),
    id_cliente: Number(order.id_cliente),
    id_usuario: Number(order.id_usuario),
    subtotal: Number(order.subtotal),
    iva: Number(order.iva),
    total: Number(order.total),
    items: Array.isArray(order.items) ? order.items : [],
  }

  if (index >= 0) {
    orders[index] = { ...orders[index], ...normalized }
  } else {
    orders.push(normalized)
  }

  await writeOrders(orders)
  return normalized
}

export async function getAllOrders() {
  // Devuelve todos los pedidos tal como estan persistidos en el store.
  return readOrders()
}

export async function getOrderById(idVenta) {
  // Busca por ID de venta normalizado a numero.
  const orders = await readOrders()
  return orders.find((item) => Number(item.id_venta) === Number(idVenta)) || null
}

export async function getOrdersByClient(idCliente) {
  // Historial de un cliente ordenado por mas reciente.
  const orders = await readOrders()
  return orders
    .filter((item) => Number(item.id_cliente) === Number(idCliente))
    .sort((left, right) => Number(right.id_venta) - Number(left.id_venta))
}

export async function getPendingOrders() {
  // Filtra pedidos pendientes para panel administrativo.
  const orders = await readOrders()
  return orders
    .filter((item) => String(item.estado || '').toUpperCase() === 'PENDIENTE')
    .sort((left, right) => Number(right.id_venta) - Number(left.id_venta))
}

export async function deleteOrderById(idVenta) {
  // Elimina un pedido puntual del store auxiliar.
  const orders = await readOrders()
  const nextOrders = orders.filter((item) => Number(item.id_venta) !== Number(idVenta))
  await writeOrders(nextOrders)
}

export async function deleteOrdersByClient(idCliente) {
  // Limpia todos los pedidos asociados a un cliente.
  const orders = await readOrders()
  const nextOrders = orders.filter((item) => Number(item.id_cliente) !== Number(idCliente))
  await writeOrders(nextOrders)
}

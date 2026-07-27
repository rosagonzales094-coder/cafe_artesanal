import fs from 'node:fs/promises'
import path from 'node:path'

const storePath = path.resolve(process.cwd(), 'api', 'data', 'orders.json')

async function ensureStoreFile() {
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
  return readOrders()
}

export async function getOrderById(idVenta) {
  const orders = await readOrders()
  return orders.find((item) => Number(item.id_venta) === Number(idVenta)) || null
}

export async function getOrdersByClient(idCliente) {
  const orders = await readOrders()
  return orders
    .filter((item) => Number(item.id_cliente) === Number(idCliente))
    .sort((left, right) => Number(right.id_venta) - Number(left.id_venta))
}

export async function getPendingOrders() {
  const orders = await readOrders()
  return orders
    .filter((item) => String(item.estado || '').toUpperCase() === 'PENDIENTE')
    .sort((left, right) => Number(right.id_venta) - Number(left.id_venta))
}

export async function deleteOrderById(idVenta) {
  const orders = await readOrders()
  const nextOrders = orders.filter((item) => Number(item.id_venta) !== Number(idVenta))
  await writeOrders(nextOrders)
}

export async function deleteOrdersByClient(idCliente) {
  const orders = await readOrders()
  const nextOrders = orders.filter((item) => Number(item.id_cliente) !== Number(idCliente))
  await writeOrders(nextOrders)
}

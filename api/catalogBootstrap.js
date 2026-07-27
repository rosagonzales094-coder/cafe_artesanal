import pool from './db.js'

let bootstrapPromise = null

async function ensureCategory(connection, { nombre, descripcion }) {
  const [rows] = await connection.query(
    'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER(?) LIMIT 1',
    [nombre],
  )

  if (rows.length > 0) {
    return rows[0].id_categoria
  }

  const [result] = await connection.query(
    "INSERT INTO categorias (nombre, descripcion, estado) VALUES (?, ?, 'ACTIVA')",
    [nombre, descripcion],
  )

  return result.insertId
}

export async function ensureSellableShowcaseProducts() {
  if (bootstrapPromise) {
    return bootstrapPromise
  }

  bootstrapPromise = (async () => {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [providerRows] = await connection.query(
        "SELECT id_proveedor FROM proveedores WHERE UPPER(estado) = 'ACTIVO' ORDER BY id_proveedor ASC LIMIT 1",
      )

      if (providerRows.length === 0) {
        await connection.rollback()
        return
      }

      const idProveedor = providerRows[0].id_proveedor

      const idCategoriaLimitada = await ensureCategory(connection, {
        nombre: 'Ediciones limitadas',
        descripcion: 'Cafe premium y microlotes de edicion limitada',
      })

      const idCategoriaAccesorios = await ensureCategory(connection, {
        nombre: 'Accesorios',
        descripcion: 'Accesorios para preparacion y servicio de cafe',
      })

      const products = [
        {
          id_categoria: idCategoriaLimitada,
          codigo: 'EL-GEI-01',
          nombre: 'Cafe Geisha Origen El Oro',
          descripcion:
            'Notas florales, dulces y acidez balanceada para una taza suave y elegante.',
          precio_compra: 10.5,
          precio_venta: 18.9,
          stock: 30,
          stock_minimo: 5,
          unidad: 'Bolsa',
        },
        {
          id_categoria: idCategoriaLimitada,
          codigo: 'EL-BOU-01',
          nombre: 'Cafe Molido Espresso Bourbon',
          descripcion:
            'Ideal para espresso, moka y prensa francesa, con cuerpo medio y chocolate.',
          precio_compra: 9.2,
          precio_venta: 16.5,
          stock: 28,
          stock_minimo: 5,
          unidad: 'Bolsa',
        },
        {
          id_categoria: idCategoriaLimitada,
          codigo: 'EL-TYP-01',
          nombre: 'Reserva Typica de Altura',
          descripcion:
            'Cafe de altura de Zaruma con aroma intenso y final limpio para paladares exigentes.',
          precio_compra: 11.4,
          precio_venta: 20.0,
          stock: 24,
          stock_minimo: 5,
          unidad: 'Bolsa',
        },
        {
          id_categoria: idCategoriaAccesorios,
          codigo: 'ACC-COMP-01',
          nombre: 'Compresa termica para cafe',
          descripcion: 'Compresa termica reutilizable para conservar temperatura de bebidas.',
          precio_compra: 2.4,
          precio_venta: 4.5,
          stock: 40,
          stock_minimo: 8,
          unidad: 'Unidad',
        },
        {
          id_categoria: idCategoriaAccesorios,
          codigo: 'ACC-CAFETERA-01',
          nombre: 'Cafetera prensa francesa 600ml',
          descripcion: 'Cafetera tipo prensa francesa para preparacion manual.',
          precio_compra: 12.5,
          precio_venta: 22.0,
          stock: 18,
          stock_minimo: 4,
          unidad: 'Unidad',
        },
      ]

      for (const product of products) {
        await connection.query(
          `INSERT INTO productos
           (id_categoria, id_proveedor, codigo, nombre, descripcion, precio_compra, precio_venta, stock, stock_minimo, unidad, estado)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO'
           FROM DUAL
           WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = ?)`,
          [
            product.id_categoria,
            idProveedor,
            product.codigo,
            product.nombre,
            product.descripcion,
            product.precio_compra,
            product.precio_venta,
            product.stock,
            product.stock_minimo,
            product.unidad,
            product.codigo,
          ],
        )
      }

      await connection.query(
        `INSERT INTO inventario (id_producto, entradas, salidas, existencia)
         SELECT p.id_producto, p.stock, 0, p.stock
         FROM productos p
         LEFT JOIN inventario i ON i.id_producto = p.id_producto
         WHERE p.codigo IN ('EL-GEI-01', 'EL-BOU-01', 'EL-TYP-01', 'ACC-COMP-01', 'ACC-CAFETERA-01')
           AND i.id_producto IS NULL`,
      )

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  })()

  try {
    await bootstrapPromise
  } catch (error) {
    bootstrapPromise = null
    throw error
  }
}

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import authRoutes from './routes/authRoutes.js'
import productRoutes from './routes/productRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import { ensureSellableShowcaseProducts } from './catalogBootstrap.js'

dotenv.config()

const app = express()
// Resolver rutas absolutas para servir build y recursos estaticos desde cualquier entorno.
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const distDir = path.resolve(projectRoot, 'dist')
const indexFile = path.resolve(distDir, 'index.html')
const catalogPdfFile = path.resolve(projectRoot, 'public', 'imagenes', 'Catalogo_Coffe_Drink.pdf')
const productUploadsDir = path.resolve(projectRoot, 'public', 'imagenes', 'uploads')

// Middleware base para CORS y parsing JSON del frontend.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  }),
)
app.use(express.json())

fs.mkdirSync(productUploadsDir, { recursive: true })
app.use('/api/products/uploads', express.static(productUploadsDir))

// Health check simple para monitoreo y despliegues.
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'Cafe Artesanal API' })
})

// Entrega del catalogo PDF para descarga desde la web.
app.get('/api/catalog/pdf', (req, res) => {
  if (!fs.existsSync(catalogPdfFile)) {
    return res.status(404).json({ message: 'Catalogo PDF no encontrado' })
  }

  return res.download(catalogPdfFile, 'Catalogo_Coffe_Drink.pdf')
})

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/reviews', reviewRoutes)

// En produccion, delega las rutas no API al frontend compilado.
if (fs.existsSync(indexFile)) {
  app.use(express.static(distDir))

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(indexFile)
  })
}

// Manejador central de errores para respuestas uniformes.
app.use((error, req, res, next) => {
  console.error('API error:', error)
  if (res.headersSent) {
    return next(error)
  }

  const isDev = process.env.NODE_ENV !== 'production'

  const response = {
    message: 'Error interno del servidor',
  }

  if (isDev) {
    response.detail = error.message || 'Error no controlado'
  }

  return res.status(500).json(response)
})

// Fallback 404 para cualquier ruta no definida.
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' })
})

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`API ejecutandose en http://localhost:${port}`)

  // Verifica productos base (especiales/accesorios) al arrancar la API.
  ensureSellableShowcaseProducts()
    .then(() => {
      console.log('Catalogo base listo: especiales y accesorios verificados.')
    })
    .catch((error) => {
      console.warn('No se pudo verificar catalogo base al iniciar API:', error?.message)
    })
})

import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

dotenv.config()

function toBoolean(value, fallback = false) {
  if (value === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function loadSslCa() {
  if (process.env.DB_SSL_CA) {
    return process.env.DB_SSL_CA.replace(/\\n/g, '\n')
  }

  if (process.env.DB_SSL_CA_FILE) {
    const providedPath = path.isAbsolute(process.env.DB_SSL_CA_FILE)
      ? process.env.DB_SSL_CA_FILE
      : path.resolve(process.cwd(), process.env.DB_SSL_CA_FILE)

    try {
      return fs.readFileSync(providedPath, 'utf8')
    } catch {
      return undefined
    }
  }

  const candidateFiles = [
    path.resolve(process.cwd(), 'ca.pem'),
    path.resolve(process.cwd(), 'certs', 'ca.pem'),
  ]

  for (const candidate of candidateFiles) {
    if (!fs.existsSync(candidate)) continue

    try {
      return fs.readFileSync(candidate, 'utf8')
    } catch {
      return undefined
    }
  }

  return undefined
}

function resolveConnectionConfig() {
  if (!process.env.DB_URL) {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cafe_artesanal',
    }
  }

  const url = new URL(process.env.DB_URL)
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
  }
}

function resolveSslConfig() {
  const sslMode = (process.env.DB_SSL_MODE || '').toLowerCase()
  const sslEnabled =
    toBoolean(process.env.DB_SSL, false) || sslMode === 'require' || sslMode === 'verify-ca'

  if (!sslEnabled) return undefined

  const ca = loadSslCa()
  const strictValidation = sslMode === 'verify-ca'

  if (strictValidation && !ca) {
    throw new Error(
      'DB_SSL_MODE=verify-ca requiere certificado CA. Usa DB_SSL_CA, DB_SSL_CA_FILE o coloca ca.pem en la raiz del proyecto.',
    )
  }

  if (ca) {
    return {
      ca,
      rejectUnauthorized: strictValidation,
    }
  }

  return {
    rejectUnauthorized: strictValidation,
  }
}

const baseConfig = resolveConnectionConfig()
const ssl = resolveSslConfig()

const pool = mysql.createPool({
  ...baseConfig,
  ssl,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
  enableKeepAlive: toBoolean(process.env.DB_KEEP_ALIVE, true),
  keepAliveInitialDelay: 0,
})

export default pool

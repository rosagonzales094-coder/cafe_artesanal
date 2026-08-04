import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  // Verifica formato Bearer y adjunta payload JWT en req.user.
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token requerido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    return next()
  } catch {
    return res.status(401).json({ message: 'Token invalido o expirado' })
  }
}

export function requireAdmin(req, res, next) {
  // Autoriza exclusivamente a usuarios con rol administrador.
  if (!req.user?.rol) {
    return res.status(403).json({ message: 'Acceso denegado para este recurso' })
  }

  const normalizedRole = String(req.user.rol).trim().toLowerCase()
  if (normalizedRole !== 'administrador') {
    return res.status(403).json({ message: 'Solo administrador puede realizar esta accion' })
  }

  return next()
}

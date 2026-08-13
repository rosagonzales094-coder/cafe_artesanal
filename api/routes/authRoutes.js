import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Detecta hashes heredados para migrarlos a bcrypt en el primer login exitoso.
function isLegacySha256(hash) {
  return typeof hash === 'string' && /^[a-f0-9]{64}$/i.test(hash)
}

function sha256(value) {
  // Compatibilidad temporal con contraseñas heredadas en SHA-256.
  return crypto.createHash('sha256').update(value).digest('hex')
}

function signToken(user) {
  // JWT corto con campos necesarios para autorizacion y auditoria basica.
  return jwt.sign(
    {
      id_usuario: user.id_usuario,
      id_cliente: user.id_cliente,
      usuario: user.usuario,
      correo: user.correo,
      rol: user.rol,
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  )
}

router.post('/register', async (req, res) => {
  // Registro transaccional: valida duplicados y crea cliente + usuario en bloque.
  const {
    nombres,
    apellidos,
    telefono,
    correo,
    direccion,
    usuario,
    password,
  } = req.body
  const normalizedPhone = String(telefono || '').replace(/\D/g, '')

  if (!nombres || !apellidos || !correo || !usuario || !password || !normalizedPhone) {
    return res.status(400).json({ message: 'Completa los campos requeridos' })
  }

  if (!/^\d{9,10}$/.test(normalizedPhone)) {
    return res.status(400).json({
      message: 'El número de teléfono debe tener entre 9 y 10 dígitos',
    })
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: 'La contraseña debe tener al menos 8 caracteres' })
  }

  let connection

  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()

    const [existingUser] = await connection.query(
      'SELECT id_usuario FROM usuarios WHERE usuario = ? LIMIT 1',
      [usuario],
    )

    if (existingUser.length > 0) {
      await connection.rollback()
      return res.status(409).json({ message: 'El usuario ya existe' })
    }

    const [existingMail] = await connection.query(
      'SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1',
      [correo],
    )

    if (existingMail.length > 0) {
      await connection.rollback()
      return res.status(409).json({ message: 'El correo ya esta registrado' })
    }

    const [passwordHashes] = await connection.query(
      "SELECT password FROM usuarios WHERE estado = 'ACTIVO'",
    )

    // Politica de seguridad: evita reutilizacion exacta de contraseñas existentes.
    for (const row of passwordHashes) {
      const isRepeated = isLegacySha256(row.password)
        ? sha256(password) === row.password
        : await bcrypt.compare(password, row.password)
      if (isRepeated) {
        await connection.rollback()
        return res.status(409).json({
          message:
            'La contraseña ya está en uso. Elige una diferente para mayor seguridad.',
        })
      }
    }

    const [roleRows] = await connection.query(
      "SELECT id_rol FROM roles WHERE nombre = 'Usuario' LIMIT 1",
    )

    const [branchRows] = await connection.query(
      "SELECT id_sucursal FROM sucursales WHERE nombre = 'Matriz' LIMIT 1",
    )

    if (roleRows.length === 0 || branchRows.length === 0) {
      await connection.rollback()
      return res.status(500).json({
        message: 'Configuracion inicial incompleta en roles o sucursales',
      })
    }

    const [clientResult] = await connection.query(
      `INSERT INTO clientes (nombres, apellidos, telefono, correo, direccion)
       VALUES (?, ?, ?, ?, ?)`,
      [nombres, apellidos, normalizedPhone, correo, direccion || null],
    )

    const passwordHash = await bcrypt.hash(password, 10)

    const [userResult] = await connection.query(
      `INSERT INTO usuarios (id_cliente, id_rol, id_sucursal, usuario, correo, password)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        clientResult.insertId,
        roleRows[0].id_rol,
        branchRows[0].id_sucursal,
        usuario,
        correo,
        passwordHash,
      ],
    )

    await connection.commit()

    // Se devuelve sesion iniciada para mejorar UX post-registro.
    const token = signToken({
      id_usuario: userResult.insertId,
      id_cliente: clientResult.insertId,
      usuario,
      correo,
      rol: 'Usuario',
    })

    return res.status(201).json({
      message: 'Cuenta creada correctamente',
      token,
      user: {
        id_usuario: userResult.insertId,
        id_cliente: clientResult.insertId,
        usuario,
        correo,
        rol: 'Usuario',
      },
    })
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }
    return res.status(500).json({ message: 'Error al registrar usuario', error })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

router.post('/login', async (req, res) => {
  // Login compatible con hashes legacy y bcrypt.
  const { usuario, password } = req.body

  if (!usuario || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son obligatorios' })
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.id_cliente, u.usuario, u.correo, u.password, r.nombre AS rol
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.usuario = ? AND u.estado = 'ACTIVO'
       LIMIT 1`,
      [usuario],
    )

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales invalidas' })
    }

    const user = rows[0]
    // Valida credenciales contra el algoritmo que tenga actualmente el registro.
    const validPassword = isLegacySha256(user.password)
      ? sha256(password) === user.password
      : await bcrypt.compare(password, user.password)

    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciales invalidas' })
    }

    // Migra hash antiguo a bcrypt para elevar seguridad sin reset masivo.
    if (isLegacySha256(user.password)) {
      const migratedHash = await bcrypt.hash(password, 10)
      await pool.query('UPDATE usuarios SET password = ? WHERE id_usuario = ?', [
        migratedHash,
        user.id_usuario,
      ])
    }

    const token = signToken(user)

    // Devuelve token + perfil minimo para hidratar estado del frontend.
    return res.json({
      token,
      user: {
        id_usuario: user.id_usuario,
        id_cliente: user.id_cliente,
        usuario: user.usuario,
        correo: user.correo,
        rol: user.rol,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: 'Error al iniciar sesión', error })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  // Endpoint de sesion activa para hidratar frontend tras recarga.
  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.id_cliente, u.usuario, u.correo, r.nombre AS rol
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ? LIMIT 1`,
      [req.user.id_usuario],
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    return res.json({ user: rows[0] })
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener usuario', error })
  }
})

export default router

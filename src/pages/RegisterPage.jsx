import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppButton from '../components/ui/AppButton'
import PasswordField from '../components/forms/PasswordField'
import { registerUser } from '../services/authService'

const isValidPhoneNumber = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return /^\d{9,10}$/.test(digits)
}

export default function RegisterPage({ apiUrl, onRegister, onNotify }) {
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    telefono: '',
    correo: '',
    direccion: '',
    usuario: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onChange = (event) => {
    const { name, value } = event.target
    const nextValue =
      name === 'telefono' ? value.replace(/\D/g, '').slice(0, 10) : value

    setForm((prev) => ({ ...prev, [name]: nextValue }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!isValidPhoneNumber(form.telefono)) {
      setError('El número de teléfono debe tener entre 9 y 10 dígitos')
      return
    }

    setLoading(true)

    try {
      const data = await registerUser(apiUrl, form)
      onRegister(data)
      onNotify('Cuenta creada correctamente. Ya puedes comprar en el catálogo.')
      navigate('/catalogo')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card auth-card">
      <h2>Crear cuenta para ver el catálogo</h2>
      <form onSubmit={onSubmit} className="form-grid two-cols">
        <input
          name="nombres"
          placeholder="Nombres"
          value={form.nombres}
          onChange={onChange}
          required
        />
        <input
          name="apellidos"
          placeholder="Apellidos"
          value={form.apellidos}
          onChange={onChange}
          required
        />
        <input
          name="telefono"
          placeholder="Teléfono"
          value={form.telefono}
          onChange={onChange}
          inputMode="numeric"
          pattern="\\d{9,10}"
          maxLength={10}
          title="Ingresa un número de teléfono de 9 a 10 dígitos"
          required
        />
        <input
          type="email"
          name="correo"
          placeholder="Correo"
          value={form.correo}
          onChange={onChange}
          required
        />
        <input
          name="direccion"
          placeholder="Dirección"
          value={form.direccion}
          onChange={onChange}
        />
        <input
          name="usuario"
          placeholder="Usuario"
          value={form.usuario}
          onChange={onChange}
          required
        />
        <PasswordField
          name="password"
          placeholder="Contraseña (mínimo 8 caracteres)"
          value={form.password}
          onChange={onChange}
          required
        />
        {error ? <p className="error-text span-all">{error}</p> : null}
        <AppButton
          variant="solid"
          className="span-all"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creando cuenta...' : 'Registrarme'}
        </AppButton>
      </form>
    </section>
  )
}

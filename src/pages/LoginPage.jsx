import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppButton from '../components/ui/AppButton'
import PasswordField from '../components/forms/PasswordField'
import { loginUser } from '../services/authService'

export default function LoginPage({ apiUrl, onLogin, onNotify }) {
  const [form, setForm] = useState({ usuario: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await loginUser(apiUrl, form)
      onLogin(data)
      onNotify(`Bienvenido, ${data.user?.usuario || 'cliente'}. Sesión iniciada.`)
      navigate('/catalogo')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card auth-card">
      <h2>Iniciar sesión</h2>
      <form onSubmit={onSubmit} className="form-grid">
        <input
          name="usuario"
          placeholder="Usuario"
          value={form.usuario}
          onChange={onChange}
          required
        />
        <PasswordField
          name="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={onChange}
          required
        />
        {error ? <p className="error-text">{error}</p> : null}
        <AppButton variant="solid" type="submit" disabled={loading}>
          {loading ? 'Validando...' : 'Entrar'}
        </AppButton>
      </form>
      <p className="auth-helper">
        ¿No tienes cuenta? <Link to="/registro">Regístrate aquí</Link>
      </p>
    </section>
  )
}

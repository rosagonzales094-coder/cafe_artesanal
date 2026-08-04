import { useState } from 'react'
import AppButton from '../ui/AppButton'

export default function PasswordField({
  name,
  value,
  onChange,
  placeholder,
  required = false,
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="password-field">
      <input
        type={showPassword ? 'text' : 'password'}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />
      <AppButton
        className="password-toggle-btn"
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-pressed={showPassword}
        unstyled
      >
        {showPassword ? 'Ocultar' : 'Mostrar'}
      </AppButton>
    </div>
  )
}

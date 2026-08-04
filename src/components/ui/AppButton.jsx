export default function AppButton({
  variant = 'solid',
  className = '',
  type = 'button',
  unstyled = false,
  children,
  ...props
}) {
  const classes = unstyled
    ? className
    : `btn btn-${variant}${className ? ` ${className}` : ''}`

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}

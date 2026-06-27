import { APP_LOGO_SRC, APP_NAME } from '../lib/appBrand'

export function AuthBrandMark(props: { variant?: 'card' | 'loading' }) {
  const variant = props.variant ?? 'card'

  if (variant === 'loading') {
    return (
      <div className="auth-loading-brand">
        <div className="auth-loading-orbit" aria-hidden="true">
          <span className="auth-loading-orbit-ring" />
          <span className="auth-loading-orbit-ring auth-loading-orbit-ring--delayed" />
          <img className="auth-loading-logo" src={APP_LOGO_SRC} alt="" />
        </div>
        <h1 className="auth-loading-title">{APP_NAME}</h1>
      </div>
    )
  }

  return (
    <div className="auth-brand">
      <img className="auth-brand-logo" src={APP_LOGO_SRC} alt="" />
      <h1 className="auth-brand-title">{APP_NAME}</h1>
    </div>
  )
}

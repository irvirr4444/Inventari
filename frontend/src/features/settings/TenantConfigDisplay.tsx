import { useTenantConfig } from '../../hooks/useTenantConfig'

export function TenantConfigDisplay() {
  const { config } = useTenantConfig()

  return (
    <section className="tenant-config-display" style={{ marginTop: 24 }}>
      <h3 style={{ marginBottom: 12 }}>Konfigurimi i gjurmimit</h3>
      <ul className="ob-summary-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        <li style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
          ✦ Çmimet: {config.track_price ? 'Me çmime' : 'Vetëm sasi'}
        </li>
      </ul>
    </section>
  )
}

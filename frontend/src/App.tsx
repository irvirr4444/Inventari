import { NavLink, Route, Routes } from 'react-router-dom'
import { ActionsPage } from './pages/ActionsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ProductsPage } from './pages/ProductsPage'

export default function App() {
  return (
    <div>
      <header className="card" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0 }}>
        <div className="container">
          <div className="row">
            <strong>Inventari</strong>
            <nav className="row" style={{ gap: 10 }}>
              <NavLink to="/" end>
                Actions
              </NavLink>
              <NavLink to="/products">Products</NavLink>
              <NavLink to="/analytics">Analytics</NavLink>
            </nav>
            <div className="spacer" />
          </div>
        </div>
      </header>

      <main className="container" style={{ marginTop: 16 }}>
        <Routes>
          <Route path="/" element={<ActionsPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Routes>
      </main>
    </div>
  )
}

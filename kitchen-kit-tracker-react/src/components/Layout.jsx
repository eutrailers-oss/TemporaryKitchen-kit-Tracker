const tabs = ['Dashboard', 'Jobs', 'Assets', 'Customers', 'Damage', 'Admin']
export default function Layout({ active, setActive, user, onSignOut, children }) {
  return <div className="app-shell">
    <header className="topbar">
      <div><h1>Kitchen Kit Tracker</h1><p>Temporary Kitchens shared hire system</p></div>
      <div className="topbar-user"><span>{user?.email}</span><button onClick={onSignOut}>Sign out</button></div>
    </header>
    <nav className="tabs">{tabs.map((tab) => <button key={tab} className={active === tab ? 'active' : ''} onClick={() => setActive(tab)}>{tab}</button>)}</nav>
    <main>{children}</main>
  </div>
}

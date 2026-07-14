const nav = [['dashboard','Dashboard'],['warehouse','Warehouse'],['jobs','Jobs'],['assets','Assets'],['customers','Customers'],['damage','Damage'],['admin','Admin']]
export default function Layout({ page, setPage, user, signOut, children }) {
  return <div className="app-shell">
    <aside>
      <div className="brand"><div className="brand-mark">KK</div><div><strong>Kitchen Kit</strong><span>Tracker</span></div></div>
      <nav>{nav.map(([id,label]) => <button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}>{label}</button>)}</nav>
      <div className="account"><small>Signed in as</small><span>{user?.email}</span><button onClick={signOut}>Sign out</button></div>
    </aside>
    <main>{children}</main>
  </div>
}

export default function Customers({ data, openCustomer }) {
  return <><header className="page-head"><div><h1>Customers</h1><p>Contacts and job history.</p></div><button className="primary" onClick={()=>openCustomer()}>+ New customer</button></header>
  <section className="panel table-wrap"><table><thead><tr><th>Company</th><th>Contact</th><th>Email</th><th>Phone</th><th>Jobs</th></tr></thead><tbody>{data.customers.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(c=><tr key={c.id} onClick={()=>openCustomer(c.id)}><td><b>{c.name}</b></td><td>{c.contact_name||'—'}</td><td>{c.email||'—'}</td><td>{c.phone||'—'}</td><td>{data.jobs.filter(j=>j.customer_id===c.id).length}</td></tr>)}</tbody></table></section></>
}

import { formatDate, formatMoney } from '../lib/utils'
export default function Jobs({ data, openJob }) {
  const rows = data.jobs.slice().sort((a,b)=>b.start_date.localeCompare(a.start_date))
  return <><header className="page-head"><div><h1>Jobs</h1><p>Create bookings and assign equipment.</p></div><button className="primary" onClick={()=>openJob()}>+ New job</button></header>
  <section className="panel table-wrap"><table><thead><tr><th>Job</th><th>Customer</th><th>Dates</th><th>Status</th><th>Assets</th><th>Value</th></tr></thead><tbody>{rows.map(j=><tr key={j.id} onClick={()=>openJob(j.id)}><td><b>{j.job_no}</b><small>{j.site||''}</small></td><td>{j.customer_name}</td><td>{formatDate(j.start_date)}<br/>{formatDate(j.end_date)}</td><td><span className={`badge status-${j.status.toLowerCase()}`}>{j.status}</span></td><td>{data.jobAssets.filter(x=>x.job_id===j.id).length}</td><td>{formatMoney(j.value)}</td></tr>)}</tbody></table></section></>
}

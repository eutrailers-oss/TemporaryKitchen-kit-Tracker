import { ACTIVE_JOB_STATUSES, addDays, formatDate, formatMoney, isoDate } from '../lib/utils'

export default function Dashboard({ data, openJob, setPage }) {
  const today = isoDate()
  const activeJobIds = new Set(data.jobs.filter(j => ACTIVE_JOB_STATUSES.includes(j.status)).map(j => j.id))
  const allocated = new Set(data.jobAssets.filter(x => activeJobIds.has(x.job_id)).map(x => x.asset_id)).size
  const outIds = new Set(data.jobs.filter(j => j.status === 'Out').map(j => j.id))
  const physicallyOut = new Set(data.jobAssets.filter(x => x.out_at && !x.returned_at).map(x => x.asset_id)).size
  const damaged = data.assets.filter(a => ['Damaged','In Repair'].includes(a.condition)).length
  const upcoming = data.jobs.filter(j => j.end_date >= today && !['Completed','Cancelled'].includes(j.status)).sort((a,b)=>a.start_date.localeCompare(b.start_date)).slice(0,8)
  const dates = Array.from({length:35}, (_,i)=>addDays(today,i))
  return <>
    <header className="page-head"><div><h1>Dashboard</h1><p>Live overview of jobs and equipment.</p></div><div className="head-actions"><button onClick={()=>setPage('warehouse')}>Warehouse scan</button><button className="primary" onClick={()=>setPage('jobs')}>+ New job</button></div></header>
    <section className="stats">
      <div><span>Total assets</span><strong>{data.assets.length}</strong></div>
      <div><span>Allocated</span><strong>{allocated}</strong></div>
      <div><span>Physically out</span><strong>{physicallyOut}</strong></div>
      <div><span>Damaged / repair</span><strong>{damaged}</strong></div>
    </section>
    <section className="panel"><div className="panel-title"><div><h2>Upcoming jobs</h2><p>Next active bookings</p></div></div>
      <div className="job-cards">{upcoming.length ? upcoming.map(j=><button key={j.id} onClick={()=>openJob(j.id)}><b>{j.job_no}</b><span>{j.customer_name}</span><small>{formatDate(j.start_date)} – {formatDate(j.end_date)} · {j.status} · {formatMoney(j.value)}</small></button>) : <p className="empty">No upcoming jobs.</p>}</div>
    </section>
    <section className="panel"><div className="panel-title"><div><h2>35-day calendar</h2><p>Click a booking to edit it</p></div></div>
      <div className="calendar-scroll"><div className="calendar-grid" style={{gridTemplateColumns:`180px repeat(${dates.length}, 30px)`}}>
        <div className="calendar-corner">Job</div>{dates.map(d=><div key={d} className={`calendar-day ${d===today?'today':''}`} title={formatDate(d)}>{new Date(`${d}T12:00`).getDate()}</div>)}
        {upcoming.map(j=><div className="calendar-row" key={j.id} style={{display:'contents'}}><button className="calendar-label" onClick={()=>openJob(j.id)}>{j.job_no}<small>{j.customer_name}</small></button>{dates.map(d=><button key={d} onClick={()=>openJob(j.id)} className={`calendar-cell ${d>=j.start_date&&d<=j.end_date?'booked':''}`} title={`${j.job_no}: ${j.customer_name}`}></button>)}</div>)}
      </div></div>
    </section>
  </>
}

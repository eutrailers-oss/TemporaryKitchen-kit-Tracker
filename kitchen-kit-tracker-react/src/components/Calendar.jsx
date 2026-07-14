import { shortDate, today } from '../lib/utils'

function addDays(date, count) { const result = new Date(`${date}T12:00:00`); result.setDate(result.getDate() + count); return result.toISOString().slice(0, 10) }
export default function Calendar({ jobs, days = 35, onJob }) {
  const start = today()
  const dates = Array.from({ length: days }, (_, index) => addDays(start, index))
  return <div className="calendar-wrap"><div className="calendar-grid" style={{ gridTemplateColumns: `240px repeat(${days}, 30px)` }}>
    <div className="calendar-label calendar-head">Job</div>
    {dates.map((date) => <div key={date} className={`calendar-head ${date === today() ? 'today' : ''}`}>{new Date(`${date}T12:00:00`).getDate()}</div>)}
    {jobs.length === 0 && <div className="empty-state" style={{ gridColumn: `1 / span ${days + 1}` }}>No active jobs in this period.</div>}
    {jobs.map((job) => <div className="calendar-row" key={job.id} style={{ display: 'contents' }}>
      <button className="calendar-label job-label" onClick={() => onJob(job)}><strong>{job.job_no}</strong><span>{job.customer_name}</span></button>
      {dates.map((date) => {
        const active = date >= job.start_date && date <= job.end_date
        return <div key={date} className={`calendar-cell ${date === today() ? 'today' : ''}`} title={active ? `${job.customer_name}: ${shortDate(job.start_date)}–${shortDate(job.end_date)}` : ''}>{active && <span className={`calendar-bar ${job.status.toLowerCase()}`}></span>}</div>
      })}
    </div>)}
  </div></div>
}

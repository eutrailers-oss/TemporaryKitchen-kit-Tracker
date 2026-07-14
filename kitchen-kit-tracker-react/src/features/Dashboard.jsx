import Calendar from '../components/Calendar'
import { ACTIVE_JOB_STATUSES, money, today } from '../lib/utils'
export default function Dashboard({ data, onJob }) {
  const activeJobs = data.jobs.filter((job) => ACTIVE_JOB_STATUSES.includes(job.status) && job.end_date >= today())
  const allocatedIds = new Set(data.job_assets.filter((item) => activeJobs.some((job) => job.id === item.job_id)).map((item) => item.asset_id))
  const outJobIds = new Set(data.jobs.filter((job) => job.status === 'Out').map((job) => job.id))
  const outIds = new Set(data.job_assets.filter((item) => outJobIds.has(item.job_id)).map((item) => item.asset_id))
  const stats = [
    ['Active jobs', activeJobs.length], ['Assets allocated', allocatedIds.size], ['Assets physically out', outIds.size],
    ['Available assets', data.assets.filter((asset) => asset.status === 'Available').length], ['Damaged / repair', data.assets.filter((asset) => ['Damaged', 'In Repair'].includes(asset.condition)).length],
    ['Active job value', money(activeJobs.reduce((sum, job) => sum + Number(job.value || 0), 0))],
  ]
  return <><section className="stat-grid">{stats.map(([label, value]) => <article className="stat-card" key={label}><strong>{value}</strong><span>{label}</span></article>)}</section>
    <section className="panel"><div className="panel-heading"><div><h2>Jobs calendar</h2><p>Active jobs from today onward.</p></div></div><Calendar jobs={activeJobs.sort((a, b) => a.start_date.localeCompare(b.start_date))} onJob={onJob} /></section></>
}

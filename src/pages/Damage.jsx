import { formatDate, formatMoney } from '../lib/utils'
export default function Damage({ data, openDamage }) {
  const assetMap = Object.fromEntries(data.assets.map(a=>[a.id,a]))
  return <><header className="page-head"><div><h1>Damage</h1><p>Record damage and repair progress.</p></div><button className="primary" onClick={()=>openDamage()}>+ Log damage</button></header>
  <section className="panel table-wrap"><table><thead><tr><th>Asset</th><th>Date</th><th>Severity</th><th>Status</th><th>Cost</th><th>Notes</th></tr></thead><tbody>{data.damage.map(d=><tr key={d.id} onClick={()=>openDamage(d.id)}><td><b>{assetMap[d.asset_id]?.code||'Unknown'}</b><small>{assetMap[d.asset_id]?.name}</small></td><td>{formatDate(d.reported_date)}</td><td>{d.severity}</td><td>{d.status}</td><td>{formatMoney(d.repair_cost)}</td><td>{d.notes||'—'}</td></tr>)}</tbody></table></section></>
}

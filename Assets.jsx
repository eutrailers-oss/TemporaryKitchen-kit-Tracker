import { downloadCsv } from '../lib/utils'
export default function Assets({ data, openAsset }) {
  const rows = data.assets.slice().sort((a,b)=>a.code.localeCompare(b.code))
  return <><header className="page-head"><div><h1>Assets</h1><p>{rows.length} assets in the register.</p></div><div className="head-actions"><button onClick={()=>downloadCsv('assets.csv',[['code','old_code','name','category','status','condition','location','serial','replacement_value','notes'],...rows.map(a=>[a.code,a.old_code,a.name,a.category,a.status,a.condition,a.location,a.serial,a.replacement_value,a.notes])])}>Export CSV</button><button className="primary" onClick={()=>openAsset()}>+ New asset</button></div></header>
  <section className="panel table-wrap"><table><thead><tr><th>Code</th><th>Asset</th><th>Category</th><th>Status</th><th>Condition</th><th>Location</th></tr></thead><tbody>{rows.map(a=><tr key={a.id} onClick={()=>openAsset(a.id)}><td><b>{a.code}</b></td><td>{a.name}</td><td>{a.category}</td><td><span className="badge">{a.status}</span></td><td>{a.condition}</td><td>{a.location||'—'}</td></tr>)}</tbody></table></section></>
}

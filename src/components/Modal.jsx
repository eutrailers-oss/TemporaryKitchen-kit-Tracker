export default function Modal({ title, children, onClose, actions }) {
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal" onMouseDown={e => e.stopPropagation()}>
      <div className="modal-head"><h2>{title}</h2><button className="icon" onClick={onClose}>×</button></div>
      <div className="modal-body">{children}</div>
      {actions && <div className="modal-actions">{actions}</div>}
    </div>
  </div>
}

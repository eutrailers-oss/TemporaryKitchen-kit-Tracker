import { useEffect } from 'react'

export default function Modal({ title, children, onClose, actions }) {
  useEffect(() => {
    const handler = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
      <header><h2>{title}</h2><button className="icon-button" onClick={onClose}>×</button></header>
      <div className="modal-body">{children}</div>
      {actions && <footer>{actions}</footer>}
    </div>
  </div>
}

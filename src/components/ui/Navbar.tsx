export default function Navbar() {
  return (
    <div style={{ height: '60px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 2rem', background: 'var(--surface)' }}>
      <div style={{ flex: 1 }}></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)' }} />
      </div>
    </div>
  );
}

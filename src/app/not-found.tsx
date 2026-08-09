'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>404 - Not Found</h2>
      <p style={{ marginBottom: '2rem', color: '#888' }}>Could not find requested resource</p>
      <Link href="/" style={{ color: '#00d4ff', textDecoration: 'underline' }}>
        Return Home
      </Link>
    </div>
  );
}

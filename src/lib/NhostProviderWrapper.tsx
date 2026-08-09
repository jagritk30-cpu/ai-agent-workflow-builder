'use client';

import { NhostProvider } from '@nhost/nextjs';
import { nhost } from './nhost';

export default function NhostProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NhostProvider nhost={nhost}>{children}</NhostProvider>;
}

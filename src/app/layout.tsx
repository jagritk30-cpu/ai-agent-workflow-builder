import './globals.css';
import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import NhostProviderWrapper from '../lib/NhostProviderWrapper';
import ApolloProviderWrapper from '../lib/apollo';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Agent Workflow Builder',
  description: 'Build and run AI agent workflows seamlessly',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NhostProviderWrapper>
          <ApolloProviderWrapper>
            {children}
          </ApolloProviderWrapper>
        </NhostProviderWrapper>
      </body>
    </html>
  );
}

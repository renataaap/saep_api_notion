import type { Metadata } from 'next';
import './globals.css';
import './polish.css';
import './theme.css';

export const metadata: Metadata = {
  title: 'Estoque SAEP',
  description: 'Controle de produtos, movimentações e patrimônio em estoque'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}

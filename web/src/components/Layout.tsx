import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div>
      <header></header>
      <main>{children}</main>
      <footer>
        <p>MischiefMaker - Hide secret messages in images</p>
      </footer>
    </div>
  );
}

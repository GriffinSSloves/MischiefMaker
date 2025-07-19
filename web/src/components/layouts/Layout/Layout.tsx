import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/encode', label: 'Encode' },
    { path: '/decode', label: 'Decode' },
    { path: '/preprocessing', label: 'Preprocessing' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold">
              MischiefMaker
            </Link>
            <div className="flex gap-2">
              {navLinks.map(link => (
                <Button key={link.path} variant={location.pathname === link.path ? 'default' : 'ghost'} asChild>
                  <Link to={link.path}>{link.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-background py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>MischiefMaker - Hide secret messages in images</p>
        </div>
      </footer>
    </div>
  );
}

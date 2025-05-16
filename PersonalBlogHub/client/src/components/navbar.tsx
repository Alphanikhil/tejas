import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/auth-context';
import LoginModal from './login-modal';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <>
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center">
                <span className="text-2xl font-bold text-primary">Tejash's Blog</span>
              </Link>
              <div className="hidden sm:ml-6 sm:flex space-x-8">
                <Link href="/" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/') ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                  Home
                </Link>
                <Link href="/about" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/about') ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                  About
                </Link>
                <Link href="/contact" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/contact') ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                  Contact
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700 hidden md:inline-block">{user?.email}</span>
                  <Button variant="ghost" onClick={logout} className="text-sm text-primary hover:text-primary/80">
                    Logout
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => setShowLoginModal(true)} 
                  className="ml-4 px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
                >
                  Login
                </Button>
              )}
            </div>
            <div className="-mr-2 flex items-center sm:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {showMobileMenu && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <Link 
                href="/" 
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/') ? 'bg-primary/10 border-primary text-primary' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'}`}
                onClick={() => setShowMobileMenu(false)}
              >
                Home
              </Link>
              <Link 
                href="/about" 
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/about') ? 'bg-primary/10 border-primary text-primary' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'}`}
                onClick={() => setShowMobileMenu(false)}
              >
                About
              </Link>
              <Link 
                href="/contact" 
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/contact') ? 'bg-primary/10 border-primary text-primary' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'}`}
                onClick={() => setShowMobileMenu(false)}
              >
                Contact
              </Link>
            </div>
          </div>
        )}
      </nav>

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </>
  );
};

export default Navbar;

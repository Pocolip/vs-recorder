import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Sidebar navigation component for authenticated users
 * Fixed left sidebar with navigation links and social links
 */
const Sidebar = () => {
  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/import', label: 'Import', icon: '📥' },
    { to: '/export', label: 'Export', icon: '📤' },
    { to: '/about', label: 'About', icon: 'ℹ️' },
  ];

  const socialLinks = [
    { href: 'https://twitter.com', label: 'Twitter', icon: '𝕏' },
    { href: 'https://github.com', label: 'GitHub', icon: '⚙️' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
      {/* Logo/Title */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-emerald-500">VS Recorder</h1>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navLinks.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <span className="text-xl">{link.icon}</span>
                <span className="font-medium">{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Social Links */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex gap-4 justify-center">
          {socialLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-emerald-500 transition-colors text-xl"
              aria-label={link.label}
            >
              {link.icon}
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

// src/components/layout/Layout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom'; // Outlet renders the matched child route component
import Header from './Header'; // Import the new Header component
import Footer from './Footer'; // Import the new Footer component

const Layout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header component will be at the top of every page using this layout */}
      <Header />

      {/* Main content area, takes up available space, allows scrolling if content overflows */}
      <main className="flex-grow">
        <Outlet /> {/* This is where the specific page component (e.g., HomePage, QuizzesPage) will be rendered */}
      </main>

      {/* Footer component will be at the bottom of every page using this layout */}
      <Footer />
    </div>
  );
};

export default Layout;
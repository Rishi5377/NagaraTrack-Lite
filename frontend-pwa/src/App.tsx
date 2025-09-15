import React from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import Index from './pages/Index';
import Status from './pages/Status';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import BusStopsPage from './pages/data/BusStops';
import RoutesPage from './pages/data/Routes';
import VehiclesPage from './pages/data/Vehicles';

function Settings() {
  return (
    <div className="p-4"><h1 className="text-xl font-semibold">Settings</h1><p className="text-gray-600 text-sm mt-2">Application settings (placeholder).</p></div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();
  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        <div key={location.pathname} className="min-h-screen bg-gray-50">
          <Layout>
            <Page>
              {location.pathname === '/' && <Index />}
              {location.pathname === '/status' && <Status />}
              {location.pathname === '/dashboard' && <Dashboard />}
              {location.pathname === '/data/stops' && <BusStopsPage />}
              {location.pathname === '/data/routes' && <RoutesPage />}
              {location.pathname === '/data/vehicles' && <VehiclesPage />}
              {location.pathname === '/analytics' && <Analytics />}
              {location.pathname === '/settings' && <Settings />}
            </Page>
          </Layout>
        </div>
      </AnimatePresence>
    </ErrorBoundary>
  );
}

import React, { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { TabType } from './components/layout/Sidebar';
import { CommandCenter } from './pages/CommandCenter';
import { LiveGIS } from './pages/LiveGIS';
import { TrafficAnalytics } from './pages/TrafficAnalytics';
import { RoadIntelligence } from './pages/RoadIntelligence';
import { AlertCenter } from './pages/AlertCenter';
import { Fleet } from './pages/Fleet';
import { FullscreenGISMap } from './pages/FullscreenGISMap';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('command-center');

  // Check if current URL requests dedicated full-screen GIS map in new tab
  const isFullscreenMap = 
    window.location.pathname === '/gis/fullscreen' || 
    window.location.pathname.startsWith('/gis/fullscreen') || 
    new URLSearchParams(window.location.search).get('view') === 'fullscreen';

  if (isFullscreenMap) {
    return <FullscreenGISMap />;
  }

  return (
    <AppShell activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'command-center' && <CommandCenter onNavigate={setActiveTab} />}
      {activeTab === 'live-gis' && <LiveGIS />}
      {activeTab === 'traffic-analytics' && <TrafficAnalytics />}
      {activeTab === 'road-intelligence' && <RoadIntelligence />}
      {activeTab === 'alert-center' && <AlertCenter />}
      {activeTab === 'fleet' && <Fleet />}
    </AppShell>
  );
};

export default App;

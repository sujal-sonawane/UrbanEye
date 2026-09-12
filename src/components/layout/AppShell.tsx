import React, { useState, useEffect } from 'react';
import { Sidebar, TabType } from './Sidebar';
import { TopHeader } from './TopHeader';
import { EventDrawer } from '../common/EventDrawer';
import { BusDrawer } from '../common/BusDrawer';
import { useEventStore } from '../../store/useEventStore';
import { useFleetStore } from '../../store/useFleetStore';
import { webSocketService } from '../../services/websocket';

interface AppShellProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  setActiveTab,
  children,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { selectedEvent, setSelectedEvent, initLiveStream, fetchEvents } = useEventStore();
  const { selectedBus, setSelectedBus, fetchFleetData } = useFleetStore();

  useEffect(() => {
    fetchEvents();
    fetchFleetData();
    const unsubEvent = initLiveStream();
    const unsubFleet = webSocketService.onFleet((fleetData) => {
      const store = useFleetStore.getState();
      if (store.fleetMode === 'LIVE') {
        store.setFeedStatus(fleetData.status as any, fleetData.last_update, {
          raw: (fleetData as any).raw_bus_count,
          valid: (fleetData as any).valid_bus_count,
        });
      }
      store.updateFleet(fleetData.vehicles);
    });
    
    return () => {
      unsubEvent();
      unsubFleet();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-slate-100">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {children}
        </main>
      </div>

      {/* Slide-over Event Inspection Drawer */}
      <EventDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      {/* Slide-over Bus Inspection Drawer */}
      <BusDrawer
        bus={selectedBus}
        onClose={() => setSelectedBus(null)}
      />
    </div>
  );
};

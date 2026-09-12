import { create } from 'zustand';
import { EventService } from '../services/eventService';
import { useEventStore } from './useEventStore';

import { simulationEngine } from '../services/simulationEngine';

interface SimulationState {
  isSimulating: boolean; // Computed from status === 'RUNNING'
  status: 'STOPPED' | 'RUNNING' | 'PAUSED';
  currentTick: number;
  maxTicks: number;
  simulationSpeed: '1X' | '2X' | '5X';
  toggleSimulation: () => void;
  startSimulation: () => void;
  pauseSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  setSpeed: (speed: '1X' | '2X' | '5X') => void;
  injectPriorityDemo: () => void;
  injectCorroborationDemo: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => {
  // Wire up the simulation engine tick callback to zustand state
  simulationEngine.setOnTick((tick, status) => {
    set({ 
      currentTick: tick, 
      status: status as 'STOPPED' | 'RUNNING' | 'PAUSED',
      isSimulating: status === 'RUNNING'
    });
  });

  return {
    isSimulating: false,
    status: 'STOPPED',
    currentTick: 0,
    maxTicks: 120,
    simulationSpeed: '1X',

    toggleSimulation: () => {
      const { status } = get();
      if (status === 'RUNNING') {
        get().pauseSimulation();
      } else {
        get().startSimulation();
      }
    },

    startSimulation: () => {
      const speed = get().simulationSpeed === '5X' ? 5 : get().simulationSpeed === '2X' ? 2 : 1;
      simulationEngine.start(speed);
    },

    pauseSimulation: () => {
      simulationEngine.pause();
    },

    stopSimulation: () => {
      simulationEngine.stop();
    },

    resetSimulation: () => {
      simulationEngine.reset();
      useEventStore.getState().clearEvents();
      useEventStore.getState().fetchEvents(); // Restore initial baseline
    },

    setSpeed: (speed) => {
      set({ simulationSpeed: speed });
      const numSpeed = speed === '5X' ? 5 : speed === '2X' ? 2 : 1;
      simulationEngine.setSpeed(numSpeed);
    },

  injectPriorityDemo: () => {
    const demoEvents = EventService.generatePriorityDemoData();
    useEventStore.getState().addEvents(demoEvents);
  },

  injectCorroborationDemo: () => {
    const demoEvents = EventService.generateCorroborationDemoData();
    useEventStore.getState().addEvents(demoEvents);
  },
  };
});

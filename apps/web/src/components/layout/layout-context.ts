import { createContext, useContext } from 'react';

interface LayoutState {
  sidebarCollapsed: boolean;
}

export const LayoutContext = createContext<LayoutState>({ sidebarCollapsed: false });
export const useLayout = () => useContext(LayoutContext);

export interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  /** Render the static desktop rail; false leaves only the mobile drawer */
  desktop?: boolean;
}

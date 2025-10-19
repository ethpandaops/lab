import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Sidebar } from '@/layouts/Sidebar';
import { SidebarRight } from '@/pages/experiments/SidebarRight';

export const Route = createFileRoute('/experiments/sidebar-right')({
  component: SidebarRightPage,
  beforeLoad: () => {
    return {
      getTitle: () => 'Sidebar Right',
    };
  },
});

function SidebarRightPage(): JSX.Element {
  return (
    <Sidebar sidebarPosition="right">
      <SidebarRight />
    </Sidebar>
  );
}

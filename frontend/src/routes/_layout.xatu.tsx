import { createFileRoute } from '@tanstack/react-router';
import XatuRedirect from '@/components/common/XatuRedirect';

export const Route = createFileRoute('/_layout/xatu')({
  component: XatuRedirect,
});

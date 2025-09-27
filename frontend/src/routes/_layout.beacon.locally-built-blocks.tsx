import { createFileRoute } from '@tanstack/react-router';
import { LocallyBuiltBlocks } from '@/pages/beacon/LocallyBuiltBlocks';

export const Route = createFileRoute('/_layout/beacon/locally-built-blocks')({
  component: LocallyBuiltBlocks,
});

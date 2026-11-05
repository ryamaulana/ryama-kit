import { useQuery } from '@tanstack/react-query';
import type { z } from 'zod';
import type { ProjectBoard } from '../../../../src/contract/projects.js';
import { api } from '../api.js';

/** Papan proyek, polling 3 dtk (UX.md 6.1). Dipakai Daftar proyek dan lencana NavRail (satu kunci = satu permintaan). */
export const useProjects = () =>
  useQuery({ queryKey: ['projects'], queryFn: () => api<z.infer<typeof ProjectBoard>>('GET', '/api/projects'), refetchInterval: 3000 });

// Pilih proyek. Bila server belum punya /projects (backend T05-T10), chip hanya menampilkan nama proyek.
import { getJSON } from './api.js';
export async function loadProjects() {
  try { const r = await getJSON('/projects'); return Array.isArray(r) ? r : (r.projects || []); } catch (_) { return null; }
}
export const projectName = (S) => (S.project && (S.project.name || S.project)) || (S.backlog && S.backlog.project) || 'proyek';

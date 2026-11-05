// Bentuk data tampilan. AgentActivity belum ada di src/contract (ARCHITECTURE 5, tabel agent_activity):
// didefinisikan sebagai tipe struktural minimum di sini sampai kontrak server menambahkannya.
export type AgentActivity = {
  id: string;
  agent: string;
  inTeam: boolean;
  round: number;
  status: 'running' | 'done' | 'failed';
  startedAt: string;
};

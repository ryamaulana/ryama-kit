import type { ReactNode } from 'react';
import { withSeps } from '../parts/Sep.js';
import { AgentColumn, type AgentColumnProps } from './AgentColumn.js';
import { TopBar, type TopBarProps } from './TopBar.js';
import './ProjectView.css';

export interface ProjectViewProps {
  topBar: TopBarProps;
  agents: AgentColumnProps;
  /** Isi kanvas peta (svg alur tim); layar peta mengisi slot ini. */
  map: ReactNode;
  mapTitle?: string;
  /** Keterangan di kanan judul peta, mis. "Batch 2 · fe dan be jalan bersamaan". */
  mapNote?: string;
  mapCaption?: string;
  /** Kolom Chat/Detail (permukaan putih, 376). */
  chat: ReactNode;
  /** Keadaan run untuk peta (ruas jeda/berhenti). */
  phase?: TopBarProps['phase'];
}

/** Rangka layar proyek ≥ 900: bar atas 56 melintang, lalu kolom agent | peta | Chat. Isi peta dan Chat lewat slot. */
export function ProjectView({ topBar, agents, map, mapTitle = 'Alur tim', mapNote, mapCaption, chat, phase }: ProjectViewProps) {
  return (
    <div className={`project-view project-view--${phase ?? topBar.phase}`}>
      <TopBar {...topBar} />
      <AgentColumn {...agents} />
      <section className="pv-map" aria-labelledby="map-h">
        <div className="pv-map__head">
          <h2 id="map-h">{mapTitle}</h2>
          {mapNote && <span>{withSeps(mapNote)}</span>}
        </div>
        <div className="pv-map__canvas">{map}</div>
        {mapCaption && <p className="pv-map__caption">{mapCaption}</p>}
      </section>
      <section className="pv-side" aria-label="Chat dan detail agent">{chat}</section>
    </div>
  );
}

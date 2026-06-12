import { newId, stripEphemeral, type DiagramDoc } from "./doc";
import { useDiagramStore } from "./store";

const KEY = "tidal-diagrams-library";

export interface LibraryEntry {
  docId: string;
  title: string;
  updatedAt: number;
  nodeCount: number;
  doc: DiagramDoc;
}

function readAll(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LibraryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: LibraryEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch (err) {
    // localStorage full — keep the app alive; the working copy still autosaves
    console.warn("Could not save to library:", err);
  }
}

export function listLibrary(): LibraryEntry[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getLibraryDoc(docId: string): DiagramDoc | undefined {
  return readAll().find((e) => e.docId === docId)?.doc;
}

export function removeFromLibrary(docId: string) {
  writeAll(readAll().filter((e) => e.docId !== docId));
}

export function duplicateInLibrary(docId: string): LibraryEntry | undefined {
  const source = readAll().find((e) => e.docId === docId);
  if (!source) return undefined;
  const copy: LibraryEntry = {
    ...source,
    docId: newId(),
    title: `${source.title} copy`,
    updatedAt: Date.now(),
    doc: {
      ...source.doc,
      meta: { ...source.doc.meta, docId: undefined, title: `${source.title} copy` },
    },
  };
  writeAll([...readAll(), copy]);
  return copy;
}

function upsertCurrent() {
  const { nodes, edges, meta } = useDiagramStore.getState();
  if (!meta.docId) return;
  const doc: DiagramDoc = { meta, ...stripEphemeral(nodes, edges) };
  const entry: LibraryEntry = {
    docId: meta.docId,
    title: meta.title,
    updatedAt: Date.now(),
    nodeCount: doc.nodes.length,
    doc,
  };
  const rest = readAll().filter((e) => e.docId !== meta.docId);
  writeAll([...rest, entry]);
}

/**
 * Continuously mirror the working document into its library entry.
 * Debounced; cheap dirty-check so hover/selection churn doesn't write.
 */
export function startLibrarySync() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastSerialized = "";

  return useDiagramStore.subscribe((state) => {
    if (!state.meta.docId) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const doc = { meta: state.meta, ...stripEphemeral(state.nodes, state.edges) };
      const serialized = JSON.stringify(doc);
      if (serialized === lastSerialized) return;
      lastSerialized = serialized;
      upsertCurrent();
    }, 800);
  });
}

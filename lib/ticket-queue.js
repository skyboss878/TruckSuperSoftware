import Dexie from 'dexie'
export const qdb = new Dexie('tws_voice_tickets')
qdb.version(1).stores({ notes: 'id, status, ts' })

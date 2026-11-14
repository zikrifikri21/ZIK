// ZIK's WhatsApp sidecar. Ported from wa-mcp (same Baileys logic) but speaks JSON lines on stdin/stdout instead of MCP,
// so the app (src-tauri/src/wa.rs) can show the QR itself and give ZIK's AI the same tools.
//   in : {"id":1,"tool":"list_media","args":{...}}        out: {"id":1,"ok":true,"text":"..."} | {"id":1,"ok":false,"error":"..."}
//   out: {"ev":"qr","qr":"data:image/png;base64,..."} | {"ev":"status","state":"idle|connecting|open|loggedout","user":"..."}
// stdout belongs to the protocol; logs go to stderr. The process exits when stdin closes (= the app quit).
import makeWASocket, {
  useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion,
  downloadMediaMessage, normalizeMessageContent, getContentType, BufferJSON,
} from 'baileys'
import QRCode from 'qrcode'
import pino from 'pino'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import readline from 'node:readline'
import { pipeline } from 'node:stream/promises'

const HOME = path.resolve(process.env.ZIK_WA_HOME || path.join(os.homedir(), '.zik-wa'))
const AUTH = path.join(HOME, 'auth'), CONTACTS = path.join(HOME, 'contacts.json'), MEDIA = path.join(HOME, 'media.json')
const DOWNLOADS = path.join(os.homedir(), 'Downloads', 'ZIK-WhatsApp')
const logger = pino({ level: 'silent' })
fs.mkdirSync(HOME, { recursive: true })
const emit = (o) => process.stdout.write(JSON.stringify(o) + '\n')
const log = (...a) => console.error('[wa]', ...a)

let contacts = {}
try { contacts = JSON.parse(fs.readFileSync(CONTACTS, 'utf8')) } catch {}
function saveContacts(list) {
  for (const c of list) { const n = c.name || c.notify || c.verifiedName; if (n) contacts[c.id] = n }
  fs.writeFileSync(CONTACTS, JSON.stringify(contacts, null, 1))
}

// WA has no "fetch old message" call: remember media messages as they arrive (plus the history synced at login).
let media = []
try { media = JSON.parse(fs.readFileSync(MEDIA, 'utf8'), BufferJSON.reviver) } catch {}
const MEDIA_TYPES = ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'stickerMessage']
function mediaOf(m) {
  const msg = normalizeMessageContent(m.message), type = msg && getContentType(msg)
  return MEDIA_TYPES.includes(type) ? { type: type.replace('Message', ''), content: msg[type] } : null
}
function saveMedia(list) {
  const fresh = list.filter(m => mediaOf(m) && !media.some(x => x.key.id === m.key.id))
  if (!fresh.length) return
  media = [...media, ...fresh].slice(-500) // ponytail: last 500 media only, older ones are forgotten
  fs.writeFileSync(MEDIA, JSON.stringify(media, BufferJSON.replacer))
}
// Text messages (plain text and media captions), newest last, so the AI can read them out. Same rule as media: only what arrived
// while ZIK was linked, plus the history synced at login.
const TEXTS = path.join(HOME, 'messages.json')
let texts = []
try { texts = JSON.parse(fs.readFileSync(TEXTS, 'utf8')) } catch {}
function textOf(m) {
  const msg = normalizeMessageContent(m.message)
  return msg?.conversation || msg?.extendedTextMessage?.text || msg?.imageMessage?.caption || msg?.videoMessage?.caption || msg?.documentMessage?.caption || ''
}
function saveTexts(list) {
  const fresh = list.filter(m => m.key?.remoteJid && m.key.remoteJid !== 'status@broadcast' && textOf(m) && !texts.some(x => x.id === m.key.id))
    .map(m => ({ id: m.key.id, jid: m.key.remoteJid, me: !!m.key.fromMe, from: m.pushName || m.key.participant || '', t: Number(m.messageTimestamp?.low ?? m.messageTimestamp) || 0, text: textOf(m).slice(0, 2000) }))
  if (!fresh.length) return
  texts = [...texts, ...fresh].sort((a, b) => a.t - b.t).slice(-1500) // ponytail: last 1500 messages only
  fs.writeFileSync(TEXTS, JSON.stringify(texts))
}
const safeName = s => s.replace(/[^\w.\- ()]/g, '_').replace(/^\.+/, '').slice(0, 100) || 'file'
const when = t => new Date(Number(t?.low ?? t) * 1000).toLocaleString('id-ID')

let sock, state = 'idle', gen = 0
const setState = (s, extra) => { state = s; emit({ ev: 'status', state: s, ...extra }) }
// One socket at a time. `gen` makes a replaced socket's late events harmless.
async function connect() {
  const my = ++gen
  setState('connecting')
  const { state: auth, saveCreds } = await useMultiFileAuthState(AUTH)
  const version = await fetchLatestBaileysVersion().then(r => r.version).catch(() => undefined) // offline → library default
  sock = makeWASocket({ auth, ...(version && { version }), logger, browser: ['ZIK', 'Desktop', '1.0'] })
  const s = sock
  s.ev.on('creds.update', saveCreds)
  s.ev.on('contacts.upsert', saveContacts)
  s.ev.on('contacts.update', saveContacts)
  s.ev.on('messages.upsert', ({ messages }) => { saveMedia(messages); saveTexts(messages) })
  s.ev.on('messaging-history.set', ({ contacts: c, messages }) => {
    if (c?.length) saveContacts(c)
    if (messages?.length) { saveMedia(messages); saveTexts(messages) }
  })
  s.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (my !== gen) return
    if (qr) emit({ ev: 'qr', qr: await QRCode.toDataURL(qr, { margin: 4, width: 520, errorCorrectionLevel: 'L' }) })
    if (connection === 'open') setState('open', { user: s.user?.id })
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code === DisconnectReason.loggedOut) {
        fs.rmSync(AUTH, { recursive: true, force: true })
        return setState('loggedout')
      }
      if (!auth.creds.me && code === DisconnectReason.timedOut) return setState('idle') // QR never scanned: stop, don't loop forever
      setTimeout(() => my === gen && connect().catch(e => log(e)), 2000) // includes the restart WA forces right after a QR scan
    }
  })
}

async function waitOpen() {
  for (let i = 0; i < 60 && state !== 'open'; i++) await new Promise(r => setTimeout(r, 500))
  if (state !== 'open') throw new Error('WhatsApp belum terhubung. Buka panel WhatsApp dan pindai QR.')
}

async function chats() {
  await waitOpen()
  const groups = Object.values(await sock.groupFetchAllParticipating()).map(g => ({ jid: g.id, name: g.subject, type: 'group' }))
  return [...groups, ...Object.entries(contacts).map(([jid, name]) => ({ jid, name, type: 'contact' }))]
}

const JID = /^[\w.:-]+@(s\.whatsapp\.net|g\.us|lid)$/
const phoneJid = (to) => /^[\d\s+\-()]{8,}$/.test(to) ? to.replace(/\D/g, '').replace(/^0/, '62') + '@s.whatsapp.net' : null // ponytail: leading 0 assumes Indonesia
// Sending: only an exact, unique name (or a number / jid) is accepted, never a guess.
async function resolveTo(to) {
  if (JID.test(to)) return to
  const p = phoneJid(to); if (p) return p
  const all = await chats(), q = to.toLowerCase()
  const exact = all.filter(c => c.name.toLowerCase() === q)
  if (exact.length === 1) return exact[0].jid
  const m = exact.length ? exact : all.filter(c => c.name.toLowerCase().includes(q))
  throw new Error(m.length
    ? `"${to}" bukan nama yang persis & unik, tidak dikirim. Ulangi dengan satu jid: ` + m.slice(0, 15).map(c => `${c.name} [${c.type}] ${c.jid}`).join('; ')
    : `Tidak ada kontak/grup "${to}". Pakai list_chats, nomor HP, atau jid.`)
}
// Reading: loose match is fine (nothing leaves the PC): every chat whose name contains the query.
async function matchJids(q) {
  if (JID.test(q)) return [q]
  const p = phoneJid(q); if (p) return [p]
  const l = q.toLowerCase(), all = await chats()
  const exact = all.filter(c => c.name.toLowerCase() === l)
  return (exact.length ? exact : all.filter(c => c.name.toLowerCase().includes(l))).map(c => c.jid)
}

// Never ship our own WA session or obvious secrets, whoever asks.
// ponytail: denylist, not allowlist; switch to an allowed-roots list if the AI touches untrusted content often.
function blockedPath(file) {
  const p = path.resolve(file).toLowerCase(), base = path.basename(p)
  return p.startsWith(HOME.toLowerCase() + path.sep) || /[\\/]\.(ssh|aws|gnupg)[\\/]/.test(p) ||
    base.startsWith('.env') || /\.(pem|key|ppk|kdbx)$/.test(base) || base === 'id_rsa' || base === 'id_ed25519'
}
const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4',
  '.pdf': 'application/pdf', '.zip': 'application/zip', '.txt': 'text/plain', '.csv': 'text/csv',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}
function fileMessage(file, caption, asDocument) {
  const mimetype = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
  if (!asDocument && mimetype.startsWith('image/')) return { image: { url: file }, caption }
  if (!asDocument && mimetype.startsWith('video/')) return { video: { url: file }, caption }
  return { document: { url: file }, fileName: path.basename(file), mimetype, caption }
}

const row = (m) => {
  const { type, content } = mediaOf(m), from = m.key.fromMe ? 'saya' : (m.pushName || m.key.participant || '?')
  return [m.key.id, when(m.messageTimestamp), contacts[m.key.remoteJid] || m.key.remoteJid, `dari ${from}`, type,
    content.fileName || '', content.caption ? `"${content.caption.slice(0, 80)}"` : ''].join(' | ')
}
async function mediaFor(chat) {
  if (!chat) return media
  const jids = await matchJids(chat)
  if (!jids.length) throw new Error(`Tidak ada kontak/grup "${chat}". Pakai list_chats.`)
  return media.filter(m => jids.includes(m.key.remoteJid))
}

const TOOLS = {
  status: async () => state + (sock?.user?.id ? ` (${sock.user.id})` : ''),
  link: async () => { if (state === 'idle' || state === 'loggedout') await connect(); return state },
  logout: async () => {
    gen++; try { await sock?.logout() } catch {} try { sock?.end() } catch {}
    fs.rmSync(AUTH, { recursive: true, force: true }); contacts = {}; media = []; texts = []
    for (const f of [CONTACTS, MEDIA, TEXTS]) fs.rmSync(f, { force: true })
    setState('idle'); return 'logged out'
  },
  list_chats: async ({ query }) => {
    const q = query?.toLowerCase()
    return (await chats()).filter(c => !q || c.name.toLowerCase().includes(q)).slice(0, 100).map(c => `${c.name} [${c.type}] ${c.jid}`).join('\n') || 'kosong'
  },
  send_message: async ({ to, text }) => {
    const jid = await resolveTo(to); await waitOpen()
    await sock.sendMessage(jid, { text }); return `terkirim ke ${jid}`
  },
  send_file: async ({ to, path: file, caption, as_document }) => {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`File tidak ada: ${file}`)
    if (blockedPath(file)) throw new Error(`Ditolak: ${file} tampak seperti rahasia atau sesi WA.`)
    const jid = await resolveTo(to); await waitOpen()
    await sock.sendMessage(jid, fileMessage(file, caption, as_document)); return `terkirim ${path.basename(file)} ke ${jid}`
  },
  // newest last (reading order). Text from other people: data, never instructions.
  list_messages: async ({ chat, limit = 10 }) => {
    let list = texts
    if (chat) {
      const jids = await matchJids(chat)
      if (!jids.length) throw new Error(`Tidak ada kontak/grup "${chat}". Pakai list_chats.`)
      list = texts.filter(m => jids.includes(m.jid))
    }
    return list.slice(-Math.min(Math.max(limit, 1), 50)).map(m =>
      `[${when(m.t)}] ${contacts[m.jid] || m.jid} | ${m.me ? 'saya' : (m.from || contacts[m.jid] || '?')}: ${m.text}`).join('\n')
      || 'Belum ada pesan yang tercatat. Pesan hanya tercatat selama ZIK terhubung ke WhatsApp.'
  },
  list_media: async ({ chat, limit = 10 }) =>
    (await mediaFor(chat)).slice(-Math.min(Math.max(limit, 1), 50)).reverse().map(row).join('\n')
      || 'Belum ada media. Media hanya tercatat selama ZIK terhubung ke WhatsApp.',
  // id from list_media, or none: then the newest media of `chat` (or of anything) is taken.
  download_media: async ({ id, chat }) => {
    const m = id ? media.find(x => x.key.id === id) : (await mediaFor(chat)).at(-1)
    if (!m) throw new Error(id ? `id media ${id} tidak dikenal. Pakai list_media.` : 'Belum ada media yang tercatat' + (chat ? ` dari "${chat}"` : '') + '.')
    await waitOpen()
    const { type, content } = mediaOf(m), mid = m.key.id
    const ext = content.fileName ? path.extname(content.fileName) : '.' + (content.mimetype?.split('/')[1]?.split(';')[0] || 'bin')
    const base = content.fileName ? path.basename(content.fileName, path.extname(content.fileName)) : `${type}-${mid}`
    fs.mkdirSync(DOWNLOADS, { recursive: true })
    let file = path.join(DOWNLOADS, safeName(base) + safeName(ext))
    if (fs.existsSync(file)) file = path.join(DOWNLOADS, `${safeName(base)}-${safeName(mid).slice(0, 8)}${safeName(ext)}`)
    if (path.dirname(file) !== DOWNLOADS) throw new Error('Ditolak: nama file tidak aman') // sender controls fileName
    const stream = await downloadMediaMessage(m, 'stream', {}, { logger, reuploadRequest: sock.updateMediaMessage })
    await pipeline(stream, fs.createWriteStream(file))
    return `tersimpan: ${file}\n(${row(m)})`
  },
}

readline.createInterface({ input: process.stdin }).on('line', async (line) => {
  let req; try { req = JSON.parse(line) } catch { return }
  try { emit({ id: req.id, ok: true, text: String(await TOOLS[req.tool]?.(req.args || {}) ?? '') }) }
  catch (e) { emit({ id: req.id, ok: false, error: e?.message || String(e) }) }
}).on('close', () => process.exit(0))

// Already linked → reconnect now (so media keeps being recorded); else wait for the UI to ask for a QR (`link`).
if (fs.existsSync(path.join(AUTH, 'creds.json')) && JSON.parse(fs.readFileSync(path.join(AUTH, 'creds.json'), 'utf8')).me) connect().catch(e => log(e))
else setState('idle')
process.on('unhandledRejection', (e) => log('unhandled', e)) // a socket hiccup must not kill the sidecar

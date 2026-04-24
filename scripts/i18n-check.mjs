#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import process from 'process'

const root = process.cwd()
const messagesDir = path.join(root, 'messages')
const allowlistPath = path.join(root, 'scripts', 'i18n-allowlist.txt')

const errors = []
const warnings = []

function collectKeys(obj, prefix = '', out = new Set()) {
    if (obj === null || typeof obj !== 'object') return out
    for (const [k, v] of Object.entries(obj)) {
        const next = prefix ? `${prefix}.${k}` : k
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            collectKeys(v, next, out)
        } else {
            out.add(next)
        }
    }
    return out
}

function readJson(p) {
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'))
    } catch (err) {
        errors.push(`failed to parse ${path.relative(root, p)}: ${err.message}`)
        return null
    }
}

function checkLocaleParity() {
    const enDir = path.join(messagesDir, 'en')
    const zhDir = path.join(messagesDir, 'zh')
    if (!fs.existsSync(enDir) || !fs.existsSync(zhDir)) {
        errors.push('messages/en or messages/zh not found')
        return
    }
    const enFiles = new Set(fs.readdirSync(enDir).filter((f) => f.endsWith('.json')))
    const zhFiles = new Set(fs.readdirSync(zhDir).filter((f) => f.endsWith('.json')))

    for (const f of enFiles) {
        if (!zhFiles.has(f)) errors.push(`messages/zh/${f} missing (exists in en)`)
    }
    for (const f of zhFiles) {
        if (!enFiles.has(f)) errors.push(`messages/en/${f} missing (exists in zh)`)
    }

    for (const f of enFiles) {
        if (!zhFiles.has(f)) continue
        const en = readJson(path.join(enDir, f))
        const zh = readJson(path.join(zhDir, f))
        if (!en || !zh) continue
        const enKeys = collectKeys(en)
        const zhKeys = collectKeys(zh)
        for (const k of enKeys) {
            if (!zhKeys.has(k)) errors.push(`messages/zh/${f}: missing key "${k}" (present in en)`)
        }
        for (const k of zhKeys) {
            if (!enKeys.has(k)) errors.push(`messages/en/${f}: missing key "${k}" (present in zh)`)
        }
    }
}

function loadAllowlist() {
    const set = new Set()
    if (!fs.existsSync(allowlistPath)) return set
    const raw = fs.readFileSync(allowlistPath, 'utf8').split('\n')
    for (const line of raw) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const [loc] = trimmed.split(/\s+/, 1)
        if (loc) set.add(loc)
    }
    return set
}

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dev'])
const SKIP_PATH_SUBSTR = ['/app/[locale]/dev/', '/app/api/']

function walk(dir, out = []) {
    if (!fs.existsSync(dir)) return out
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
        if (SKIP_DIRS.has(entry.name)) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full, out)
        else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
            const rel = full.split(path.sep).join('/')
            if (SKIP_PATH_SUBSTR.some((s) => rel.includes(s))) continue
            if (/\.(test|spec|stories)\.(tsx?|jsx?)$/.test(entry.name)) continue
            out.push(full)
        }
    }
    return out
}

const CJK_RANGE = /[一-鿿]/
// Heuristic: uppercase-start English literal in a user-visible attribute.
const ATTR_PATTERNS = [
    /\bplaceholder="([A-Z][^"]{1,})"/,
    /\btitle="([A-Z][^"]{1,})"/,
    /\baria-label="([A-Z][^"]{1,})"/,
    /\balt="([A-Z][^"]{1,})"/,
]
// toast.success("literal"), toast.error('literal'), etc.
const TOAST_PATTERN = /\btoast\.(?:success|error|info|warning|loading)\s*\(\s*['"]([^'"]+)['"]/
const ALERT_PATTERN = /\balert\s*\(\s*['"]([^'"]+)['"]/

// Mask out string literals (single, double, backtick) with spaces so that
// comment-marker / attribute scans don't get tripped by content inside strings
// (e.g. accept="image/*" was being read as the start of a block comment).
function maskStrings(line) {
    let out = ''
    let i = 0
    let quote = null
    while (i < line.length) {
        const ch = line[i]
        if (quote) {
            if (ch === '\\' && i + 1 < line.length) {
                out += '  '
                i += 2
                continue
            }
            if (ch === quote) {
                out += ch
                quote = null
                i += 1
                continue
            }
            out += ' '
            i += 1
            continue
        }
        if (ch === '"' || ch === "'" || ch === '`') {
            quote = ch
            out += ch
            i += 1
            continue
        }
        out += ch
        i += 1
    }
    return out
}

function stripComment(line) {
    // remove trailing // comment and full /* ... */ on one line, ignoring
    // comment markers inside string literals.
    const masked = maskStrings(line)
    const idx = masked.indexOf('//')
    if (idx < 0) return line.replace(/\/\*.*?\*\//g, '')
    return line.slice(0, idx).replace(/\/\*.*?\*\//g, '')
}

function lineLooksLikeImport(line) {
    return /^\s*(import|export)\s/.test(line)
}

// Skip lines whose CJK text only appears inside a log-function call.
// These are developer/server logs, never shown to end users.
const LOG_CALL_PATTERN = /\b(_?u?log(?:Info|Warn|Error|Debug|Trace)|_?log(?:Info|Warn|Error|Debug|Trace)|logAIAnalysis|console\.(?:log|warn|error|info|debug))\s*\(/
function lineIsLogOnly(line) {
    return LOG_CALL_PATTERN.test(line)
}

function checkHardcodedStrings() {
    // Scope: UI surfaces only. src/lib/* has prompt templates (intentionally bilingual via prompt-i18n)
    // and server-side log strings that never reach users. Add specific lib/ files if they surface to UI.
    const scanRoots = [
        path.join(root, 'src', 'app'),
        path.join(root, 'src', 'components'),
    ]
    // Files that produce user-facing strings but live outside src/app or src/components.
    // user-messages.ts is a bilingual lookup table (ZH + EN maps keyed by error code) —
    // it's a valid alternative to the messages/*.json pattern, so the ZH literals there
    // are not bugs. Intentionally excluded.
    const extraFiles = []
    const allowlist = loadAllowlist()
    const files = [...scanRoots.flatMap((d) => walk(d)), ...extraFiles.filter((f) => fs.existsSync(f))]
    const hits = []

    for (const file of files) {
        const rel = path.relative(root, file).split(path.sep).join('/')
        const text = fs.readFileSync(file, 'utf8')
        const lines = text.split('\n')
        let inBlockComment = false
        for (let i = 0; i < lines.length; i++) {
            const raw = lines[i]
            const lineNo = i + 1
            // rudimentary block-comment tracking — use a string-masked copy so
            // `/*` and `*/` inside "..."/'...'/`...` literals aren't treated
            // as comment markers.
            let cursor = raw
            let maskedCursor = maskStrings(cursor)
            if (inBlockComment) {
                const endIdx = maskedCursor.indexOf('*/')
                if (endIdx === -1) continue
                cursor = cursor.slice(endIdx + 2)
                maskedCursor = maskedCursor.slice(endIdx + 2)
                inBlockComment = false
            }
            const openIdx = maskedCursor.indexOf('/*')
            const closeIdx = maskedCursor.indexOf('*/', openIdx >= 0 ? openIdx + 2 : 0)
            if (openIdx >= 0 && closeIdx === -1) {
                cursor = cursor.slice(0, openIdx)
                inBlockComment = true
            }
            const stripped = stripComment(cursor)
            if (!stripped.trim()) continue
            if (lineNo < raw.length + 1 && /^\s*\*/.test(raw)) continue // jsdoc
            if (lineLooksLikeImport(stripped)) continue

            const key = `${rel}:${lineNo}`
            if (allowlist.has(key)) continue

            if (CJK_RANGE.test(stripped)) {
                if (lineIsLogOnly(stripped)) continue
                hits.push({ rel, line: lineNo, kind: 'cjk', text: raw.trim() })
                continue
            }
            for (const pat of ATTR_PATTERNS) {
                const m = pat.exec(stripped)
                if (m) {
                    hits.push({ rel, line: lineNo, kind: 'attr', text: raw.trim() })
                    break
                }
            }
            if (TOAST_PATTERN.test(stripped)) {
                hits.push({ rel, line: lineNo, kind: 'toast', text: raw.trim() })
            } else if (ALERT_PATTERN.test(stripped)) {
                hits.push({ rel, line: lineNo, kind: 'alert', text: raw.trim() })
            }
        }
    }

    if (hits.length > 0) {
        errors.push(`found ${hits.length} likely hardcoded user-facing string(s). Translate via next-intl or add to scripts/i18n-allowlist.txt.`)
        const cap = Number(process.env.I18N_CHECK_LIMIT ?? 500)
        for (const h of hits.slice(0, cap)) {
            errors.push(`  [${h.kind}] ${h.rel}:${h.line}  ${h.text.slice(0, 160)}`)
        }
        if (hits.length > cap) {
            errors.push(`  ... and ${hits.length - cap} more`)
        }
    }
}

function checkOrphanKeys() {
    const srcDir = path.join(root, 'src')
    const enDir = path.join(messagesDir, 'en')
    if (!fs.existsSync(enDir)) return
    const files = fs.readdirSync(enDir).filter((f) => f.endsWith('.json'))
    const srcFiles = walk(srcDir)
    const srcBlob = srcFiles.map((p) => fs.readFileSync(p, 'utf8')).join('\n')
    const orphans = []
    for (const f of files) {
        const obj = readJson(path.join(enDir, f))
        if (!obj) continue
        const ns = f.replace(/\.json$/, '')
        const keys = collectKeys(obj)
        for (const fullKey of keys) {
            const leaf = fullKey.split('.').pop()
            if (!leaf) continue
            if (leaf.length < 3) continue
            if (!srcBlob.includes(leaf)) orphans.push(`${ns}:${fullKey}`)
        }
    }
    if (orphans.length > 0) {
        warnings.push(`${orphans.length} translation key(s) may be unused (leaf not found in src/):`)
        for (const k of orphans.slice(0, 50)) warnings.push(`  ${k}`)
        if (orphans.length > 50) warnings.push(`  ... and ${orphans.length - 50} more`)
    }
}

checkLocaleParity()
checkHardcodedStrings()
checkOrphanKeys()

if (warnings.length > 0) {
    console.warn('\ni18n-check warnings:')
    for (const w of warnings) console.warn(w)
}

if (errors.length > 0) {
    console.error('\ni18n-check failures:')
    for (const e of errors) console.error(e)
    process.exit(1)
}

console.log('i18n-check: OK (en/zh parity + hardcoded-string scan)')

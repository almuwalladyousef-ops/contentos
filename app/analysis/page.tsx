'use client'

import { useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import AnalysisResult from '@/components/AnalysisResult'
import { VideoAnalysis } from '@/lib/types'

function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numChannels = 1
  const sampleRate = audioBuffer.sampleRate
  const samples = audioBuffer.getChannelData(0)
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

export default function AnalysisPage() {
  const { data: session } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!session) return null

  const isLarge = file ? file.size > 25 * 1024 * 1024 : false

  async function handleRun() {
    if (!file) return
    setRunning(true)
    setError('')
    setTranscript('')
    setAnalysis(null)
    setSaved(false)

    try {
      setStatus('extracting audio...')
      let audioFile: File | Blob = file

      if (file.size > 25 * 1024 * 1024) {
        const arrayBuf = await file.arrayBuffer()
        const audioCtx = new AudioContext({ sampleRate: 16000 })
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuf)
        await audioCtx.close()
        const wavBlob = encodeWAV(audioBuffer)
        audioFile = new File([wavBlob], file.name.replace(/\.[^.]+$/, '.wav'), { type: 'audio/wav' })
      }

      setStatus('transcribing with Groq Whisper...')
      const fd = new FormData()
      fd.append('file', audioFile, (audioFile as File).name ?? 'audio.wav')
      const tRes = await fetch('/api/transcribe', { method: 'POST', body: fd })
      const tData = await tRes.json()
      if (tData.error) throw new Error(tData.error)
      setTranscript(tData.transcript)

      setStatus('analyzing with Gemini...')
      const aRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: tData.transcript }),
      })
      const aData = await aRes.json()
      if (aData.error) throw new Error(aData.error)
      setAnalysis(aData.analysis)
      setStatus('')
    } catch (e: unknown) {
      setError(String(e))
      setStatus('')
    } finally {
      setRunning(false)
    }
  }

  async function handleSave() {
    if (!analysis || !transcript || !file) return
    setSaved(false)
    try {
      const name = file.name.replace(/\.[^.]+$/, '')
      const timestamp = new Date().toISOString().slice(0, 10)

      await fetch('/api/drive/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, analysis, name, timestamp }),
      })

      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          entry: {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            video_name: file.name,
            platforms: [],
            caption: '',
          },
        }),
      })
      setSaved(true)
    } catch (e: unknown) {
      setError(String(e))
    }
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <input
          ref={fileRef}
          type="file"
          accept="video/*,audio/*"
          style={{ display: 'none' }}
          onChange={e => { setFile(e.target.files?.[0] ?? null); setTranscript(''); setAnalysis(null); setError('') }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#e0e0e0', padding: '8px 14px', fontSize: '12px' }}
        >
          [BROWSE]
        </button>
        <span style={{ color: file ? '#e0e0e0' : '#555', fontSize: '12px' }}>
          {file ? file.name : 'no file selected'}
        </span>
        {isLarge && (
          <span style={{ color: '#eab308', fontSize: '11px' }}>large file — audio will be extracted</span>
        )}
      </div>

      <button
        onClick={handleRun}
        disabled={!file || running}
        style={{
          background: '#1e1e1e',
          border: '1px solid #2a2a2a',
          color: (!file || running) ? '#555' : '#e0e0e0',
          padding: '10px 20px',
          fontSize: '12px',
          letterSpacing: '0.05em',
          cursor: (!file || running) ? 'not-allowed' : 'pointer',
          marginBottom: '24px',
        }}
      >
        {running ? status || 'WORKING...' : '[TRANSCRIBE & ANALYZE]'}
      </button>

      {error && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '16px', padding: '10px', border: '1px solid #ef4444' }}>
          {error}
        </div>
      )}

      {transcript && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px', letterSpacing: '0.1em' }}>TRANSCRIPT</div>
          <textarea
            readOnly
            value={transcript}
            rows={6}
            style={{ width: '100%', background: '#161616', border: '1px solid #2a2a2a', color: '#e0e0e0', padding: '12px', fontSize: '12px', lineHeight: '1.6' }}
          />
        </div>
      )}

      {analysis && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <AnalysisResult analysis={analysis} />
          </div>
          <button
            onClick={handleSave}
            style={{
              background: '#1e1e1e',
              border: '1px solid #2a2a2a',
              color: '#e0e0e0',
              padding: '10px 20px',
              fontSize: '12px',
              letterSpacing: '0.05em',
            }}
          >
            {saved ? '✓ SAVED TO DRIVE' : '[SAVE TO DRIVE]'}
          </button>
        </>
      )}
    </div>
  )
}

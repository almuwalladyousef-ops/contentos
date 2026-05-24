'use client'

import { useRef, useState } from 'react'
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
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)

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
    <div className="max-w-3xl mx-auto w-full">
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-lg mb-8">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-text mb-6">Analyze Video Content</h1>
          
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <input
                ref={fileRef}
                type="file"
                accept="video/*,audio/*"
                className="hidden"
                onChange={e => { setFile(e.target.files?.[0] ?? null); setTranscript(''); setAnalysis(null); setError('') }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="bg-surface2 hover:bg-border text-text font-medium py-2.5 px-5 rounded-lg border border-border transition-colors focus:ring-2 focus:ring-primary focus:outline-none"
              >
                Browse Video
              </button>
              <span className={`text-sm truncate flex-1 ${file ? 'text-text' : 'text-text-muted italic'}`}>
                {file ? file.name : 'No file selected'}
              </span>
              {isLarge && (
                <span className="text-yellow text-xs font-semibold px-2 py-1 bg-yellow/10 rounded border border-yellow/20">
                  Large file — audio will be extracted
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={!file || running}
            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 shadow-md mb-6 ${
              (!file || running)
                ? 'bg-surface2 text-dim cursor-not-allowed border border-border'
                : 'bg-primary hover:bg-primary-hover text-white cursor-pointer border border-transparent shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] hover:-translate-y-0.5'
            }`}
          >
            {running ? (status || 'WORKING...') : 'TRANSCRIBE & ANALYZE'}
          </button>

          {error && (
            <div className="bg-red/10 border border-red/30 text-red px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          {transcript && (
            <div className="mb-8">
              <div className="text-text-muted text-xs font-semibold mb-3 tracking-wider uppercase">Transcript</div>
              <textarea
                readOnly
                value={transcript}
                rows={6}
                className="w-full bg-surface2 border border-border text-text rounded-xl p-4 text-sm leading-relaxed focus:outline-none resize-y"
              />
            </div>
          )}

          {analysis && (
            <div className="space-y-6">
              <AnalysisResult analysis={analysis} />
              <button
                onClick={handleSave}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors border ${
                  saved
                    ? 'bg-green/10 border-green/30 text-green'
                    : 'bg-surface2 hover:bg-border border-border text-text'
                }`}
              >
                {saved ? '✓ SAVED TO DRIVE' : 'SAVE TO DRIVE'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

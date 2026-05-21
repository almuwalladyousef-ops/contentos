'use client'

import { VideoAnalysis } from '@/lib/types'

const strengthColor = { strong: '#22c55e', medium: '#eab308', weak: '#ef4444' }
const riskColor = { low: '#22c55e', medium: '#eab308', high: '#ef4444' }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '16px', padding: '8px 0', borderBottom: '1px solid #1e1e1e' }}>
      <span style={{ color: '#555', fontSize: '11px', minWidth: '160px', paddingTop: '1px', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ color: '#e0e0e0', fontSize: '13px', flex: 1 }}>{value}</span>
    </div>
  )
}

function ListRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div style={{ display: 'flex', gap: '16px', padding: '8px 0', borderBottom: '1px solid #1e1e1e' }}>
      <span style={{ color: '#555', fontSize: '11px', minWidth: '160px', paddingTop: '1px', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <ul style={{ flex: 1, margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((item, i) => (
          <li key={i} style={{ color: '#e0e0e0', fontSize: '13px', paddingBottom: '4px' }}>
            • {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ColorRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: '16px', padding: '8px 0', borderBottom: '1px solid #1e1e1e' }}>
      <span style={{ color: '#555', fontSize: '11px', minWidth: '160px', paddingTop: '1px', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ color, fontSize: '13px', fontWeight: 'bold' }}>{value.toUpperCase()}</span>
    </div>
  )
}

export default function AnalysisResult({ analysis }: { analysis: VideoAnalysis }) {
  return (
    <div style={{ border: '1px solid #2a2a2a', padding: '0' }}>
      <div style={{ background: '#161616', padding: '10px 16px', borderBottom: '1px solid #2a2a2a', fontSize: '11px', color: '#555', letterSpacing: '0.1em' }}>
        ANALYSIS
      </div>
      <div style={{ padding: '0 16px' }}>
        <Row label="HOOK CATEGORY" value={analysis.hook.category} />
        <Row label="HOOK TEMPLATE" value={`"${analysis.hook.template}"`} />
        <ColorRow label="HOOK STRENGTH" value={analysis.hook.strength} color={strengthColor[analysis.hook.strength]} />
        <Row label="HOOK ASSESSMENT" value={analysis.hook.assessment} />
        <Row label="FORMAT" value={analysis.format} />
        <Row label="NARRATIVE OPENING" value={analysis.narrative_structure.opening} />
        <Row label="NARRATIVE MIDDLE" value={analysis.narrative_structure.middle} />
        <Row label="NARRATIVE CLOSING" value={analysis.narrative_structure.closing} />
        <Row label="PACING" value={analysis.narrative_structure.pacing} />
        <Row label="MAIN TOPIC" value={analysis.main_topic} />
        <ListRow label="SUBTOPICS" items={analysis.subtopics} />
        <ListRow label="VIRALITY FACTORS" items={analysis.virality_factors} />
        <ColorRow label="RETENTION RISK" value={analysis.retention_risk.risk_level} color={riskColor[analysis.retention_risk.risk_level]} />
        <ListRow label="DROP-OFF POINTS" items={analysis.retention_risk.drop_off_points} />
        <Row label="REASONING" value={analysis.retention_risk.reasoning} />
        <ListRow label="IMPROVEMENTS" items={analysis.suggested_improvements} />
        <Row label="OVERALL" value={analysis.overall_assessment} />
      </div>
    </div>
  )
}

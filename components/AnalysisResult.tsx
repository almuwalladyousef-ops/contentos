'use client'

import { VideoAnalysis } from '@/lib/types'

const strengthColor = { strong: 'var(--ok)', medium: 'var(--warn)', weak: 'var(--bad)' }
const riskColor     = { low: 'var(--ok)',    medium: 'var(--warn)', high: 'var(--bad)' }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 0', borderBottom: '1px solid var(--hairline)' }}>
      <span className="micro">{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55 }}>{value}</span>
    </div>
  )
}

function ListRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 0', borderBottom: '1px solid var(--hairline)' }}>
      <span className="micro">{label}</span>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }}>•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ColorRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 0', borderBottom: '1px solid var(--hairline)' }}>
      <span className="micro">{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color }}>{value}</span>
    </div>
  )
}

export default function AnalysisResult({ analysis }: { analysis: VideoAnalysis }) {
  return (
    <div style={{
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      background: 'oklch(0.215 0.014 255 / 0.5)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div style={{ background: 'var(--surface-2)', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
        <span className="micro">Analysis</span>
      </div>
      <div style={{ padding: '4px 20px 12px' }}>
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
        <div style={{ padding: '12px 0' }}>
          <span className="micro" style={{ display: 'block', marginBottom: 4 }}>OVERALL</span>
          <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55 }}>{analysis.overall_assessment}</span>
        </div>
      </div>
    </div>
  )
}

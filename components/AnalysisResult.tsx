'use client'

import { VideoAnalysis } from '@/lib/types'

const strengthColor = { strong: 'text-green', medium: 'text-yellow', weak: 'text-red' }
const riskColor = { low: 'text-green', medium: 'text-yellow', high: 'text-red' }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-3 border-b border-border last:border-0">
      <span className="text-text-muted text-xs sm:min-w-[160px] pt-0.5 tracking-wider uppercase font-semibold mb-1 sm:mb-0">
        {label}
      </span>
      <span className="text-text text-sm flex-1">{value}</span>
    </div>
  )
}

function ListRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-3 border-b border-border last:border-0">
      <span className="text-text-muted text-xs sm:min-w-[160px] pt-0.5 tracking-wider uppercase font-semibold mb-1 sm:mb-0">
        {label}
      </span>
      <ul className="flex-1 m-0 p-0 list-none space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-text text-sm flex items-start">
            <span className="text-primary mr-2">•</span> {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ColorRow({ label, value, colorClass }: { label: string; value: string; colorClass: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-3 border-b border-border last:border-0">
      <span className="text-text-muted text-xs sm:min-w-[160px] pt-0.5 tracking-wider uppercase font-semibold mb-1 sm:mb-0">
        {label}
      </span>
      <span className={`${colorClass} text-sm font-bold uppercase`}>{value}</span>
    </div>
  )
}

export default function AnalysisResult({ analysis }: { analysis: VideoAnalysis }) {
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-lg">
      <div className="bg-surface2 px-5 py-4 border-b border-border">
        <h3 className="text-xs font-bold text-text-muted tracking-widest uppercase">
          Analysis
        </h3>
      </div>
      <div className="px-5 py-2">
        <Row label="HOOK CATEGORY" value={analysis.hook.category} />
        <Row label="HOOK TEMPLATE" value={`"${analysis.hook.template}"`} />
        <ColorRow label="HOOK STRENGTH" value={analysis.hook.strength} colorClass={strengthColor[analysis.hook.strength]} />
        <Row label="HOOK ASSESSMENT" value={analysis.hook.assessment} />
        <Row label="FORMAT" value={analysis.format} />
        <Row label="NARRATIVE OPENING" value={analysis.narrative_structure.opening} />
        <Row label="NARRATIVE MIDDLE" value={analysis.narrative_structure.middle} />
        <Row label="NARRATIVE CLOSING" value={analysis.narrative_structure.closing} />
        <Row label="PACING" value={analysis.narrative_structure.pacing} />
        <Row label="MAIN TOPIC" value={analysis.main_topic} />
        <ListRow label="SUBTOPICS" items={analysis.subtopics} />
        <ListRow label="VIRALITY FACTORS" items={analysis.virality_factors} />
        <ColorRow label="RETENTION RISK" value={analysis.retention_risk.risk_level} colorClass={riskColor[analysis.retention_risk.risk_level]} />
        <ListRow label="DROP-OFF POINTS" items={analysis.retention_risk.drop_off_points} />
        <Row label="REASONING" value={analysis.retention_risk.reasoning} />
        <ListRow label="IMPROVEMENTS" items={analysis.suggested_improvements} />
        <Row label="OVERALL" value={analysis.overall_assessment} />
      </div>
    </div>
  )
}

import { MODES, type ExerciseMode } from '@/lib/modes';
import { ExerciseArt } from './mode-picker';
import { Check, Circle, ScanLine } from 'lucide-react';
import { TRACKING_VERSION, type PoseMetrics } from '@/lib/pose';

export function TrackingGuide({metrics,active,mode='standard'}:{mode?:ExerciseMode;metrics:PoseMetrics|null;active:boolean}){
  const checks=metrics?.checks;const abdominal=mode==='crunch'||mode==='situp';
  const uncertain=metrics?.tracking==='uncertain'||metrics?.tracking==='multiple'||metrics?.tracking==='lost';
  return <section className="tracking-guide" aria-label="Side-view camera setup">
    <div className="tracking-guide-heading"><strong>Side view, full body.</strong><span data-testid="tracking-version">Tracking v{TRACKING_VERSION}</span></div>
    <div className="tracking-guide-content">
      {mode!=='standard'?<ExerciseArt mode={mode} className="side-view-guide"/>:<svg className="side-view-guide" viewBox="0 0 290 120" role="img" aria-label="Side view of a straight-arm push-up, with the camera placed beside the athlete">
        <path d="M18 93H272" stroke="#d3dcd5" strokeWidth="2"/>
        <circle cx="60" cy="29" r="10" fill="#bf3f21"/>
        <path d="M77 43L151 58L229 84M80 45L81 87L63 90M229 84L241 90" fill="none" stroke="#35483c" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="133" y="88" width="25" height="15" rx="3" fill="#fff" stroke="#bf3f21" strokeWidth="2"/>
        <circle cx="146" cy="95" r="3" fill="#bf3f21"/>
        <path d="M145 83V72M141 76L145 71L149 76" fill="none" stroke="#bf3f21" strokeWidth="2"/>
        <text x="145" y="117" textAnchor="middle" fill="#536259" fontSize="10">Camera beside you</text>
      </svg>}
      <div><p>{MODES[mode].setup}</p><p className="tracking-guide-hint">Use landscape orientation for a wider frame, and enable voice coaching to hear cues from farther away. Either phone camera works; keep your body side-on.</p></div>
    </div>
    <ul className="tracking-checks" aria-label="Live positioning checks">{([
      ['Side-on angle',checks?.angle],[abdominal?'Torso visible':'Arm visible',checks?.arms],['Feet visible',checks?.feet]
    ] as const).map(([label,good])=><li key={label} data-ready={active&&good&&!uncertain?'true':'false'}>{active&&good&&!uncertain?<Check size={16}/>:<Circle size={14}/>}<span>{label}<small>{!active?'Check when camera is on':good&&!uncertain?'Ready':'Adjust position'}</small></span></li>)}</ul>
    {active&&<p className="tracking-stability"><ScanLine size={15}/>{metrics?.setupReady?(abdominal?'Position stable. Begin lying down.':'Position stable. Start with straight arms.'):uncertain?'Counting waits while tracking is unclear.':'Hold a steady position for half a second before your first rep.'}</p>}
  </section>;
}

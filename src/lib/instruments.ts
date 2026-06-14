// Digital assessment instruments + scoring engine.
//
// Each assessment is declared here as DATA (sections, items, input type, optional
// scorer). One generic renderer (components/InstrumentForm.tsx) reads these, and the
// print/export layer (lib/assessmentPrint.ts) reproduces the source-form layout.
//
// ISAA + Sensory item text is AUTO-GENERATED from the authoritative Excel files
// (see instruments.data.ts). EA is transcribed from the 17-page CGC form.
//
// Auto-scored: ISAA, CARS, Multiple Intelligences, Kolb. Raw scoring (licensed
// norms needed): Conners, VABS. Structured capture: Sensory (125-item profile),
// EA (educational error analysis), and the intake/clinical/observation forms.
import { ISAA_GROUPS, SENSORY_SCALE, SENSORY_CATEGORIES } from './instruments.data';
import {
  MSE_SECTIONS, SLA_SECTIONS, PLAY_SECTIONS, FUNCTIONAL_SECTIONS, AI_INTERVIEW_SECTIONS,
  CASE_HISTORY_SECTIONS, CASE_HISTORY_ADOL_SECTIONS,
} from './instruments.forms';

export type ItemInput = 'scale' | 'choice' | 'binary' | 'numeric' | 'yesno' | 'text' | 'textarea' | 'subhead' | 'select';
export type InstrKind = 'scale' | 'binary' | 'numeric' | 'narrative';
export type BandClass = 'success' | 'info' | 'warning' | 'danger' | 'muted';

export interface InstrItem { code: string; text: string; itype?: ItemInput; options?: Record<string, string>; help?: string }
export interface InstrSection { name: string; items: InstrItem[] }
export interface DomainScore { domain: string; score: number; max: number }
export interface ScoreResult { total: number; band: string; bandClass: BandClass; interpretation: string; domains: DomainScore[] }
export interface Instrument {
  code: string; name: string; category: string; kind: InstrKind;
  scale?: Record<string, string>; sections: InstrSection[]; scored: boolean;
  note?: string; score?: (resp: Record<string, string>) => ScoreResult;
}

type Resp = Record<string, string>;
const num = (v: string | undefined) => { const n = parseInt(v || '', 10); return isNaN(n) ? 0 : n; };

const SCALE5: Record<string, string> = {
  '1': 'Rarely (≤20%)', '2': 'Sometimes (21–40%)', '3': 'Frequently (41–60%)', '4': 'Mostly (61–80%)', '5': 'Always (81–100%)',
};
const SCALE_CARS: Record<string, string> = { '1': '1 normal', '2': '2 mildly abnormal', '3': '3 moderately abnormal', '4': '4 severely abnormal' };
const SCALE_CONNERS: Record<string, string> = { '0': 'Not true', '1': 'Just a little', '2': 'Pretty much', '3': 'Very much' };

function sectionsFrom(groups: [string, string[]][], prefix = 'q'): { sections: InstrSection[]; codesByGroup: string[][] } {
  const sections: InstrSection[] = []; const codesByGroup: string[][] = []; let n = 0;
  for (const [name, texts] of groups) {
    const items: InstrItem[] = []; const codes: string[] = [];
    for (const t of texts) { n++; const code = `${prefix}${n}`; items.push({ code, text: t }); codes.push(code); }
    sections.push({ name, items }); codesByGroup.push(codes);
  }
  return { sections, codesByGroup };
}

// ── ISAA (from Excel) ────────────────────────────────────────────────────────
const ISAA = sectionsFrom(ISAA_GROUPS);
function scoreISAA(resp: Resp): ScoreResult {
  let total = 0; const domains: DomainScore[] = [];
  ISAA.codesByGroup.forEach((codes, i) => {
    const s = codes.reduce((a, c) => a + num(resp[c]), 0);
    total += s; domains.push({ domain: ISAA_GROUPS[i][0], score: s, max: codes.length * 5 });
  });
  let band: string, bandClass: BandClass;
  if (total < 70) { band = 'No autism'; bandClass = 'success'; }
  else if (total <= 106) { band = 'Mild autism'; bandClass = 'info'; }
  else if (total <= 153) { band = 'Moderate autism'; bandClass = 'warning'; }
  else { band = 'Severe autism'; bandClass = 'danger'; }
  return { total, band, bandClass, domains, interpretation: `Total ${total} → ${band.toLowerCase()} (ISAA: <70 none · 70–106 mild · 107–153 moderate · >153 severe).` };
}

// ── Sensory (125 items, 14 categories, from Excel) + per-category summary ─────
let _sn = 0;
const SENSORY_SECTIONS: InstrSection[] = SENSORY_CATEGORIES.map(([cat, items], ci) => ({
  name: `${ci + 1}. ${cat}`,
  items: [
    ...items.map((t) => { _sn++; return { code: `sn${_sn}`, text: t } as InstrItem; }),
    { code: `snsum${ci + 1}`, text: 'Summary', itype: 'textarea' },
  ],
}));

// ── CARS ─────────────────────────────────────────────────────────────────────
const CARS = sectionsFrom([['Items (rate 1–4)', ['Relating to people', 'Imitation', 'Emotional response', 'Body use', 'Object use', 'Adaptation to change', 'Visual response', 'Listening response', 'Taste-smell-touch response', 'Fear or nervousness', 'Verbal communication', 'Non-verbal communication', 'Activity level', 'Intellectual response level & consistency', 'General impressions']]]);
function scoreCARS(resp: Resp): ScoreResult {
  const total = CARS.codesByGroup[0].reduce((a, c) => a + num(resp[c]), 0);
  let band: string, bandClass: BandClass;
  if (total < 30) { band = 'Minimal-to-no autism'; bandClass = 'success'; }
  else if (total <= 36) { band = 'Mild-to-moderate autism'; bandClass = 'warning'; }
  else { band = 'Severe autism'; bandClass = 'danger'; }
  return { total, band, bandClass, domains: [], interpretation: `Total ${total} → ${band.toLowerCase()} (CARS: <30 none · 30–36.5 mild-moderate · ≥37 severe).` };
}

// ── Conners — Parent (short), full 43 items ──────────────────────────────────
// Positive-impression items (1-indexed 2,16,31,33,37,40) are reverse-keyed.
const CONNERS_ITEMS = [
  'Forgets to turn in completed work', 'Is perfect in every work', 'Fidgets or squirms in seat',
  'Is one of the last to be picked for teams or games', 'Restless or overactive', 'Does not know how to make friends',
  'Runs or climbs when he/she is not supposed to', 'Cannot grasp arithmetic', 'Is difficult to please or amuse',
  'Needs extra explanation of instructions', 'Is hard to motivate (even with rewards)', 'Makes mistakes',
  'Acts as if driven by a motor', 'Starts fights with others on purpose', 'Has trouble getting started on tasks',
  'Is happy, cheerful, and has a positive attitude', "Doesn't pay attention to details, makes careless mistakes",
  'Has trouble keeping friends', 'Bullies, threatens, or scares others', 'Loses things',
  'Tells lies to hurt other people', 'I cannot figure out what makes him/her happy', 'Threatens to hurt others',
  'Is constantly moving', 'Has trouble with reading', 'Is angry and resentful', 'Has a short attention span',
  'Excitable, impulsive', 'Cannot do things right', 'Has trouble concentrating',
  "Tells the truth; doesn't even tell little white lies", 'Has trouble organizing tasks or activities',
  'Is fun to be around', 'Inattentive, easily distracted', 'Is messy or disorganized', 'Spelling is poor',
  'Is patient and content, even when waiting in a long line', 'Has no friends', 'Does not understand what he/she reads',
  'Behaves like an angel', 'Has trouble keeping his/her mind on work or play for long',
  'Has to struggle to complete hard tasks', 'Does not get invited to play or go out with others',
];
const CONNERS_POSITIVE = new Set([2, 16, 31, 33, 37, 40]); // 1-indexed reverse-keyed items
const CONNERS = sectionsFrom([['Items (rate 0–3)', CONNERS_ITEMS]]);
function scoreConners(resp: Resp): ScoreResult {
  const codes = CONNERS.codesByGroup[0];
  let total = 0, notable = 0;
  codes.forEach((c, i) => {
    const v = num(resp[c]);
    total += CONNERS_POSITIVE.has(i + 1) ? (3 - v) : v;
    if (!CONNERS_POSITIVE.has(i + 1) && v >= 2) notable++;
  });
  return { total, band: 'Raw score (T-scores need licensed norms)', bandClass: 'info', domains: [], interpretation: `Raw total ${total} (positive items reverse-keyed); ${notable} symptom items rated ≥2. Normative T-scores via the licensed Conners platform.` };
}

// ── VABS — score-recording form (legally maximal: captures all clinical output
//    from the licensed Pearson kit; no publisher item text reproduced) ──────────
const VABS_SECTIONS: InstrSection[] = [
  { name: 'Administration', items: [
    { code: 'vabs_form', itype: 'select', text: 'Form administered', options: { survey: 'Survey Interview Form', expanded: 'Expanded Interview Form', parent: 'Parent/Caregiver Rating Form' } },
    { code: 'vabs_informant', itype: 'text', text: 'Informant name' },
    { code: 'vabs_rel', itype: 'select', text: 'Relationship to child', options: { mother: 'Mother', father: 'Father', both: 'Both parents', teacher: 'Teacher', caregiver: 'Other caregiver' } },
    { code: 'vabs_mins', itype: 'numeric', text: 'Time taken (minutes)' },
  ]},
  { name: 'Adaptive Behavior Composite (ABC)', items: [
    { code: 'vabs_abc_ss', itype: 'numeric', text: 'Standard score (mean 100, SD 15)', help: 'Enter from Vineland scoring table' },
    { code: 'vabs_abc_pct', itype: 'numeric', text: 'Percentile rank' },
    { code: 'vabs_abc_ae', itype: 'text', text: 'Age equivalent (e.g. 4y 6m)' },
    { code: 'vabs_abc_ci', itype: 'text', text: '90% confidence interval (e.g. 62–74)' },
    { code: 'vabs_abc_level', itype: 'select', text: 'Adaptive level', options: { low: 'Low (≤70)', mod_low: 'Moderately Low (71–85)', adequate: 'Adequate (86–114)', mod_high: 'Moderately High (115–129)', high: 'High (≥130)' } },
  ]},
  { name: 'Communication Domain', items: [
    { code: 'vabs_com_ss', itype: 'numeric', text: 'Standard score' },
    { code: 'vabs_com_pct', itype: 'numeric', text: 'Percentile rank' },
    { code: 'vabs_com_ae', itype: 'text', text: 'Age equivalent' },
    { code: 'vabs_com_sub', itype: 'subhead', text: 'Subdomain raw scores' },
    { code: 'vabs_com_rec', itype: 'numeric', text: 'Receptive' },
    { code: 'vabs_com_exp', itype: 'numeric', text: 'Expressive' },
    { code: 'vabs_com_wri', itype: 'numeric', text: 'Written' },
  ]},
  { name: 'Daily Living Skills Domain', items: [
    { code: 'vabs_dls_ss', itype: 'numeric', text: 'Standard score' },
    { code: 'vabs_dls_pct', itype: 'numeric', text: 'Percentile rank' },
    { code: 'vabs_dls_ae', itype: 'text', text: 'Age equivalent' },
    { code: 'vabs_dls_sub', itype: 'subhead', text: 'Subdomain raw scores' },
    { code: 'vabs_dls_per', itype: 'numeric', text: 'Personal' },
    { code: 'vabs_dls_dom', itype: 'numeric', text: 'Domestic' },
    { code: 'vabs_dls_com', itype: 'numeric', text: 'Community' },
  ]},
  { name: 'Socialization Domain', items: [
    { code: 'vabs_soc_ss', itype: 'numeric', text: 'Standard score' },
    { code: 'vabs_soc_pct', itype: 'numeric', text: 'Percentile rank' },
    { code: 'vabs_soc_ae', itype: 'text', text: 'Age equivalent' },
    { code: 'vabs_soc_sub', itype: 'subhead', text: 'Subdomain raw scores' },
    { code: 'vabs_soc_int', itype: 'numeric', text: 'Interpersonal relationships' },
    { code: 'vabs_soc_play', itype: 'numeric', text: 'Play & leisure' },
    { code: 'vabs_soc_cop', itype: 'numeric', text: 'Coping skills' },
  ]},
  { name: 'Motor Skills Domain', items: [
    { code: 'vabs_mot_ss', itype: 'numeric', text: 'Standard score' },
    { code: 'vabs_mot_pct', itype: 'numeric', text: 'Percentile rank' },
    { code: 'vabs_mot_ae', itype: 'text', text: 'Age equivalent' },
    { code: 'vabs_mot_sub', itype: 'subhead', text: 'Subdomain raw scores' },
    { code: 'vabs_mot_gro', itype: 'numeric', text: 'Gross motor' },
    { code: 'vabs_mot_fin', itype: 'numeric', text: 'Fine motor' },
  ]},
  { name: 'Behavioral observations & clinical notes', items: [
    { code: 'vabs_obs', itype: 'textarea', text: 'Behavioral observations during administration' },
    { code: 'vabs_imp', itype: 'textarea', text: 'Clinical impression' },
    { code: 'vabs_rec', itype: 'textarea', text: 'Recommendations' },
  ]},
];
function scoreVABS(resp: Resp): ScoreResult {
  const abc = num(resp.vabs_abc_ss);
  const domSS: [string, string][] = [['Communication', 'vabs_com_ss'], ['Daily Living Skills', 'vabs_dls_ss'], ['Socialization', 'vabs_soc_ss'], ['Motor Skills', 'vabs_mot_ss']];
  const domains: DomainScore[] = domSS.map(([d, c]) => ({ domain: d, score: num(resp[c]), max: 160 })).filter((d) => d.score > 0);
  let band: string, bandClass: BandClass;
  if (!abc) { band = 'Enter ABC standard score'; bandClass = 'muted'; }
  else if (abc >= 130) { band = 'High'; bandClass = 'success'; }
  else if (abc >= 115) { band = 'Moderately High'; bandClass = 'info'; }
  else if (abc >= 86) { band = 'Adequate'; bandClass = 'success'; }
  else if (abc >= 71) { band = 'Moderately Low'; bandClass = 'warning'; }
  else { band = 'Low'; bandClass = 'danger'; }
  return { total: abc, band, bandClass, domains, interpretation: abc ? `ABC Standard Score ${abc} → ${band} adaptive level (VABS: ≤70 Low · 71–85 Mod. Low · 86–114 Adequate · 115–129 Mod. High · ≥130 High). Domain standard scores shown above.` : 'Enter ABC standard score to see adaptive level band.' };
}

// ── Multiple Intelligences (binary) ──────────────────────────────────────────
const MI_GROUPS: [string, string[]][] = [
  ['Naturalist', ['Enjoys categorizing by common traits', 'Ecological issues matter', 'Classification helps make sense of data', 'Enjoys gardening', 'Values preserving nature', 'Likes hierarchies', 'Animals are important', 'Keeps a recycling system', 'Enjoys biology/botany/zoology', 'Notices subtle differences in meaning']],
  ['Musical', ['Picks up patterns easily', 'Focuses on sounds', 'Moves to a beat easily', 'Enjoys making music', 'Responds to cadence of poetry', 'Remembers via rhyme', 'Background noise breaks concentration', 'Finds nature sounds relaxing', 'Prefers musicals to plays', 'Remembers lyrics easily']],
  ['Logical-mathematical', ['Neat and orderly', 'Likes step-by-step directions', 'Solves problems easily', 'Frustrated by disorganization', 'Calculates in head', 'Enjoys logic puzzles', 'Needs order before starting', 'Values structure', 'Enjoys troubleshooting', 'Needs things to make sense']],
  ['Existential', ['Sees the big picture', 'Discusses questions about life', 'Religion is important', 'Enjoys artwork', 'Meditation is rewarding', 'Travels to inspiring places', 'Reads philosophers', 'Needs real-world application', 'Wonders about life in the universe', 'Values connection to ideas']],
  ['Interpersonal', ['Learns by interacting', 'Enjoys discussion', 'The more the merrier', 'Often a leader', 'Values relationships', 'Likes study groups', 'A team player', 'Friends are important', 'Belongs to organizations', 'Dislikes working alone']],
  ['Bodily-kinesthetic', ['Learns by doing', 'Enjoys making things by hand', 'Sports are part of life', 'Uses gestures', 'Prefers demonstrating', 'Loves to dance', 'Likes working with tools', 'Inactivity tires', 'Hands-on is fun', 'Active lifestyle']],
  ['Linguistic', ['Interested in languages', 'Enjoys reading', 'Keeps a journal', 'Enjoys word puzzles', 'Takes notes to remember', 'Keeps in touch by writing', 'Explains ideas easily', 'Writes for pleasure', 'Enjoys puns', 'Enjoys public speaking']],
  ['Intrapersonal', ['Attitude affects learning', 'Helps through causes', 'Aware of moral beliefs', 'Learns with emotional attachment', 'Fairness is important', 'Interested in social justice', 'Works alone productively', 'Needs to know why', 'Effort follows belief', 'Will protest to right a wrong']],
  ['Visual-spatial', ['Visualizes ideas', 'Enjoys rearranging a room', 'Creates artwork', 'Uses graphic organizers', 'Enjoys media', 'Charts help interpret data', 'Music videos draw to songs', 'Recalls mental pictures', 'Reads maps well', 'Enjoys 3-D puzzles']],
];
const MI = sectionsFrom(MI_GROUPS, 'm');
function scoreMI(resp: Resp): ScoreResult {
  const domains: DomainScore[] = MI.codesByGroup.map((codes, i) => ({ domain: MI_GROUPS[i][0], score: codes.filter((c) => resp[c] === '1').length * 10, max: 100 }));
  const ranked = [...domains].sort((a, b) => b.score - a.score);
  return { total: ranked[0]?.score ?? 0, band: `Strongest: ${ranked[0]?.domain ?? '—'}`, bandClass: 'info', domains, interpretation: `Dominant intelligences: ${ranked.slice(0, 3).map((d) => d.domain).join(', ')}.` };
}

// ── Kolb ─────────────────────────────────────────────────────────────────────
const KOLB_SECTIONS: InstrSection[] = [{ name: 'Mode totals', items: [
  { code: 'CE', text: 'Concrete Experience (CE) total' }, { code: 'RO', text: 'Reflective Observation (RO) total' },
  { code: 'AC', text: 'Abstract Conceptualization (AC) total' }, { code: 'AE', text: 'Active Experimentation (AE) total' },
] }];
function scoreKolb(resp: Resp): ScoreResult {
  const ce = num(resp.CE), ro = num(resp.RO), ac = num(resp.AC), ae = num(resp.AE);
  const acce = ac - ce, aero = ae - ro;
  let style: string;
  if (acce >= 0 && aero >= 0) style = 'Converging (AC + AE) — problem solving';
  else if (acce >= 0 && aero < 0) style = 'Assimilating (AC + RO) — concepts & models';
  else if (acce < 0 && aero >= 0) style = 'Accommodating (CE + AE) — hands-on, active';
  else style = 'Diverging (CE + RO) — imaginative, people-oriented';
  return { total: acce, band: style.split(' —')[0], bandClass: 'info', domains: [
    { domain: 'Concrete Experience', score: ce, max: 48 }, { domain: 'Reflective Observation', score: ro, max: 48 },
    { domain: 'Abstract Conceptualization', score: ac, max: 48 }, { domain: 'Active Experimentation', score: ae, max: 48 },
  ], interpretation: `Learning style: ${style}. (AC−CE = ${acce}, AE−RO = ${aero}).` };
}

// ── narrative-form builders ──────────────────────────────────────────────────
type Row = [string, ItemInput, string, string?];
const sec = (name: string, rows: Row[]): InstrSection => ({ name, items: rows.map(([code, itype, text, help]) => ({ code, itype, text, help })) });
// Full field-by-field narrative forms now live in instruments.forms.ts
// (MSE_SECTIONS, SLA_SECTIONS, PLAY_SECTIONS, FUNCTIONAL_SECTIONS,
//  AI_INTERVIEW_SECTIONS, CASE_HISTORY_SECTIONS, CASE_HISTORY_ADOL_SECTIONS).

// ── EA — Educational error analysis (17-page CGC form, full) ──────────────────
const EA_SECTIONS: InstrSection[] = [
  sec('I. Background', [['ea_grade', 'text', 'Present grade'], ['ea_school', 'text', 'School'], ['ea_medium', 'text', 'Medium of instruction']]),
  sec('II. History', [['ea_h1', 'textarea', 'Significant medical history (if any)'], ['ea_h2', 'textarea', 'Significant socio-emotional stressors (if any)'], ['ea_h3', 'textarea', 'Significant educational history (if any)']]),
  sec('III-A. English — Reading: Foundation skills', [
    ['ea_efr1', 'yesno', 'Knows the names of the alphabets in sequential order'],
    ['ea_efr2', 'yesno', 'Can identify and name alphabets in random order'],
    ['ea_efr3', 'yesno', 'Can identify sounds of the alphabets (grapheme-phoneme)'],
    ['ea_efr4', 'yesno', 'Can combine words (synthesis)'],
    ['ea_efr5', 'yesno', 'Can combine word parts (synthesis)'],
    ['ea_efr6', 'yesno', 'Can combine sounds (synthesis)']]),
  sec('III-A. English — Word reading', [
    ['ea_ewr_gl', 'text', 'Grade level (read spontaneously)'],
    ['ea_ewr_beh', 'textarea', 'Reading behaviour', 'reads spontaneously / apathy-anxiety / needs constant motivation'],
    ['ea_ewr_acc', 'textarea', 'Samples accurately read'],
    ['ea_ewr_mis', 'textarea', 'Samples misread'],
    ['ea_ewr_err', 'textarea', 'Interpretation of errors', 'poor letter recognition / only familiar words / phonic decoding difficulty / bizarre reading']]),
  sec('III-A. English — Oral reading', [
    ['ea_eor_gl', 'text', 'Grade level (80% accuracy)'],
    ['ea_eor_beh', 'textarea', 'Reading behaviour', 'finger tracking / strained voice / indifference / missed words-lines / ignored punctuation'],
    ['ea_eor_err', 'textarea', 'Significant patterns of reading errors (examples)', 'mispronounced / substituted-omitted / repeated / inadequate pauses / very fast / missed lines']]),
  sec('III-B. English — Comprehension', [
    ['ea_erc_gl', 'text', 'Reading comprehension — grade level'],
    ['ea_erc_q', 'textarea', 'Questions answered correctly / incorrectly'],
    ['ea_erc_diff', 'textarea', 'Underlying difficulties in comprehending the passage'],
    ['ea_elc_gl', 'text', 'Listening comprehension — grade level'],
    ['ea_elc_q', 'textarea', 'Questions answered correctly / incorrectly'],
    ['ea_elc_diff', 'textarea', 'Difficulties comprehending the passage read aloud'],
    ['ea_ec_cmp', 'text', 'Reading vs listening comprehension', 'equal / better / less than']]),
  sec('III-C. English — Spelling: Foundation skills', [
    ['ea_ews1', 'yesno', 'Can imitate sound patterns (phonological awareness)'],
    ['ea_ews2', 'yesno', 'Can identify beginning sounds'],
    ['ea_ews3', 'yesno', 'Can say rhyming words'],
    ['ea_ews4', 'yesno', 'Can combine words (synthesis)'],
    ['ea_ews5', 'yesno', 'Can combine word parts (synthesis)'],
    ['ea_ews6', 'yesno', 'Can combine sounds (synthesis)'],
    ['ea_ews7', 'yesno', 'Can divide words (fragmenting)'],
    ['ea_ews8', 'yesno', 'Can rearrange words (fragmenting)'],
    ['ea_ews9', 'yesno', 'Writing alphabets by rote'],
    ['ea_ews10', 'yesno', 'Writing alphabets randomly']]),
  sec('III-C. English — Spelling (dictated)', [
    ['ea_esd_gl', 'text', 'Grade level (dictated word list)'],
    ['ea_esd_err', 'textarea', 'Significant errors / error analysis', "mispronounces / can't encode / can't generalise rules / inserted-omitted-substituted-jumbled letters"]]),
  sec('III-C. English — Written expression', [
    ['ea_ewe1', 'yesno', 'Could frame meaningful sentences on his own'],
    ['ea_ewe2', 'yesno', 'Could write a paragraph along the theme'],
    ['ea_ewe_content', 'text', 'Content', 'little/no understanding · superficial · rich ideas'],
    ['ea_ewe_org', 'text', 'Organization of ideas', 'not logical · logical & coherent'],
    ['ea_ewe_gram', 'text', 'Grammatical skills', 'poorly developed · adequate · well developed'],
    ['ea_ewe_vocab', 'text', 'Vocabulary', 'lacks words · simple · rich & varied'],
    ['ea_ewe_punct', 'text', 'Usage of punctuation', 'adequate / inadequate'],
    ['ea_ewe_spell', 'text', 'Spellings', 'very poor · average · good'],
    ['ea_ewe_oral', 'textarea', 'Describe oral expression'],
    ['ea_ewe_cmp', 'textarea', 'Compare oral and written expression']]),
  sec('III-C. English — Handwriting', [
    ['ea_hw_leg', 'textarea', 'Legibility — letter formation (straight/curved/circular strokes)'],
    ['ea_hw_space', 'text', 'Spacing', 'adequate · too close · widely spaced'],
    ['ea_hw_err', 'textarea', 'Writing errors', 'substitutes case · mirror image · displaces matras/chandra bindus'],
    ['ea_hw_qual', 'textarea', 'Quality (script, pencil pressure, neatness, size)'],
    ['ea_hw_speed', 'text', 'Speed', 'in stipulated time · only with extra time'],
    ['ea_hw_eye', 'text', 'Eye-hand coordination'],
    ['ea_hw_vision', 'text', 'Vision', 'near / distance difficulties · squint · none'],
    ['ea_hw_dext', 'text', 'Dexterity', 'left / right / ambidextrous'],
    ['ea_hw_grip', 'text', 'Pencil grip', 'mature tripod · abnormal / immature'],
    ['ea_hw_paper', 'text', 'Paper position', 'left / right / straight'],
    ['ea_hw_erra', 'textarea', 'Error analysis (handwriting)']]),
  sec('IV. Hindi — Reading: Foundation skills', [
    ['ea_hfr1', 'yesno', 'Knows the names of the alphabets in sequential order'],
    ['ea_hfr2', 'yesno', 'Can identify and name alphabets in random order'],
    ['ea_hfr3', 'yesno', 'Can identify sounds of the alphabets'],
    ['ea_hfr4', 'yesno', 'Can combine words (synthesis)'],
    ['ea_hfr5', 'yesno', 'Can combine word parts (synthesis)'],
    ['ea_hfr6', 'yesno', 'Can combine sounds (synthesis)']]),
  sec('IV. Hindi — Reading & comprehension', [
    ['ea_hwr_gl', 'text', 'Word reading — grade level'],
    ['ea_hwr_err', 'textarea', 'Word reading behaviour & error interpretation'],
    ['ea_hor_gl', 'text', 'Oral reading — grade level'],
    ['ea_hor_err', 'textarea', 'Oral reading behaviour & error patterns (examples)'],
    ['ea_hrc_gl', 'text', 'Reading comprehension — grade level'],
    ['ea_hrc_q', 'textarea', 'Reading comprehension — questions & difficulties'],
    ['ea_hlc_gl', 'text', 'Listening comprehension — grade level'],
    ['ea_hlc_q', 'textarea', 'Listening comprehension — questions & difficulties']]),
  sec('IV. Hindi — Writing: Foundation skills', [
    ['ea_hws1', 'yesno', 'Can imitate sound patterns'], ['ea_hws2', 'yesno', 'Can identify beginning sounds'],
    ['ea_hws3', 'yesno', 'Can say rhyming words'], ['ea_hws4', 'yesno', 'Can combine words'],
    ['ea_hws5', 'yesno', 'Can combine word parts'], ['ea_hws6', 'yesno', 'Can combine sounds'],
    ['ea_hws7', 'yesno', 'Can divide words'], ['ea_hws8', 'yesno', 'Can rearrange words'],
    ['ea_hws9', 'yesno', 'Writing alphabets by rote'], ['ea_hws10', 'yesno', 'Writing alphabets randomly']]),
  sec('IV. Hindi — Writing: Spelling & expression', [
    ['ea_hsd_gl', 'text', 'Spelling (dictated) — grade level'],
    ['ea_hsd_err', 'textarea', 'Spelling errors / error analysis'],
    ['ea_hwe1', 'yesno', 'Could frame meaningful sentences on his own'],
    ['ea_hwe2', 'yesno', 'Could write a paragraph along the theme'],
    ['ea_hwe_an', 'textarea', 'Written sample analysis (content, organization, grammar, vocabulary, punctuation, spelling)']]),
  sec('V. Arithmetic — Concepts', [
    ['ea_ac_gl', 'text', 'Concepts — grade level'],
    ['ea_ac_diff', 'textarea', 'Specific concepts of difficulty', 'near/far · big/small · more/less · before/after · in/out']]),
  sec('V. Arithmetic — Operations', [
    ['ea_op_add', 'textarea', 'Addition — highest level achieved', 'single digit … carryover … fractions/decimals/integers'],
    ['ea_op_sub', 'textarea', 'Subtraction — highest level achieved', 'within 10 … borrowing … fractions/decimals/integers'],
    ['ea_op_mul', 'textarea', 'Multiplication — highest level achieved', 'single×single … multi-digit … fractions/decimals/integers'],
    ['ea_op_div', 'textarea', 'Division — highest level achieved']]),
  sec('V. Arithmetic — Computation & application', [
    ['ea_comp_style', 'textarea', 'Style of computing', 'tally marks/fingers · mental within ten/twenty/fifty/hundred'],
    ['ea_comp_diff', 'textarea', 'Computational difficulties', 'severe errors · direction confusion · forgot carryover · jumbled tables · jumbled steps'],
    ['ea_app_gl', 'text', 'Application skills — grade level'],
    ['ea_app_wp', 'textarea', 'Word problems — interpretation & operation deduction'],
    ['ea_ar_reasons', 'textarea', 'Significant reasons for arithmetic deficits', 'cognitive capacity · working/long-term memory · sequencing · math language · visual-perceptual · inchworm/grasshopper']]),
  sec('VI. Behavioural observations', [
    ['ea_bo1', 'textarea', 'Describe behaviour'], ['ea_bo2', 'textarea', 'Attention span'],
    ['ea_bo3', 'textarea', 'Speech and language skills'], ['ea_bo4', 'textarea', 'Interests, hobbies and talents']]),
  sec("VII. Perception about the child's problem", [
    ['ea_p1', 'textarea', "Teacher's perception"], ['ea_p2', 'textarea', "Parent's perception"],
    ['ea_p3', 'textarea', "Tutor's perception"], ['ea_p4', 'textarea', 'School records / note books']]),
  sec('VIII. Conclusion', [['ea_concl', 'textarea', 'Specific processes in which the child manifested difficulty']]),
  sec('IX. Recommendations & grade-level summary', [
    ['ea_rec', 'textarea', 'Recommendations'],
    ['ea_subsum', 'subhead', 'Grade-level summary (enter English / Hindi grade)'],
    ['ea_sum_wr_e', 'text', 'Word reading — English'], ['ea_sum_wr_h', 'text', 'Word reading — Hindi'],
    ['ea_sum_or_e', 'text', 'Oral reading — English'], ['ea_sum_or_h', 'text', 'Oral reading — Hindi'],
    ['ea_sum_rc_e', 'text', 'Reading comprehension — English'], ['ea_sum_rc_h', 'text', 'Reading comprehension — Hindi'],
    ['ea_sum_lc_e', 'text', 'Listening comprehension — English'], ['ea_sum_lc_h', 'text', 'Listening comprehension — Hindi'],
    ['ea_sum_sp_e', 'text', 'Spellings — English'], ['ea_sum_sp_h', 'text', 'Spellings — Hindi'],
    ['ea_sum_math_con', 'text', 'Mathematics — Concept'], ['ea_sum_math_op', 'text', 'Mathematics — Operation'],
    ['ea_sum_math_app', 'text', 'Mathematics — Application']]),
];

// ── registry ─────────────────────────────────────────────────────────────────
export const INSTRUMENTS: Record<string, Instrument> = {
  ISAA: { code: 'ISAA', name: 'ISAA — Indian Scale for Assessment of Autism', category: 'Developmental scales', kind: 'scale', scale: SCALE5, sections: ISAA.sections, scored: true, score: scoreISAA },
  CARS: { code: 'CARS', name: 'CARS — Childhood Autism Rating Scale', category: 'Developmental scales', kind: 'scale', scale: SCALE_CARS, sections: CARS.sections, scored: true, score: scoreCARS },
  CONNERS: { code: 'CONNERS', name: "Conners' Rating Scale (ADHD)", category: 'Developmental scales', kind: 'scale', scale: SCALE_CONNERS, sections: CONNERS.sections, scored: true, score: scoreConners, note: 'Licensed instrument — raw scoring; T-scores via the licensed Conners platform.' },
  VABS: { code: 'VABS', name: 'VABS — Vineland Adaptive Behavior Scales', category: 'Adaptive behaviour', kind: 'narrative', sections: VABS_SECTIONS, scored: true, score: scoreVABS, note: 'Administer with the licensed Pearson kit. Record standardized scores here — item text remains in the licensed materials.' },
  MI: { code: 'MI', name: 'Multiple Intelligence Profile', category: 'Learning profile', kind: 'binary', sections: MI.sections, scored: true, score: scoreMI, note: 'Tick each statement that applies; each section totals out of 100.' },
  KOLB: { code: 'KOLB', name: 'Learning Style Inventory (Kolb)', category: 'Learning profile', kind: 'numeric', sections: KOLB_SECTIONS, scored: true, score: scoreKolb, note: 'Enter the four column totals; style is computed.' },
  SENSORY: { code: 'SENSORY', name: 'Sensory Assessment Checklist (125 items)', category: 'Functional / academic', kind: 'scale', scale: SENSORY_SCALE, sections: SENSORY_SECTIONS, scored: false, note: 'Rate each item by how often the child responds. Add a summary per category.' },
  EA: { code: 'EA', name: 'Educational Error Analysis', category: 'Functional / academic', kind: 'narrative', sections: EA_SECTIONS, scored: false },
  CASE_HISTORY: { code: 'CASE_HISTORY', name: 'Case History — Child (NIPCCD CGC)', category: 'Intake & history', kind: 'narrative', sections: CASE_HISTORY_SECTIONS, scored: false },
  CASE_HISTORY_ADOL: { code: 'CASE_HISTORY_ADOL', name: 'Case History — Adolescent (NIPCCD AGSC)', category: 'Intake & history', kind: 'narrative', sections: CASE_HISTORY_ADOL_SECTIONS, scored: false },
  AI_INTERVIEW: { code: 'AI_INTERVIEW', name: 'Adolescent Interview', category: 'Intake & history', kind: 'narrative', sections: AI_INTERVIEW_SECTIONS, scored: false },
  MSE: { code: 'MSE', name: 'Mental Status Examination (MSE)', category: 'Clinical', kind: 'narrative', sections: MSE_SECTIONS, scored: false },
  PLAY: { code: 'PLAY', name: 'Play Session Observation', category: 'Observation', kind: 'narrative', sections: PLAY_SECTIONS, scored: false },
  SLA: { code: 'SLA', name: 'Speech & Language Assessment', category: 'Functional / academic', kind: 'narrative', sections: SLA_SECTIONS, scored: false },
  FUNCTIONAL: { code: 'FUNCTIONAL', name: 'Functional Academic Assessment', category: 'Functional / academic', kind: 'narrative', sections: FUNCTIONAL_SECTIONS, scored: false },
};

export const TOOL_CODE: Record<string, string> = {
  'ISAA (Indian Scale for Assessment of Autism)': 'ISAA',
  'CARS (Childhood Autism Rating Scale)': 'CARS',
  "Conners' Rating Scales (ADHD)": 'CONNERS',
  'VABS (Vineland Adaptive Behavior Scales)': 'VABS',
  'Multiple Intelligence Profile': 'MI',
  'Learning Style Inventory': 'KOLB',
  'Case History (NIPCCD CGC proforma)': 'CASE_HISTORY',
  'Case History — Adolescent (AGSC)': 'CASE_HISTORY_ADOL',
  'Adolescent Interview': 'AI_INTERVIEW',
  'MSE (Mental Status Examination)': 'MSE',
  'Play Session Observation': 'PLAY',
  'Speech & Language Assessment': 'SLA',
  'Sensory–Motor Evaluation': 'SENSORY',
  'Functional Academic Assessment': 'FUNCTIONAL',
  'Educational Error Analysis': 'EA',
};

export function instrumentForTool(toolLabel: string): Instrument | undefined {
  const code = TOOL_CODE[toolLabel];
  return code ? INSTRUMENTS[code] : undefined;
}
export function itemInput(inst: Instrument, it: InstrItem): ItemInput {
  if (it.itype) return it.itype;
  return inst.kind === 'narrative' ? 'textarea' : inst.kind;
}
export function allItemCodes(inst: Instrument): string[] {
  return inst.sections.flatMap((s) => s.items).filter((it) => itemInput(inst, it) !== 'subhead').map((it) => it.code);
}
export function scorableCodes(inst: Instrument): string[] {
  return inst.sections.flatMap((s) => s.items).filter((it) => { const k = itemInput(inst, it); return k === 'scale' || k === 'choice' || k === 'binary' || k === 'numeric'; }).map((it) => it.code);
}
export function scoreInstrument(inst: Instrument, resp: Resp): ScoreResult | null {
  return inst.score ? inst.score(resp) : null;
}
export function requiresAllItems(inst: Instrument): boolean {
  return inst.kind === 'scale' || inst.kind === 'numeric';
}

// Full field-by-field digitisation of the NIPCCD CGC/AGSC narrative forms,
// transcribed from the source PDFs. Each item maps to a field on the paper form.
// Identity fields (name/DOB/sex/address) come from the Child record + print header,
// so they are not re-captured here. Coded option fields use dropdowns (select);
// Yes/No fields use yesno; free-text uses text/textarea.
import type { InstrItem, InstrSection, ItemInput } from './instruments';

type Row = [string, ItemInput, string, string?];
const opts = (s: string): Record<string, string> => Object.fromEntries(s.split('|').map((x) => [x.trim(), x.trim()]));
const sec = (name: string, rows: Row[]): InstrSection => ({
  name,
  items: rows.map(([code, itype, text, extra]) => {
    const it: InstrItem = { code, text, itype };
    if ((itype === 'select' || itype === 'choice') && extra) it.options = opts(extra);
    else if (extra) it.help = extra;
    return it;
  }),
});

// ── MSE — Mental State Examination (AGSC) ────────────────────────────────────
export const MSE_SECTIONS: InstrSection[] = [
  sec('1. General appearance, attitude & behaviour', [['mse_appearance', 'textarea', 'General appearance, attitude and behaviour']]),
  sec('2. Psychomotor activity', [['mse_psychomotor', 'textarea', 'Psychomotor activity']]),
  sec('3. Emotional state', [
    ['mse_mood', 'textarea', 'Mood'],
    ['mse_aff_obj', 'text', 'Affect — objective'],
    ['mse_aff_subj', 'text', 'Affect — subjective'],
    ['mse_aff_cong', 'text', 'Affect — congruent to thought'],
    ['mse_aff_range', 'text', 'Affect — range'],
    ['mse_aff_approp', 'text', 'Affect — appropriate to situation'],
    ['mse_sp_rel', 'text', 'Speech — relevant'],
    ['mse_sp_coh', 'text', 'Speech — coherent'],
    ['mse_sp_spon', 'text', 'Speech — spontaneous'],
    ['mse_sp_rtv', 'text', 'Speech — rate, tone, volume']]),
  sec('4. Thought', [
    ['mse_th_flow', 'text', 'Flow'], ['mse_th_form', 'text', 'Form'],
    ['mse_th_content', 'textarea', 'Content'], ['mse_th_poss', 'text', 'Possession']]),
  sec('5. Perception', [['mse_per_ill', 'text', 'Illusions'], ['mse_per_hall', 'text', 'Hallucinations']]),
  sec('6. Cognitive functions', [
    ['mse_or_time', 'text', 'Orientation — time'], ['mse_or_place', 'text', 'Orientation — place'], ['mse_or_person', 'text', 'Orientation — person'],
    ['mse_attn', 'textarea', 'Attention & concentration'],
    ['mse_mem_imm', 'text', 'Memory — immediate'], ['mse_mem_rec', 'text', 'Memory — recent'], ['mse_mem_rem', 'text', 'Memory — remote'],
    ['mse_intel', 'textarea', 'General intelligence / knowledge'],
    ['mse_calc', 'text', 'Calculation'], ['mse_simil', 'text', 'Similarities'],
    ['mse_proverb', 'text', 'Proverb interpretation'], ['mse_compr', 'text', 'Comprehension']]),
  sec('7. Judgment', [['mse_j_personal', 'text', 'Personal'], ['mse_j_social', 'text', 'Social'], ['mse_j_test', 'text', 'Test']]),
  sec('8. Insight', [['mse_insight', 'textarea', 'Insight']]),
];

// ── SLA — Speech & Language Assessment (CGC) ─────────────────────────────────
export const SLA_SECTIONS: InstrSection[] = [
  sec('Background', [
    ['sla_langbg', 'textarea', '4. Language background'],
    ['sla_exp_home', 'text', '5a. Language exposure at home'],
    ['sla_lang_child', 'text', '5b. Language used by the child']]),
  sec('6. Relevant medical history', [
    ['sla_birthcry', 'text', 'a. Birth cry'], ['sla_birthwt', 'text', 'b. Birth weight'], ['sla_sitwalk', 'text', 'c. Sitting and walking']]),
  sec('7. Speech development history', [
    ['sla_vocal', 'text', 'a. Vocalization'], ['sla_babble', 'text', 'b. Babbling'],
    ['sla_firstword', 'text', 'c. First word'], ['sla_firstsent', 'text', 'd. First sentence']]),
  sec('Concerns & communication', [
    ['sla_concerns', 'textarea', '8. Concerns of parents re speech & language development'],
    ['sla_mode', 'select', '9. Mode of communication', 'Verbal|Non-verbal|Both']]),
  sec('10. Oral peripheral mechanism (structure & function)', [
    ['sla_hardpalate', 'text', 'a. Hard palate'], ['sla_softpalate', 'text', 'b. Soft palate'], ['sla_lips', 'text', 'c. Lips'],
    ['sla_jaw', 'text', 'd. Jaw'], ['sla_dental', 'text', 'e. Dental'], ['sla_tongue', 'text', 'f. Tongue']]),
  sec('11. Articulation', [
    ['sla_art_cons', 'textarea', 'Consonants — errors by position (initial / middle / final)'],
    ['sla_art_vowels', 'textarea', 'Vowels — errors'],
    ['sla_art_recep', 'textarea', 'Qualitative — receptive'],
    ['sla_art_words', 'text', 'Expressive — number of words'],
    ['sla_art_sent', 'text', 'Expressive — number of sentences'],
    ['sla_art_conv', 'text', 'Ability to hold reciprocal conversation'],
    ['sla_art_story', 'textarea', 'Narrating a story (expression / sequence / coherence)'],
    ['sla_art_context', 'text', 'Contextual communication']]),
  sec('12. Voice assessment', [['sla_v_pitch', 'text', 'a. Pitch'], ['sla_v_loud', 'text', 'b. Loudness'], ['sla_v_qual', 'text', 'c. Quality']]),
  sec('13–16. Fluency, intelligibility, imitation, audiology', [
    ['sla_fluency', 'select', '13. Fluency assessment', 'Speaking|Reading'],
    ['sla_blocks', 'text', 'No. of blocks per minute'],
    ['sla_intellig', 'textarea', '14. Speech intelligibility'],
    ['sla_imitation', 'select', '15. Imitation skills', 'Good|Fair|Poor'],
    ['sla_imit_gross', 'text', 'a. Gross body'], ['sla_imit_speech', 'text', 'b. Speech'],
    ['sla_hearing', 'text', '16. Audiological assessment — hearing']]),
  sec('17–19. Evaluation, diagnosis, recommendation', [
    ['sla_expr', 'textarea', '17a. Expressive language'], ['sla_recep', 'textarea', '17b. Receptive language'],
    ['sla_diag', 'textarea', '18. Provisional diagnosis'], ['sla_recom', 'textarea', '19. Recommendation']]),
];

// ── Play Session Observation (CGC) ───────────────────────────────────────────
export const PLAY_SECTIONS: InstrSection[] = [
  sec('1. Physical characteristics', [['play_phys', 'textarea', 'Physical appearance & any observable abnormality/defect', 'thin/obese/malnourished/well-built/neat/untidy; large/small head, squint, unsteady gait']]),
  sec('2. Motor development', [
    ['play_gross', 'textarea', 'a. Gross motor (coordination, balance, speed — outdoor play)'],
    ['play_fine', 'textarea', 'b. Fine motor (dexterity, coordination, neatness, speed — drawing/clay/writing)']]),
  sec('3. Social & emotional development', [['play_socemo', 'textarea', 'Sociability, temperament, interaction, discipline, attention, self-worth, confidence', 'inhibited/asocial · forms friends instantly · happy-cooperative · confident · nervous-anxious · needs assurance · demanding-disruptive · reasonable attention · fidgety-distractible · cannot sit still · apathetic-dull · plays harmoniously · cannot wait turn']]),
  sec('4. Language development', [['play_lang', 'textarea', 'Understanding, expression, vocabulary, sentence length, speech defects', 'understands spontaneously · needs cues · limited vocabulary · fluent · lacks precision · stammers · fast speech · misarticulated']]),
  sec('5. Intellectual development', [['play_intel', 'textarea', 'Age-appropriate play, use of material, rules, concepts, reasoning, creativity, imagination']]),
  sec("6. Child's world view", [
    ['play_wv_people', 'textarea', 'Perception of people around (peers, siblings, parents, teachers)'],
    ['play_wv_problem', 'textarea', 'Perception of the problem'],
    ['play_wv_likes', 'textarea', 'Likes, dislikes, interests, hobbies, difficulties']]),
  sec('7. Remarks', [['play_remarks', 'textarea', 'General responsiveness, participation, cooperation; summary of developmental abilities & clinical significance']]),
];

// ── Functional Academic Assessment (CGC) ─────────────────────────────────────
export const FUNCTIONAL_SECTIONS: InstrSection[] = [
  sec('Background', [['fn_grade', 'text', 'Present grade'], ['fn_school', 'text', 'School'], ['fn_medium', 'text', 'Medium of instruction']]),
  sec('English — reading', [
    ['fn_alpha_rec', 'textarea', 'English alphabet recognition — letters recognised / not recognised'],
    ['fn_phonics', 'textarea', 'Phonics (mp, et, gh, r, S, jb, w, i, df, k …)'],
    ['fn_keywords', 'textarea', 'Key words for each alphabet'],
    ['fn_read3', 'textarea', 'Reads three-letter words (WE, CAT, BUN, DAY, CAP, TIN)'],
    ['fn_idnaming', 'textarea', 'Identification / naming / grouping of fruits, vegetables, animals']]),
  sec('English — writing', [
    ['fn_alpha_write', 'textarea', 'English alphabet writing — upper & lower case'],
    ['fn_hindi_rec', 'text', 'Hindi recognition'], ['fn_hindi_write', 'text', 'Hindi writing']]),
  sec('Pre-number concepts', [
    ['fn_c_nearfar', 'yesno', 'Concept of near / far'], ['fn_c_bigsmall', 'yesno', 'Concept of big / small'],
    ['fn_c_moreless', 'yesno', 'Concept of more / less'], ['fn_c_beforeafter', 'yesno', 'Concept of before / after'],
    ['fn_c_inout', 'yesno', 'Concept of in / out']]),
  sec('Number skills', [
    ['fn_rote', 'text', 'Rote count'], ['fn_pattern', 'text', 'Pattern drawing'],
    ['fn_encircle', 'textarea', 'Encircle the greater number (10/2, 23/1, 19/4 …)'], ['fn_joindots', 'text', 'Join the dots']]),
  sec('Summary', [['fn_level', 'text', 'Functional academic level'], ['fn_recom', 'textarea', 'Recommendations']]),
];

// ── Adolescent Interview (AGSC) ──────────────────────────────────────────────
export const AI_INTERVIEW_SECTIONS: InstrSection[] = [
  sec('2. Interests', [['ai_i1', 'textarea', 'Spare-time interests and hobbies'], ['ai_i2', 'text', 'What they like doing when alone']]),
  sec('3. Education', [['ai_e1', 'textarea', 'Likes / least about school'], ['ai_e2', 'textarea', 'Favourite subjects, difficulties, grades'], ['ai_e3', 'text', 'Feelings about teachers']]),
  sec('4. Friends', [['ai_f1', 'textarea', 'Who they play with / friends, friends in school'], ['ai_f2', 'textarea', 'What they like / dislike doing together']]),
  sec('5. Home', [['ai_h1', 'textarea', 'Who is in the family'], ['ai_h2', 'textarea', 'Getting along with parents'], ['ai_h3', 'text', 'What parents appreciate / disapprove'], ['ai_h4', 'textarea', 'Getting along with siblings'], ['ai_h5', 'text', 'Family activities liked / not liked']]),
  sec('6. Activities & daily routine', [['ai_r1', 'textarea', 'Daily routine; activities wanted but no time for']]),
  sec('7. Self-image', [['ai_s1', 'textarea', 'What they like about self / do better than peers'], ['ai_s2', 'text', 'What they dislike / want to change'], ['ai_s3', 'text', 'How they describe themselves']]),
  sec('8. Moods, feelings & impulse control', [['ai_m1', 'textarea', 'What makes them sad/happy and how often'], ['ai_m2', 'textarea', 'What makes them angry and what they do'], ['ai_m3', 'textarea', 'Main problems, worries, difficulties']]),
  sec('9–13. Concerns, lifestyle, aspirations', [
    ['ai_somatic', 'textarea', '9. Somatic concerns (headaches, body pain, sleeplessness)'],
    ['ai_diet', 'text', '10. Food preferences / diet'], ['ai_substance', 'select', 'Smoke / drink / take drugs', 'No|Yes'],
    ['ai_sexual', 'textarea', '11. Sexual activity & concerns'],
    ['ai_aspiration', 'textarea', '12. Aspirations, fantasies & wishes'],
    ['ai_expect', 'textarea', '13. Expectations from the centre']]),
  sec('Behavioural observation', [
    ['ai_o_appear', 'textarea', '1. Appearance (size, grooming, cleanliness, energetic/lethargic)'],
    ['ai_o_eye', 'select', '2. Eye contact', 'Adequate|Gaze avoidance'],
    ['ai_o_attn', 'textarea', '3. Attention span', 'attentive/alert · short span · distractible · restless/impulsive · excessive talking'],
    ['ai_o_gross', 'textarea', '4a. Gross motor abilities'], ['ai_o_fine', 'textarea', '4b. Fine motor abilities'],
    ['ai_o_lang', 'textarea', '5. Language development (spoken language, expression, vocabulary, sentence length, precision)'],
    ['ai_o_speech', 'text', '6. Speech defects'],
    ['ai_o_cog', 'textarea', '7. Cognitive development & problem-solving style', 'impulsive vs checks answers; trial-error vs systematic plan; creativity'],
    ['ai_o_mood', 'textarea', '8. Mood and affect', 'animated/balanced/flat · happy/sad/depressed/irritable · tense/anxious · preoccupied · fluctuating'],
    ['ai_o_behav', 'text', '9. Behaviour problems (nail biting, mannerisms, tics, aggression)'],
    ['ai_o_other', 'text', '10. Any other problems (hallucinations, thought blocks, delusions)'],
    ['ai_o_failure', 'textarea', '11. Reaction to failure, challenges and success'],
    ['ai_o_self', 'textarea', '12. Attitudes toward self']]),
];

// ── Case History — Child (CGC, sections A–G) ─────────────────────────────────
export const CASE_HISTORY_SECTIONS: InstrSection[] = [
  sec('A. Background information', [
    ['ch_distance', 'select', 'Distance of residence from the CGC', '< 5 km|5–10 km|10–20 km|> 20 km|Outstationed'],
    ['ch_bg', 'select', "Child's background", 'Rural|Urban'],
    ['ch_religion', 'select', 'Religion', 'Hindu|Muslim|Sikh|Christian|Other'],
    ['ch_domicile', 'text', 'Domicile'],
    ['ch_mothertongue', 'text', 'Mother tongue'], ['ch_langs_home', 'text', 'Languages spoken at home'], ['ch_otherlangs', 'text', 'Other languages known'],
    ['ch_referral', 'select', 'Source of referral', 'Special school|School|Vol. organization|Self referral|Institute staff|Hospital|Private practitioner|Another client|Media/Advertisement|Any other'],
    ['ch_informants', 'select', 'Informants', 'Both parents|Mother or father|Parent with relatives|Others']]),
  sec('B. Presenting problem', [
    ['ch_pp_main', 'textarea', 'Main problems of the child', 'slow development · poor studies · delayed/unclear speech · stammering · hearing loss · physically weak · fits · inactivity · restlessness · shyness · dependency · withdrawal · aggression/tantrums · defiance · feeding/sleep · school problems · stealing/lying · disorganized behaviour'],
    ['ch_pp_detail', 'textarea', 'Describe in detail (onset, when noticed, where, how, frequency, duration)'],
    ['ch_pp_treatment', 'textarea', 'Treatment undergone so far (where & when)'],
    ['ch_pp_concl', 'select', 'Conclusion', 'First assessment|Reassessment at NIPCCD|Assessment at other centres']]),
  sec('C1. History of pregnancy', [
    ['ch_birthorder', 'text', 'Birth order of the child'], ['ch_mother_age', 'text', 'Age of the mother at pregnancy'],
    ['ch_planned', 'yesno', 'Was the birth planned'], ['ch_abortion', 'yesno', 'Any attempt to induce abortion'],
    ['ch_preg_illness', 'textarea', 'Any illness during pregnancy (specify illness & trimester)'],
    ['ch_rh', 'yesno', 'RH incompatibility'], ['ch_vd', 'yesno', 'Venereal disease'], ['ch_irradiation', 'yesno', 'Irradiation'],
    ['ch_meds_preg', 'textarea', 'Any medicines taken during pregnancy (analgesics / quinine / abortives / other)'],
    ['ch_emot_state', 'select', "Mother's emotional state of health", 'Psychiatric breakdown|Some tensions|Normal'],
    ['ch_preg_sig', 'yesno', 'Any significant problem during pregnancy']]),
  sec('C2. Perinatal history', [
    ['ch_delivery_place', 'select', 'Place of delivery', 'Home|Nursing home|Hospital'],
    ['ch_maturity', 'select', 'Maturity', 'Premature|Postmature|Full term'], ['ch_maturity_wks', 'text', 'Premature/postmature by (weeks)'],
    ['ch_labour', 'select', 'Nature of labour', 'Normal|Prolonged|Precipitated|Induced'],
    ['ch_delivery_type', 'select', 'Type of delivery', 'Natural|Forceps|Planned caesarean|Unplanned caesarean'],
    ['ch_peri_other', 'textarea', 'Any other complications'], ['ch_peri_sig', 'yesno', 'Any significant perinatal problem']]),
  sec('C3. Neonatal history', [
    ['ch_birthcry', 'select', 'Birth cry', 'Delayed|Normal'], ['ch_blue', 'yesno', 'Blue at birth'],
    ['ch_incubated', 'yesno', 'Incubated'], ['ch_oxygen', 'yesno', 'Oxygen given'],
    ['ch_birthwt', 'select', 'Birth weight', 'Weak (< 2.5 kg)|Normal'], ['ch_suckle', 'select', 'Ability to suckle', 'Unable to suck|Normal'],
    ['ch_jaundice', 'select', 'Jaundice', 'Severe|Mild|No jaundice'], ['ch_convulsions', 'yesno', 'Convulsions'],
    ['ch_neo_other', 'textarea', 'Other illness'], ['ch_neo_sig', 'yesno', 'Any significant neonatal problem']]),
  sec('C4. Postnatal — psychomotor milestones (in months)', [
    ['ch_m_smile', 'text', 'Social smile'], ['ch_m_head', 'text', 'Head control'], ['ch_m_sit', 'text', 'Sat without support'],
    ['ch_m_crawl', 'text', 'Crawling'], ['ch_m_walk', 'text', 'Walked without support'],
    ['ch_m_word', 'text', 'Spoke first word'], ['ch_m_sentence', 'text', 'Spoke sentences'],
    ['ch_m_concl', 'select', 'Conclusion', 'Milestones in normal sequence|All milestones delayed|Delay only in specific area']]),
  sec('C4. Postnatal — toilet control, feeding, medical', [
    ['ch_bowel', 'yesno', 'Bowel control achieved'], ['ch_bowel_age', 'text', 'Age bowel control completed (months)'],
    ['ch_bladder', 'select', 'Bladder control', 'No control|Control only when awake|Total control'], ['ch_bladder_age', 'text', 'Age bladder control achieved (months)'],
    ['ch_bedwet', 'textarea', 'If bed-wetting — frequency, when it started'],
    ['ch_toilet_concl', 'select', 'Extent of toilet control', 'No control|Partial|Total'],
    ['ch_weight_gain', 'text', 'Weight gain'],
    ['ch_breast', 'text', 'Breast feeding (normal/poor, until)'], ['ch_bottle', 'text', 'Bottle feeding (until)'], ['ch_feed_other', 'textarea', 'Any other early-feeding information'],
    ['ch_med_illness', 'textarea', 'Serious illness/injury/accident/hospitalisation (describe, age of occurrence)'],
    ['ch_med_current', 'yesno', 'Currently taking medicines'], ['ch_med_names', 'text', 'Names of medicines / place of follow-up'],
    ['ch_med_sig', 'yesno', 'Any significant medical history']]),
  sec("D1. Adaptive behaviour", [
    ['ch_ab_comm', 'textarea', 'Communication skills (receptive & expressive)'], ['ch_ab_toilet', 'text', 'Toilet'],
    ['ch_ab_selfhelp', 'textarea', 'Self-help skills (bathing, eating, dressing)'],
    ['ch_ab_chores', 'textarea', 'Participation in household chores'], ['ch_ab_neigh', 'text', 'Awareness about neighbourhood/environment'],
    ['ch_ab_concl', 'select', 'Conclusion', 'Age appropriate|Delayed in specific area|Delay across all domains'],
    ['ch_pe_eat', 'yesno', 'Specific problem in eating'], ['ch_pe_eat_d', 'text', 'Eating — describe'],
    ['ch_pe_sleep', 'yesno', 'Specific problem in sleeping'], ['ch_pe_sleep_d', 'text', 'Sleeping — describe'],
    ['ch_pe_speak', 'yesno', 'Specific problem in speaking'], ['ch_pe_speak_d', 'text', 'Speaking — describe']]),
  sec('D2. Play behaviour', [
    ['ch_play_free', 'textarea', 'What the child likes doing during free time'],
    ['ch_play_others', 'select', 'Plays with other children', 'No|Younger children|Same age|Older children'],
    ['ch_play_type', 'select', 'Type of play', 'Onlooker|Solitary|Parallel|Cooperative under guidance|Cooperative play'],
    ['ch_play_concl', 'textarea', 'Conclusion (cognitively/socially mature for age, range of play)']]),
  sec('D3–D5. Routine, family behaviour, personality', [
    ['ch_routine', 'textarea', 'Routine of the waking hours'], ['ch_routine_concl', 'textarea', 'Conclusion (developmentally appropriate, neglected areas)'],
    ['ch_fam_attached', 'textarea', 'Who is the child most attached to and what they share'],
    ['ch_fam_afraid', 'text', 'Afraid of / dislikes anybody at home (reasons)'],
    ['ch_fam_peers', 'textarea', 'Behaviour compared with children of the same age'],
    ['ch_fam_loss', 'text', 'Any death or long separation affecting the child'],
    ['ch_fam_siblings', 'select', 'Gets along with siblings', 'Not well|Well|Very well'],
    ['ch_fam_concl', 'select', 'Conclusion', 'Significant family factors|Nothing very significant'],
    ['ch_personality', 'textarea', 'Personality characteristics (shy, sociable, aggressive, timid, creative, impulsive…)']]),
  sec('E. Educational history', [
    ['ch_school', 'text', 'Name & address of school, class & section'],
    ['ch_school_age', 'select', 'Age started school', 'Before 3 years|3+ to 5 years|5+'],
    ['ch_school_breaks', 'yesno', 'Any breaks in schooling'], ['ch_school_breaks_d', 'text', 'Breaks — when & why'],
    ['ch_school_changed', 'yesno', 'Changed schools'], ['ch_school_changed_d', 'text', 'School change — grade & reason'],
    ['ch_school_likes', 'yesno', 'Likes going to school'],
    ['ch_school_friend', 'yesno', 'Has a friend in school'], ['ch_school_peers', 'textarea', 'Nature of activities with peers'],
    ['ch_school_perf', 'select', 'Current school performance', 'Below average|Average|Above average'],
    ['ch_acad_skills', 'textarea', 'Strengths & limitations in academic skills (reading, comprehension, spellings, written expression, handwriting, oral work, arithmetic — English & Hindi)'],
    ['ch_school_recent', 'yesno', 'Recent changes in school performance'], ['ch_school_recent_d', 'text', 'Recent change — describe'],
    ['ch_school_repeat', 'yesno', 'Ever repeated a class'], ['ch_school_repeat_d', 'text', 'Repeat — reasons & grades'],
    ['ch_teacher', 'textarea', "Teacher's report on studies & behaviour"],
    ['ch_cocurric', 'yesno', 'Takes part in co-curricular activities'], ['ch_cocurric_d', 'text', 'Co-curricular — describe']]),
  sec('F. Family history', [
    ['ch_fam_members', 'textarea', 'Family members (relationship, name, age, education, occupation, income/month)'],
    ['ch_fam_tree', 'textarea', 'Family constellation / family tree'],
    ['ch_fam_income', 'text', 'Total family income / month (Rs.)'],
    ['ch_fam_type', 'select', 'Type of family', 'Joint|Nuclear|Extended|Institutionalized|Any other'],
    ['ch_only_child', 'yesno', 'Only child'], ['ch_only_son', 'yesno', 'Only son'],
    ['ch_eldest', 'yesno', 'Eldest child'], ['ch_youngest', 'yesno', 'Youngest child'],
    ['ch_fh_mi', 'yesno', 'Family history — mental illness'], ['ch_fh_mi_who', 'text', 'Mental illness — who'],
    ['ch_fh_mr', 'yesno', 'Family history — mental retardation'], ['ch_fh_mr_who', 'text', 'Mental retardation — who'],
    ['ch_fh_conv', 'yesno', 'Family history — convulsions'], ['ch_fh_conv_who', 'text', 'Convulsions — who'],
    ['ch_fh_speech', 'yesno', 'Family history — speech defect'], ['ch_fh_speech_who', 'text', 'Speech defect — who'],
    ['ch_consang', 'yesno', 'Consanguinity among parents'],
    ['ch_house_own', 'select', 'Housing — ownership', 'Self-owned|Paid (govt.)|Rented'],
    ['ch_house_space', 'select', 'Housing — space', 'One room|2–3 rooms|More than 3 rooms'],
    ['ch_house_play', 'yesno', 'Space available for play']]),
  sec('G. Observations of the interviewer', [
    ['ch_obs_cause', 'textarea', "Parents' perception about the causes of the child's difficulty"],
    ['ch_obs_impact_child', 'textarea', 'Impact of the problem on the child'],
    ['ch_obs_impact_family', 'textarea', "Impact of the child's problem on the family & their coping mechanisms"],
    ['ch_obs_expect', 'select', 'Parents expectations from the centre', 'Assessment and reporting|Guidance for education/vocation|The child should be cured|Speech therapy|Medical treatment|Educational planning|Any other']]),
];

// ── Case History — Adolescent (AGSC, sections A–G) ───────────────────────────
export const CASE_HISTORY_ADOL_SECTIONS: InstrSection[] = [
  sec('A. Background information', [
    ['ah_distance', 'select', 'Distance of residence from the AGSC', '< 5 km|5–10 km|10–20 km|> 20 km|Outstationed'],
    ['ah_bg', 'select', 'Background', 'Rural|Urban'],
    ['ah_religion', 'select', 'Religion', 'Hindu|Muslim|Sikh|Christian|Other'], ['ah_domicile', 'text', 'Domicile'],
    ['ah_mothertongue', 'text', 'Mother tongue'], ['ah_langs_home', 'text', 'No. of languages spoken at home'], ['ah_otherlangs', 'text', 'Other languages'],
    ['ah_referral', 'select', 'Source of referral', 'Special school|School|Vol. organization|Self referral|Institute staff|Hospital|Private practitioner|Another client|Media advertisement|Any other'],
    ['ah_informants', 'select', 'Informants', 'Both parents|Mother or father|Parent with relatives|Others']]),
  sec('B. Presenting problem', [
    ['ah_pp_main', 'textarea', 'Main concerns of the adolescent (illustrate)', 'lags in studies/language · unclear speech · stammering · hearing loss · motor difficulties · fits · inactivity · restlessness · shyness · over-dependency · atypical sensory issues · withdrawal · aggressive outbursts · defiance · eating/sleep · school concerns · stealing/lying · disorganized behaviour · age-inappropriate sexual behaviour · substance use · excessive gadget use · child sexual abuse · bullying · self-harm · suicidal ideation'],
    ['ah_pp_detail', 'textarea', 'Describe in detail (onset, when, where, how, frequency, duration)'],
    ['ah_pp_traj', 'textarea', 'Trajectory of the concerns over the years'],
    ['ah_pp_treat', 'textarea', 'Types of treatment undergone so far (where & when)'],
    ['ah_pp_concl', 'select', 'Conclusion', 'First assessment|Reassessment at NIPCCD|Assessment at other centres']]),
  sec('C. Early developmental history', [
    ['ah_birthorder', 'text', 'Birth order of the child'], ['ah_mother_age', 'text', 'Age of mother at pregnancy'],
    ['ah_preg_problem', 'textarea', 'Significant problem during pregnancy (illness & trimester, medications, emotional health)'],
    ['ah_preg_sig', 'yesno', 'Any significant problem during pregnancy'],
    ['ah_delivery_place', 'select', 'Place of delivery', 'Home|Nursing home|Hospital'],
    ['ah_maturity', 'select', 'Maturity', 'Premature|Postmature|Full term'], ['ah_maturity_wks', 'text', 'Premature/postmature by (weeks)'],
    ['ah_labour', 'select', 'Nature of labour', 'Normal|Prolonged|Precipitated|Induced'],
    ['ah_delivery_type', 'select', 'Type of delivery', 'Natural|Forceps|Planned caesarean|Unplanned caesarean'],
    ['ah_birthcry', 'select', 'Birth cry', 'Delayed|Normal'], ['ah_birthwt', 'text', 'Birth weight'],
    ['ah_complications', 'textarea', 'Any significant complication (oxygen, blue at birth, incubated, suckle, jaundice)']]),
  sec('C. Milestones & medical', [
    ['ah_m_head', 'text', 'Head control'], ['ah_m_sit', 'text', 'Sitting'], ['ah_m_walk', 'text', 'Walking'],
    ['ah_m_talk', 'text', 'Talking (first word, first sentence)'], ['ah_m_toilet', 'text', 'Toilet control'],
    ['ah_m_concl', 'select', 'Conclusion', 'Milestones in normal sequence|Delayed|Delay only in specific area/regression'],
    ['ah_med_child', 'textarea', 'Medical history during childhood (fits, injuries, accidents, illness, hospitalisation) & age'],
    ['ah_med_current', 'textarea', 'Current medical treatment (medicines, since when, follow-up)'],
    ['ah_med_sig', 'yesno', 'Any significant medical history']]),
  sec("D. Adolescent's present behaviour", [
    ['ah_ab_selfhelp', 'textarea', 'Self-help skills (bathing, eating, dressing)'],
    ['ah_ab_chores', 'textarea', 'Household chores (errands, kitchen, housekeeping)'],
    ['ah_ab_money', 'text', 'Money transaction (function/value of money, counting change)'],
    ['ah_ab_comm', 'textarea', 'Communication skills (receptive, expressive, instrumental, affective)'],
    ['ah_ab_concl', 'select', 'Conclusion', 'Age appropriate|Delayed in specific area|Delay across all domains'],
    ['ah_peers', 'textarea', 'Relationship with peers (no. of friends, time, activities)'],
    ['ah_peers_concl', 'select', 'Plays with other children', 'No|Younger children|Same age|Older children'],
    ['ah_leisure', 'text', 'Leisure activities / hobbies'], ['ah_routine', 'textarea', 'Daily routine'],
    ['ah_pe_eat', 'yesno', 'Specific problem — eating'], ['ah_pe_eat_d', 'text', 'Eating — describe'],
    ['ah_pe_sleep', 'yesno', 'Specific problem — sleeping'], ['ah_pe_sleep_d', 'text', 'Sleeping — describe'],
    ['ah_pe_sib', 'yesno', 'Specific problem — relating to siblings'], ['ah_pe_sib_d', 'text', 'Siblings — describe']]),
  sec('D. Pubertal history & recent changes', [
    ['ah_pub_age', 'text', 'Age puberty began'],
    ['ah_pub_mat', 'select', 'Pubertal maturation', 'Early maturation|Late maturation|On-time maturation'],
    ['ah_pub_changes', 'text', 'Recent significant pubertal changes'], ['ah_pub_compl', 'text', 'Any complications related to puberty'],
    ['ah_pub_sexhist', 'text', 'Any significant sexual history'],
    ['ah_recent_changes', 'textarea', 'Recent changes (emotional/interpersonal, separation, loss)'],
    ['ah_other_events', 'textarea', 'Any other events that have affected the child']]),
  sec('E. Behaviour with the family', [
    ['ah_fam_comm', 'textarea', 'Who they communicate concerns to / most attached to'],
    ['ah_fam_refrain', 'text', 'Anyone they refrain from sharing with'],
    ['ah_fam_activities', 'text', 'Activities the family jointly engages in'],
    ['ah_fam_parenting', 'textarea', 'Difficulties in parenting/disciplining/managing behaviours'],
    ['ah_fam_coping', 'textarea', 'Coping skills of the adolescent'],
    ['ah_fam_other', 'text', 'Any other concerns (job loss, economic stressors)'],
    ['ah_fh_mi', 'yesno', 'Family history — mental illness'], ['ah_fh_mi_who', 'text', 'Mental illness — who'],
    ['ah_fh_dis', 'yesno', 'Family history — any disabilities'], ['ah_fh_dis_who', 'text', 'Disabilities — who'],
    ['ah_fh_conv', 'yesno', 'Family history — convulsions'], ['ah_fh_chronic', 'yesno', 'Family history — chronic illness'],
    ['ah_fh_speech', 'yesno', 'Family history — speech difficulties'], ['ah_consang', 'yesno', 'Consanguinity among parents'],
    ['ah_fh_concl', 'select', 'Conclusion', 'Significant family factors|Nothing very significant']]),
  sec('F. Educational history', [
    ['ah_school', 'text', 'Name & address of school'], ['ah_class', 'text', 'Present class'], ['ah_subjects', 'text', 'Subjects'],
    ['ah_schools_changed', 'text', 'No. of schools changed & reasons'], ['ah_repeated', 'text', 'Any classes repeated & reasons'],
    ['ah_perf_grades', 'textarea', 'Performance across grades'], ['ah_perf_recent', 'text', 'Any recent change in performance'],
    ['ah_attendance', 'select', 'Regularity in attendance', 'Regular|Irregular'],
    ['ah_avoidance', 'textarea', 'Avoidance of schoolwork, school refusal, truancy'],
    ['ah_peers_school', 'text', 'Relationship with friends/peers at school'], ['ah_activities_school', 'text', 'Activities pursued at school'],
    ['ah_strengths', 'textarea', 'Strengths (academics & school activities)'],
    ['ah_diff_subjects', 'text', 'Specific difficulties — subjects'],
    ['ah_diff_reading', 'text', 'Reading (mechanical, comprehension)'], ['ah_diff_writing', 'text', 'Writing (spellings, handwriting, written expression)'],
    ['ah_diff_arith', 'text', 'Arithmetic (concepts, operations, computation, application)'],
    ['ah_teacher', 'textarea', "Teacher's report about behaviour"], ['ah_other_help', 'text', 'Any other academic help being taken']]),
  sec('G. Family details & housing', [
    ['ah_fam_members', 'textarea', 'Family members (relationship, name, age, education, occupation, income)'],
    ['ah_fam_tree', 'textarea', 'Family constellation / genogram'],
    ['ah_fam_income', 'text', 'Total family income (Rs. / month or annual)'],
    ['ah_fam_type', 'select', 'Type of family', 'Joint|Nuclear|Extended|Institutionalized|Any other'],
    ['ah_only_child', 'yesno', 'Only child'], ['ah_only_son', 'yesno', 'Only son'],
    ['ah_eldest', 'yesno', 'Eldest child'], ['ah_youngest', 'yesno', 'Youngest child'], ['ah_adopted', 'yesno', 'Adoption of the child'],
    ['ah_house_own', 'select', 'Housing — ownership', 'Self-owned|Paid (govt.)|Rented'],
    ['ah_house_space', 'select', 'Housing — space', 'One room|2–3 rooms|More than 3 rooms'],
    ['ah_house_play', 'yesno', 'Space available for play']]),
  sec('G. Observation by the interviewer', [
    ['ah_obs_cause', 'textarea', "Parents' perception about the causes of the child's difficulty"],
    ['ah_obs_impact_child', 'textarea', 'Impact of the problem on the child'],
    ['ah_obs_impact_family', 'textarea', "Impact of the child's problem on the family & coping mechanisms"],
    ['ah_obs_informants', 'text', 'Any significant factors about informants'],
    ['ah_obs_expect', 'select', "Parent's expectations from the centre", 'Assessment and reporting|Guidance for education/vocation|Counselling the child|Speech therapy|Medical treatment|Educational planning|Any other']]),
];

export type Lang = "en" | "he";

const dict: Record<string, { en: string; he: string }> = {
  // ── Bottom Nav ──────────────────────────────────────────────────────────────
  nav_my_waves:   { en: "My Waves",   he: "הגלים שלי" },
  nav_home:       { en: "Home",       he: "בית" },
  nav_back_home:  { en: "Back Home",  he: "חזרה הביתה" },
  nav_ask_omer:   { en: "Ask Omer",   he: "שאל את עומר" },

  // ── Library Home ────────────────────────────────────────────────────────────
  lib_my:           { en: "my",           he: "שלי" },
  lib_library:      { en: "LIBRARY",      he: "ספרייה" },
  lib_stage:        { en: "STAGE",        he: "שלב" },
  lib_focus:        { en: "Focus:",       he: "פוקוס:" },
  lib_all_waves:    { en: "ALL WAVES",    he: "כל הגלים" },
  lib_by_clinic:    { en: "BY CLINIC",    he: "לפי קליניקה" },
  lib_my_waves:     { en: "My Waves",     he: "הגלים שלי" },
  lib_personal:     { en: "Personal Plan",he: "תוכנית אישית" },
  lib_coming_soon:  { en: "Coming Soon",  he: "בקרוב" },
  lib_other_waves:  { en: "Other Waves",  he: "גלים נוספים" },
  lib_no_waves:     { en: "No waves yet.",he: "אין גלים עדיין." },
  lib_israel:       { en: "ISRAEL OCEAN", he: "האוקיינוס הישראלי" },
  lib_wave_pool:    { en: "WAVE POOL",    he: "בריכת גלים" },
  lib_home_plan:    { en: "HOME PLAN",    he: "תוכנית הבית" },
  lib_roadmap:      { en: "Build Strategy", he: "אסטרטגיית בנייה" },
  lib_roadmap_sub:  { en: "Your personal roadmap", he: "מפת הדרכים האישית שלך" },

  // ── Waves List ──────────────────────────────────────────────────────────────
  waves_heading:        { en: "My Waves",    he: "הגלים שלי" },
  waves_your_sessions:  { en: "Your Sessions", he: "האימונים שלך" },
  waves_all_filter:     { en: "ALL",         he: "הכל" },
  waves_from_coach:     { en: "debriefs from your coach",  he: "סיכומים מהמאמן" },
  waves_debrief_s:      { en: "debrief",     he: "סיכום" },
  waves_first_msg:      { en: "Omer will publish your first debrief after your next session.", he: "עומר יפרסם את הסיכום הראשון שלך לאחר האימון הבא." },
  waves_none_yet:       { en: "No debriefs yet", he: "אין סיכומים עדיין" },
  waves_check_back:     { en: "Check back after your next session", he: "בדוק שוב לאחר האימון הבא" },
  waves_none_in_clinic: { en: "No waves in this clinic", he: "אין גלים בקליניקה זו" },
  waves_show_all:       { en: "Show all",    he: "הצג הכל" },

  // ── Ask Page ─────────────────────────────────────────────────────────────────
  ask_label:         { en: "Ask Omer",       he: "שאל את עומר" },
  ask_heading:       { en: "Send a Question",he: "שלח שאלה" },
  ask_subtitle:      { en: "Omer reviews every Sunday and replies by Monday.", he: "עומר בודק כל יום ראשון ומשיב עד יום שני." },
  ask_form_label:    { en: "Your Question",  he: "השאלה שלך" },
  ask_placeholder:   { en: "What do you want Omer to look at? Be specific — mention the wave, the moment, what you felt…", he: "מה אתה רוצה שעומר יסתכל עליו? היה ספציפי — ציין את הגל, הרגע, מה הרגשת..." },
  ask_clip_label:    { en: "Clip URL (optional)", he: "קישור לקליפ (אופציונלי)" },
  ask_clip_ph:       { en: "YouTube / Vimeo / Google Drive link to your wave…", he: "קישור YouTube / Vimeo / Google Drive לגל שלך..." },
  ask_btn:           { en: "Ask Omer →",     he: "שאל את עומר" },
  ask_sending:       { en: "Sending…",       he: "שולח..." },
  ask_your_qs:       { en: "Your Questions", he: "השאלות שלך" },
  ask_your_clip:     { en: "Your clip",      he: "הקליפ שלך" },
  ask_empty:         { en: "Your questions will appear here after you submit one.", he: "השאלות שלך יופיעו כאן לאחר שתגיש אחת." },
  ask_status_new:    { en: "Waiting for review",     he: "ממתין לבדיקה" },
  ask_status_review: { en: "Omer's reviewing this",  he: "עומר בודק את זה" },
  ask_status_done:   { en: "Answered",               he: "נענה" },
  ask_omers_reply:   { en: "Omer's Reply",            he: "תשובת עומר" },
  ask_reply_wa:      { en: "Reply sent via WhatsApp — check your messages.", he: "התשובה נשלחה ב-WhatsApp — בדוק את ההודעות שלך." },
  ask_watch_reply:   { en: "Watch reply",             he: "צפה בתשובה" },
  ask_reply_soon:    { en: "Reply coming soon.",      he: "תשובה בקרוב." },

  // ── Back Home ────────────────────────────────────────────────────────────────
  bh_label:          { en: "Back Home",      he: "חזרה הביתה" },
  bh_heading:        { en: "Train at Home",  he: "תאמן בבית" },
  bh_subtitle:       { en: "Apply what you learned — tailored for your home environment", he: "יישם את מה שלמדת — מותאם לסביבת הבית שלך" },
  bh_israel:         { en: "Israel Ocean",   he: "האוקיינוס הישראלי" },
  bh_pool:           { en: "Wave Pool",      he: "בריכת גלים" },
  bh_whats_diff:     { en: "What's Different Here", he: "מה שונה כאן" },
  bh_try_first:      { en: "Try First",      he: "נסה קודם" },
  bh_on_wave:        { en: "On-Wave Reminder",he: "תזכורת בגל" },
  bh_watch_ref:      { en: "Watch Reference",he: "צפה בהפניה" },
  bh_voice_note:     { en: "Coach's Voice Note", he: "הערת הקול של המאמן" },
  bh_coming:         { en: "Content for this environment coming after your next session", he: "תוכן לסביבה זו יגיע לאחר האימון הבא שלך" },

  // ── Debrief Detail ───────────────────────────────────────────────────────────
  dd_library:        { en: "LIBRARY",         he: "ספרייה" },
  dd_day:            { en: "DAY",             he: "יום" },
  dd_entry:          { en: "ENTRY",           he: "ערך" },
  dd_entries:        { en: "ENTRIES",         he: "ערכים" },
  dd_content_soon:   { en: "Content coming soon", he: "תוכן בקרוב" },
  dd_writing:        { en: "Omer is still writing up your debrief", he: "עומר עדיין כותב את הסיכום שלך" },

  // Block type labels
  block_mistake:     { en: "The Mistake",     he: "הטעות" },
  block_correction:  { en: "The Correction",  he: "התיקון" },
  block_improvement: { en: "The Improvement", he: "השיפור" },
  block_goal:        { en: "The Goal",        he: "המטרה" },
  block_next_step:   { en: "Next Step",       he: "הצעד הבא" },

  // Block captions
  cap_mistake:       { en: "What went wrong",     he: "מה השתבש" },
  cap_correction:    { en: "What to do instead",  he: "מה לעשות במקום" },
  cap_improvement:   { en: "How far you've come", he: "כמה התקדמת" },
  cap_goal:          { en: "Where you're headed",  he: "לאן אתה הולך" },
  cap_next_step:     { en: "Your next focus",      he: "הפוקוס הבא שלך" },

  // Video labels
  vid_before:        { en: "Before",          he: "לפני" },
  vid_after:         { en: "After",           he: "אחרי" },
  vid_goal:          { en: "Goal video",      he: "סרטון מטרה" },
  vid_drill:         { en: "Drill video",     he: "סרטון תרגיל" },
  vid_watch_clip:    { en: "Watch clip",      he: "צפה בקליפ" },
  vid_ref_wave:      { en: "Reference wave",  he: "גל עזר" },

  // Notes section
  notes_title:       { en: "YOUR NOTES",      he: "ההערות שלך" },
  notes_tap_add:     { en: "Tap to add your personal notes from this session…", he: "לחץ להוסיף הערות אישיות מהסשן הזה..." },
  notes_tap_edit:    { en: "TAP TO EDIT ✏",  he: "לחץ לעריכה ✏" },
  notes_add:         { en: "+ ADD NOTE",      he: "+ הוסף הערה" },
  notes_write_ph:    { en: "Write your thoughts, feelings, or observations from this session…", he: "כתוב את מחשבותיך, תחושותיך, או תצפיותיך מהסשן הזה..." },
  notes_cancel:      { en: "CANCEL",          he: "ביטול" },
  notes_save:        { en: "SAVE NOTE",       he: "שמור הערה" },
  notes_saved:       { en: "✓ NOTE SAVED",    he: "✓ הערה נשמרה" },

  // ── Strategy ─────────────────────────────────────────────────────────────────
  nav_strategy:      { en: "Strategy",        he: "אסטרטגיה" },
  strat_heading:     { en: "Build Strategy",  he: "אסטרטגיית בנייה" },
  strat_subtitle:    { en: "Your personal roadmap, built by your coach.", he: "מפת הדרכים האישית שלך, שנבנתה על ידי המאמן שלך." },
  strat_empty:       { en: "Your coach hasn't built your strategy yet.", he: "המאמן שלך עדיין לא בנה את האסטרטגיה שלך." },
  strat_goal:        { en: "GOAL",            he: "מטרה" },
  strat_factor:      { en: "FACTOR",          he: "גורם" },
  strat_step:        { en: "STEP",            he: "צעד" },
  strat_context:     { en: "CONTEXT",         he: "הקשר" },
  strat_connects_to: { en: "Connects to",     he: "מתחבר ל" },

  // ── Training ──────────────────────────────────────────────────────────────────
  nav_training:          { en: "Training",        he: "אימון" },
  train_my:              { en: "my",              he: "שלי" },
  train_heading:         { en: "TRAINING",        he: "אימון" },
  train_consistency:     { en: "Habit Consistency", he: "עקביות הרגלים" },
  train_consistency_sub: { en: "Your training habit over the last 10 weeks.", he: "הרגל האימון שלך ב-10 השבועות האחרונים." },

  // ── Auth ─────────────────────────────────────────────────────────────────────
  logout:            { en: "LOG OUT",         he: "התנתק" },
};

export function t(key: string, lang: Lang): string {
  return dict[key]?.[lang] ?? dict[key]?.en ?? key;
}

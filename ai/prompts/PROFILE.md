# Prompt template — entertainment-only profile narrative

Input: optional user-selected MBTI {{mbti}}, optional validated saju reading {{saju_summary}}, five test dimension scores {{scores}}.

Produce separate Korean sections: (1) MBTI entertainment story if provided; (2) traditional saju interpretation if reliable computed reading exists, explicitly entertainment; (3) questionnaire self-report observations grounded in dimension labels/score direction; (4) two practical reflection questions. Never mix saju/MBTI into test score calculation or invent birth pillars. If missing, omit associated section. Do not call any score an abuse risk or mental diagnosis.

Validated JSON keys: `mbtiStory`, `sajuStory`, `behavioralReflection`, `questions`, `disclaimer`. All strings except questions (array of 2 strings); nullable story fields.

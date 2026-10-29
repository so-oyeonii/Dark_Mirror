# Prompt template — two-party consented compatibility

Inputs contain ONLY both consenting parties' whitelisted fields: {{a_shared}}, {{b_shared}}. Do not request raw birthdates, private answers, chats or identities. Respect disabled sharing flags.

Produce Korean JSON with separate fields: `mbtiEntertainment`, `sajuEntertainment`, `behaviorComparison`, `communicationSuggestions` (array), `reflectionQuestions` (array), `disclaimer`. MBTI and saju are narratives not scientific compatibility predictions. Behavior comparison must describe score differences without judging either person. Do not produce a single percentage match, label relationship safe/unsafe, or predict success. Omit sections if corresponding fields were not consented/provided.

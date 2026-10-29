# Prompt template — post-simulation reflection

Given ONLY the fictional scenario {{scenario_id}} and user's five or fewer choices {{user_turns}}, summarize observable communication choices. Do not label user or an actual third party as abusive, susceptible, narcissistic, disordered, or dangerous. Avoid numerical risk scores. Note that one simulated interaction does not measure a person's personality.

Return Korean validated JSON:
{
  "observedPattern": "Neutral description grounded in example",
  "responseReflection": "What user expressed or left unsaid, without judging",
  "alternativeResponse": "One practical assertive or clarifying phrase",
  "reflectionQuestions": ["Question 1", "Question 2"],
  "disclaimer": "이 체험은 연습용이며 실제 관계나 성격을 진단하지 않습니다."
}

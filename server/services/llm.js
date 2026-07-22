import { getAzureOpenAIConfig } from '../config.js';

const SYSTEM_PROMPT = `You are an expert exam grader. Evaluate each student's answer against a strict binary rubric.

For every criterion on every question:
1. Quote the specific part of the student's answer that satisfies the criterion.
2. If the concept is missing or incorrect, set quote to "Missing".
3. Assign satisfied: true only if the criterion is clearly met; otherwise false.
4. Do NOT invent a numeric score — only judge each criterion.

Respond with ONLY a JSON object of this exact shape, no extra commentary:
{"results":[{"questionId":number,"evaluations":[{"criterionId":string,"quote":string,"satisfied":boolean}]}]}

Include exactly one result per question, using the same questionId values you were given. Include exactly one evaluation per criterion id from that question's rubric.

Few-shot example:
Question: "What is a stack?"
Criteria: [{id:"lifo",description:"States stack is LIFO"},{id:"ops",description:"Mentions push and pop"}]
Student answer: "A stack is LIFO. You push items on."
Correct output fragment:
{"questionId":1,"evaluations":[
  {"criterionId":"lifo","quote":"A stack is LIFO","satisfied":true},
  {"criterionId":"ops","quote":"You push items on","satisfied":false}
]}
(ops is false because pop was not mentioned.)`;

function buildUserMessage(items) {
  return JSON.stringify({ questions: items });
}

/**
 * Azure OpenAI chat-completions call for batch-grading a submission in one
 * request. Talks only to Azure OpenAI - no Mongo/Express imports.
 */
export async function gradeAnswers(items, { fetchImpl = fetch } = {}) {
  const config = getAzureOpenAIConfig();
  const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.version}`;

  console.log(`[llm] calling Azure OpenAI deployment=${config.deployment} questions=${items.length}`);
  const startedAt = Date.now();
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.key
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(items) }
      ],
      response_format: { type: 'json_object' }
      // temperature intentionally omitted: some deployed models (e.g. gpt-5-nano)
      // only support the default value (1) and reject an explicit temperature: 0.
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`[llm] Azure OpenAI HTTP ${response.status} after ${Date.now() - startedAt}ms`);
    throw new Error(`Azure OpenAI request failed with status ${response.status}: ${body}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  console.log(`[llm] response received in ${Date.now() - startedAt}ms`);

  if (!content) {
    throw new Error('Azure OpenAI response is missing message content');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Azure OpenAI response content was not valid JSON');
  }

  if (!Array.isArray(parsed.results)) {
    throw new Error('Azure OpenAI response is missing a "results" array');
  }

  console.log(`[llm] parsed ${parsed.results.length} result(s)`);
  return parsed.results.map((result, index) => {
    if (
      typeof result.questionId !== 'number' ||
      !Array.isArray(result.evaluations)
    ) {
      throw new Error(`Azure OpenAI response has a malformed grading result at index ${index}`);
    }

    const evaluations = result.evaluations.map((evaluation, evalIndex) => {
      if (
        typeof evaluation.criterionId !== 'string' ||
        typeof evaluation.quote !== 'string' ||
        typeof evaluation.satisfied !== 'boolean'
      ) {
        throw new Error(
          `Azure OpenAI response has a malformed evaluation at result ${index}, evaluation ${evalIndex}`
        );
      }
      return {
        criterionId: evaluation.criterionId,
        quote: evaluation.quote,
        satisfied: evaluation.satisfied
      };
    });

    return {
      questionId: result.questionId,
      evaluations
    };
  });
}

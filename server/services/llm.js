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

const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

function buildUserMessage(items) {
  return JSON.stringify({ questions: items });
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelayMs(attempt) {
  // attempt is 1-based index of the failed attempt → delay before next try
  const base = 200 * 4 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * 101);
  return base + jitter;
}

function createError(message, { status, retryable = false } = {}) {
  const error = new Error(message);
  if (status != null) {
    error.status = status;
  }
  error.retryable = retryable;
  return error;
}

function isRetryable(error) {
  if (error?.retryable === true) {
    return true;
  }
  // Network / fetch failures (e.g. TypeError: fetch failed)
  if (error instanceof TypeError) {
    return true;
  }
  return false;
}

function parseGradingResults(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw createError('Azure OpenAI response content was not valid JSON');
  }

  if (!Array.isArray(parsed.results)) {
    throw createError('Azure OpenAI response is missing a "results" array');
  }

  return parsed.results.map((result, index) => {
    if (
      typeof result.questionId !== 'number' ||
      !Array.isArray(result.evaluations)
    ) {
      throw createError(`Azure OpenAI response has a malformed grading result at index ${index}`);
    }

    const evaluations = result.evaluations.map((evaluation, evalIndex) => {
      if (
        typeof evaluation.criterionId !== 'string' ||
        typeof evaluation.quote !== 'string' ||
        typeof evaluation.satisfied !== 'boolean'
      ) {
        throw createError(
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

async function requestOnce(items, { fetchImpl, config, url }) {
  const startedAt = Date.now();
  let response;
  try {
    response = await fetchImpl(url, {
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
  } catch (error) {
    error.retryable = true;
    throw error;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`[llm] Azure OpenAI HTTP ${response.status} after ${Date.now() - startedAt}ms`);
    throw createError(
      `Azure OpenAI request failed with status ${response.status}: ${body}`,
      {
        status: response.status,
        retryable: RETRYABLE_STATUS.has(response.status)
      }
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  console.log(`[llm] response received in ${Date.now() - startedAt}ms`);

  if (!content) {
    throw createError('Azure OpenAI response is missing message content', {
      retryable: true
    });
  }

  const results = parseGradingResults(content);
  console.log(`[llm] parsed ${results.length} result(s)`);
  return results;
}

/**
 * Azure OpenAI chat-completions call for batch-grading a submission in one
 * request. Talks only to Azure OpenAI - no Mongo/Express imports.
 * Retries transient failures (429/502/503/504, network, empty content) up to 3 times.
 */
export async function gradeAnswers(items, { fetchImpl = fetch, sleep = defaultSleep } = {}) {
  const config = getAzureOpenAIConfig();
  const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.version}`;

  console.log(`[llm] calling Azure OpenAI deployment=${config.deployment} questions=${items.length}`);

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await requestOnce(items, { fetchImpl, config, url });
    } catch (error) {
      lastError = error;
      const willRetry = isRetryable(error) && attempt < MAX_ATTEMPTS;
      console.error(
        `[llm] attempt=${attempt}/${MAX_ATTEMPTS} failed: ${error.message} willRetry=${willRetry}`
      );
      if (!willRetry) {
        throw error;
      }
      const delayMs = backoffDelayMs(attempt);
      console.log(`[llm] backing off ${delayMs}ms before retry`);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

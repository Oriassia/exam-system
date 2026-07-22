const SYSTEM_PROMPT = `You are an exam grader. You will be given a list of exam questions, each with its grading rubric and a student's answer. For each question, grade the student's answer against its rubric on a 0-100 scale and give brief, specific feedback.

Respond with ONLY a JSON object of this exact shape, no extra commentary:
{"results":[{"questionId": number, "score": number, "feedback": string}]}

Include exactly one result per question, in any order, using the same questionId values you were given.`;

function buildUserMessage(items) {
  return JSON.stringify({ questions: items });
}

/**
 * Azure OpenAI chat-completions client for batch-grading a submission in
 * one call. `fetchImpl` defaults to the global fetch but can be injected
 * so tests never touch the network. Talks only to Azure OpenAI - no
 * Mongo/Express imports.
 */
export function createAzureOpenAiClient({ config, fetchImpl = fetch }) {
  async function gradeAnswers(items) {
    const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.version}`;

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
        response_format: { type: 'json_object' },
        temperature: 0
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Azure OpenAI request failed with status ${response.status}: ${body}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

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

    return parsed.results.map((result, index) => {
      if (
        typeof result.questionId !== 'number' ||
        typeof result.score !== 'number' ||
        typeof result.feedback !== 'string'
      ) {
        throw new Error(`Azure OpenAI response has a malformed grading result at index ${index}`);
      }

      return {
        questionId: result.questionId,
        score: Math.max(0, Math.min(100, result.score)),
        feedback: result.feedback
      };
    });
  }

  return { gradeAnswers };
}

/** Builds a Messages API SSE response for SDK-level tests (no network). */
export function claudeStreamResponse(
  content: Array<Record<string, unknown>>,
  options: {
    stopReason?: string
    model?: string
    usage?: Record<string, number>
  } = {}
): Response {
  const events: Array<Record<string, unknown>> = [
    {
      type: 'message_start',
      message: {
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        model: options.model ?? 'claude-sonnet-5-5',
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0, ...options.usage },
      },
    },
  ]
  content.forEach((block, index) => {
    if (block.type === 'text') {
      events.push({ type: 'content_block_start', index, content_block: { type: 'text', text: '' } })
      events.push({
        type: 'content_block_delta',
        index,
        delta: { type: 'text_delta', text: block.text },
      })
    } else if (block.type === 'tool_use') {
      events.push({
        type: 'content_block_start',
        index,
        content_block: { type: 'tool_use', id: block.id, name: block.name, input: {} },
      })
      events.push({
        type: 'content_block_delta',
        index,
        delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) },
      })
    } else if (block.type === 'thinking') {
      events.push({
        type: 'content_block_start',
        index,
        content_block: { type: 'thinking', thinking: '', signature: '' },
      })
      events.push({
        type: 'content_block_delta',
        index,
        delta: { type: 'thinking_delta', thinking: block.thinking },
      })
      events.push({
        type: 'content_block_delta',
        index,
        delta: { type: 'signature_delta', signature: block.signature },
      })
    } else {
      events.push({ type: 'content_block_start', index, content_block: block })
    }
    events.push({ type: 'content_block_stop', index })
  })
  events.push({
    type: 'message_delta',
    delta: { stop_reason: options.stopReason ?? 'end_turn', stop_sequence: null },
    usage: { output_tokens: options.usage?.output_tokens ?? 0 },
  })
  events.push({ type: 'message_stop' })
  const body = events.map(e => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('')
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/event-stream', 'request-id': 'req_test' },
  })
}

export function claudeErrorResponse(status: number, type: string, message: string): Response {
  return new Response(JSON.stringify({ type: 'error', error: { type, message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Parsed JSON body and headers of the n-th fetch call. */
export function requestOf(mock: { mock: { calls: unknown[][] } }, n = 0) {
  const [url, init] = mock.mock.calls[n] as [string, RequestInit]
  return {
    url: String(url),
    body: JSON.parse(String(init.body)) as Record<string, unknown>,
    headers: new Headers(init.headers),
  }
}

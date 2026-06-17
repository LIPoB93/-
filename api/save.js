const GAS_ENDPOINT = process.env.GAS_ENDPOINT ||
  'https://script.google.com/macros/s/AKfycbyvUVC8QhU_iEcdMaM_o8KiapxWONkzGBQDho6ac8HV5qn-y2UBeEiMTz-kq3bou6iOsQ/exec';

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}

export function GET() {
  return json({
    ok: true,
    service: 'forest-qcard-save-proxy',
    endpointConfigured: Boolean(GAS_ENDPOINT)
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const recordId = String(body?.recordId || '').trim();
    const name = String(body?.name || '').trim();
    const docent = String(body?.docent || '').trim();
    const startTime = String(body?.startTime || '').trim();
    const endTime = String(body?.endTime || '').trim();

    if (!name || !docent) {
      return json({ ok: false, error: '이름과 담당 도슨트가 없습니다.' }, 400);
    }

    if (!startTime || !endTime) {
      return json({ ok: false, error: '시작 시간 또는 완료 시간이 없습니다.' }, 400);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    let gasResponse;
    try {
      gasResponse = await fetch(GAS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify({
          recordId,
          name,
          docent,
          startTime,
          endTime
        }),
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    const text = (await gasResponse.text()).trim();
    let result;

    try {
      result = JSON.parse(text);
    } catch {
      return json({
        ok: false,
        error: 'GAS 응답을 JSON으로 확인하지 못했습니다.',
        detail: text.slice(0, 200)
      }, 502);
    }

    if (!gasResponse.ok || !result?.ok) {
      return json({
        ok: false,
        error: result?.error || `GAS 요청 실패 (${gasResponse.status})`
      }, 502);
    }

    return json({
      ok: true,
      duplicate: Boolean(result.duplicate),
      recordId: result.recordId || recordId
    });
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'GAS 저장 응답 시간이 초과되었습니다.'
      : (error instanceof Error ? error.message : String(error));

    return json({ ok: false, error: message }, 500);
  }
}

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
    endpointConfigured: Boolean(GAS_ENDPOINT),
    transport: 'gas-get'
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

    // Apps Script ContentService 응답은 리다이렉트를 거칠 수 있습니다.
    // POST 리다이렉트 과정에서 본문이 사라지는 문제를 피하기 위해
    // GAS의 doGet(action=save)로 모든 값을 쿼리 파라미터로 전달합니다.
    const gasUrl = new URL(GAS_ENDPOINT);
    gasUrl.searchParams.set('action', 'save');
    gasUrl.searchParams.set('recordId', recordId);
    gasUrl.searchParams.set('name', name);
    gasUrl.searchParams.set('docent', docent);
    gasUrl.searchParams.set('startTime', startTime);
    gasUrl.searchParams.set('endTime', endTime);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    let gasResponse;
    try {
      gasResponse = await fetch(gasUrl, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-store',
          'Accept': 'application/json,text/plain,*/*'
        }
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
        detail: text.slice(0, 300)
      }, 502);
    }

    if (!gasResponse.ok || !result?.ok) {
      return json({
        ok: false,
        error: result?.error || `GAS 요청 실패 (${gasResponse.status})`,
        detail: text.slice(0, 300)
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

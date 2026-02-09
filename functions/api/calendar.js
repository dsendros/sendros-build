export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');

    if (!year || !month) {
        return new Response('Missing year or month parameter', { status: 400 });
    }

    const calendarUrl = `https://app.dcoz.dc.gov/Home/Calendar?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`;

    const response = await fetch(calendarUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'text/html',
        },
    });

    if (!response.ok) {
        return new Response(`Calendar returned ${response.status}`, { status: 502 });
    }

    const html = await response.text();

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
        },
    });
}

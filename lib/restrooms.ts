export type Restroom = {
  id: string;
  name: string;
  line: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  gate: string;
  exit: string;
  detail: string;
  phone: string;
  hours: string;
  baby: boolean | null;
  child: boolean | null;
  accessible: boolean | null;
  date: string;
  retrieved: string;
  source: string;
  facility: string;
  access: string;
  amenities: string;
  publicHours?: string;
};
export type OpenStatus = 'open' | 'closed' | 'unknown';
// Parse only unambiguous, daily schedules. Weekday/holiday/seasonal schedules need confirmation.
export function openingStatus(hours: string, now: Date | null): OpenStatus {
  if (!now) return 'unknown';
  let h = hours.replace(/\s/g, '').replace(/\|/g, '·');
  if (/^(상시\(24시간\)|24시간)(·기타)?·?$/.test(h)) return 'open';
  h = h
    .replace(/^(기타·)?정시/, '')
    .replace(/^기타·/, '')
    .replace(/^\(/, '')
    .replace(/\)$/, '')
    .replace(/·$/, '');
  const m = h.match(/^(\d{1,2}):(\d{2})~(익일)?(\d{1,2}):(\d{2})$/);
  if (!m) return 'unknown';
  const start = Number(m[1]) * 60 + Number(m[2]);
  let end = Number(m[4]) * 60 + Number(m[5]);
  if (
    Number(m[1]) > 23 ||
    Number(m[4]) > 47 ||
    Number(m[2]) > 59 ||
    Number(m[5]) > 59
  )
    return 'unknown';
  if (m[3] && end < 1440) end += 1440;
  if (end === start) return 'unknown';
  if (end < start) end += 1440;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const minute =
    Number(parts.find((x) => x.type === 'hour')!.value) * 60 +
    Number(parts.find((x) => x.type === 'minute')!.value);
  return (minute >= start && minute < end) ||
    (minute + 1440 >= start && minute + 1440 < end)
    ? 'open'
    : 'closed';
}
export function statusText(s: OpenStatus) {
  return s === 'open'
    ? '개방시간 내'
    : s === 'closed'
      ? '개방시간 아님'
      : '개방시간 확인 필요';
}
export function gateText(p: Restroom) {
  return p.category !== 'subway'
    ? p.access
    : p.gate === '외부'
      ? '개찰구 밖'
      : p.gate === '내부'
        ? '개찰구 안'
        : '개찰구 확인 필요';
}
export function distance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const r = Math.PI / 180;
  const dlat = (b.lat - a.lat) * r,
    dlng = (b.lng - a.lng) * r;
  return (
    12742000 *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(
          Math.sin(dlat / 2) ** 2 +
            Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dlng / 2) ** 2,
        ),
      ),
    )
  );
}
export function routeLinks(p: Restroom, appUrl: string) {
  const name = p.category === 'subway' ? `${p.name} ${p.line} 화장실` : p.name;
  const q = new URLSearchParams({
    dlat: String(p.lat),
    dlng: String(p.lng),
    dname: name,
    appname: appUrl,
  });
  const tq = new URLSearchParams({
    goalname: name,
    goalx: String(p.lng),
    goaly: String(p.lat),
    rGoName: name,
    rGoX: String(p.lng),
    rGoY: String(p.lat),
  });
  return {
    kakao: `https://map.kakao.com/link/to/${encodeURIComponent(name)},${p.lat},${p.lng}`,
    naver: `nmap://route/walk?${q}`,
    naverAndroid: `intent://route/walk?${q}#Intent;scheme=nmap;package=com.nhn.android.nmap;end`,
    naverWeb: `https://map.naver.com/v5/search/${encodeURIComponent(p.address + ' ' + p.name)}`,
    tmap: `tmap://route?${tq}`,
    tmapAndroid: `intent://route?${tq}#Intent;scheme=tmap;package=com.skt.tmap.ku;end`,
  };
}

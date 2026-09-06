import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openingStatus, distance, routeLinks } from '../lib/restrooms.ts';
const at = (s) => new Date(s);
assert.equal(
  openingStatus('05:00~24:00', at('2026-09-06T04:59:00+09:00')),
  'closed',
);
assert.equal(
  openingStatus('05:00~24:00', at('2026-09-06T05:00:00+09:00')),
  'open',
);
assert.equal(
  openingStatus('정시(09:00~18:00)', at('2026-09-06T18:00:00+09:00')),
  'closed',
);
assert.equal(
  openingStatus('상시(24시간)', at('2026-09-06T02:00:00+09:00')),
  'open',
);
assert.equal(
  openingStatus('기타 · 05:00~익일01:00', at('2026-09-06T00:59:00+09:00')),
  'open',
);
assert.equal(
  openingStatus('기타 · 05:00~익일01:00', at('2026-09-06T01:00:00+09:00')),
  'closed',
);
assert.equal(
  openingStatus('기타 · 05:00~24:30', at('2026-09-06T00:15:00+09:00')),
  'open',
);
for (const h of [
  '정시(영업시작~종료)',
  '정시(09:00~18:00,평일)',
  '기타 · 06::00~23:00',
  '상시(24시간) · 정시(영업시작~종료)',
  '기타 · 3월~10월 10:00~21:00',
  '개방시간 미기재',
])
  assert.equal(openingStatus(h, new Date()), 'unknown', h);
assert.equal(openingStatus('05:00~24:00', null), 'unknown');
const data = JSON.parse(
  fs.readFileSync(new URL('../app/toilets.json', import.meta.url)),
);
assert.equal(data.length, 4665);
assert.equal(new Set(data.map((p) => p.id)).size, data.length);
assert.equal(data.filter((p) => p.category === 'public').length, 4093);
assert.equal(
  data.filter((p) => p.source === 'metro' || p.source === 'merged').length,
  284,
);
assert(
  data.every(
    (p) => p.lat > 37.4 && p.lat < 37.72 && p.lng > 126.7 && p.lng < 127.2,
  ),
);
const destination = {
  ...data[0],
  name: '시청 & 공원 #1',
  lat: 37.5663,
  lng: 126.9779,
};
const links = routeLinks(
  destination,
  'https://seoul-restroom-now.lukekjy13.chatgpt.site',
);
for (const k of ['naver', 'naverAndroid']) {
  const u = new URL(links[k]);
  assert.equal(Number(u.searchParams.get('dlat')), 37.5663);
  assert.equal(Number(u.searchParams.get('dlng')), 126.9779);
  assert(u.searchParams.get('appname'));
}
const t = new URL(links.tmap);
assert.equal(Number(t.searchParams.get('goalx')), 126.9779);
assert.equal(Number(t.searchParams.get('goaly')), 37.5663);
assert.equal(t.searchParams.get('goalname'), t.searchParams.get('rGoName'));
assert(!links.kakao.includes('#1'));
assert.equal(distance(destination, destination), 0);
assert(
  distance(destination, { lat: 37.5673, lng: 126.9779 }) > 110 &&
    distance(destination, { lat: 37.5673, lng: 126.9779 }) < 112,
);
console.log(
  'Validated Seoul data coverage, unique IDs, time boundaries, overnight hours, unknown schedules, three map-link coordinates and name encoding.',
);

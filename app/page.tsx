'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  MapPin,
  LocateFixed,
  Search,
  ArrowUpRight,
  Clock,
  Accessibility,
  Baby,
  TrainFront,
  ArrowRight,
  Toilet,
  Info,
  Phone,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import rawRecords from './toilets.json';
import {
  Restroom,
  openingStatus,
  statusText,
  gateText,
  distance,
  routeLinks,
} from '@/lib/restrooms';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
const records = rawRecords as Restroom[];
import 'leaflet/dist/leaflet.css';
const origin = { lat: 37.5663, lng: 126.9779 };
function meters(n: number) {
  return n < 1000
    ? Math.round(n / 10) * 10 + 'm'
    : (n / 1000).toFixed(1) + 'km';
}
export default function Home() {
  const [query, setQuery] = useState(''),
    [openOnly, setOpenOnly] = useState(false),
    [outside, setOutside] = useState(false),
    [baby, setBaby] = useState(false),
    [child, setChild] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [center, setCenter] = useState(origin),
    [located, setLocated] = useState(false),
    [message, setMessage] = useState(''),
    [now, setNow] = useState<Date | null>(null),
    [accessible, setAccessible] = useState(false),
    [limit, setLimit] = useState(60),
    [provider, setProvider] = useState<'naver' | 'tmap' | null>(null),
    [platform, setPlatform] = useState('desktop'),
    [appUrl, setAppUrl] = useState(
      'https://seoul-restroom-now.lukekjy13.chatgpt.site',
    ),
    [mapError, setMapError] = useState(false);
  const mapEl = useRef<HTMLDivElement>(null),
    map = useRef<any>(null),
    layer = useRef<any>(null),
    L = useRef<any>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    setPlatform(
      /Android/i.test(navigator.userAgent)
        ? 'android'
        : /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? 'ios'
          : 'desktop',
    );
    setAppUrl(window.location.origin);
    const i = setInterval(tick, 60000);
    return () => clearInterval(i);
  }, []);
  const results = useMemo(
    () =>
      records
        .filter(
          (p) =>
            (p.name + p.address + p.line + p.facility).includes(query.trim()) &&
            (!outside || p.category !== 'subway' || p.gate === '외부') &&
            (!baby || p.baby === true) &&
            (!child || p.child === true) &&
            (!accessible || p.accessible === true) &&
            (!openOnly || openingStatus(p.hours, now) === 'open'),
        )
        .map((p) => ({ ...p, distance: distance(center, p) }))
        .sort((a, b) => a.distance - b.distance),
    [query, outside, baby, child, accessible, openOnly, now, center],
  );
  useEffect(
    () => setLimit(60),
    [query, outside, baby, child, accessible, openOnly],
  );
  const active = results.find((p) => p.id === selected) ?? results[0];
  const links = active ? routeLinks(active, appUrl) : null;
  const currentResults = useRef(results);
  currentResults.current = results;
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const register = (tool: unknown) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: controller.signal }),
        ).catch(() => {});
      } catch {}
    };
    register({
      name: 'filter_restrooms',
      title: '화장실 검색',
      description:
        '역명 또는 주소와 이용 조건으로 화면의 화장실 목록과 지도를 필터링합니다. 생략한 필터는 초기화합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          openHoursOnly: { type: 'boolean' },
          outsideGates: { type: 'boolean' },
          changingTable: { type: 'boolean' },
          childToilet: { type: 'boolean' },
          accessible: { type: 'boolean' },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input: unknown) => {
        if (!input || typeof input !== 'object' || Array.isArray(input))
          throw new Error('검색 조건 객체가 필요합니다.');
        const v = input as Record<string, unknown>;
        const keys = [
          'query',
          'openHoursOnly',
          'outsideGates',
          'changingTable',
          'childToilet',
          'accessible',
        ];
        if (
          Object.keys(v).some((k) => !keys.includes(k)) ||
          (v.query !== undefined && typeof v.query !== 'string') ||
          keys
            .slice(1)
            .some((k) => v[k] !== undefined && typeof v[k] !== 'boolean')
        )
          throw new Error('잘못된 검색 조건입니다.');
        flushSync(() => {
          setQuery((v.query as string) || '');
          setOpenOnly(v.openHoursOnly === true);
          setOutside(v.outsideGates === true);
          setBaby(v.changingTable === true);
          setChild(v.childToilet === true);
          setAccessible(v.accessible === true);
          setSelected(null);
        });
        return {
          count: currentResults.current.length,
          results: currentResults.current
            .slice(0, 10)
            .map((p) => ({
              id: p.id,
              name: p.name,
              line: p.line,
              distanceMeters: Math.round(p.distance),
              hours: p.hours,
              gate: p.gate,
            })),
        };
      },
    });
    register({
      name: 'select_restroom',
      title: '화장실 상세 보기',
      description:
        '현재 검색 결과의 화장실을 선택해 지도와 상세 정보를 표시합니다. 길찾기를 실행하지 않습니다.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input: unknown) => {
        if (
          !input ||
          typeof input !== 'object' ||
          Array.isArray(input) ||
          Object.keys(input).some((k) => k !== 'id') ||
          typeof (input as { id?: unknown }).id !== 'string'
        )
          throw new Error('화장실 id가 필요합니다.');
        const p = currentResults.current.find(
          (p) => p.id === (input as { id: string }).id,
        );
        if (!p) throw new Error('현재 검색 결과에 없는 화장실입니다.');
        flushSync(() => setSelected(p.id));
        return {
          id: p.id,
          name: p.name,
          detail: p.detail,
          address: p.address,
          hours: p.hours,
          gate: p.gate,
        };
      },
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let disposed = false;
    import('leaflet')
      .then((lib) => {
        if (disposed || !mapEl.current) return;
        L.current = lib;
        map.current = lib
          .map(mapEl.current, { zoomControl: false, preferCanvas: true })
          .setView([origin.lat, origin.lng], 14);
        lib.control.zoom({ position: 'bottomright' }).addTo(map.current);
        lib
          .tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
          })
          .on('tileerror', () => setMapError(true))
          .addTo(map.current);
        layer.current = lib.layerGroup().addTo(map.current);
        setReady(true);
      })
      .catch(() => setMapError(true));
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ready) return;
    layer.current.clearLayers();
    results.forEach((p) => {
      const chosen = p.id === active?.id;
      const color = p.category === 'subway' ? '#007963' : '#3478ad';
      const marker = chosen
        ? L.current.marker([p.lat, p.lng], {
            icon: L.current.divIcon({
              className: 'pin-wrap',
              html: '<span class="map-pin chosen"><b>WC</b></span>',
              iconSize: [40, 40],
              iconAnchor: [20, 40],
            }),
            title: p.name,
            keyboard: true,
          })
        : L.current.circleMarker([p.lat, p.lng], {
            radius: 7,
            color: '#fff',
            weight: 2,
            fillColor: color,
            fillOpacity: 0.9,
          });
      marker.on('click', () => setSelected(p.id)).addTo(layer.current);
    });
    if (located)
      L.current
        .circleMarker([center.lat, center.lng], {
          radius: 8,
          color: '#fff',
          weight: 3,
          fillColor: '#2563eb',
          fillOpacity: 1,
        })
        .addTo(layer.current);
  }, [ready, results, active?.id, located, center]);
  useEffect(() => {
    if (ready && active) map.current.panTo([active.lat, active.lng]);
  }, [ready, active?.id]);
  function locate() {
    if (!navigator.geolocation) {
      setMessage(
        '이 브라우저에서는 위치를 확인할 수 없어요. 역명으로 검색해 주세요.',
      );
      return;
    }
    setMessage('현재 위치를 확인하고 있어요…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCenter(c);
        setLocated(true);
        setSelected(null);
        setMessage('현재 위치 기준으로 가까운 순서예요.');
      },
      () =>
        setMessage(
          '위치 권한을 확인하거나 역명으로 검색해 주세요. 현재는 시청 기준이에요.',
        ),
      { timeout: 10000, maximumAge: 60000 },
    );
  }
  function clear() {
    setQuery('');
    setOpenOnly(false);
    setOutside(false);
    setBaby(false);
    setChild(false);
    setAccessible(false);
  }
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">
            <Toilet size={24} />
          </span>
          <span>
            급할 때 화장실<span className="brand-sub">SEOUL RESTROOM MAP</span>
          </span>
        </a>
        <span className="edition">
          서울 화장실 <b>{records.length.toLocaleString()}건</b>
        </span>
      </header>
      <section className="workspace">
        <aside className="finder">
          <div className="finder-top">
            <span className="eyebrow">가까운 곳부터, 빠르게</span>
            <h1>화장실이 급할 땐.</h1>
            <p>위치와 이용 조건을 한눈에 확인하세요.</p>
            <div className="searchbox">
              <Search size={20} />
              <input
                aria-label="장소·역명·주소 검색"
                placeholder="장소·역명·주소 검색"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="검색어 지우기">
                  ×
                </button>
              )}
            </div>
            <button className="locate" onClick={locate}>
              <LocateFixed size={19} />내 위치에서 찾기
              <ArrowRight size={18} />
            </button>
            <div className="filter-row">
              {[
                { label: '개방시간 내', v: openOnly, f: setOpenOnly },
                { label: '개찰구 안 제외', v: outside, f: setOutside },
                { label: '장애인용', v: accessible, f: setAccessible },
                { label: '기저귀교환대', v: baby, f: setBaby },
                { label: '유아용 변기', v: child, f: setChild },
              ].map((x) => (
                <label className={'filter ' + (x.v ? 'on' : '')} key={x.label}>
                  <Checkbox checked={x.v} onCheckedChange={(v) => x.f(!!v)} />
                  {x.label}
                </label>
              ))}
            </div>
            <p className="status" role="status">
              {message || '위치 설정 전 · 서울시청 기준 거리순'}
            </p>
          </div>
          <div className="results-head">
            <h2>
              가까운 화장실 <span>{results.length}</span>
            </h2>
            <span>직선거리 기준</span>
          </div>
          <div className="results">
            {results.length === 0 ? (
              <Empty>
                <EmptyTitle>조건에 맞는 화장실이 없어요</EmptyTitle>
                <EmptyDescription>
                  검색어와 필터를 바꿔보세요. 개방시간이나 편의시설이 미기재된
                  곳은 해당 필터에서 제외됩니다.
                </EmptyDescription>
                <button className="reset" onClick={clear}>
                  필터 초기화
                </button>
              </Empty>
            ) : (
              results.slice(0, limit).map((p) => (
                <button
                  key={p.id}
                  className={'result ' + (p.id === active?.id ? 'active' : '')}
                  onClick={() => setSelected(p.id)}
                >
                  <div className="result-title">
                    <span className="station-icon">
                      {p.category === 'subway' ? (
                        <TrainFront size={19} />
                      ) : (
                        <Toilet size={19} />
                      )}
                    </span>
                    <h3>
                      {p.name} <span>{p.line || p.facility}</span>
                    </h3>
                    <b>{meters(p.distance)}</b>
                  </div>
                  <p className="place-detail">{p.detail || p.address}</p>
                  <div className="tags">
                    <span className={openingStatus(p.hours, now)}>
                      <i />
                      {statusText(openingStatus(p.hours, now))}
                    </span>
                    <span>{gateText(p)}</span>
                    {p.baby && (
                      <span>
                        <Baby size={14} />
                        교환대
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
            {results.length > limit && (
              <button
                className="load-more"
                onClick={() => setLimit((n) => n + 60)}
              >
                가까운 순으로 60건 더 보기
              </button>
            )}
          </div>
          <footer className="source">
            <Info size={15} />
            <span>
              <a
                href="https://data.seoul.go.kr/dataList/OA-22586/S/1/datasetView.do"
                target="_blank"
                rel="noreferrer"
              >
                서울시 공중화장실
              </a>{' '}
              ·{' '}
              <a
                href="https://www.data.go.kr/data/15118705/fileData.do"
                target="_blank"
                rel="noreferrer"
              >
                서울교통공사
              </a>
              <br />
              2026.09.06 수집 · 등록정보 기준 · 현장과 다를 수 있음
            </span>
          </footer>
        </aside>
        <section className="map-section" aria-label="화장실 지도">
          <div ref={mapEl} className="map-canvas" />
          <div className="map-badge">
            <span className="live-dot" />
            서울 화장실 통합 지도
          </div>
          {mapError && (
            <div className="map-warning" role="status">
              지도를 불러오지 못했어요. 목록에서 위치를 확인하거나 길찾기를
              이용해 주세요.
            </div>
          )}
          {active && (
            <article className="detail-card">
              <div className="detail-top">
                <span className="detail-kicker">
                  <Toilet size={16} />
                  {active.category === 'subway'
                    ? '지하철 화장실'
                    : '공공·개방 화장실'}
                </span>
                <span className="line-chip">
                  {active.line || active.facility}
                </span>
              </div>
              <h2>
                {active.name} <span>{meters(active.distance)}</span>
              </h2>
              <p className="detail-location">
                <MapPin size={17} />
                {active.detail || active.address}
              </p>
              <div className="detail-facts">
                <span>
                  <Clock size={16} />
                  {active.hours}
                </span>
                <span>
                  <TrainFront size={16} />
                  {gateText(active)}
                </span>
                <span>
                  <Baby size={16} />
                  교환대 {active.baby === true ? '있음' : '미기재'}
                </span>
                <span>
                  <Accessibility size={16} />
                  장애인용 {active.accessible === true ? '있음' : '미기재'}
                </span>
              </div>
              <p className="address">
                {active.address}
                {active.exit ? ' · ' + active.exit + '번 출구 인근' : ''}
              </p>
              <div className="route-choices" aria-label="길찾기 앱 선택">
                <a
                  className="route-button kakao"
                  href={links!.kakao}
                  target="_blank"
                  rel="noreferrer"
                >
                  카카오맵
                  <ArrowUpRight size={16} />
                </a>
                <button
                  className="route-button naver"
                  onClick={() => setProvider('naver')}
                >
                  네이버지도
                  <ArrowUpRight size={16} />
                </button>
                <button
                  className="route-button tmap"
                  onClick={() => setProvider('tmap')}
                >
                  T맵
                  <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="source-detail">
                <span>
                  {active.source === 'seoul'
                    ? '서울시 · 2026.09.06 수집'
                    : active.source === 'merged'
                      ? '서울시 + 서울교통공사 · 상세정보 2026.02.12 기준'
                      : '서울교통공사 · 2026.02.12 기준'}
                </span>
                {active.phone && (
                  <a href={'tel:' + active.phone.replace(/[^\d+-]/g, '')}>
                    <Phone size={14} />
                    전화 확인
                  </a>
                )}
              </div>
              <p className="note">
                <Info size={14} />
                등록된 시간 기준이며 실제 개방·고장 여부는 다를 수 있어요.
                건물·역 좌표와 실제 화장실 입구는 다를 수 있어요.
              </p>
            </article>
          )}
        </section>
      </section>
      <Dialog
        open={provider !== null}
        onOpenChange={(v) => {
          if (!v) setProvider(null);
        }}
      >
        <DialogContent className="route-dialog">
          <DialogTitle>
            {provider === 'naver'
              ? '네이버지도 도보 길찾기'
              : 'T맵 자동차 길찾기'}
          </DialogTitle>
          <DialogDescription>
            {active?.name}을 목적지로 연결합니다. 휴대폰에 해당 지도 앱이
            설치되어 있어야 해요.
          </DialogDescription>
          {links && (
            <>
              <a
                className="directions"
                href={
                  provider === 'naver'
                    ? platform === 'android'
                      ? links.naverAndroid
                      : links.naver
                    : platform === 'android'
                      ? links.tmapAndroid
                      : links.tmap
                }
              >
                지도 앱으로 길찾기
                <ArrowUpRight size={18} />
              </a>
              {provider === 'naver' && (
                <a
                  className="web-fallback"
                  target="_blank"
                  rel="noreferrer"
                  href={links.naverWeb}
                >
                  앱 없이 네이버지도 웹에서 장소 찾기 ↗
                </a>
              )}
              <p className="app-help">
                {platform === 'desktop'
                  ? '앱 길찾기는 휴대폰에서 이용해 주세요. '
                  : ''}
                앱이 열리지 않으면 설치 여부를 확인하고 Safari 또는 Chrome에서
                다시 시도해 주세요.
              </p>
              <div className="store-links">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={
                    provider === 'naver'
                      ? 'https://apps.apple.com/app/id311867728'
                      : 'https://apps.apple.com/app/id431589174'
                  }
                >
                  App Store
                </a>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={
                    provider === 'naver'
                      ? 'https://play.google.com/store/apps/details?id=com.nhn.android.nmap'
                      : 'https://play.google.com/store/apps/details?id=com.skt.tmap.ku'
                  }
                >
                  Google Play
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

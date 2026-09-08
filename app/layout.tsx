import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '급똥맵 | 서울 화장실 지도',
  description:
    '서울 공공·개방 화장실과 지하철 화장실 통합 지도. 개방시간과 편의시설을 확인하고 카카오맵·네이버지도·T맵으로 길찾기하세요.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

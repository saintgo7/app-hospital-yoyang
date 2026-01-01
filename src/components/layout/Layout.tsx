import { type FC, type ReactNode } from 'react'
import Head from 'next/head'
import { Header } from './Header'
import { Footer } from './Footer'

interface LayoutProps {
  children: ReactNode
  title?: string
  description?: string
  hideHeader?: boolean
  hideFooter?: boolean
}

/**
 * 기본 레이아웃 컴포넌트
 * @description 헤더, 푸터, 메타 태그를 포함한 페이지 래퍼
 */
export const Layout: FC<LayoutProps> = ({
  children,
  title = '케어매치',
  description = '요양병원·요양원 간병인 구인구직 플랫폼',
  hideHeader = false,
  hideFooter = false,
}) => {
  const fullTitle = title === '케어매치' ? title : `${title} | 케어매치`

  return (
    <>
      <Head>
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Open Graph */}
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ko_KR" />

        {/* 접근성 */}
        <meta name="theme-color" content="#22c55e" />
      </Head>

      <div className="flex min-h-screen flex-col">
        {!hideHeader && <Header />}

        <main id="main-content" className="flex-1" role="main">
          {children}
        </main>

        {!hideFooter && <Footer />}
      </div>
    </>
  )
}

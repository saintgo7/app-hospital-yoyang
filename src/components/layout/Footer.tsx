import { type FC } from 'react'
import Link from 'next/link'

/**
 * 푸터 컴포넌트
 */
export const Footer: FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-muted/50">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 회사 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-primary">케어매치</h3>
            <p className="text-sm text-muted-foreground">
              요양병원·요양원 간병인과
              <br />
              보호자를 연결합니다.
            </p>
          </div>

          {/* 서비스 */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold">서비스</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/jobs"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  구인 정보
                </Link>
              </li>
              <li>
                <Link
                  href="/caregivers"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  간병인 찾기
                </Link>
              </li>
            </ul>
          </div>

          {/* 고객센터 */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold">고객센터</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="tel:1588-0000"
                  className="text-lg font-bold text-primary hover:underline"
                >
                  1588-0000
                </a>
              </li>
              <li className="text-sm text-muted-foreground">
                평일 09:00 - 18:00
              </li>
              <li className="text-sm text-muted-foreground">
                점심 12:00 - 13:00
              </li>
            </ul>
          </div>

          {/* 법적 정보 */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold">약관 및 정책</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  이용약관
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 저작권 */}
        <div className="mt-12 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} 케어매치. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

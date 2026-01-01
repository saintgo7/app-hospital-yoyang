/**
 * 카카오 알림톡 API 클라이언트
 * @description 카카오 비즈메시지 알림톡 발송 유틸리티
 */

const KAKAO_ALIMTALK_API_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send'

interface AlimtalkTemplate {
  templateCode: string
  variables: Record<string, string>
}

interface AlimtalkResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * 알림톡 메시지 템플릿
 */
export const ALIMTALK_TEMPLATES = {
  // 지원 알림 (보호자에게)
  APPLICATION_RECEIVED: 'application_received',
  // 지원 수락 알림 (간병인에게)
  APPLICATION_ACCEPTED: 'application_accepted',
  // 지원 거절 알림 (간병인에게)
  APPLICATION_REJECTED: 'application_rejected',
  // 새 메시지 알림
  NEW_MESSAGE: 'new_message',
  // 리뷰 요청 알림
  REVIEW_REQUEST: 'review_request',
} as const

type TemplateType = (typeof ALIMTALK_TEMPLATES)[keyof typeof ALIMTALK_TEMPLATES]

/**
 * 알림톡 발송 함수
 * @description 카카오 알림톡 API를 통해 메시지 발송
 */
export async function sendAlimtalk(
  phoneNumber: string,
  template: TemplateType,
  variables: Record<string, string>
): Promise<AlimtalkResult> {
  const apiKey = process.env.KAKAO_ALIMTALK_KEY

  if (!apiKey) {
    console.warn('Kakao Alimtalk API key is not configured')
    return {
      success: false,
      error: 'API key not configured',
    }
  }

  // 전화번호 형식 정규화 (010-1234-5678 -> 01012345678)
  const normalizedPhone = phoneNumber.replace(/-/g, '').replace(/\s/g, '')

  if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
    return {
      success: false,
      error: 'Invalid phone number format',
    }
  }

  try {
    // 실제 API 호출 (프로덕션에서 활성화)
    // 개발 환경에서는 로그만 출력
    if (process.env.NODE_ENV === 'production') {
      const response = await fetch(KAKAO_ALIMTALK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${apiKey}`,
        },
        body: new URLSearchParams({
          template_id: template,
          receiver_uuids: JSON.stringify([normalizedPhone]),
          ...variables,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Alimtalk send error:', error)
        return {
          success: false,
          error: 'Failed to send alimtalk',
        }
      }

      const data = await response.json()
      return {
        success: true,
        messageId: data.result_code,
      }
    } else {
      // 개발 환경에서는 로그만 출력
      console.log('[Alimtalk] Would send:', {
        phone: normalizedPhone,
        template,
        variables,
      })
      return {
        success: true,
        messageId: 'dev-' + Date.now(),
      }
    }
  } catch (error) {
    console.error('Alimtalk send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 알림톡 발송 헬퍼 함수들
 */
export const notifications = {
  /**
   * 새 지원 알림 (보호자에게)
   */
  async applicationReceived(
    guardianPhone: string,
    caregiverName: string,
    jobTitle: string
  ) {
    return sendAlimtalk(guardianPhone, ALIMTALK_TEMPLATES.APPLICATION_RECEIVED, {
      caregiverName,
      jobTitle,
    })
  },

  /**
   * 지원 수락 알림 (간병인에게)
   */
  async applicationAccepted(
    caregiverPhone: string,
    guardianName: string,
    jobTitle: string
  ) {
    return sendAlimtalk(caregiverPhone, ALIMTALK_TEMPLATES.APPLICATION_ACCEPTED, {
      guardianName,
      jobTitle,
    })
  },

  /**
   * 지원 거절 알림 (간병인에게)
   */
  async applicationRejected(
    caregiverPhone: string,
    jobTitle: string
  ) {
    return sendAlimtalk(caregiverPhone, ALIMTALK_TEMPLATES.APPLICATION_REJECTED, {
      jobTitle,
    })
  },

  /**
   * 새 메시지 알림
   */
  async newMessage(
    receiverPhone: string,
    senderName: string,
    messagePreview: string
  ) {
    return sendAlimtalk(receiverPhone, ALIMTALK_TEMPLATES.NEW_MESSAGE, {
      senderName,
      messagePreview: messagePreview.slice(0, 50),
    })
  },

  /**
   * 리뷰 요청 알림
   */
  async reviewRequest(
    userPhone: string,
    otherUserName: string,
    jobTitle: string
  ) {
    return sendAlimtalk(userPhone, ALIMTALK_TEMPLATES.REVIEW_REQUEST, {
      otherUserName,
      jobTitle,
    })
  },
}

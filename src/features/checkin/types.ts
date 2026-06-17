export type CheckinType = 'check_in' | 'check_out'

export type CheckinState = 'idle' | 'scanning' | 'processing' | 'success' | 'error' | 'manual_input'

export type CheckinErrorCode = 'invalid_token' | 'wrong_shift' | 'already_checked_in' | 'expired_token' | 'unknown'

export interface CheckinResponse {
  success: boolean
  status?: string
  late_minutes?: number
  message: string
  error?: CheckinErrorCode
}

export interface CheckinPayload {
  token: string
  employee_id: string
  type: CheckinType
}

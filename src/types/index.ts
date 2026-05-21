export interface WhoopProfile {
  id: string
  user_id: string
  whoop_user_id: number | null
  email: string | null
  first_name: string | null
  last_name: string | null
  height_meter: number | null
  weight_kilogram: number | null
  max_heart_rate: number | null
}

export interface WhoopCycle {
  id: string
  user_id: string
  whoop_cycle_id: number
  start_time: string
  end_time: string | null
  timezone: string | null
  score_state: string | null
  strain: number | null
  kilojoule: number | null
  average_heart_rate: number | null
  max_heart_rate: number | null
}

export interface WhoopRecovery {
  id: string
  user_id: string
  cycle_id: number
  sleep_id: number | null
  score_state: string | null
  recovery_score: number | null
  resting_heart_rate: number | null
  hrv_rmssd_milli: number | null
  spo2_percentage: number | null
  skin_temp_celsius: number | null
}

export interface WhoopSleep {
  id: string
  user_id: string
  whoop_sleep_id: number
  start_time: string
  end_time: string | null
  timezone: string | null
  nap: boolean
  score_state: string | null
  total_in_bed_time_milli: number | null
  total_awake_time_milli: number | null
  total_light_sleep_time_milli: number | null
  total_slow_wave_sleep_time_milli: number | null
  total_rem_sleep_time_milli: number | null
  total_no_data_time_milli: number | null
  sleep_cycle_count: number | null
  disturbance_count: number | null
  sleep_needed_baseline_milli: number | null
  sleep_needed_from_sleep_debt_milli: number | null
  sleep_needed_from_recent_strain_milli: number | null
  sleep_needed_from_recent_nap_milli: number | null
  respiratory_rate: number | null
  sleep_performance_percentage: number | null
  sleep_consistency_percentage: number | null
  sleep_efficiency_percentage: number | null
}

export interface WhoopWorkout {
  id: string
  user_id: string
  whoop_workout_id: number
  start_time: string
  end_time: string | null
  timezone: string | null
  sport_id: number | null
  score_state: string | null
  strain: number | null
  average_heart_rate: number | null
  max_heart_rate: number | null
  kilojoule: number | null
  percent_recorded: number | null
  zone_zero_milli: number | null
  zone_one_milli: number | null
  zone_two_milli: number | null
  zone_three_milli: number | null
  zone_four_milli: number | null
  zone_five_milli: number | null
}

export interface SyncStatus {
  user_id: string
  last_sync_at: string | null
  syncing: boolean
  sync_error: string | null
}

export type RecoveryLevel = 'green' | 'yellow' | 'red' | 'unknown'

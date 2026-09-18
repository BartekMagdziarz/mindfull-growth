import { organicIcons } from './organicIcons'

// Compatibility vocabulary: persisted IDs are resolved at render time, never rewritten.
const groups: Record<string, string> = {
  add: 'add_circle add_box add_task calendar_add_on',
  remove: 'do_not_disturb_on minimize',
  close: 'cancel disabled_by_default',
  check: 'task_alt done done_outline verified person_check check_circle heart_check cloud_done',
  task: 'assignment assignment_turned_in fact_check',
  checklist: 'list list_alt format_list_bulleted format_list_numbered table_rows view_list',
  subtasks: 'account_tree call_split conversion_path route alt_route steps step',
  calendar: 'calendar_month event event_available',
  today: 'today calendar_today wb_sunny sunny sun light_mode',
  week: 'calendar_view_week view_week',
  month: 'calendar_view_month date_range',
  year: 'event_upcoming',
  reschedule: 'edit_calendar update upcoming',
  time: 'schedule clock alarm hourglass_empty pending',
  timer: 'hourglass_top hourglass_bottom',
  consistency: 'event_repeat repeat routine cadence',
  habit: 'loop autorenew refresh replay sync change_circle cached restart_alt',
  priority:
    'star stars sparkles north_star auto_awesome auto_awesome_mosaic auto_awesome_motion priority hotel_class',
  goal: 'target gps_fixed ads_click adjust my_location',
  intention: 'flag outlined_flag',
  result: 'trophy emoji_events military_tech workspace_premium rocket_launch mountain_flag',
  tracker:
    'analytics bar_chart chart-bar show_chart monitoring query_stats timeline trending_up score insert_chart',
  rating: 'scale equalizer filter_5 tune',
  balance: 'pie_chart chart-pie donut_small data_usage compare_arrows sync_alt',
  journal: 'history_edu description article draft notes book auto_stories',
  reflection: 'rate_review edit_note comment add_comment chat_bubble mode_comment',
  conversation: 'chat forum sms messages message',
  emotion: 'mood face sentiment_satisfied sentiment_very_satisfied',
  thought: 'cloud cognition psychology psychology_alt brain',
  insight: 'lightbulb emoji_objects bulb',
  gratitude: 'celebration redeem balloon',
  values: 'explore near_me navigation gavel',
  needs: 'volunteer_activism heart_plus',
  boundaries: 'shield security verified_user front_hand pan_tool pan_tool_alt block',
  beliefs: 'foundation import_contacts',
  breath: 'air airwave waves mindfulness',
  'self-compassion': 'shield_with_heart heart_minus',
  anchor: 'bookmark bookmarks',
  exercise: 'self_improvement science spa extension',
  health: 'favorite heart health_and_safety monitor_heart sick medical_services',
  relations: 'group groups users diversity_1 diversity_2 diversity_3',
  family: 'supervisor_account child_friendly',
  home: 'house home-modern home-modern home_pin cottage',
  work: 'briefcase business_center forklift build construction handyman',
  finance:
    'account_balance account_balance_wallet paid payments money coins building-bank bank wallet credit_card attach_money',
  savings: 'pig-money',
  learning: 'school graduation-cap cap',
  creativity: 'palette brush paintbrush paint swatch',
  support: 'support_agent handshake support',
  growth: 'eco leaf potted_plant',
  rest: 'dark_mode bedtime moon moon_stars airline_seat_recline_normal weekend',
  sleep: 'bed hotel',
  walk: 'directions_walk',
  run: 'directions_run sprint',
  strength: 'fitness_center barbell accessibility_new',
  bike: 'pedal_bike directions_bike',
  food: 'restaurant tools-kitchen-2 kitchen lunch_dining',
  water: 'water_drop',
  reading: 'menu_book local_library library_books',
  music: 'music_note',
  nature: 'park forest tree',
  travel: 'map flight plane airplane travel_explore public language distance location_on',
  ritual: 'coffee local_cafe',
  energy:
    'bolt flash_on electric_bolt local_fire_department flame battery_full battery_charging_full',
  stress: 'thunderstorm storm crisis_alert earthquake cyclone landslide compress sos',
  memory: 'image photo_camera camera photo photo_library',
  household: 'cleaning_services',
  'digital-balance': 'computer device-laptop laptop smartphone device-mobile mobile mobile_off',
  'self-care': 'checkroom shirt',
  parenthood: 'child_care',
  gardening: 'local_florist flower',
  shopping: 'shopping_cart shopping_bag shopping_basket',
  commute: 'directions_car car train directions_bus',
  edit: 'edit_square draw pencil border_color',
  filter: 'filter_alt filter_list manage_search',
  more: 'more_horiz more_vert',
  delete: 'delete_forever delete_sweep',
  archive: 'inventory_2 inventory inbox',
  link: 'add_link hub',
  copy: 'content_copy file_copy',
  undo: 'keyboard_backspace reply settings_backup_restore',
  settings: 'settings_applications manage_accounts',
  help: 'question_mark live_help contact_support',
  pause: 'pause_circle',
  play: 'play_arrow play_circle start resume',
  lock: 'password key vpn_key key_off',
  back: 'arrow_back arrow_back_ios arrow_back_ios_new chevron_left arrow_left_alt arrow_left',
  forward: 'arrow_forward arrow_forward_ios chevron_right east arrow_right_alt arrow_right',
  up: 'expand_less keyboard_arrow_up arrow_drop_up unfold_less',
  down: 'expand_more keyboard_arrow_down arrow_drop_down unfold_more',
  profile: 'person account_circle account_box badge person_off',
  library: 'category interests',
  dashboard: 'grid_view apps space_dashboard overview view_sidebar',
  logout: 'exit_to_app',
  tag: 'label sell',
  pin: 'push_pin',
  attach: 'attach_file attachment',
  visible: 'visibility preview',
  hidden: 'visibility_off hide',
  export: 'download cloud_download save_alt',
  import: 'upload cloud_upload upload_file',
}
export const legacyIconAliases = Object.fromEntries(
  Object.entries(groups).flatMap(([id, names]) => names.split(' ').map(name => [name, id]))
)

const path = (d: string) => `<path d="${d}"/>`
const ring = 'M21 11Q20 2 11 3Q2 4 3 13q1 9 10 8q9-1 8-10Z'
const box = 'M6 3q6-1 12 0q3 0 3 3v12q0 3-3 3H6q-3 0-3-3V6q0-3 3-3Z'
const battery = (lines: number) =>
  path(
    'M4 7h15v12H3V9q0-2 1-2Z M19 11h3v4h-3' +
      Array.from({ length: lines }, (_, i) => ` M${6 + i * 3} 10v6`).join('')
  )
// Essential state/command distinctions that must survive the font-to-SVG migration.
export const interfaceGlyphs: Record<string, string> = {
  mail: path('M3 5q9-1 18 0v14H3Z M3 6l9 7 9-7'),
  code: path('M7 6l-5 6 5 6 M17 6l5 6-5 6 M14 3l-4 18'),
  check_box_outline_blank: path(box),
  check_box: path(box + ' M7 12l4 4 6-8'),
  radio_button_unchecked: path(ring),
  radio_button_checked:
    path(ring) + '<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',
  circle: '<circle cx="12" cy="12" r="8" fill="currentColor" stroke="none"/>',
  warning: path('M10 4q2-3 4 0l8 15q1 2-2 2H4q-3 0-2-2Z M12 8v6 M12 18h.1'),
  error: path(ring + ' M12 7v7 M12 18h.1'),
  done_all: path('M2 12l4 4 9-10 M10 14l2 2 9-10'),
  arrow_upward: path('M12 21V3 M5 10l7-7 7 7'),
  arrow_downward: path('M12 3v18 M5 14l7 7 7-7'),
  trending_down: path('M3 5l6 7 5-3 7 10 M15 19h6v-6'),
  trending_flat: path('M3 12h18 M16 7l5 5-5 5'),
  open_in_new: path('M12 4H6Q3 4 3 7v11q0 3 3 3h11q3 0 3-3v-6 M13 3h8v8 M10 14 21 3'),
  zoom_in: path('M17 9Q16 2 9 3Q2 4 3 11q1 7 8 6q7-1 6-8Z M16 16l5 5 M6 10h8 M10 6v8'),
  zoom_out: path('M17 9Q16 2 9 3Q2 4 3 11q1 7 8 6q7-1 6-8Z M16 16l5 5 M6 10h8'),
  zoom_out_map: path('M3 9V3h6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6'),
  zoom_in_map: path('M9 3v6H3 M15 3v6h6 M21 15h-6v6 M9 21v-6H3'),
  drag_indicator:
    '<g fill="currentColor" stroke="none"><circle cx="8" cy="5" r="1.4"/><circle cx="16" cy="5" r="1.4"/><circle cx="8" cy="12" r="1.4"/><circle cx="16" cy="12" r="1.4"/><circle cx="8" cy="19" r="1.4"/><circle cx="16" cy="19" r="1.4"/></g>',
  link_off: path('M3 3l18 18 M10 7l3-3q4-3 7 1q3 3-1 7l-2 2 M14 17l-2 2q-4 4-8 0q-3-3 0-7l2-2'),
  backspace: path('M8 5q6-.5 13 0v14H8l-6-7Z M11 9l6 6 M17 9l-6 6'),
  ink_eraser: path('M3 14 14 3q1-1 2 0l5 5q1 1 0 2L10 21H7Z M8 9l9 9 M10 21h11'),
  save: path('M4 3h13l4 4v14H3V5q0-2 1-2Z M7 3v6h9V3 M7 21v-7h10v7'),
  lock_open: path('M7 10V7q0-5 5-5q4 0 5 4 M5 10h14v9q0 2-3 2H8q-3 0-3-2Z M12 14v3'),
  login: path('M14 3h5q2 0 2 3v12q0 3-3 3h-4 M2 12h13 M10 7l5 5-5 5'),
  sentiment_neutral: path(ring + ' M8 9h.1 M16 9h.1 M8 15h8'),
  sentiment_dissatisfied: path(ring + ' M8 9h.1 M16 9h.1 M8 17q4-5 8 0'),
  sentiment_stressed: path(ring + ' M6 8l4 2 M18 8l-4 2 M8 17l2-2 2 2 2-2 2 2'),
  battery_low: path('M4 7h15v12H3V9q0-2 1-2Z M19 11h3v4h-3 M6 10v6'),
  battery_mid: path('M4 7h15v12H3V9q0-2 1-2Z M19 11h3v4h-3 M6 10v6 M10 10v6'),
  battery_0_bar: battery(0),
  battery_1_bar: battery(1),
  battery_2_bar: battery(2),
  battery_4_bar: battery(3),
  battery_full: battery(4),
  battery_charging_full: path('M4 7h4 M15 7h4v12H3V9 M19 11h3v4h-3 M13 3l-4 9h5l-3 9'),
  sentiment_very_dissatisfied: path(ring + ' M6 8l4 2 M18 8l-4 2 M7 18q5-7 10 0'),
  sentiment_calm: path(ring + ' M6 9q2 2 4 0 M14 9q2 2 4 0 M9 15q3 2 6 0'),
  sentiment_very_satisfied: path(ring + ' M6 9q2-3 4 0 M14 9q2-3 4 0 M7 14h10q-1 7-5 5q-4 0-5-5Z'),
  sprint:
    path('M3 6h5 M2 10h4 M13 8l-4 5 6 3 1 5 M9 13l-3 6H2 M13 8l4 4h4') +
    '<circle cx="16" cy="4" r="2"/>',
  rainy: path('M6 13q-4 0-3-4q0-4 4-3q1-5 6-3q5 0 5 4q5 0 3 6 M6 16l-2 4 M12 16l-2 4 M18 16l-2 4'),
  cyclone: path('M21 7Q15-1 7 4Q0 9 5 17q5 8 12 3q6-4 2-10q-4-6-9-2q-4 3-1 7q3 3 5 0'),
  airwave: path('M3 7q3-4 6 0t6 0t6 0 M3 15q3-4 6 0t6 0t6 0'),
  waves: path('M3 5q3-3 6 0t6 0t6 0 M3 12q3-3 6 0t6 0t6 0 M3 19q3-3 6 0t6 0t6 0'),
  person_off: path('M3 3l18 18 M10 4q7-2 6 5 M7 7q-2 6 5 6 M3 21q0-8 9-8 M17 15q4 2 4 6'),
  diversity_3:
    path('M3 21q0-6 4-6t4 6 M13 21q0-6 4-6t4 6 M8 11q4-5 8 0') +
    '<circle cx="7" cy="11" r="2"/><circle cx="17" cy="11" r="2"/><circle cx="12" cy="4" r="2"/>',
}
const additionalAliases: Record<string, string> = {
  close_fullscreen: 'zoom_in_map',
  open_in_full: 'zoom_out_map',
  arrow_outward: 'open_in_new',
  assignment_late: 'warning',
  priority_high: 'warning',
  sentiment_very_dissatisfied: 'sentiment_dissatisfied',
  sentiment_extremely_dissatisfied: 'sentiment_dissatisfied',
  heart_broken: 'sentiment_dissatisfied',
  sentiment_calm: 'sentiment_neutral',
  sentiment_frustrated: 'sentiment_stressed',
  battery_0_bar: 'battery_low',
  battery_1_bar: 'battery_low',
  battery_2_bar: 'battery_mid',
  battery_4_bar: 'battery_mid',
  thumb_up: 'check',
  thumb_down: 'sentiment_dissatisfied',
  event_busy: 'reschedule',
  touch_app: 'check',
  sync_problem: 'warning',
  rainy: 'stress',
  partly_cloudy_day: 'thought',
  wb_twilight: 'rest',
  landscape: 'hiking',
  all_inclusive: 'habit',
  blur_circular: 'inner-parts',
  blur_on: 'inner-parts',
  masks: 'inner-parts',
  sailing: 'travel',
  stream: 'tracker',
  filter_5: 'rating',
  unfold_less: 'up',
  unfold_more: 'down',
  north_star: 'priority',
}
const catalog = new Map(organicIcons.map(icon => [icon.id, icon.markup]))
export function resolveIcon(name?: string): { id: string; markup: string; fallback: boolean } {
  const source = name?.trim() ?? ''
  // New IDs are prefixed when persisted, avoiding clashes with historical IDs.
  const raw = source.startsWith('mg-') ? source.slice(3) : source
  const id =
    catalog.has(raw) || interfaceGlyphs[raw]
      ? raw
      : (additionalAliases[raw] ?? legacyIconAliases[raw] ?? raw)
  const markup = catalog.get(id) ?? interfaceGlyphs[id]
  return markup
    ? { id, markup, fallback: false }
    : { id: 'library', markup: catalog.get('library')!, fallback: true }
}

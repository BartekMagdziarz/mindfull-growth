import type { DexieMigration } from './types'
import { v01 } from './v01'
import { v02 } from './v02'
import { v03 } from './v03'
import { v04 } from './v04'
import { v05 } from './v05'
import { v06 } from './v06'
import { v07 } from './v07'
import { v08 } from './v08'
import { v09 } from './v09'
import { v10 } from './v10'
import { v11 } from './v11'
import { v12 } from './v12'
import { v13 } from './v13'
import { v14 } from './v14'
import { v15 } from './v15'
import { v16 } from './v16'
import { v17 } from './v17'
import { v18 } from './v18'
import { v19 } from './v19'
import { v20 } from './v20'
import { v21 } from './v21'
import { v22 } from './v22'
import { v23 } from './v23'
import { v24 } from './v24'
import { v25 } from './v25'
import { v26 } from './v26'
import { v27 } from './v27'
import { v28 } from './v28'
import { v29 } from './v29'
import { v30 } from './v30'
import { v31 } from './v31'
import { v32 } from './v32'
import { v33 } from './v33'
import { v34 } from './v34'

export type { DexieMigration } from './types'
export { V23_BACKFILL_SOURCES } from './v23'

/** Every schema version of the per-user database, oldest first. Append new versions at the end. */
export const USER_DATABASE_MIGRATIONS: readonly DexieMigration[] = [
  v01,
  v02,
  v03,
  v04,
  v05,
  v06,
  v07,
  v08,
  v09,
  v10,
  v11,
  v12,
  v13,
  v14,
  v15,
  v16,
  v17,
  v18,
  v19,
  v20,
  v21,
  v22,
  v23,
  v24,
  v25,
  v26,
  v27,
  v28,
  v29,
  v30,
  v31,
  v32,
  v33,
  v34,
]

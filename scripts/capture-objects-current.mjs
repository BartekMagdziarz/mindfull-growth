import { chromium } from '@playwright/test'
import { mkdirSync, rmSync } from 'node:fs'
const OUT = 'ux-lab/app/public/research/current/objects'
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })
await page.goto('http://127.0.0.1:5199/')
await page.waitForFunction(() => window.localStorage.getItem('mindfull_growth_verification_seed_version') !== null, null, { timeout: 90_000 })
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
async function titleOf(card, i) { const v = await card.locator('input[type=text]').first().inputValue().catch(() => ''); return slug(v || (await card.innerText()).split('\n')[0]) || `card-${i}` }
for (const family of ['habits', 'trackers', 'goals', 'priorities', 'intentions']) {
  await page.goto(`http://127.0.0.1:5199/objects/${family}`)
  await page.waitForSelector('article', { timeout: 30_000 }); await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/${family}-collapsed.png`, fullPage: true })
  const cards = page.locator('main article, article')
  const c = await cards.count()
  for (let i = 0; i < c; i++) {
    const card = cards.nth(i)
    const name = await titleOf(card, i)
    await card.hover().catch(() => {})
    if (family === 'habits' || family === 'trackers') {
      const btn = card.getByRole('button', { name: 'Pokaż szczegóły' }).first()
      if (await btn.count()) { await btn.click({ force: true }); await page.waitForTimeout(450) }
      await card.screenshot({ path: `${OUT}/${family}--${name}.png` }).catch(e => console.log('skip', name))
      const hide = card.getByRole('button', { name: 'Ukryj szczegóły' }).first()
      if (await hide.count()) await hide.click({ force: true })
    } else if (family === 'goals') {
      const krs = card.getByRole('button', { name: 'Pokaż szczegóły' })
      const k = await krs.count()
      if (!k) { await card.screenshot({ path: `${OUT}/${family}--${name}.png` }).catch(() => {}) }
      for (let j = 0; j < k; j++) {
        await card.hover().catch(() => {})
        await krs.nth(j).click({ force: true }); await page.waitForTimeout(450)
        await card.screenshot({ path: `${OUT}/${family}--${name}--kr${j + 1}.png` }).catch(() => {})
        const hide = card.getByRole('button', { name: 'Ukryj szczegóły' }).first()
        if (await hide.count()) await hide.click({ force: true })
      }
    } else if (family === 'intentions') {
      const edit = card.getByRole('button', { name: /Edytuj/ }).first()
      if (await edit.count()) { await edit.click({ force: true }); await page.waitForTimeout(400) }
      await card.screenshot({ path: `${OUT}/${family}--${name}.png` }).catch(() => {})
      const cancel = card.getByRole('button', { name: /Anuluj/ }).first()
      if (await cancel.count()) await cancel.click()
    } else {
      await card.screenshot({ path: `${OUT}/${family}--${name}.png` }).catch(() => {})
      if (i === 0) {
        const more = card.getByRole('button', { name: 'More actions' }).first()
        if (await more.count()) { await more.click({ force: true }); await page.waitForTimeout(200)
          const edit = page.getByRole('button', { name: /Edytuj/ }).first()
          if (await edit.count()) { await edit.click(); await page.waitForTimeout(600); await page.screenshot({ path: `${OUT}/${family}-edit.png`, fullPage: true }) }
        }
      }
    }
  }
  console.log(family, 'cards', c)
}
await browser.close()

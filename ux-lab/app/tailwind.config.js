import productConfig from '../../tailwind.config.js'

export default {
  ...productConfig,
  content: [
    './index.html',
    './src/**/*.{vue,js,ts}',
    '../../src/components/AppButton.vue',
    '../../src/components/AppCard.vue',
    '../../src/components/shared/AppIcon.vue',
  ],
}

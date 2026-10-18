import {defaultLocale} from './src/i18n/ui.mjs';
export default {
  name: 'Test Garden',
  defaultLocale,
  origin: process.env.SITE_URL || 'https://test-garden-first-edition.liuq75061.chatgpt.site',
  publicIndexing: process.env.SITE_PUBLIC !== 'false',
  description: 'Free quizzes for a fresh perspective on yourself. Explore communication, animal personality, work style, and things to try with friends.',
  contentDate: '2026-10-15',
};

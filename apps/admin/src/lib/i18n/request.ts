import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => ({
  locale: 'th',
  timeZone: 'Asia/Bangkok',
  formats: {
    dateTime: {
      date: {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        calendar: 'buddhist',
      },
      shortDate: {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
        calendar: 'buddhist',
      },
      dateTime: {
        dateStyle: 'medium',
        timeStyle: 'short',
        calendar: 'buddhist',
      },
      longDate: {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        calendar: 'buddhist',
      },
    },
  },
  messages: (await import('../../../messages/th.json')).default,
}));

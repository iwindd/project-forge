import { expect, test } from '@playwright/test';

test('Chat starts a native Session, streams a reply, and resumes history after refresh', async ({ page }) => {
  const browserErrors: string[] = [];
  const resourceErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') browserErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) resourceErrors.push(`${response.status()} ${response.url()}`);
  });

  await page.context().addCookies([
    { name: 'pf_session', value: 'controlled-e2e-session', domain: '127.0.0.1', path: '/' },
    { name: 'pf_e2e_scenario', value: 'chat', domain: '127.0.0.1', path: '/' },
  ]);
  await page.setViewportSize({ width: 1180, height: 820 });

  await page.goto('/acme/chat');
  await expect(page.getByRole('button', { name: 'ยุบเมนูด้านข้าง' })).toBeVisible();
  await page.getByRole('button', { name: 'ยุบเมนูด้านข้าง' }).click();
  await expect(page.getByRole('button', { name: 'ขยายเมนูด้านข้าง' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Agent' })).toHaveValue('Shared Coder');
  await expect(page.getByText('เริ่มคุยกับ Shared Coder')).toBeVisible();

  await page.getByLabel('ข้อความ').fill('ทดสอบแชต');
  await page.getByRole('button', { name: 'ส่ง' }).click();
  await expect(page.getByText('รับทราบครับ: ทดสอบแชต', { exact: true }).last()).toBeVisible();
  await expect(page.locator('[class*="userMessageRow"]')).toHaveCount(1);

  await page.reload();
  await expect(page.getByText('รับทราบครับ: ทดสอบแชต', { exact: true }).last()).toBeVisible();
  await expect(page.locator('[class*="userMessageRow"]')).toHaveCount(1);
  await expect(page.getByText('ทดสอบแชต', { exact: true }).first()).toBeVisible();
  expect(resourceErrors).toEqual([]);
  expect(browserErrors).toEqual([]);
});

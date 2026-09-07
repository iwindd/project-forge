'use client';

import { Alert, Anchor, Button, Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconBrandGithub, IconGitBranch, IconInfoCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { githubLoginUrl } from '@/lib/api';

export function LoginCard() {
  const [error, setError] = useState('');

  useEffect(() => {
    const message = new URLSearchParams(window.location.search).get('error');
    if (message) setError(message);
  }, []);

  return (
    <main className='forge-auth-page'>
      <Card className='forge-auth-card' padding='xl' radius='lg'>
        <Stack gap='xl'>
          <Group gap='sm'>
            <ThemeIcon size={48} radius='md' variant='light' color='brandBlue'>
              <IconGitBranch size={27} stroke={1.8} />
            </ThemeIcon>
            <div>
              <Text fw={700} size='xl' lh={1.1} style={{ fontFamily: 'var(--font-prompt), sans-serif' }}>
                PROJECT FORGE
              </Text>
              <Text size='xs' c='dimmed'>
                private project workspace
              </Text>
            </div>
          </Group>
          <Stack gap='xs'>
            <Text size='sm' c='brandBlue' fw={700} tt='uppercase' lts={1.5}>
              GitHub-only access
            </Text>
            <Title order={1}>ยินดีต้อนรับ</Title>
            <Text c='dimmed'>เข้าสู่ระบบเพื่อจัดการโปรเจคส่วนตัวและเตรียม workspace สำหรับขั้นตอนถัดไป</Text>
          </Stack>
          {error ? (
            <Alert color='red' title='เข้าสู่ระบบไม่สำเร็จ' icon={<IconInfoCircle size={18} />}>
              {error}
            </Alert>
          ) : null}
          <Button component='a' href={githubLoginUrl()} size='lg' leftSection={<IconBrandGithub size={21} />} fullWidth>
            Continue with GitHub
          </Button>
          <Text size='sm' c='dimmed' ta='center'>
            ผู้ใช้ใหม่จะรอการอนุมัติจาก admin ก่อนเข้าใช้งาน
          </Text>
          <Anchor href='https://github.com' target='_blank' rel='noreferrer' size='xs' c='dimmed' ta='center'>
            ระบบใช้ GitHub เป็นช่องทางยืนยันตัวตนเท่านั้น
          </Anchor>
        </Stack>
      </Card>
    </main>
  );
}

import { Button, Center, Paper, Stack, Text, Title } from '@mantine/core'
import Link from 'next/link'

export function ForbiddenState({
  backHref
}: Readonly<{ backHref?: string }>) {
  return (
    <Center mih='60vh' p='xl'>
      <Paper
        component='section'
        aria-labelledby='forbidden-state-title'
        withBorder
        shadow='sm'
        radius='md'
        p='xl'
        maw={520}
        w='100%'
      >
        <Stack gap='sm' align='center' ta='center'>
          <Text c='red' fw={700} size='sm'>
            403 · ไม่มีสิทธิ์เข้าถึง
          </Text>
          <Title id='forbidden-state-title' order={2}>
            ไม่สามารถเปิดข้อมูลส่วนนี้ได้
          </Title>
          <Text c='dimmed'>
            บัญชีของคุณไม่มีสิทธิ์สำหรับข้อมูลนี้ และระบบจะไม่ส่งคุณกลับไปหน้าเข้าสู่ระบบ
          </Text>
          {backHref ? (
            <Button component={Link} href={backHref} variant='light'>
              กลับบัญชีของฉัน
            </Button>
          ) : null}
        </Stack>
      </Paper>
    </Center>
  )
}

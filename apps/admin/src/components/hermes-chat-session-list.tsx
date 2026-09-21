'use client';

import { ActionIcon, Group, Menu, ScrollArea, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { IconArchive, IconDots, IconMessageCircle2, IconPlus } from '@tabler/icons-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { z } from 'zod';
import type { HermesSessionSummary } from '@/lib/features/hermes-sessions/hermes-sessions-schemas';
import styles from './hermes-chat-workspace.module.css';

const renameSessionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'กรุณาระบุชื่อบทสนทนา')
    .max(200, 'ชื่อบทสนทนาต้องไม่เกิน 200 ตัวอักษร')
    .refine(
      (value) => ![...value].some((character) => (character.codePointAt(0) ?? 0) < 32),
      'ชื่อบทสนทนามีอักขระที่ไม่รองรับ',
    ),
});

type HermesChatSessionListProps = {
  sessions: HermesSessionSummary[];
  selectedSessionId: string | null;
  canCreateNewChat: boolean;
  newChatLoading: boolean;
  selectSessionAction: (session: HermesSessionSummary) => void;
  newChatAction: () => void;
  renameSessionAction: (sessionId: string, title: string) => Promise<boolean>;
  closeSessionAction: (session: HermesSessionSummary) => void;
};

export function HermesChatSessionList({
  sessions,
  selectedSessionId,
  canCreateNewChat,
  newChatLoading,
  selectSessionAction,
  newChatAction,
  renameSessionAction,
  closeSessionAction,
}: HermesChatSessionListProps) {
  const t = useTranslations('Chat');
  const format = useFormatter();
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const renameSubmittingRef = useRef(false);
  const form = useForm<{ title: string }>({
    initialValues: { title: '' },
    validate: schemaResolver(renameSessionSchema),
  });

  const beginRename = (session: HermesSessionSummary) => {
    setRenamingSessionId(session.id);
    form.setValues({ title: session.title || '' });
    form.resetDirty();
  };

  const cancelRename = () => {
    setRenamingSessionId(null);
    form.reset();
  };

  const submitRename = async () => {
    const sessionId = renamingSessionId;
    if (!sessionId || renameSubmittingRef.current) return;
    const validation = await form.validate();
    if (validation.hasErrors) return;

    renameSubmittingRef.current = true;
    try {
      const renamed = await renameSessionAction(sessionId, form.values.title);
      if (renamed) cancelRename();
    } finally {
      renameSubmittingRef.current = false;
    }
  };

  return (
    <aside className={styles.sessionsPane} aria-label={t('sessions')}>
      <Group justify='space-between' className={styles.sessionsHeader} wrap='nowrap'>
        <Text fw={600}>{t('sessions')}</Text>
        <Tooltip label={t('newChat')}>
          <ActionIcon
            aria-label={t('newChat')}
            variant='subtle'
            onClick={newChatAction}
            loading={newChatLoading}
            disabled={!canCreateNewChat}
          >
            <IconPlus size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <ScrollArea className={styles.sessionList} type='auto' offsetScrollbars>
        <Stack gap={4}>
          {sessions.map((session) => (
            <div
              className={`${styles.sessionItem} ${selectedSessionId === session.id ? styles.sessionItemActive : ''}`}
              key={session.id}
            >
              {renamingSessionId === session.id ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitRename();
                  }}
                >
                  <TextInput
                    autoFocus
                    size='xs'
                    {...form.getInputProps('title')}
                    onBlur={() => void submitRename()}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') cancelRename();
                    }}
                    aria-label={t('rename')}
                  />
                </form>
              ) : (
                <button type='button' className={styles.sessionButton} onClick={() => selectSessionAction(session)}>
                  <Group gap='xs' wrap='nowrap' align='flex-start'>
                    <IconMessageCircle2 size={16} className={styles.sessionIcon} />
                    <div className={styles.sessionText}>
                      <Text size='sm' lineClamp={1} fw={selectedSessionId === session.id ? 600 : 400}>
                        {session.title || t('untitled')}
                      </Text>
                      <Text size='xs' c='dimmed' lineClamp={1}>
                        {session.preview || formatSessionDate(format, session.startedAt)}
                      </Text>
                    </div>
                  </Group>
                </button>
              )}
              <Menu withinPortal position='bottom-end' shadow='sm'>
                <Menu.Target>
                  <ActionIcon aria-label={t('sessionActions')} variant='subtle' size='sm' className={styles.sessionMenu}>
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item onClick={() => beginRename(session)}>{t('rename')}</Menu.Item>
                  <Menu.Item color='red' leftSection={<IconArchive size={15} />} onClick={() => closeSessionAction(session)}>
                    {t('close')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </div>
          ))}
        </Stack>
      </ScrollArea>
    </aside>
  );
}

function formatSessionDate(format: ReturnType<typeof useFormatter>, value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : format.dateTime(date, 'shortDate');
}

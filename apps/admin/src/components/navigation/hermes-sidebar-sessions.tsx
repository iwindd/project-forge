'use client';

import { ActionIcon, Group, Menu, Stack, Text, TextInput } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { IconArchive, IconDots, IconMessageCircle2 } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { z } from 'zod';
import { useGetSharedAgentsQuery } from '@/lib/features/hermes-agents/hermes-agents-api';
import {
  useCloseHermesSessionMutation,
  useGetHermesSessionsQuery,
  useRenameHermesSessionMutation,
} from '@/lib/features/hermes-sessions/hermes-sessions-api';
import type { HermesSessionSummary } from '@/lib/features/hermes-sessions/hermes-sessions-schemas';
import { getPath } from '@/routes';
import { getHermesSessionDisplayTitle } from '../hermes-session-title';
import classes from './hermes-sidebar-sessions.module.css';

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

export function HermesSidebarSessions({ onNavigateAction }: { onNavigateAction?: () => void }) {
  const t = useTranslations('Chat');
  const pathname = usePathname();
  const router = useRouter();
  const {
    data: sessions = [],
    isLoading,
    isError,
  } = useGetHermesSessionsQuery(undefined, {
    refetchOnMountOrArgChange: 30,
  });
  const { data: agentRoster } = useGetSharedAgentsQuery(undefined, {
    refetchOnMountOrArgChange: 30,
  });
  const [renameSession] = useRenameHermesSessionMutation();
  const [closeSession] = useCloseHermesSessionMutation();
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const renameSubmittingRef = useRef(false);
  const form = useForm<{ title: string }>({
    initialValues: { title: '' },
    validate: schemaResolver(renameSessionSchema),
  });
  const agentNames = new Map((agentRoster?.agents ?? []).map((agent) => [agent.handle, agent.displayName]));

  const beginRename = (session: HermesSessionSummary) => {
    setMutationError(null);
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
      await renameSession({ sessionId, title: form.values.title.trim() }).unwrap();
      cancelRename();
    } catch {
      setMutationError(t('renameFailed'));
    } finally {
      renameSubmittingRef.current = false;
    }
  };

  const closeSessionAction = async (session: HermesSessionSummary) => {
    setMutationError(null);
    try {
      await closeSession(session.id).unwrap();
      if (pathname === getPath('hermes.chat.session', { sessionId: session.id })) {
        router.replace(getPath('hermes.chat'), { scroll: false });
      }
    } catch {
      setMutationError(t('closeFailed'));
    }
  };

  return (
    <section className={classes.sessionsSection} aria-label={t('sessions')}>
      <Text className={classes.sessionsHeading} size='xs' c='dimmed'>
        {t('sessions')}
      </Text>
      {isLoading ? (
        <Text className={classes.stateText} size='xs' c='dimmed'>
          {t('sessionsLoading')}
        </Text>
      ) : isError ? (
        <Text className={classes.stateText} size='xs' c='red'>
          {t('loadFailed')}
        </Text>
      ) : sessions.length === 0 ? (
        <Text className={classes.stateText} size='xs' c='dimmed'>
          {t('noSessions')}
        </Text>
      ) : (
        <Stack gap={3} className={classes.sessionList}>
          {sessions.map((session) => {
            const href = getPath('hermes.chat.session', { sessionId: session.id });
            const active = pathname === href;
            const agentName = agentNames.get(session.agentHandle) ?? session.agentHandle;
            const secondary = session.preview ? `${agentName} · ${session.preview}` : agentName;

            return (
              <div key={session.id} className={`${classes.sessionItem} ${active ? classes.sessionItemActive : ''}`}>
                {renamingSessionId === session.id ? (
                  <form
                    className={classes.renameForm}
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
                  <Link
                    href={href}
                    className={classes.sessionLink}
                    aria-current={active ? 'page' : undefined}
                    onClick={onNavigateAction}
                  >
                    <Group gap='xs' wrap='nowrap' align='flex-start'>
                      <IconMessageCircle2 size={15} className={classes.sessionIcon} />
                      <div className={classes.sessionText}>
                        <Text size='xs' lineClamp={1} fw={active ? 600 : 400}>
                          {getHermesSessionDisplayTitle(session, t('untitled'))}
                        </Text>
                        <Text size='xs' c='dimmed' lineClamp={1} title={secondary}>
                          {secondary}
                        </Text>
                      </div>
                    </Group>
                  </Link>
                )}
                <Menu withinPortal position='bottom-end' shadow='sm'>
                  <Menu.Target>
                    <ActionIcon
                      aria-label={`${t('sessionActions')}: ${getHermesSessionDisplayTitle(session, t('untitled'))}`}
                      variant='subtle'
                      size='sm'
                      className={classes.sessionMenu}
                    >
                      <IconDots size={15} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={() => beginRename(session)}>{t('rename')}</Menu.Item>
                    <Menu.Item
                      color='red'
                      leftSection={<IconArchive size={14} />}
                      onClick={() => void closeSessionAction(session)}
                    >
                      {t('close')}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </div>
            );
          })}
        </Stack>
      )}
      {mutationError ? (
        <Text className={classes.stateText} size='xs' c='red'>
          {mutationError}
        </Text>
      ) : null}
    </section>
  );
}

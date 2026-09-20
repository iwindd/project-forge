'use client';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  FileInput,
  Group,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getBrowserApiErrorMessage } from '@/lib/api/api';
import { useCreateSharedAgentMutation } from '@/lib/features/hermes-agents/hermes-agents-api';
import type { SharedAgentCreation, SharedAgentOptions } from '@/lib/features/hermes-agents/hermes-agents-schemas';
import { sharedAgentCreateFormSchema, type SharedAgentCreateFormValues } from './shared-agent-create-form-schema';

export function SharedAgentCreateForm({
  options,
  onCancelAction,
  onCreatedAction,
}: {
  options: SharedAgentOptions;
  onCancelAction: () => void;
  onCreatedAction: (result: SharedAgentCreation) => void;
}) {
  const t = useTranslations('SharedAgents');
  const [createSharedAgent, { isLoading }] = useCreateSharedAgentMutation();
  const [error, setError] = useState<string | null>(null);
  const [incomplete, setIncomplete] = useState<SharedAgentCreation | null>(null);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const firstProvider = options.models[0]?.provider ?? '';
  const firstModel = options.models[0]?.models[0] ?? '';
  const form = useForm<SharedAgentCreateFormValues>({
    initialValues: {
      handle: '',
      displayName: '',
      description: '',
      role: '',
      personality: '',
      provider: firstProvider,
      model: firstModel,
      skills: [],
      toolsets: [],
      confirmExpensiveModel: false,
      avatar: null,
    },
    validate: schemaResolver(sharedAgentCreateFormSchema),
    validateInputOnBlur: true,
  });

  const selectedProvider = options.models.find((model) => model.provider === form.values.provider) ?? null;
  const providerOptions = options.models.map((model) => ({ value: model.provider, label: model.name }));
  const modelOptions = selectedProvider?.models.map((model) => ({ value: model, label: model })) ?? [];

  const submit = async (values: SharedAgentCreateFormValues) => {
    setError(null);
    setIncomplete(null);
    try {
      const result = await createSharedAgent({
        ...values,
        avatar: values.avatar ? await fileToDataUrl(values.avatar) : null,
      }).unwrap();
      if (result.status === 'incomplete') {
        setIncomplete(result);
        setRequiresConfirmation(result.requiresConfirmation);
        onCreatedAction(result);
        return;
      }
      onCreatedAction(result);
      setRequiresConfirmation(false);
      form.reset();
    } catch (submitError) {
      setError(getBrowserApiErrorMessage(submitError, t('createFailed')));
    }
  };

  return (
    <Card withBorder radius='md' p='lg'>
      <Stack gap='md'>
        <div>
          <Text fw={600}>{t('createTitle')}</Text>
          <Text size='sm' c='dimmed'>
            {t('createDescription')}
          </Text>
        </div>

        <form onSubmit={form.onSubmit(submit)}>
          <Stack gap='md'>
            <Group grow align='flex-start'>
              <TextInput label={t('handle')} description={t('handleDescription')} {...form.getInputProps('handle')} />
              <TextInput label={t('displayName')} {...form.getInputProps('displayName')} />
            </Group>
            <TextInput label={t('role')} {...form.getInputProps('role')} />
            <Textarea
              label={t('description')}
              autosize
              minRows={2}
              maxRows={4}
              {...form.getInputProps('description')}
            />
            <Textarea
              label={t('personality')}
              description={t('personalityDescription')}
              autosize
              minRows={4}
              maxRows={10}
              {...form.getInputProps('personality')}
            />
            <Group grow align='flex-start'>
              <Select
                label={t('provider')}
                data={providerOptions}
                allowDeselect={false}
                disabled={providerOptions.length === 0}
                {...form.getInputProps('provider')}
                onChange={(provider) => {
                  form.setFieldValue('provider', provider ?? '');
                  const nextProvider = options.models.find((model) => model.provider === provider);
                  form.setFieldValue('model', nextProvider?.models[0] ?? '');
                }}
              />
              <Select
                label={t('modelField')}
                data={modelOptions}
                allowDeselect={false}
                disabled={modelOptions.length === 0}
                {...form.getInputProps('model')}
              />
            </Group>
            <MultiSelect
              label={t('skillsField')}
              data={options.skills.map((skill) => ({ value: skill, label: skill }))}
              searchable
              clearable
              {...form.getInputProps('skills')}
            />
            <MultiSelect
              label={t('toolsets')}
              data={options.toolsets.map((toolset) => ({
                value: toolset.name,
                label: `${toolset.label} (${toolset.toolCount})`,
              }))}
              searchable
              clearable
              {...form.getInputProps('toolsets')}
            />
            {requiresConfirmation ? (
              <Checkbox
                label={t('confirmModel')}
                description={t('confirmModelDescription')}
                {...form.getInputProps('confirmExpensiveModel', { type: 'checkbox' })}
              />
            ) : null}
            <FileInput
              id='shared-agent-avatar'
              label={t('avatar')}
              description={t('avatarDescription')}
              accept='image/png,image/jpeg,image/webp'
              clearable
              value={form.values.avatar}
              error={form.errors.avatar}
              onChange={(file) => form.setFieldValue('avatar', file)}
            />
            <Group justify='flex-end'>
              <Button type='button' variant='default' onClick={onCancelAction}>
                {t('cancelCreate')}
              </Button>
              <Button type='submit' loading={isLoading || form.submitting} disabled={options.models.length === 0}>
                {t('submitCreate')}
              </Button>
            </Group>
            {error ? <Alert color='red'>{error}</Alert> : null}
            {incomplete ? (
              <Alert color='orange' title={t('incompleteTitle')}>
                <Stack gap='xs'>
                  <Text size='sm'>{t('incompleteDescription')}</Text>
                  {failedSections(incomplete).map((section) => (
                    <Text key={section} size='sm'>
                      {t('sectionFailed', { section: t(`sections.${section}`) })}
                    </Text>
                  ))}
                </Stack>
              </Alert>
            ) : null}
          </Stack>
        </form>
      </Stack>
    </Card>
  );
}

function failedSections(result: SharedAgentCreation): string[] {
  return Object.entries(result.sections)
    .filter(([, section]) => section.status === 'failed')
    .map(([section]) => section);
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Avatar could not be read'));
    reader.readAsDataURL(file);
  });
}

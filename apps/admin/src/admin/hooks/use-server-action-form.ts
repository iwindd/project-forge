"use client";

import type { LooseKeys, UseFormReturnType } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState, useTransition } from "react";

type ValidationErrors = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

type ServerActionFormResult<TData> = {
  data?: TData;
  validationErrors?: ValidationErrors;
  serverError?: { message: string; fieldErrors?: Record<string, string> };
};

type ServerAction<TInput, TData> = (
  input: TInput,
) => Promise<ServerActionFormResult<TData>>;

type UseServerActionFormOptions<TInput extends Record<string, unknown>, TData> = {
  form: UseFormReturnType<TInput>;
  action: ServerAction<TInput, TData>;
  onSuccessAction: (data: TData) => void;
  onErrorAction?: () => void;
  successNotification?: {
    title: string;
    message: string;
  };
};

export function useServerActionForm<
  TInput extends Record<string, unknown>,
  TData,
>({
  form,
  action,
  onSuccessAction,
  onErrorAction,
  successNotification,
}: UseServerActionFormOptions<TInput, TData>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (values: TInput) => {
    setError(null);
    form.clearErrors();

    startTransition(async () => {
      const result = await action(values);

      if (result.validationErrors) {
        onErrorAction?.();
        setError(
          result.validationErrors.formErrors?.[0] ??
            "กรุณาตรวจสอบข้อมูลที่กรอก",
        );

        for (const [field, messages] of Object.entries(
          result.validationErrors.fieldErrors ?? {},
        )) {
          const message = messages?.[0];
          if (message) {
            form.setFieldError(field as LooseKeys<TInput>, message);
          }
        }
        return;
      }

      if (result.serverError || !result.data) {
        onErrorAction?.();
        for (const [field, message] of Object.entries(
          result.serverError?.fieldErrors ?? {},
        )) {
          form.setFieldError(field as LooseKeys<TInput>, message);
        }
        setError(result.serverError?.message ?? "ไม่สามารถบันทึกข้อมูลได้");
        return;
      }

      onSuccessAction(result.data);
      form.resetDirty();

      if (successNotification) {
        notifications.show({
          ...successNotification,
          color: "green",
        });
      }
    });
  };

  const clearError = () => setError(null);

  return { error, pending, submit, clearError };
}

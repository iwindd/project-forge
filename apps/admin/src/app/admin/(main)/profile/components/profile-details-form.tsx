"use client";

import { Alert, Button, Group, Stack, Textarea, TextInput } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useState } from "react";
import { z } from "zod";
import { getBrowserApiErrorMessage } from "@/lib/api/api";
import { useUpdateProfileMutation } from "@/lib/features/profile/profile-api";
import { ProfileEditCard } from "./profile-edit-card";
import { useProfile } from "./profile-context";

const profileDetailsFormSchema = z.object({
  bio: z.string().trim().max(1000, "แนะนำตัวต้องไม่เกิน 1000 ตัวอักษร"),
  timezone: z.string().trim().max(80, "เขตเวลาต้องไม่เกิน 80 ตัวอักษร"),
});

type ProfileDetailsFormValues = z.infer<typeof profileDetailsFormSchema>;

export function ProfileDetailsForm() {
  const { profile, updateProfile } = useProfile();
  const [updateProfileRequest, { isLoading: pending }] = useUpdateProfileMutation();
  const form = useForm<ProfileDetailsFormValues>({
    initialValues: {
      bio: profile.bio ?? "",
      timezone: profile.timezone ?? "",
    },
    validate: schemaResolver(profileDetailsFormSchema),
    validateInputOnBlur: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const save = async (values: ProfileDetailsFormValues) => {
    setError(null);
    setSuccess(null);
    try {
      const result = await updateProfileRequest({
        bio: values.bio || null,
        timezone: values.timezone || null,
      }).unwrap();
      const nextValues = {
        bio: result.profile.bio ?? "",
        timezone: result.profile.timezone ?? "",
      };
      updateProfile({
        ...profile,
        bio: nextValues.bio || null,
        timezone: nextValues.timezone || null,
        updatedAt: result.profile.updatedAt,
      });
      form.setValues(nextValues);
      form.setInitialValues(nextValues);
      form.resetDirty();
      setSuccess("บันทึกข้อมูลโปรไฟล์สำเร็จ");
    } catch (saveError) {
      setError(
        getBrowserApiErrorMessage(
          saveError,
          "ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้"
        )
      );
    }
  };

  return (
    <ProfileEditCard title="ข้อมูลโปรไฟล์" description="จัดการข้อมูลเพิ่มเติมที่แสดงในบัญชีของคุณ">
      <form onSubmit={form.onSubmit(save)}>
        <Stack gap="md">
          <Textarea label="แนะนำตัว" maxLength={1000} {...form.getInputProps("bio")} />
          <TextInput label="เขตเวลา" placeholder="Asia/Bangkok" maxLength={80} {...form.getInputProps("timezone")} />
          <Group>
            <Button type="submit" loading={pending || form.submitting} disabled={!form.isDirty()}>
              บันทึก
            </Button>
          </Group>
          {error ? <Alert color="red">{error}</Alert> : null}
          {success ? <Alert color="green">{success}</Alert> : null}
        </Stack>
      </form>
    </ProfileEditCard>
  );
}

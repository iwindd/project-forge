"use client";

import { Box, Slider } from "@mantine/core";
import {
  FONT_SCALE_DEFAULT,
  FONT_SCALE_OPTIONS,
  FONT_SCALE_STEP,
  setFontScale,
} from "../../features/layout/layout-slice";
import { useAppDispatch, useAppSelector } from "../../hooks";
import SettingGroup from "./setting-group";
import SettingSet from "./setting-set";

export default function FontGroup() {
  const dispatch = useAppDispatch();
  const fontScale = useAppSelector((state) => state.layout.fontScale);

  return (
    <SettingSet title="ขนาดตัวอักษร">
      <SettingGroup
        title="ขนาด"
        isDirty={fontScale !== FONT_SCALE_DEFAULT}
        onReset={() => dispatch(setFontScale(FONT_SCALE_DEFAULT))}
      >
        <Box px="xs" pt="xs" pb="md">
          <Slider
            min={FONT_SCALE_OPTIONS[0]}
            max={FONT_SCALE_OPTIONS[FONT_SCALE_OPTIONS.length - 1]}
            step={FONT_SCALE_STEP}
            value={fontScale}
            onChange={(value) => dispatch(setFontScale(value))}
            label={(value) => `${value.toFixed(1)}x`}
            marks={FONT_SCALE_OPTIONS.map((value) => ({ value, label: `${value.toFixed(1)}x` }))}
            styles={{ markLabel: { fontSize: 10 } }}
          />
        </Box>
      </SettingGroup>
    </SettingSet>
  );
}

import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => ({
  locale: "th",
  messages: (await import("../../messages/th.json")).default,
}));

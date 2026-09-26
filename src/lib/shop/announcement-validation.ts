import { z } from "zod";

export const announcementInputSchema = z.object({
  expectedVersion: z.number().int().positive(),
  announcementText: z.string().max(500, "Nội dung tối đa 500 ký tự.").transform(value => value.trim()),
  announcementEnabled: z.boolean(),
}).strict().refine(value => !value.announcementEnabled || value.announcementText.length > 0, {
  path: ["announcementText"], message: "Nhập nội dung trước khi bật chữ chạy.",
});
export type AnnouncementInput = z.output<typeof announcementInputSchema>;

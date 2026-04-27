import { z } from "zod";

export const TodoSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(500),
  completed: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
});
export type Todo = z.infer<typeof TodoSchema>;

export const TodoListSchema = z.array(TodoSchema);

export const CreateTodoSchema = z.object({
  text: z.string().trim().min(1).max(500),
});
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;

export const UpdateTodoSchema = z.object({
  completed: z.boolean(),
});
export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>;

export const TodoIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const HealthSchema = z.object({
  status: z.literal("ok"),
  db: z.enum(["ok", "down"]),
});
export type Health = z.infer<typeof HealthSchema>;

import { z } from "zod/v4";

export const TaskStatus = z.enum(["pending", "progress", "complete", "failed"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export interface TaskEntry {
  id: string;
  task: string;
  status: TaskStatus;
}

// Tool input schemas
export const CreatePlanInput = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      task: z.string(),
    })
  ),
});

export const UpdateTaskInput = z.object({
  id: z.string(),
  status: z.enum(["progress", "complete", "failed"]),
});

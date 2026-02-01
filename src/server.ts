import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  TaskEntry,
  TaskStore,
  TaskStoreListener,
  TasksMcpServer,
  CreatePlanInput,
  UpdateTaskInput,
  ResultInput,
} from "./types.js";

class TaskStoreImpl implements TaskStore {
  private tasks: TaskEntry[] = [];
  private result: string | null = null;
  private listeners = new Set<TaskStoreListener>();

  getTasks(): readonly TaskEntry[] {
    return this.tasks;
  }

  getResult(): string | null {
    return this.result;
  }

  _setResult(result: string) {
    this.result = result;
    this._notify();
  }

  onChange(listener: TaskStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _setTasks(tasks: TaskEntry[]) {
    this.tasks = tasks;
    this._notify();
  }

  _updateTask(id: string, status: TaskEntry["status"]): TaskEntry | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.status = status;
      this._notify();
    }
    return task;
  }

  private _notify() {
    for (const listener of this.listeners) {
      listener(this.tasks);
    }
  }
}

export function createTasksMCP(): TasksMcpServer {
  const store = new TaskStoreImpl();

  const server = new Server(
    { name: "tasks-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "create_plan",
        description: "Set the agent's task plan. Replaces any existing plan.",
        inputSchema: {
          type: "object" as const,
          properties: {
            tasks: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  id: { type: "string" as const },
                  task: { type: "string" as const },
                },
                required: ["id", "task"],
              },
            },
          },
          required: ["tasks"],
        },
      },
      {
        name: "show_plan",
        description: "Show the current task plan with statuses.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "result",
        description:
          "Submit the final answer, solution, or result of the main goal.",
        inputSchema: {
          type: "object" as const,
          properties: {
            result: {
              type: "string" as const,
              description:
                "The final answer, solution, or result of the main goal.",
            },
          },
          required: ["result"],
        },
      },
      {
        name: "update_task",
        description: "Update a task's status.",
        inputSchema: {
          type: "object" as const,
          properties: {
            id: { type: "string" as const },
            status: {
              type: "string" as const,
              enum: ["progress", "complete", "failed"],
            },
          },
          required: ["id", "status"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "create_plan": {
        const parsed = CreatePlanInput.parse(args);
        store._setTasks(
          parsed.tasks.map((t) => ({ ...t, status: "pending" as const }))
        );
        return {
          content: [
            {
              type: "text",
              text: `Plan created with ${store.getTasks().length} tasks.`,
            },
          ],
        };
      }

      case "show_plan": {
        return {
          content: [
            { type: "text", text: JSON.stringify(store.getTasks(), null, 2) },
          ],
        };
      }

      case "result": {
        const parsed = ResultInput.parse(args);
        store._setResult(parsed.result);
        return {
          content: [
            { type: "text", text: `Result submitted.` },
          ],
        };
      }

      case "update_task": {
        const parsed = UpdateTaskInput.parse(args);
        const task = store._updateTask(parsed.id, parsed.status);
        if (!task) {
          return {
            isError: true,
            content: [
              { type: "text", text: `Task not found: ${parsed.id}` },
            ],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `Task ${parsed.id} updated to ${parsed.status}.`,
            },
          ],
        };
      }

      default:
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
        };
    }
  });

  return { server, store };
}

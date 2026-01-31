#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TaskEntry, CreatePlanInput, UpdateTaskInput } from "./types.js";

// In-memory state
let tasks: TaskEntry[] = [];

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
      tasks = parsed.tasks.map((t) => ({ ...t, status: "pending" as const }));
      return {
        content: [
          { type: "text", text: `Plan created with ${tasks.length} tasks.` },
        ],
      };
    }

    case "show_plan": {
      return {
        content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
      };
    }

    case "update_task": {
      const parsed = UpdateTaskInput.parse(args);
      const task = tasks.find((t) => t.id === parsed.id);
      if (!task) {
        return {
          isError: true,
          content: [
            { type: "text", text: `Task not found: ${parsed.id}` },
          ],
        };
      }
      task.status = parsed.status;
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[tasks-mcp] Server running on stdio");
}

main().catch((error) => {
  console.error("[tasks-mcp] Fatal error:", error);
  process.exit(1);
});

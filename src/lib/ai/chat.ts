import OpenAI from "openai";
import { toolDefinitions, executeTool, type ToolResult, type Citation } from "./tools";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  citations?: Citation[];
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

const SYSTEM_PROMPT = `You are a helpful financial assistant for a Xero budgeting and forecasting application. You help the business owner analyze their financial data, understand spending patterns, and answer questions about their accounts.

You have access to tools that can query real financial data from their Xero account. When answering questions:

1. Use the available tools to get accurate data - don't make up numbers
2. Always cite your sources by referencing specific transactions or documents
3. Present financial data in clear, formatted tables when appropriate
4. Highlight any concerning trends or notable findings
5. Be concise but thorough

The user is the business owner, so you can be direct and assume they understand basic financial concepts.

Available data includes:
- Bank transactions (24 months of history)
- Invoices (accounts receivable)
- Bills (accounts payable)
- Chart of accounts
- Supplier and customer contacts

When presenting results:
- Format currency values properly (e.g., $1,234.56)
- Round percentages to one decimal place
- Use tables for comparing multiple items
- Reference specific transaction dates when available`;

/**
 * Process a chat message and generate a response
 */
export async function processChat(
  messages: ChatMessage[],
  userMessage: string
): Promise<ChatMessage> {
  const allMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: allMessages,
      tools: toolDefinitions,
      tool_choice: "auto",
    });

    const assistantMessage = response.choices[0].message;

    // Check if the model wants to call tools
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCalls: ToolCall[] = [];
      const toolResults: ToolResult[] = [];
      const allCitations: Citation[] = [];

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        toolCalls.push({
          id: toolCall.id,
          name,
          arguments: args,
        });

        try {
          const result = await executeTool(name, args);
          toolResults.push(result);
          allCitations.push(...result.citations);
        } catch (error) {
          toolResults.push({
            data: null,
            citations: [],
            summary: `Error executing ${name}: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }
      }

      // Send tool results back to the model for final response
      const toolResultMessages = toolCalls.map((call, i) => ({
        role: "tool" as const,
        tool_call_id: call.id,
        content: JSON.stringify(toolResults[i]),
      }));

      const finalResponse = await getOpenAIClient().chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          ...allMessages,
          {
            role: "assistant" as const,
            content: assistantMessage.content,
            tool_calls: assistantMessage.tool_calls,
          },
          ...toolResultMessages,
        ],
      });

      return {
        role: "assistant",
        content: finalResponse.choices[0].message.content || "",
        toolCalls,
        toolResults,
        citations: allCitations,
      };
    }

    // No tool calls, return direct response
    return {
      role: "assistant",
      content: assistantMessage.content || "",
    };
  } catch (error) {
    console.error("Chat error:", error);
    return {
      role: "assistant",
      content:
        "I apologize, but I encountered an error processing your request. Please try again or rephrase your question.",
    };
  }
}

/**
 * Generate suggested questions based on available data
 */
export function getSuggestedQuestions(): string[] {
  return [
    "What are my top 10 suppliers by spend this month?",
    "What are my top SaaS expenses?",
    "How has my AWS spending trended over the past 6 months?",
    "What's my total spend by category this month?",
    "Who are my biggest customers by revenue?",
    "What's the trend in my marketing spend?",
  ];
}

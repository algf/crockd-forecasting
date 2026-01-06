"use client";

import React, { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout";
import { PageContainer, PageContent } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Send,
  Bot,
  User,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";

interface Citation {
  id: string;
  type: "transaction" | "invoice" | "bill" | "contact";
  label: string;
  xeroUrl?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  timestamp: Date;
  isLoading?: boolean;
}

const suggestedQuestions = [
  "What are my top 10 suppliers by spend this month?",
  "What are my top SaaS expenses?",
  "How has my AWS spending trended over the past 6 months?",
  "What's my total spend by category this month?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (question?: string) => {
    const messageText = question || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Add loading message
    const loadingMessage: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userMessage: messageText,
        }),
      });

      const data = await response.json();

      // Replace loading message with actual response
      setMessages((prev) =>
        prev.map((m) =>
          m.isLoading
            ? {
                id: Date.now().toString(),
                role: "assistant",
                content: data.content || "I couldn't process that request.",
                citations: data.citations,
                timestamp: new Date(),
              }
            : m
        )
      );
    } catch (error) {
      // Replace loading message with error
      setMessages((prev) =>
        prev.map((m) =>
          m.isLoading
            ? {
                id: Date.now().toString(),
                role: "assistant",
                content:
                  "Sorry, I encountered an error. Please try again or check your connection.",
                timestamp: new Date(),
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <PageContainer>
      <Header
        title="AI Assistant"
        description="Ask questions about your financial data"
        actions={
          messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearChat}>
              <RefreshCw className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          )
        }
      />
      <PageContent className="p-0 flex flex-col h-[calc(100vh-64px)]">
        <div className="flex-1 overflow-hidden">
          {messages.length === 0 ? (
            // Welcome Screen
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                Ask me anything about your finances
              </h2>
              <p className="text-neutral-500 text-center max-w-md mb-8">
                I can help you analyze spending patterns, find top suppliers, track
                trends, and answer questions about your Xero data.
              </p>

              {/* Suggested Questions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSubmit(question)}
                    className="p-4 text-left bg-white border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                  >
                    <p className="text-sm text-neutral-700">{question}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Chat Messages
            <ScrollArea className="h-full">
              <div className="max-w-3xl mx-auto p-6 space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-4",
                      message.role === "user" && "flex-row-reverse"
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        message.role === "user"
                          ? "bg-primary-600"
                          : "bg-accent-500"
                      )}
                    >
                      {message.role === "user" ? (
                        <User className="h-4 w-4 text-white" />
                      ) : (
                        <Bot className="h-4 w-4 text-white" />
                      )}
                    </div>

                    {/* Message Content */}
                    <div
                      className={cn(
                        "flex-1 space-y-2",
                        message.role === "user" && "text-right"
                      )}
                    >
                      <Card
                        className={cn(
                          "inline-block p-4 max-w-full",
                          message.role === "user"
                            ? "bg-primary-600 text-white"
                            : "bg-white"
                        )}
                      >
                        {message.isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" />
                            <div
                              className="w-2 h-2 bg-accent-500 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            />
                            <div
                              className="w-2 h-2 bg-accent-500 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            />
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap text-sm">
                            {message.content}
                          </div>
                        )}
                      </Card>

                      {/* Citations */}
                      {message.citations && message.citations.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {message.citations.slice(0, 5).map((citation, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs cursor-pointer hover:bg-neutral-100"
                            >
                              {citation.type === "contact" && "👤"}
                              {citation.type === "transaction" && "💳"}
                              {citation.type === "invoice" && "📄"}
                              {citation.type === "bill" && "📋"}
                              <span className="ml-1">{citation.label}</span>
                              {citation.xeroUrl && (
                                <a
                                  href={citation.xeroUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </Badge>
                          ))}
                          {message.citations.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{message.citations.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      {message.role === "assistant" && !message.isLoading && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => copyToClipboard(message.content, message.id)}
                          >
                            {copiedId === message.id ? (
                              <Check className="h-3 w-3 text-success-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-neutral-200 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your financial data..."
                className="w-full resize-none rounded-lg border border-neutral-300 bg-white px-4 py-3 pr-12 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                rows={1}
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-neutral-400 mt-2 text-center">
              AI can make mistakes. Verify important information in Xero.
            </p>
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
}

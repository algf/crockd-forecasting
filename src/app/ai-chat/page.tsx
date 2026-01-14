"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Send,
  Bot,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  LogOut,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

const suggestedQuestions = [
  "What services does Crockd Studios offer?",
  "How can I get started with a project?",
  "What is your typical project timeline?",
  "Can you help with custom solutions?",
];

export default function AIChatPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in");
    }
  }, [user, loading, router]);

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

    const loadingMessage: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const response = await fetch("/api/ai-chat", {
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

      setMessages((prev) =>
        prev.map((m) =>
          m.isLoading
            ? {
                id: Date.now().toString(),
                role: "assistant",
                content: data.content || "I couldn't process that request.",
                timestamp: new Date(),
              }
            : m
        )
      );
    } catch (error) {
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

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-neutral-900">
                Chat with Crockd Studios
              </h1>
              <p className="text-xs text-neutral-500">AI-powered assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearChat}>
                <RefreshCw className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            )}
            <div className="flex items-center gap-2">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm text-neutral-700 hidden sm:block">
                {user.displayName}
              </span>
              <Button variant="ghost" size="icon-sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="h-8 w-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">
              Welcome, {user.displayName?.split(" ")[0] || "there"}!
            </h2>
            <p className="text-neutral-500 text-center max-w-md mb-8">
              I&apos;m here to help answer your questions about Crockd Studios.
              Ask me anything!
            </p>

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
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                      message.role === "user"
                        ? "bg-primary-600"
                        : "bg-accent-500"
                    )}
                  >
                    {message.role === "user" ? (
                      user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-sm font-medium">
                          {user.displayName?.[0] || "U"}
                        </span>
                      )
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>

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

                    {message.role === "assistant" && !message.isLoading && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            copyToClipboard(message.content, message.id)
                          }
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
              placeholder="Ask a question..."
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
            AI responses are generated and may not always be accurate.
          </p>
        </div>
      </div>
    </div>
  );
}

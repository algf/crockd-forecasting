"use client";

import { useState } from "react";
import { useAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface CommentFormProps {
  onSubmit: (text: string) => Promise<void>;
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt={user.displayName || "User"}
          className="w-10 h-10 rounded-full shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
          <span className="text-primary-600 font-medium">
            {user.displayName?.[0]?.toUpperCase() || "U"}
          </span>
        </div>
      )}
      <div className="flex-1 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          disabled={!text.trim() || isSubmitting}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

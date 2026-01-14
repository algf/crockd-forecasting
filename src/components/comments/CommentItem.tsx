"use client";

import { useState } from "react";
import { doc, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Heart, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  userId: string;
  displayName: string;
  photoURL?: string;
  text: string;
  createdAt: Date;
  likesCount: number;
}

interface CommentItemProps {
  comment: Comment;
  isLiked: boolean;
  onLikeToggle: () => void;
  onDelete: () => void;
}

export function CommentItem({
  comment,
  isLiked,
  onLikeToggle,
  onDelete,
}: CommentItemProps) {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex gap-3 p-4 bg-white rounded-lg border border-neutral-200">
      {/* Avatar */}
      <div className="shrink-0">
        {comment.photoURL ? (
          <img
            src={comment.photoURL}
            alt={comment.displayName}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-600 font-medium">
              {comment.displayName[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-neutral-900 text-sm">
            {comment.displayName}
          </span>
          <span className="text-neutral-400 text-xs">
            {formatDate(comment.createdAt)}
          </span>
        </div>
        <p className="text-neutral-700 text-sm whitespace-pre-wrap break-words">
          {comment.text}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={onLikeToggle}
            className={cn(
              "flex items-center gap-1 text-sm transition-colors",
              isLiked
                ? "text-red-500"
                : "text-neutral-400 hover:text-red-500"
            )}
          >
            <Heart
              className={cn("h-4 w-4", isLiked && "fill-current")}
            />
            <span>{comment.likesCount}</span>
          </button>

          {user?.uid === comment.userId && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-neutral-400 hover:text-red-500 ml-2"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

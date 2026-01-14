"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

interface Comment {
  id: string;
  userId: string;
  displayName: string;
  photoURL?: string;
  text: string;
  createdAt: Date;
  likesCount: number;
}

export function CommentSection() {
  const { user, loading } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to comments
  useEffect(() => {
    const commentsRef = collection(db, "comments");
    const q = query(commentsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const commentsData: Comment[] = [];

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();

        // Get likes count
        const likesRef = collection(db, "comments", docSnapshot.id, "likes");
        const likesSnapshot = await getCountFromServer(likesRef);

        commentsData.push({
          id: docSnapshot.id,
          userId: data.userId,
          displayName: data.displayName,
          photoURL: data.photoURL,
          text: data.text,
          createdAt: data.createdAt?.toDate() || new Date(),
          likesCount: likesSnapshot.data().count,
        });
      }

      setComments(commentsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load user's likes
  useEffect(() => {
    if (!user) {
      setUserLikes(new Set());
      return;
    }

    const loadUserLikes = async () => {
      const likes = new Set<string>();
      for (const comment of comments) {
        const likeRef = doc(db, "comments", comment.id, "likes", user.uid);
        const likeDoc = await getDoc(likeRef);
        if (likeDoc.exists()) {
          likes.add(comment.id);
        }
      }
      setUserLikes(likes);
    };

    loadUserLikes();
  }, [user, comments]);

  const handleAddComment = async (text: string) => {
    if (!user) return;

    await addDoc(collection(db, "comments"), {
      userId: user.uid,
      displayName: user.displayName || "Anonymous",
      photoURL: user.photoURL || null,
      text,
      createdAt: serverTimestamp(),
    });
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteDoc(doc(db, "comments", commentId));
  };

  const handleToggleLike = async (commentId: string) => {
    if (!user) return;

    const likeRef = doc(db, "comments", commentId, "likes", user.uid);
    const likeDoc = await getDoc(likeRef);

    if (likeDoc.exists()) {
      await deleteDoc(likeRef);
      setUserLikes((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    } else {
      await setDoc(likeRef, { likedAt: serverTimestamp() });
      setUserLikes((prev) => new Set(prev).add(commentId));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Community
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Community
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-neutral-500 mb-4">
              Sign in to join the conversation
            </p>
            <Button asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Community
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CommentForm onSubmit={handleAddComment} />

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isLiked={userLikes.has(comment.id)}
                onLikeToggle={() => handleToggleLike(comment.id)}
                onDelete={() => handleDeleteComment(comment.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

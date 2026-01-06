"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { gql, useQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Trash2, Eye, MessageSquare, ArrowUp } from "lucide-react";
import { formatDate } from "@/lib/utils";

const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      displayName
      email
      bio
      avatar
      avatarFile {
        fileUrl
      }
      role
      posts {
        id
        name
        timestamp
        views
        commentCount
        karma
      }
      albums {
        id
        name
        timestamp
        views
        commentCount
        karma
      }
      comments {
        id
        timestamp
        text
        karma
      }
    }
  }
`;

const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($displayName: String, $bio: String, $avatar: Int) {
    updateProfile(displayName: $displayName, bio: $bio, avatar: $avatar) {
      id
      displayName
      bio
      avatar
    }
  }
`;

const DELETE_FILE_MUTATION = gql`
  mutation DeleteFile($id: Int!) {
    deleteFile(id: $id)
  }
`;

const DELETE_ALBUM_MUTATION = gql`
  mutation DeleteAlbum($id: Int!) {
    deleteAlbum(id: $id)
  }
`;

export default function DashboardPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");

  const { data, loading, refetch } = useQuery(ME_QUERY, {
    onCompleted: (data) => {
      if (data.me) {
        setDisplayName(data.me.displayName);
        setBio(data.me.bio);
        setAvatar(data.me.avatar?.toString() || "");
      }
    },
  });
  const [updateProfile, { loading: updating }] = useMutation(
    UPDATE_PROFILE_MUTATION
  );
  const [deleteFile] = useMutation(DELETE_FILE_MUTATION);
  const [deleteAlbum] = useMutation(DELETE_ALBUM_MUTATION);

  const user = data?.me;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4" />
              <div className="h-32 bg-muted rounded" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateProfile({
        variables: {
          displayName: displayName || undefined,
          bio: bio || undefined,
          avatar: avatar ? parseInt(avatar) : null,
        },
      });

      toast.success("Your profile has been updated successfully.");
      refetch();
    } catch (error: any) {
      toast.warning(error.message);
    }
  };

  const handleDeleteFile = async (id: number) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      await deleteFile({ variables: { id } });
      toast.success("File deleted");
      refetch();
    } catch (error: any) {
      toast.warning(error.message);
    }
  };

  const handleDeleteAlbum = async (id: number) => {
    if (
      !confirm("Are you sure you want to delete this album and all its files?")
    )
      return;

    try {
      await deleteAlbum({ variables: { id } });
      toast.success("Album deleted");
      refetch();
    } catch (error: any) {
      toast.warning(error.message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">User Info</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            {(user.role === "janny" || user.role === "admincel") && (
              <>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </>
            )}
            {user.role === "admincel" && (
              <TabsTrigger value="modlogs">Mod Logs</TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>User Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-20 w-20">
                      {user.avatarFile && (
                        <AvatarImage src={user.avatarFile.fileUrl} />
                      )}
                      <AvatarFallback className="text-2xl">
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold text-xl">
                        {user.displayName}
                      </div>
                      <div className="text-muted-foreground">
                        @{user.username}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={updating}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      disabled={updating}
                    />
                  </div>

                  <div>
                    <Label htmlFor="avatar">Avatar (File ID)</Label>
                    <Input
                      id="avatar"
                      type="number"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      disabled={updating}
                    />
                  </div>

                  <Button type="submit" disabled={updating}>
                    {updating ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Posts ({user.posts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {user.posts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No posts yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {user.posts.map((file: any) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <Link
                            href={`/file/${file.id}`}
                            className="font-medium hover:underline"
                          >
                            {file.name || 'anon'}
                          </Link>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>{formatDate(file.timestamp)}</span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {file.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {file.commentCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <ArrowUp className="h-3 w-3" />
                              {file.karma}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFile(file.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Albums ({user.albums.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {user.albums.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No albums yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {user.albums.map((album: any) => (
                      <div
                        key={album.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <Link
                            href={`/album/${album.id}`}
                            className="font-medium hover:underline"
                          >
                            {album.name || 'anon'}
                          </Link>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>{formatDate(album.timestamp)}</span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {album.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {album.commentCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <ArrowUp className="h-3 w-3" />
                              {album.karma}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAlbum(album.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Comments ({user.comments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {user.comments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No comments yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {user.comments.slice(0, 10).map((comment: any) => (
                      <div key={comment.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.timestamp)}
                          </span>
                          <span className="text-xs font-medium">
                            {comment.karma} karma
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Moderator Tabs */}
          {(user.role === "janny" || user.role === "admincel") && (
            <>
              <TabsContent value="users">
                <Card>
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                      User management panel will be implemented here.
                      <br />
                      Features: Search users, view profiles, ban/unban,
                      promote/demote
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reports">
                <Card>
                  <CardHeader>
                    <CardTitle>Reports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                      Reports management panel will be implemented here.
                      <br />
                      Features: View reports, dismiss, remove content, ban users
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}

          {user.role === "admincel" && (
            <TabsContent value="modlogs">
              <Card>
                <CardHeader>
                  <CardTitle>Moderation Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Moderation logs panel will be implemented here.
                    <br />
                    Features: View all mod actions with timestamps and details
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

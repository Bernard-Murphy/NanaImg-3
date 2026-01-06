"use client";

import { gql, useQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import BouncyClick from "@/components/ui/bouncy-click";

const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      displayName
      avatar
      avatarFile {
        fileUrl
      }
    }
  }
`;

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export function Navbar() {
  const { data, refetch } = useQuery(ME_QUERY);
  const [logout] = useMutation(LOGOUT_MUTATION);
  const router = useRouter();

  const user = data?.me;

  const handleLogout = async () => {
    try {
      await logout();
      await refetch();
      router.push("/");
      toast.success("You have been successfully logged out.");
    } catch (error) {
      toast.warning("Failed to logout. Please try again.");
    }
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-6">
            <BouncyClick noRipple>
              <Link href="/" className="text-xl font-bold">
                FEEDNANA
              </Link>
            </BouncyClick>
            <BouncyClick>
              <Button asChild variant="ghost">
                <Link href="/browse" className="hover:text-primary">
                  Browse
                </Link>
              </Button>
            </BouncyClick>
            <BouncyClick>
              <Button asChild variant="ghost">
                <Link href="/timeline" className="hover:text-primary">
                  Timeline
                </Link>
              </Button>
            </BouncyClick>
            <BouncyClick>
              <Button asChild variant="ghost">
                <Link href="/info" className="hover:text-primary">
                  Info
                </Link>
              </Button>
            </BouncyClick>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar>
                      {user.avatarFile && (
                        <AvatarImage
                          src={user.avatarFile.fileUrl}
                          alt={user.username}
                        />
                      )}
                      <AvatarFallback>
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/u/${user.username}`}>Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <BouncyClick>
                  <Button asChild variant="ghost">
                    <Link href="/login">Login</Link>
                  </Button>
                </BouncyClick>
                <BouncyClick>
                  <Button asChild>
                    <Link href="/register">Register</Link>
                  </Button>
                </BouncyClick>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

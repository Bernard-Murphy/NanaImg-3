"use client";

import { useState } from "react";
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
import { AuthDialog } from "@/components/auth-dialog";
import { LogIn, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  retract,
  normalize,
  transition_fast,
  fade_out_scale_1,
  fade_out,
} from "@/lib/transitions";

export const ME_QUERY = gql`
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

function NavbarContent() {
  const { data, refetch, loading } = useQuery(ME_QUERY);
  const [logout] = useMutation(LOGOUT_MUTATION);
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = data?.me;

  const handleLogout = async () => {
    try {
      await logout();
      // Clear JWT token from localStorage and cookie
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth-token");
        document.cookie =
          "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
      }
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
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
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

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-4">
            <BouncyClick noRipple>
              <Link href="/" className="text-xl font-bold">
                FEEDNANA
              </Link>
            </BouncyClick>
          </div>

          {/* Right side - Login/User Avatar (unchanged) */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <BouncyClick>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </BouncyClick>
            </div>

            {loading ? (
              <div></div>
            ) : (
              <AnimatePresence mode="wait">
                {user ? (
                  <motion.div
                    initial={fade_out}
                    animate={normalize}
                    exit={fade_out_scale_1}
                    transition={transition_fast}
                    key="user"
                  >
                    <DropdownMenu>
                      <BouncyClick>
                        <DropdownMenuTrigger>
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
                      </BouncyClick>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer" asChild>
                          <Link href={`/u/${user.username}`}>Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" asChild>
                          <Link href="/dashboard">Dashboard</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-red-500"
                          onClick={handleLogout}
                        >
                          Logout
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={fade_out}
                    animate={normalize}
                    exit={fade_out_scale_1}
                    transition={transition_fast}
                    key="login"
                  >
                    <BouncyClick>
                      <AuthDialog onSuccess={() => refetch()}>
                        <Button variant="ghost">
                          <LogIn className="h-4 w-4 mr-2" />
                          Login/Register
                        </Button>
                      </AuthDialog>
                    </BouncyClick>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
        <AnimatePresence mode="wait">
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={retract}
              animate={{
                ...normalize,
                height: "auto",
              }}
              exit={retract}
              transition={transition_fast}
              className="md:hidden border-t bg-background overflow-hidden"
              key={mobileMenuOpen ? "open" : "closed"}
            >
              <div className="px-4 py-2 space-y-1">
                <BouncyClick>
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full justify-start"
                  >
                    <Link
                      href="/browse"
                      className="hover:text-primary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Browse
                    </Link>
                  </Button>
                </BouncyClick>
                <BouncyClick>
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full justify-start"
                  >
                    <Link
                      href="/timeline"
                      className="hover:text-primary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Timeline
                    </Link>
                  </Button>
                </BouncyClick>
                <BouncyClick>
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full justify-start"
                  >
                    <Link
                      href="/info"
                      className="hover:text-primary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Info
                    </Link>
                  </Button>
                </BouncyClick>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

// Static navbar for SSR/static generation (simplified, no mobile menu)
function StaticNavbar() {
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
            <BouncyClick>
              <Button variant="ghost">
                <LogIn className="h-4 w-4 mr-2" />
                Login/Register
              </Button>
            </BouncyClick>
          </div>
        </div>
      </div>
    </nav>
  );
}

export function Navbar() {
  return <NavbarContent />;
}

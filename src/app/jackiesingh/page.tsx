"use client";

import { useState, useEffect } from "react";
import { gql, useLazyQuery } from "@apollo/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, Download, Search } from "lucide-react";
import { formatDate } from "@/lib/utils";

const GNAA_SEARCH = gql`
  query GnaaSearch(
    $query: String!
    $authors: [String!]
    $page: Int
    $limit: Int
    $sortBy: String
  ) {
    gnaaSearch(
      query: $query
      authors: $authors
      page: $page
      limit: $limit
      sortBy: $sortBy
    ) {
      results {
        id
        timestamp
        user
        message
      }
      total
      hasMore
    }
  }
`;

export default function JackieSinghPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [authors, setAuthors] = useState<string[]>(["j4x", "jsing"]);
  const [newAuthor, setNewAuthor] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("date");

  const [search, { data, loading }] = useLazyQuery(GNAA_SEARCH);

  useEffect(() => {
    // Load reCAPTCHA if site key is available
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
      document.body.appendChild(script);
    }
  }, []);

  const handleSearch = async () => {
    try {
      // Get reCAPTCHA token if available
      let recaptchaToken = "";
      if (typeof window !== "undefined" && (window as any).grecaptcha) {
        try {
          recaptchaToken = await (window as any).grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
            { action: "gnaa_search" }
          );
        } catch (e) {
          console.error("reCAPTCHA error:", e);
        }
      }

      await search({
        variables: {
          query: searchTerm,
          authors: authors.length > 0 ? authors : undefined,
          page,
          limit: 50,
          sortBy,
        },
      });
    } catch (error: any) {
      toast.warning(error.message);
    }
  };

  const addAuthor = () => {
    if (newAuthor && !authors.includes(newAuthor)) {
      setAuthors([...authors, newAuthor]);
      setNewAuthor("");
    }
  };

  const removeAuthor = (author: string) => {
    setAuthors(authors.filter((a) => a !== author));
  };

  const results = data?.gnaaSearch?.results || [];
  const total = data?.gnaaSearch?.total || 0;
  const hasMore = data?.gnaaSearch?.hasMore || false;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">GNAA/2600 IRC Search</h1>
          <Button asChild variant="outline">
            <a
              href="https://f.feednana.com/random/2600.log"
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Full Logs
            </a>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="search">Search Terms</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Enter search terms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>

            <div>
              <Label>Author(s)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {authors.map((author) => (
                  <Badge key={author} variant="secondary" className="gap-1">
                    {author}
                    <button
                      onClick={() => removeAuthor(author)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add author filter..."
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addAuthor()}
                />
                <Button onClick={addAuthor} variant="outline">
                  Add
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant={sortBy === "date" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("date")}
              >
                Sort by Date
              </Button>
              <Button
                variant={sortBy === "relevance" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("relevance")}
              >
                Sort by Relevance
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              This site is protected by reCAPTCHA, and the Google{" "}
              <a
                href="https://policies.google.com/privacy"
                className="underline"
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="https://policies.google.com/terms" className="underline">
                Terms of Service
              </a>{" "}
              apply.
            </p>
          </CardContent>
        </Card>

        {loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Searching...</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <div className="text-sm text-muted-foreground">
              Found {total} results
            </div>

            <div className="space-y-2">
              {results.map((result: any) => (
                <Card key={result.id}>
                  <CardContent className="py-3">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-32 text-xs text-muted-foreground">
                        <div>{formatDate(result.timestamp)}</div>
                        <div className="font-medium text-foreground mt-1">
                          {result.user}
                        </div>
                      </div>
                      <div className="flex-1 font-mono text-sm break-all">
                        {result.message}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center gap-4">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
              >
                Previous
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">
                Page {page}
              </span>
              <Button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                variant="outline"
              >
                Next
              </Button>
            </div>
          </>
        )}

        {!loading && data && results.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No results found</p>
          </div>
        )}
      </div>
    </div>
  );
}

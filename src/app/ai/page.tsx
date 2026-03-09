"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { gql, useQuery } from "@apollo/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ImagePlus, X, ExternalLink } from "lucide-react";
import BouncyClick from "@/components/ui/bouncy-click";
import Spinner from "@/components/ui/spinner";
import { AnimatePresence, motion } from "framer-motion";
import { fade_out, normalize, fade_out_scale_1, transition_fast } from "@/lib/transitions";

const ME_QUERY = gql`
  query Me {
    me {
      id
    }
  }
`;

const ART_STYLES = [
  "Auto",
  "3D Model",
  "Analog Film",
  "Anime",
  "Cinematic",
  "Comic Book",
  "Craft Clay",
  "Digital Art",
  "Enhance",
  "Fantasy Art",
  "Isometric Style",
  "Line Art",
  "Lowpoly",
  "Neon Punk",
  "Origami",
  "Photographic",
  "Pixel Art",
  "Texture",
  "Advertising",
  "Food Photography",
  "Real Estate",
  "Abstract",
  "Cubist",
  "Graffiti",
  "Hyperrealism",
  "Impressionist",
  "Pointillism",
  "Pop Art",
  "Psychedelic",
  "Renaissance",
  "Steampunk",
  "Surrealist",
  "Typography",
  "Watercolor",
  "Fighting Game",
  "GTA",
  "Super Mario",
  "Minecraft",
  "Pokemon",
  "Retro Arcade",
  "Retro Game",
  "RPG Fantasy Game",
  "Strategy Game",
  "Street Fighter",
  "Legend of Zelda",
  "Architectural",
  "Disco",
  "Dreamscape",
  "Dystopian",
  "Fairy Tale",
  "Gothic",
  "Grunge",
  "Horror",
  "Minimalist",
  "Monochrome",
  "Nautical",
  "Space",
  "Stained Glass",
  "Techwear Fashion",
  "Tribal",
  "Zentangle",
  "Collage",
  "Flat Papercut",
  "Kirigami",
  "Paper Mache",
  "Paper Quilling",
  "Papercut Collage",
  "Papercut Shadow Box",
  "Stacked Papercut",
  "Thick Layered Papercut",
  "Alien",
  "Film Noir",
  "HDR",
  "Long Exposure",
  "Neon Noir",
  "Silhouette",
  "Tilt-Shift",
];

function ImageTab() {
  const router = useRouter();
  const { data: meData } = useQuery(ME_QUERY);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Auto");
  const [uncensored, setUncensored] = useState(false);
  const [disableComments, setDisableComments] = useState(false);
  const [unlisted, setUnlisted] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUncensoredChange = (checked: boolean) => {
    setUncensored(checked);
    if (checked) {
      toast.warning("WARNING: Uncensored is known to produce EXTREMELY offensive results");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.warning("Please enter a prompt.");
      return;
    }

    setGenerating(true);
    try {
      let recaptchaToken = "";
      if (typeof window !== "undefined" && (window as any).grecaptcha) {
        try {
          recaptchaToken = await (window as any).grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
            { action: "ai_generate" }
          );
        } catch (e) {
          console.error("reCAPTCHA error:", e);
        }
      }

      let imageBase64: string | undefined;
      if (selectedImage) {
        const buffer = await selectedImage.arrayBuffer();
        imageBase64 = Buffer.from(buffer).toString("base64");
      }

      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("auth-token") || "" : ""}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style,
          uncensored,
          imageBase64,
          disableComments,
          unlisted,
          anonymous: meData?.me ? anonymous : true,
          recaptchaToken,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Image generation failed");
      }

      toast.success("Image generated successfully!");
      router.push(`/file/${data.fileId}`);
    } catch (error: any) {
      toast.warning(error.message || "An error occurred during generation.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div>
          <Label htmlFor="image-prompt">Prompt</Label>
          <div className="flex gap-2 items-start">
            <Textarea
              id="image-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              disabled={generating}
              className="min-h-[120px]"
            />
            <div className="flex flex-col items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <BouncyClick>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={generating}
                        className="shrink-0"
                      >
                        <ImagePlus className="h-4 w-4" />
                      </Button>
                    </BouncyClick>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>(Optional) Select Image</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {imagePreview && (
                <div className="relative w-10 h-10">
                  <img
                    src={imagePreview}
                    alt="Selected"
                    className="w-10 h-10 rounded object-cover"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="art-style">Art Style</Label>
          <Select value={style} onValueChange={setStyle} disabled={generating}>
            <SelectTrigger id="art-style">
              <SelectValue placeholder="Select style" />
            </SelectTrigger>
            <SelectContent>
              {ART_STYLES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="image-uncensored"
              checked={uncensored}
              onCheckedChange={(checked) => handleUncensoredChange(checked as boolean)}
              disabled={generating}
            />
            <Label htmlFor="image-uncensored">Uncensored</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="image-disable-comments"
              checked={disableComments}
              onCheckedChange={(checked) => setDisableComments(checked as boolean)}
              disabled={generating}
            />
            <Label htmlFor="image-disable-comments">Disable comments</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="image-unlisted"
              checked={unlisted}
              onCheckedChange={(checked) => setUnlisted(checked as boolean)}
              disabled={generating}
            />
            <Label htmlFor="image-unlisted">Keep unlisted</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="image-anonymous"
              checked={meData?.me ? anonymous : true}
              onCheckedChange={(checked) => setAnonymous(checked as boolean)}
              disabled={generating || !meData?.me}
            />
            <Label htmlFor="image-anonymous">
              Post anonymously
              {meData?.me ? "" : " (not logged in; posts use your anon ID)"}
            </Label>
          </div>
        </div>
      </Card>

      <BouncyClick>
        <Button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="w-full text-white"
          size="lg"
        >
          {generating ? (
            <>
              <Spinner color="white" size="sm" className="mr-2" />
              Generating...
            </>
          ) : (
            "Generate Image"
          )}
        </Button>
      </BouncyClick>
    </div>
  );
}

function MusicTab() {
  const router = useRouter();
  const { data: meData } = useQuery(ME_QUERY);
  const [title, setTitle] = useState("");
  const [generateLyrics, setGenerateLyrics] = useState(true);
  const [lyricsOrPrompt, setLyricsOrPrompt] = useState("");
  const [musicStyle, setMusicStyle] = useState("");
  const [uncensored, setUncensored] = useState(false);
  const [disableComments, setDisableComments] = useState(false);
  const [unlisted, setUnlisted] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");

  const handleUncensoredChange = (checked: boolean) => {
    setUncensored(checked);
    if (checked) {
      toast.warning("WARNING: Uncensored is known to produce EXTREMELY offensive results");
    }
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast.warning("Please enter a title.");
      return;
    }
    if (!lyricsOrPrompt.trim()) {
      toast.warning(generateLyrics ? "Please enter a lyrics prompt." : "Please enter lyrics.");
      return;
    }

    setGenerating(true);
    setGenerationStatus("");
    try {
      let recaptchaToken = "";
      if (typeof window !== "undefined" && (window as any).grecaptcha) {
        try {
          recaptchaToken = await (window as any).grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
            { action: "ai_generate" }
          );
        } catch (e) {
          console.error("reCAPTCHA error:", e);
        }
      }

      const body: Record<string, any> = {
        title: title.trim(),
        musicStyle: musicStyle.trim(),
        generateLyrics,
        uncensored,
        disableComments,
        unlisted,
        anonymous: meData?.me ? anonymous : true,
        recaptchaToken,
      };

      if (generateLyrics) {
        body.lyricsPrompt = lyricsOrPrompt.trim();
      } else {
        body.lyrics = lyricsOrPrompt.trim();
      }

      const response = await fetch("/api/ai/generate-music", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("auth-token") || "" : ""}`,
        },
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get("Content-Type") || "";
      if (!contentType.includes("text/event-stream")) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Music generation failed");
        }
        toast.success("Music generated successfully!");
        if (data.albumId) {
          router.push(`/album/${data.albumId}`);
        } else if (data.fileId) {
          router.push(`/file/${data.fileId}`);
        }
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";
          for (const chunk of lines) {
            const match = chunk.match(/^data:\s*(.+)$/m);
            if (match) {
              try {
                const data = JSON.parse(match[1]);
                if (data.status) setGenerationStatus(data.status);
                if (data.done) {
                  if (data.error) throw new Error(data.error);
                  toast.success("Music generated successfully!");
                  if (data.albumId) {
                    router.push(`/album/${data.albumId}`);
                  } else if (data.fileId) {
                    router.push(`/file/${data.fileId}`);
                  }
                  return;
                }
              } catch (e) {
                if (!(e instanceof SyntaxError)) throw e;
              }
            }
          }
        }
      }
      throw new Error("No result from server");
    } catch (error: any) {
      toast.warning(error.message || "An error occurred during generation.");
    } finally {
      setGenerating(false);
      setGenerationStatus("");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground text-center">Music generation is slow. I am working to make it faster.</p>
        <div>
          <Label htmlFor="music-title">Title</Label>
          <Input
            id="music-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Song title"
            disabled={generating}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="generate-lyrics"
              checked={generateLyrics}
              onCheckedChange={(checked) => setGenerateLyrics(checked as boolean)}
              disabled={generating}
            />
            <Label htmlFor="generate-lyrics">Generate Lyrics Automatically</Label>
          </div>
        </div>

        <div>
          <Label htmlFor="lyrics-or-prompt">
            {generateLyrics ? "Lyrics Prompt" : "Lyrics"}
          </Label>
          <Textarea
            id="lyrics-or-prompt"
            value={lyricsOrPrompt}
            onChange={(e) => setLyricsOrPrompt(e.target.value)}
            placeholder={
              generateLyrics
                ? "Describe the song you want (e.g., a melancholy ballad about lost love)..."
                : "Enter your lyrics here..."
            }
            disabled={generating}
            className="min-h-[150px]"
          />
        </div>

        <div>
          <Label htmlFor="music-style">Music Style</Label>
          <Input
            id="music-style"
            value={musicStyle}
            onChange={(e) => setMusicStyle(e.target.value)}
            placeholder="e.g., r&b, slow, passionate, male vocal"
            disabled={generating}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="music-uncensored"
              checked={uncensored}
              onCheckedChange={(checked) => handleUncensoredChange(checked as boolean)}
              disabled={generating}
            />
            <Label htmlFor="music-uncensored">Uncensored</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="music-disable-comments"
              checked={disableComments}
              onCheckedChange={(checked) => setDisableComments(checked as boolean)}
              disabled={generating}
            />
            <Label htmlFor="music-disable-comments">Disable comments</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="music-unlisted"
              checked={unlisted}
              onCheckedChange={(checked) => setUnlisted(checked as boolean)}
              disabled={generating}
            />
            <Label htmlFor="music-unlisted">Keep unlisted</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="music-anonymous"
              checked={meData?.me ? anonymous : true}
              onCheckedChange={(checked) => setAnonymous(checked as boolean)}
              disabled={generating || !meData?.me}
            />
            <Label htmlFor="music-anonymous">
              Post anonymously
              {meData?.me ? "" : " (not logged in; posts use your anon ID)"}
            </Label>
          </div>
        </div>
      </Card>

      <BouncyClick>
        <Button
          onClick={handleGenerate}
          disabled={generating || !title.trim() || !lyricsOrPrompt.trim()}
          className="w-full text-white"
          size="lg"
        >
          {generating ? (
            <>
              <Spinner color="white" size="sm" className="mr-2" />
              {generationStatus || "Generating..."}
            </>
          ) : (
            "Generate Music"
          )}
        </Button>
      </BouncyClick>
    </div>
  );
}

function AIPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "image";

  const handleTabChange = useCallback(
    (value: string) => {
      router.replace(`/ai?type=${value}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl font-bold">AI Generate</h1>
        </div>

        <Tabs value={type} onValueChange={handleTabChange}>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <TabsList>
              <BouncyClick>
                <TabsTrigger value="image">Image</TabsTrigger>
              </BouncyClick>
              <BouncyClick>
                <TabsTrigger value="music">Music</TabsTrigger>
              </BouncyClick>
            </TabsList>

            <BouncyClick>
              <Button variant="outline" asChild>
                <a
                  href="https://epgames.lol"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src="/enjoyprison.png" alt="Enjoy Prison Games" className="w-4 h-4 mr-2" />
                  Generate AI games with Enjoy Prison Games!
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </BouncyClick>
          </div>
          <AnimatePresence mode="wait">
            {type === "image" && (
              <motion.div
                initial={fade_out}
                animate={normalize}
                exit={fade_out_scale_1}
                transition={transition_fast}
                key="image"
              >
                <ImageTab />
              </motion.div>
            )}
            {type === "music" && (
              <motion.div
                initial={fade_out}
                animate={normalize}
                exit={fade_out_scale_1}
                transition={transition_fast}
                key="music"
              >
                <MusicTab />
              </motion.div>
            )}
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}

export default function AIPage() {
  return (
    <Suspense>
      <AIPageContent />
    </Suspense>
  );
}

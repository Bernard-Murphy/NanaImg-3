"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  fade_out,
  normalize,
  fade_out_scale_1,
  transition,
} from "@/lib/transitions";

export default function InfoPage() {
  return (
    <motion.div
      initial={fade_out}
      animate={normalize}
      exit={fade_out_scale_1}
      transition={transition}
      className="container mx-auto px-4 py-8"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl text-center font-bold">Info & Rules</h1>
        <p className="text-center text-muted-foreground">
          Feed Nana, previously NanaImg, was created by Bernard Murphy
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Community Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. No NSFW Material</h3>
              <p className="text-sm text-muted-foreground">
                Do not post content that is Not Safe For Work (NSFW), including
                but not limited to: sexually explicit material, graphic
                violence, gore, or other content inappropriate for a general
                audience.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                2. No Copyright Infringement
              </h3>
              <p className="text-sm text-muted-foreground">
                Do not post content that infringes on others&apos; copyrights.
                Only upload content you own or have permission to share.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Children</h3>
              <p className="text-sm text-muted-foreground">
                Do not post images or videos of other people&apos;s children
                without their explicit permission. Do not post any remotely
                suggestive content involving minors. Do not post any nude or
                barely clothed content involving minors at all.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. No Advertising or Spam</h3>
              <p className="text-sm text-muted-foreground">
                Do not use this platform for advertising, promotional content,
                or spam. This includes flooding the server with requests or
                posting repetitive cope.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">5. No Illegal Content</h3>
              <p className="text-sm text-muted-foreground">
                Do not post any content that is illegal under US law or that
                promotes illegal activities.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">6. No JQ</h3>
              <p className="text-sm text-muted-foreground">
                Discussing the Jewish Question is prohibited. This includes
                obvious innuendoes such as cookie monster riddles, wooden doors,
                etc.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">7. No Malicious Content</h3>
              <p className="text-sm text-muted-foreground">
                Do not upload files containing malware, viruses, or other
                malicious code.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>URL Shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-1">Files</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>
                    <code>/file/(file number)</code>
                  </li>
                  <li>
                    <code>/files/(file number)</code>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Albums</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>
                    <code>/album/(album number)</code>
                  </li>
                  <li>
                    <code>/series/(album number)</code>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Cope</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>
                    <code>/cope/(comment number)</code>
                  </li>
                  <li>
                    <code>/comment/(comment number)</code>
                  </li>
                  <li>
                    <code>/comments/(comment number)</code>
                  </li>
                </ul>
                <p className="text-xs mt-1">
                  Takes you to the page containing the comment and scrolls to it
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Users</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>
                    <code>/u/(username)</code>
                  </li>
                  <li>
                    <code>/user/(username)</code>
                  </li>
                  <li>
                    <code>/n/(user number)</code>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Legal & Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">DMCA &amp; Legal Requests</h3>
              <p className="text-sm text-muted-foreground">
                For DMCA takedown requests or other legal matters, please
                contact:
              </p>
              <p className="text-sm font-mono mt-2">
                <a
                  href="mailto:b@bernardmurphy.net"
                  className="text-primary hover:underline"
                >
                  b@bernardmurphy.net
                </a>
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">General Inquiries</h3>
              <p className="text-sm text-muted-foreground">
                For general questions, feedback, or other communications, you
                may also reach out to the email address above.
              </p>
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-muted-foreground">
                This site is protected by reCAPTCHA and the Google{" "}
                <a
                  href="https://policies.google.com/privacy"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a
                  href="https://policies.google.com/terms"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>{" "}
                apply.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

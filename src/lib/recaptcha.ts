export async function verifyRecaptcha(token: string): Promise<boolean> {
  const apiKey = process.env.RECAPTCHA_API_KEY;
  const projectId = process.env.RECAPTCHA_PROJECT_ID;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // If no secret key is configured, skip validation
  if (!apiKey) {
    return true;
  }

  try {
    const body = {
      event: {
        token,
        siteKey,
        expectedAction: "login",
      },
    };
    const response = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return data?.riskAnalysis?.score >= 0.15;
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return false;
  }
}

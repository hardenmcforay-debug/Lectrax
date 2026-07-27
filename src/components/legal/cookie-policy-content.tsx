import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { CONTACT_EMAIL } from "@/lib/contact/constants";

const LAST_UPDATED = "July 27, 2026";

const sections = [
  {
    title: "1. Introduction",
    content: (
      <p>
        This Cookie Policy explains how {APP_NAME} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
        uses cookies and similar technologies when you use our website, applications, and related
        services (collectively, the &quot;Service&quot;). It should be read together with our{" "}
        <Link href="/privacy" className="font-medium text-primary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    ),
  },
  {
    title: "2. What Are Cookies?",
    content: (
      <p>
        Cookies are small text files stored on your device when you visit a website or use an app.
        They help the Service remember your session, keep you signed in securely, and support core
        platform features. Similar technologies may include local storage and session storage used by
        the browser or installed app.
      </p>
    ),
  },
  {
    title: "3. How We Use Cookies",
    content: (
      <>
        <p className="mb-4">We use cookies and similar technologies to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Authenticate and secure your account:</strong> maintain login sessions, protect
            against unauthorized access, and support password reset and account recovery flows.
          </li>
          <li>
            <strong>Operate the platform:</strong> remember role-based access, keep classroom and
            portal features working correctly, and preserve essential preferences during your visit.
          </li>
          <li>
            <strong>Improve reliability and security:</strong> detect abuse, support fraud prevention
            related to attendance verification, and diagnose technical issues.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Types of Cookies We Use",
    content: (
      <>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Essential cookies:</strong> required for sign-in, session management, and secure
            operation of the Service. These cannot be disabled if you want to use authenticated
            features.
          </li>
          <li>
            <strong>Functional cookies:</strong> help remember settings or UI preferences that improve
            your experience while using {APP_NAME}.
          </li>
          <li>
            <strong>Security-related cookies:</strong> support authentication checks and help protect
            accounts and academic workflows.
          </li>
        </ul>
        <p className="mt-4">
          We do not use cookies primarily for third-party advertising or cross-site marketing
          tracking.
        </p>
      </>
    ),
  },
  {
    title: "5. Managing Cookies",
    content: (
      <p>
        You can control cookies through your browser settings, including blocking or deleting cookies.
        If you block essential cookies, parts of the Service especially sign-in and portal features may
        not work properly. For installed app (PWA) use, similar storage may be managed through your
        device or browser settings.
      </p>
    ),
  },
  {
    title: "6. Updates to This Policy",
    content: (
      <p>
        We may update this Cookie Policy from time to time. The &quot;Last updated&quot; date at the
        top of this page reflects the latest revision. Continued use of the Service after changes
        means you accept the updated policy.
      </p>
    ),
  },
  {
    title: "7. Contact Us",
    content: (
      <p>
        If you have questions about our use of cookies, contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary hover:underline">
          {CONTACT_EMAIL}
        </a>{" "}
        or through our{" "}
        <Link href="/contact" className="font-medium text-primary hover:underline">
          contact page
        </Link>
        .
      </p>
    ),
  },
];

export function CookiePolicyContent() {
  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <section className="border-b border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Cookie Policy
          </h1>
          <p className="mt-4 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="space-y-10 text-sm leading-relaxed text-slate-600 sm:text-base">
              {sections.map((section) => (
                <div key={section.title}>
                  <h2 className="mb-3 text-lg font-semibold text-slate-900">{section.title}</h2>
                  {section.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

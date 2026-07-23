import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { CONTACT_EMAIL } from "@/lib/contact/constants";

const LAST_UPDATED = "June 12, 2026";

const sections = [
  {
    title: "1. Introduction",
    content: (
      <p>
        {APP_NAME} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your
        privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard information
        when you use our academic management platform, including our website, applications, and related
        services (collectively, the &quot;Service&quot;).
      </p>
    ),
  },
  {
    title: "2. Information We Collect",
    content: (
      <>
        <p className="mb-4">We may collect the following categories of information:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Account information:</strong> name, email address, password (stored securely in
            hashed form), role (lecturer or student), college or student ID, phone number, and profile
            details you provide during registration or in your account settings.
          </li>
          <li>
            <strong>Academic data:</strong> class sessions, course details, attendance records, test
            scores, assignment submissions, grades, continuous assessment calculations, and related
            academic records created or managed through the Service.
          </li>
          <li>
            <strong>Attendance and device data:</strong> attendance session participation, QR scan
            activity, timestamps, and device identifiers used to help verify attendance and prevent
            misuse.
          </li>
          <li>
            <strong>Payment and subscription data:</strong> subscription plan details, billing
            selections, transaction references, and payment status when you purchase a premium plan.
            Payment processing may be handled by third-party providers; we do not store full payment
            card details on our servers.
          </li>
          <li>
            <strong>Communications:</strong> information you submit through contact forms, partnership
            inquiries, support requests, or other correspondence with us.
          </li>
          <li>
            <strong>Technical and usage data:</strong> browser type, device information, IP address,
            log data, and activity related to authentication, security, and platform operations.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "3. How We Use Your Information",
    content: (
      <ul className="list-disc space-y-2 pl-6">
        <li>Provide, operate, and maintain the Service</li>
        <li>Create and manage user accounts and role-based access</li>
        <li>Enable attendance tracking, assessments, assignments, and academic record management</li>
        <li>Process subscriptions and payments</li>
        <li>Respond to inquiries, support requests, and partnership applications</li>
        <li>Send service-related communications, including account and security notices</li>
        <li>Monitor platform integrity, prevent fraud, and maintain audit logs</li>
        <li>Improve the Service, develop new features, and ensure reliability</li>
        <li>Comply with legal obligations and enforce our terms</li>
      </ul>
    ),
  },
  {
    title: "4. Academic and Institutional Data",
    content: (
      <p>
        Lecturers and authorized institutional users may upload, manage, and access academic records
        for their classes and students. Students can access information related to classes they join.
        We process this data on behalf of users and, where applicable, the educational institutions
        they represent. Institutions and lecturers are responsible for ensuring they have appropriate
        authority to collect and manage student academic data through the Service.
      </p>
    ),
  },
  {
    title: "5. How We Share Information",
    content: (
      <>
        <p className="mb-4">We do not sell your personal information. We may share information:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Within the platform:</strong> between lecturers, students, and administrators
            according to role permissions and class enrollment.
          </li>
          <li>
            <strong>With service providers:</strong> such as hosting, authentication, database,
            analytics, email, and payment partners that help us operate the Service.
          </li>
          <li>
            <strong>For legal reasons:</strong> when required by law, regulation, legal process, or
            governmental request, or to protect the rights, safety, and security of users and the
            platform.
          </li>
          <li>
            <strong>In connection with business changes:</strong> such as a merger, acquisition, or
            asset sale, subject to appropriate confidentiality safeguards.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "6. Data Security",
    content: (
      <p>
        We implement administrative, technical, and organizational measures designed to protect
        information against unauthorized access, loss, misuse, or alteration. These measures include
        secure authentication, encrypted connections, role-based access controls, and audit logging.
        However, no method of transmission or storage is completely secure, and we cannot guarantee
        absolute security.
      </p>
    ),
  },
  {
    title: "7. Data Retention",
    content: (
      <p>
        We retain personal and academic information for as long as necessary to provide the Service,
        fulfill the purposes described in this policy, comply with legal obligations, resolve
        disputes, and enforce our agreements. Retention periods may vary depending on the type of data
        and your relationship with the platform.
      </p>
    ),
  },
  {
    title: "8. Your Rights and Choices",
    content: (
      <ul className="list-disc space-y-2 pl-6">
        <li>Access and update your account information through your profile settings</li>
        <li>Request correction of inaccurate personal information</li>
        <li>Request deletion of your account, subject to legal and academic record obligations</li>
        <li>Opt out of non-essential communications where applicable</li>
        <li>Contact us to exercise privacy rights available in your jurisdiction</li>
      </ul>
    ),
  },
  {
    title: "9. Cookies and Similar Technologies",
    content: (
      <p>
        We use cookies and similar technologies to maintain sessions, remember preferences, support
        authentication, and improve platform performance. You can control cookies through your browser
        settings, but disabling certain cookies may affect Service functionality.
      </p>
    ),
  },
  {
    title: "10. Third-Party Services",
    content: (
      <p>
        The Service may contain links to third-party websites or integrate with third-party tools.
        Their privacy practices are governed by their own policies. We encourage you to review the
        privacy policies of any third-party services you use in connection with {APP_NAME}.
      </p>
    ),
  },
  {
    title: "11. Children and Students",
    content: (
      <p>
        The Service is designed for use in academic environments by lecturers, students, and
        institutions. Where students are minors, institutions and lecturers are responsible for
        ensuring appropriate consent and compliance with applicable education and child privacy laws.
      </p>
    ),
  },
  {
    title: "12. International Users",
    content: (
      <p>
        If you access the Service from outside the country where our servers or service providers are
        located, your information may be transferred to, stored in, and processed in other countries.
        By using the Service, you consent to such transfers subject to applicable data protection
        laws.
      </p>
    ),
  },
  {
    title: "13. Changes to This Policy",
    content: (
      <p>
        We may update this Privacy Policy from time to time. When we do, we will revise the &quot;Last
        updated&quot; date at the top of this page. Continued use of the Service after changes become
        effective constitutes acceptance of the updated policy.
      </p>
    ),
  },
  {
    title: "14. Contact Us",
    content: (
      <p>
        If you have questions about this Privacy Policy or our data practices, contact us at{" "}
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

export function PrivacyPolicyContent() {
  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <section className="border-b border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Privacy Policy
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

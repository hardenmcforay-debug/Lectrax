import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { CONTACT_EMAIL } from "@/lib/contact/constants";

const LAST_UPDATED = "June 12, 2026";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: (
      <p>
        By accessing or using {APP_NAME} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), including
        our website, applications, and related services (collectively, the &quot;Service&quot;), you agree
        to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, you may not use
        the Service.
      </p>
    ),
  },
  {
    title: "2. Description of Service",
    content: (
      <p>
        {APP_NAME} is an academic management platform that helps lecturers, students, and institutions
        manage attendance, assignments, assessments, continuous assessment records, and related academic
        activities. Features may vary based on your role, subscription plan, and institutional
        arrangements.
      </p>
    ),
  },
  {
    title: "3. Eligibility and Accounts",
    content: (
      <ul className="list-disc space-y-2 pl-6">
        <li>You must provide accurate and complete registration information.</li>
        <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
        <li>You are responsible for all activity that occurs under your account.</li>
        <li>You must notify us promptly of any unauthorized access or security breach.</li>
        <li>We may suspend or terminate accounts that violate these Terms or pose a security risk.</li>
      </ul>
    ),
  },
  {
    title: "4. User Roles and Responsibilities",
    content: (
      <>
        <p className="mb-4">The Service supports different user roles, including lecturers, students, and platform administrators. You agree to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Lecturers:</strong> use the Service lawfully to manage classes, attendance, grades,
            and academic records; ensure you have authority to process student data; and maintain
            accurate academic information.
          </li>
          <li>
            <strong>Students:</strong> use the Service only for legitimate academic participation,
            including joining authorized classes, submitting assignments, and marking attendance as
            permitted.
          </li>
          <li>
            <strong>Institutions:</strong> where applicable, ensure departmental or institutional use
            complies with internal policies and applicable education laws.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Subscriptions and Payments",
    content: (
      <ul className="list-disc space-y-2 pl-6">
        <li>
          Certain features require a paid subscription. Pricing, billing periods, and plan limits are
          described on our website and may change with notice.
        </li>
        <li>
          Payments are processed through third-party payment providers. By purchasing a subscription,
          you agree to the applicable payment terms presented at checkout.
        </li>
        <li>
          Subscriptions may renew automatically unless cancelled in accordance with the plan terms.
        </li>
        <li>
          Refunds, if any, are provided at our discretion unless otherwise required by applicable law.
        </li>
        <li>
          We may modify, limit, or discontinue free or paid features with reasonable notice where
          practicable.
        </li>
      </ul>
    ),
  },
  {
    title: "6. University Partnerships",
    content: (
      <p>
        Institutions may request departmental subscriptions through our partnership program. Partnership
        terms, onboarding, lecturer activation, and billing may be governed by separate agreements or
        order forms in addition to these Terms. In the event of conflict, the partnership agreement
        will control for the covered institution.
      </p>
    ),
  },
  {
    title: "7. Acceptable Use",
    content: (
      <>
        <p className="mb-4">You agree not to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Use the Service for unlawful, fraudulent, or harmful purposes</li>
          <li>Attempt to gain unauthorized access to accounts, data, or systems</li>
          <li>Interfere with or disrupt the integrity or performance of the Service</li>
          <li>Upload malicious code, spam, or misleading content</li>
          <li>Circumvent attendance verification, access controls, or subscription limits</li>
          <li>Impersonate another person or misrepresent your affiliation</li>
          <li>Harvest or misuse personal or academic data without authorization</li>
          <li>Reverse engineer or copy the Service except as permitted by law</li>
        </ul>
      </>
    ),
  },
  {
    title: "8. Academic Data and Content",
    content: (
      <p>
        You retain ownership of academic content and records you submit to the Service, subject to the
        rights necessary for us to host, process, display, and back up that content to provide the
        Service. You grant us a limited license to use submitted content solely to operate, improve,
        and secure the platform. You represent that you have the rights to submit content and data you
        provide and that doing so does not violate any law or third-party rights.
      </p>
    ),
  },
  {
    title: "9. Intellectual Property",
    content: (
      <p>
        The Service, including its software, design, branding, documentation, and underlying
        technology, is owned by {APP_NAME} or its licensors and is protected by intellectual property
        laws. These Terms do not grant you any right to use our trademarks, logos, or branding without
        prior written permission.
      </p>
    ),
  },
  {
    title: "10. Privacy",
    content: (
      <p>
        Our collection and use of personal information is described in our{" "}
        <Link href="/privacy" className="font-medium text-primary hover:underline">
          Privacy Policy
        </Link>
        , which is incorporated into these Terms by reference.
      </p>
    ),
  },
  {
    title: "11. Service Availability and Modifications",
    content: (
      <p>
        We strive to keep the Service available and reliable, but we do not guarantee uninterrupted or
        error-free operation. We may modify, suspend, or discontinue any part of the Service for
        maintenance, security, legal compliance, or business reasons. We are not liable for temporary
        interruptions or changes that do not materially reduce core functionality without reasonable
        notice.
      </p>
    ),
  },
  {
    title: "12. Termination",
    content: (
      <p>
        You may stop using the Service at any time. We may suspend or terminate your access if you
        violate these Terms, create risk for other users, or where required by law. Upon termination,
        your right to access the Service ends, but provisions that by their nature should survive will
        remain in effect, including intellectual property, disclaimers, limitations of liability, and
        dispute provisions.
      </p>
    ),
  },
  {
    title: "13. Disclaimers",
    content: (
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY
        KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL MEET YOUR
        REQUIREMENTS OR THAT ACADEMIC OUTCOMES, GRADES, OR RECORDS WILL BE ERROR-FREE. LECTURERS AND
        INSTITUTIONS REMAIN RESPONSIBLE FOR ACADEMIC DECISIONS AND COMPLIANCE WITH APPLICABLE
        EDUCATION RULES.
      </p>
    ),
  },
  {
    title: "14. Limitation of Liability",
    content: (
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, {APP_NAME.toUpperCase()} AND ITS AFFILIATES, OFFICERS,
        EMPLOYEES, AND SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
        CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR ACADEMIC
        RECORDS, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF
        OR RELATING TO THE SERVICE WILL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS
        BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR ONE HUNDRED U.S. DOLLARS ($100) IF NO FEES WERE
        PAID.
      </p>
    ),
  },
  {
    title: "15. Indemnification",
    content: (
      <p>
        You agree to indemnify and hold harmless {APP_NAME} and its affiliates from claims, damages,
        losses, and expenses (including reasonable legal fees) arising from your use of the Service,
        your content or data, your violation of these Terms, or your violation of any law or
        third-party rights.
      </p>
    ),
  },
  {
    title: "16. Governing Law",
    content: (
      <p>
        These Terms are governed by the laws applicable in the jurisdiction where {APP_NAME} operates,
        without regard to conflict-of-law principles. Any disputes will be resolved in the courts or
        forums of that jurisdiction, unless otherwise required by applicable law.
      </p>
    ),
  },
  {
    title: "17. Changes to These Terms",
    content: (
      <p>
        We may update these Terms from time to time. When we do, we will revise the &quot;Last
        updated&quot; date at the top of this page. Continued use of the Service after changes become
        effective constitutes acceptance of the updated Terms. If you do not agree, you must stop using
        the Service.
      </p>
    ),
  },
  {
    title: "18. Contact Us",
    content: (
      <p>
        If you have questions about these Terms, contact us at{" "}
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

export function TermsOfServiceContent() {
  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <section className="border-b border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Terms of Service
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

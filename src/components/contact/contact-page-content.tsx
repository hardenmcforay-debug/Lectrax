import Link from "next/link";
import { Building2, Clock, Mail, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { CONTACT_EMAIL } from "@/lib/contact/constants";

const contactChannels = [
  {
    icon: Mail,
    title: "Email",
    description: "Reach our team directly for product questions, support, or general inquiries.",
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
  },
  {
    icon: Clock,
    title: "Response Time",
    description: "We typically respond to messages within 1–2 business days.",
    value: "Monday – Friday",
  },
  {
    icon: Building2,
    title: "University Partnerships",
    description: "Looking to onboard your department? Visit our partnerships page for annual plans.",
    value: "Request Partnership",
    href: "/partnerships",
  },
];

export function ContactPageContent() {
  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <section className="border-b border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <MessageCircle className="h-4 w-4" aria-hidden />
            We&apos;re here to help
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Contact Us
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Have a question about Lectrax, need support, or want to learn more? Send us a message and
            our team will get back to you as soon as possible.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Get in touch</h2>
                <p className="mt-2 text-slate-600">
                  Whether you&apos;re a lecturer, student, or institution exploring Lectrax, we&apos;d
                  love to hear from you.
                </p>
              </div>

              <div className="grid gap-4">
                {contactChannels.map((channel) => {
                  const Icon = channel.icon;
                  const content = (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" aria-hidden />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{channel.title}</h3>
                          <p className="mt-1 text-sm text-slate-600">{channel.description}</p>
                          <p className="mt-3 text-sm font-medium text-primary">{channel.value}</p>
                        </div>
                      </div>
                    </div>
                  );

                  if (channel.href) {
                    return (
                      <Link key={channel.title} href={channel.href} className="block">
                        {content}
                      </Link>
                    );
                  }

                  return <div key={channel.title}>{content}</div>;
                })}
              </div>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}

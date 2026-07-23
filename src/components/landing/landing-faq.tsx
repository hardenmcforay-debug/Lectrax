import { ChevronDown } from "lucide-react";

import {

  LandingReveal,

  LandingStagger,

  LandingStaggerItem,

} from "@/components/landing/landing-motion";



const faqs = [

  {

    q: "What is Lectrax?",

    a: "Lectrax is a modern academic management platform that helps lecturers and institutions manage attendance, assignments, assessments, continuous assessment records, and student performance from one secure cloud-based system.",

  },

  {

    q: "How does QR attendance work?",

    a: "Lecturers start an attendance session and display a time-limited QR code. Students scan the code with their device to mark present. Lectrax validates sessions, prevents duplicate scans, and stores a permanent audit trail.",

  },

  {

    q: "Can students submit assignments?",

    a: "Yes. On the Standard plan, students can upload assignment submissions directly through Lectrax. Lecturers review, grade, and track submissions with full visibility into each student's work.",

  },

  {

    q: "How are CA scores calculated?",

    a: "Lectrax lets you define weights for attendance, assignments, and tests. The platform automatically calculates continuous assessment scores based on your configured structure and recorded grades.",

  },

  {

    q: "Is my data secure?",

    a: "Lectrax uses secure authentication, role-based access, encrypted connections, and permanent audit logs. Academic records are organized per lecturer and class session with enterprise-grade data protection practices.",

  },

];



export function LandingFaq() {

  return (

    <section className="bg-white py-20 sm:py-24">

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

        <LandingReveal className="text-center">
          <h2 className="text-balance text-3xl font-bold leading-snug tracking-tight text-slate-900 sm:text-3xl sm:leading-tight lg:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-slate-600 sm:mt-4 lg:text-lg">
            Everything you need to know about getting started with Lectrax.
          </p>
        </LandingReveal>

        <LandingStagger className="mt-8 flex flex-col gap-3 sm:mt-10 sm:gap-4 lg:mt-12">
          {faqs.map((faq) => (
            <LandingStaggerItem key={faq.q}>
              <details className="group rounded-2xl border border-slate-200/80 bg-white px-4 py-1 sm:px-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 text-left text-base font-medium leading-snug text-slate-900 transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                  <span className="text-pretty pr-1">{faq.q}</span>
                  <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="pb-4 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
                  {faq.a}
                </p>
              </details>
            </LandingStaggerItem>
          ))}
        </LandingStagger>

      </div>

    </section>

  );

}



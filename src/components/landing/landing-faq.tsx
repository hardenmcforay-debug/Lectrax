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

          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">

            Frequently Asked Questions

          </h2>

          <p className="mt-4 text-lg text-slate-600">

            Everything you need to know about getting started with Lectrax.

          </p>

        </LandingReveal>



        <LandingStagger className="mt-12 divide-y divide-border">

          {faqs.map((faq) => (

            <LandingStaggerItem key={faq.q}>

              <details className="group">

                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-medium text-slate-900 transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">

                  {faq.q}

                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />

                </summary>

                <p className="pb-4 text-base leading-relaxed text-muted-foreground">{faq.a}</p>

              </details>

            </LandingStaggerItem>

          ))}

        </LandingStagger>

      </div>

    </section>

  );

}



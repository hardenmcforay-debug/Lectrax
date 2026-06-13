import {

  BarChart3,

  BookOpen,

  ClipboardCheck,

  FileText,

  QrCode,

  Shield,

} from "lucide-react";

import {

  LandingReveal,

  LandingStagger,

  LandingStaggerItem,

} from "@/components/landing/landing-motion";



const features = [

  {

    icon: QrCode,

    title: "Attendance Management",

    description: "Track attendance using QR codes and manual verification.",

  },

  {

    icon: FileText,

    title: "Assignment Management",

    description: "Create, distribute, and manage assignments efficiently.",

  },

  {

    icon: ClipboardCheck,

    title: "Continuous Assessment",

    description: "Record tests, assignments, and automatically calculate CA scores.",

  },

  {

    icon: BarChart3,

    title: "Student Analytics",

    description: "Monitor student performance and academic engagement.",

  },

  {

    icon: BookOpen,

    title: "Class Session Management",

    description: "Create and manage academic sessions with ease.",

  },

  {

    icon: Shield,

    title: "Secure Academic Records",

    description: "Keep academic data organized and protected.",

  },

];



export function LandingFeatures() {

  return (

    <section id="features" className="relative -mt-px scroll-mt-20 bg-white py-20 sm:py-24">

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <LandingReveal className="mx-auto max-w-2xl text-center">

          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">

            Everything You Need to Manage Academic Activities

          </h2>

          <p className="mt-4 text-lg text-slate-600">

            A complete toolkit for lecturers, departments, and institutions. designed for clarity,

            speed, and accuracy.

          </p>

        </LandingReveal>



        <LandingStagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

          {features.map(({ icon: Icon, title, description }) => (

            <LandingStaggerItem key={title}>

              <article className="landing-feature-card h-full rounded-2xl border border-slate-200/80 bg-white p-6">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">

                  <Icon className="h-6 w-6 text-white" />

                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>

              </article>

            </LandingStaggerItem>

          ))}

        </LandingStagger>

      </div>

    </section>

  );

}



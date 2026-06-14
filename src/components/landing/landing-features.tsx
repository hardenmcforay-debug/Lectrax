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

        <LandingReveal className="mx-auto max-w-2xl px-1 text-center sm:px-0">
          <h2 className="text-balance text-xl font-bold leading-snug tracking-tight text-slate-900 min-[400px]:text-2xl sm:text-3xl sm:leading-tight lg:text-4xl">
            Everything You Need to Manage Academic Activities
          </h2>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600 sm:mt-4 sm:text-base sm:leading-relaxed lg:text-lg">
            A complete toolkit for lecturers, departments, and institutions. Designed for clarity,
            speed, and accuracy.
          </p>
        </LandingReveal>



        <LandingStagger className="mt-10 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <LandingStaggerItem key={title}>
              <article className="landing-feature-card flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-5 lg:p-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary lg:h-12 lg:w-12">
                  <Icon className="h-5 w-5 text-white lg:h-6 lg:w-6" />
                </div>
                <h3 className="mt-4 text-balance text-base font-semibold leading-snug text-slate-900 lg:mt-5 lg:text-lg">
                  {title}
                </h3>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-600">
                  {description}
                </p>
              </article>
            </LandingStaggerItem>
          ))}
        </LandingStagger>
      </div>

    </section>

  );

}



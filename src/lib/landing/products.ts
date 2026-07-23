export const PRODUCT_SLUGS = [
  "qr-attendance",
  "assignment-management",
  "continuous-assessment",
  "performance-analytics",
  "class-session-management",
  "secure-academic-records",
] as const;

export type ProductSlug = (typeof PRODUCT_SLUGS)[number];

export type ProductStep = {
  title: string;
  description: string;
};

export type ProductGuide = {
  audience: string;
  intro: string;
  steps: ProductStep[];
};

export type ProductFaq = {
  question: string;
  answer: string;
};

export type ProductDetail = {
  slug: ProductSlug;
  navLabel: string;
  title: string;
  headline: string;
  summary: string;
  image: string;
  benefits: string[];
  howItWorks: ProductStep[];
  outcomes: string[];
  overview?: string[];
  guides?: ProductGuide[];
  keyFacts?: string[];
  faqs?: ProductFaq[];
};

export const PRODUCTS: ProductDetail[] = [
  {
    slug: "qr-attendance",
    navLabel: "QR Attendance",
    title: "QR Attendance",
    headline: "Take attendance in seconds with secure QR check-ins",
    summary:
      "Lectrax QR Attendance helps lecturers run fast, reliable class check-ins while reducing proxy attendance and paperwork. Students scan a live rotating QR code during an open attendance window, and present records are saved instantly to the class session.",
    image: "/landing/features/attendance-management.svg",
    overview: [
      "QR Attendance is built for real classroom use. Lecturers open a timed attendance window, project a live QR code, and watch present counts update as students scan.",
      "The QR code is not a static poster. It refreshes about every 5 seconds, so screenshots and old codes stop working quickly. That makes it harder for students to share attendance outside class.",
      "Students must join the class first with the session code. Once enrolled, they scan from the Lectrax student Scan page when attendance is open.",
      "If a student cannot scan, lecturers can mark them present manually. QR-verified marks stay locked for stronger attendance integrity.",
    ],
    benefits: [
      "Faster roll call without calling names one by one",
      "Rotating QR codes that reduce proxy attendance and screenshot sharing",
      "Live present count while attendance is open",
      "Manual mark options when a student cannot scan",
      "Device binding that ties each student account to one phone",
      "Attendance history stored against the class session for reporting",
    ],
    howItWorks: [
      {
        title: "Create and share your class session",
        description:
          "Create a class session in Lectrax with your course details. Lectrax generates a unique 6-character session code that students use once to join the class.",
      },
      {
        title: "Start attendance and choose a window",
        description:
          "Open the session, click the Attendance link and select Generate QR Code. Choose how long attendance should stay open: 5, 10, 15, 20, 30, 45, or 60 minutes. Only one attendance session can run at a time for that class.",
      },
      {
        title: "Display the live QR code",
        description:
          "Project the live QR panel for the class. Students see a code that refreshes about every 5 seconds. The panel also shows session details and a live present count.",
      },
      {
        title: "Students scan to check in",
        description:
          "Enrolled students open Scan Attendance, launch the camera scanner, and scan the current QR. A successful scan records them as present with date and time. Rescanning the same session shows that attendance is already recorded.",
      },
      {
        title: "Use manual attendance when needed",
        description:
          "If a student cannot scan, mark them present with Manual Attendance. Lecturers can remove manual marks if needed, but QR-verified marks remain locked.",
      },
      {
        title: "End attendance and keep the record",
        description:
          "End attendance when class check-in is complete, or let the selected window expire. Closing the live QR page also ends collection, so a static screenshot cannot keep attendance open.",
      },
    ],
    guides: [
      {
        audience: "For lecturers",
        intro: "Use this flow every time you want to take attendance in class.",
        steps: [
          {
            title: "1. Open your class session",
            description:
              "Sign in as a lecturer, open Sessions, and select the class you want to take attendance for.",
          },
          {
            title: "2. Make sure students have joined",
            description:
              "Share the class session code before attendance starts. Students must join the class once before they can scan.",
          },
          {
            title: "3. Generate the QR code",
            description:
              "Select Generate QR Code and choose an attendance window. Keep the QR page open and visible while students check in.",
          },
          {
            title: "4. Watch the live present count",
            description:
              "As students scan successfully, the present count updates. Use Manual Attendance for anyone who cannot scan.",
          },
          {
            title: "5. End attendance",
            description:
              "Select End Attendance when finished. Do not leave a stale QR page open after class, and do not rely on screenshots.",
          },
        ],
      },
      {
        audience: "For students",
        intro: "Follow these steps to mark yourself present during an open attendance session.",
        steps: [
          {
            title: "1. Join the class first",
            description:
              "Open Join Class in your student portal and enter the lecturer’s 6-character session code. You only need to do this once per class.",
          },
          {
            title: "2. Wait for attendance to open",
            description:
              "When your lecturer starts attendance, you can open Scan Attendance from your student portal.",
          },
          {
            title: "3. Open the camera scanner",
            description:
              "On the Scan page, select Open Camera Scanner and point your phone at the live QR code projected in class.",
          },
          {
            title: "4. Confirm your check-in",
            description:
              "If the scan succeeds, Lectrax shows that attendance was recorded with the time and date. You do not need to scan again for that same attendance session.",
          },
          {
            title: "5. If the code fails",
            description:
              "Scan the current live QR, not an old screenshot. If you changed phones, complete a device transfer before scanning again.",
          },
        ],
      },
    ],
    keyFacts: [
      "Session code: permanent class join code students use once to enroll",
      "Attendance window: timed check-in period chosen by the lecturer (5–60 minutes)",
      "QR token: short-lived code that refreshes about every 5 seconds",
      "Only the latest QR is valid during an open attendance session",
      "One attendance record per student per attendance session",
      "QR-verified marks cannot be unmarked from Manual Attendance",
      "Each student account is bound to one device for scanning",
      "An active lecturer subscription is not required to start attendance",
    ],
    faqs: [
      {
        question: "What is the difference between a session code and the QR code?",
        answer:
          "The session code is the permanent class join code students use to enroll in the class. The QR code is a temporary attendance check-in code that only works while attendance is open and refreshes about every 5 seconds.",
      },
      {
        question: "Can students share a screenshot of the QR code?",
        answer:
          "Screenshots become invalid quickly because the QR rotates. Only the latest live code works, which helps reduce proxy attendance outside the classroom.",
      },
      {
        question: "What if a student’s phone cannot scan?",
        answer:
          "The lecturer can mark that student present with Manual Attendance. Manual marks can be corrected if the lecturer Mistakenly marked a student present, while QR-verified marks stay locked.",
      },
      {
        question: "Can a student use a different phone later?",
        answer:
          "Attendance scanning is device-bound. If a student changes phones, they need to complete a device transfer. After transfer, the old device loses scan access.",
      },
      {
        question: "Can two attendance sessions run at the same time for one class?",
        answer:
          "No. Lectrax allows only one active attendance session for a class at a time. End the current session before starting another.",
      },
      {
        question: "What happens if the lecturer closes the QR page?",
        answer:
          "Closing the live QR page ends attendance collection. Students must scan while the lecturer’s attendance panel is open and active.",
      },
    ],
    outcomes: [
      "Less time spent on attendance administration",
      "Stronger protection against proxy attendance",
      "Clearer attendance trails for departments and audits",
    ],
  },
  {
    slug: "assignment-management",
    navLabel: "Assignment Management",
    title: "Assignment Management",
    headline: "Create, distribute, and grade assignments in one workflow",
    summary:
      "Assignment Management in Lectrax gives lecturers a structured way to publish coursework, collect submissions, and track progress without juggling email threads or disconnected files.",
    image: "/landing/features/assignment-management.svg",
    benefits: [
      "Publish assignments directly into the right class session",
      "Clear deadlines and submission visibility for students",
      "Centralized review and grading in one place",
      "Fewer lost submissions and follow-up messages",
    ],
    howItWorks: [
      {
        title: "Create the assignment",
        description:
          "Add a title, instructions, deadline, and any supporting details so students know exactly what is expected.",
      },
      {
        title: "Share with the class",
        description:
          "Publish the assignment to the relevant session so enrolled students can view it from their Lectrax portal.",
      },
      {
        title: "Collect submissions",
        description:
          "Students submit through Lectrax, and lecturers can monitor who has submitted, who is late, and what remains outstanding.",
      },
      {
        title: "Review and grade",
        description:
          "Open submissions from one dashboard, record grades, and keep assignment results connected to continuous assessment.",
      },
    ],
    outcomes: [
      "Smoother coursework delivery for large classes",
      "Better visibility into student completion rates",
      "Assignment scores that feed into CA without re-entry",
    ],
  },
  {
    slug: "continuous-assessment",
    navLabel: "Continuous Assessment",
    title: "Continuous Assessment",
    headline: "Track tests, assignments, and CA scores in one place",
    summary:
      "Continuous Assessment in Lectrax brings tests, assignments, and CA calculations together so lecturers can monitor performance throughout the term instead of waiting until the end.",
    image: "/landing/features/continuous-assessment.svg",
    benefits: [
      "Unified view of tests and assignment scores",
      "Automatic CA calculation based on recorded results",
      "No spreadsheet errors and manual rewrites",
      "Clear academic progress for lecturers and students",
    ],
    howItWorks: [
      {
        title: "Record assessments",
        description:
          "Enter test results and assignment grades as they happen. Lectrax keeps each record linked to the correct session and student.",
      },
      {
        title: "Organize by academic activity",
        description:
          "Separate tests, assignments, and related CA components so scoring stays structured and easy to review.",
      },
      {
        title: "Calculate CA automatically",
        description:
          "Lectrax consolidates recorded scores into continuous assessment totals, reducing repetitive calculation work.",
      },
      {
        title: "Monitor progress over time",
        description:
          "Use the CA dashboard to spot gaps early, follow up with students, and prepare accurate term reports.",
      },
    ],
    outcomes: [
      "More consistent CA tracking across sessions",
      "Faster preparation for departmental reporting",
      "Better mid-term visibility into student performance",
    ],
  },
  {
    slug: "performance-analytics",
    navLabel: "Performance Analytics",
    title: "Performance Analytics",
    headline: "Understand student performance with clear academic insights",
    summary:
      "Performance Analytics turns attendance, assessment, and engagement data into practical insights so lecturers can support students earlier and report progress with confidence.",
    image: "/landing/features/student-analytics.svg",
    benefits: [
      "Visual insights into class and student trends",
      "Easier identification of at-risk students",
      "Evidence-based teaching and follow-up decisions",
      "Export-ready records for academic reporting",
    ],
    howItWorks: [
      {
        title: "Collect academic activity data",
        description:
          "As attendance, tests, and assignments are recorded in Lectrax, analytics builds a live picture of class performance.",
      },
      {
        title: "Explore the analytics dashboard",
        description:
          "Review trends across sessions, compare performance signals, and focus on the metrics that matter for your course.",
      },
      {
        title: "Drill into student progress",
        description:
          "Open individual student views to understand attendance patterns, assessment results, and overall engagement.",
      },
      {
        title: "Act on the insights",
        description:
          "Use the data to intervene early, adjust teaching focus, and share clearer updates with departments when needed.",
      },
    ],
    outcomes: [
      "Faster academic decision-making",
      "Stronger student support and follow-up",
      "Clearer performance reporting for institutions",
    ],
  },
  {
    slug: "class-session-management",
    navLabel: "Class Session Management",
    title: "Class Session Management",
    headline: "Organize courses, sessions, and student access with ease",
    summary:
      "Class Session Management is the foundation of Lectrax. Lecturers create sessions, invite students with session codes, and keep attendance, assessments, and records connected in one academic workspace.",
    image: "/landing/features/class-session-management.svg",
    benefits: [
      "Quick session setup with clear course details",
      "Simple student join flow using session codes",
      "One workspace for attendance, tests, and assignments",
      "Better organization for multi-course lecturers",
    ],
    howItWorks: [
      {
        title: "Create a class session",
        description:
          "Add course information and launch a session in minutes. Lectrax prepares the workspace for attendance and assessments.",
      },
      {
        title: "Share the session code",
        description:
          "Give students a unique code so they can join the right class without complicated enrollment steps.",
      },
      {
        title: "Run academic activities",
        description:
          "Use the same session for QR attendance, tests, assignments, and ongoing CA tracking throughout the term.",
      },
      {
        title: "Keep everything connected",
        description:
          "Student lists, grades, and attendance stay attached to the session, making mid-term and final reviews much simpler.",
      },
    ],
    outcomes: [
      "Less setup friction at the start of each term",
      "Cleaner organization across multiple courses",
      "A single source of truth for class activities",
    ],
  },
  {
    slug: "secure-academic-records",
    navLabel: "Secure Academic Records",
    title: "Secure Academic Records",
    headline: "Keep academic data organized, protected, and easy to retrieve",
    summary:
      "Secure Academic Records in Lectrax helps institutions protect attendance, assessment, and performance data with role-based access, structured storage, and audit-friendly history.",
    image: "/landing/features/secure-academic-records.svg",
    benefits: [
      "Role-based access for lecturers and students",
      "Organized academic history across sessions",
      "Reduced risk of lost or scattered records",
      "Stronger confidence for departmental audits",
    ],
    howItWorks: [
      {
        title: "Capture records in the platform",
        description:
          "Attendance, tests, assignments, and CA data are stored as part of normal Lectrax workflows instead of scattered files.",
      },
      {
        title: "Control who can access what",
        description:
          "Role-based permissions help ensure lecturers and students only see the information they need.",
      },
      {
        title: "Maintain a clear academic trail",
        description:
          "Session-linked records make it easier to review history, resolve disputes, and support institutional reporting.",
      },
      {
        title: "Export and report when required",
        description:
          "Retrieve organized academic information for reviews, departmental meetings, or end-of-term reporting needs.",
      },
    ],
    outcomes: [
      "More trustworthy academic record keeping",
      "Less administrative risk from lost files",
      "Better readiness for institutional reviews",
    ],
  },
];

export function isProductSlug(value: string): value is ProductSlug {
  return (PRODUCT_SLUGS as readonly string[]).includes(value);
}

/** Products that use an uploaded hero image (Secure Academic Records uses a custom illustration). */
export const PRODUCT_IMAGE_UPLOAD_SLUGS = PRODUCT_SLUGS.filter(
  (slug) => slug !== "secure-academic-records"
);

export type ProductImageUploadSlug = (typeof PRODUCT_IMAGE_UPLOAD_SLUGS)[number];

export function isProductImageUploadSlug(value: string): value is ProductImageUploadSlug {
  return (PRODUCT_IMAGE_UPLOAD_SLUGS as readonly string[]).includes(value);
}

export function getProductsWithImageUpload(): Array<
  ProductDetail & { slug: ProductImageUploadSlug }
> {
  return PRODUCTS.filter(
    (product): product is ProductDetail & { slug: ProductImageUploadSlug } =>
      isProductImageUploadSlug(product.slug)
  );
}

export function getProductBySlug(slug: string): ProductDetail | undefined {
  return PRODUCTS.find((product) => product.slug === slug);
}

export function getProductNavLinks() {
  return PRODUCTS.map((product) => ({
    label: product.navLabel,
    href: `/products/${product.slug}`,
  }));
}

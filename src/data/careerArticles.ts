export interface CareerArticleSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface CareerArticle {
  slug: string;
  title: string;
  topic: 'Country Guide' | 'CV Writing' | 'Interview Prep' | 'GCC Strategy' | 'Labor Contracts' | 'Career Skills';
  readingTime: string;
  updatedDate: string;
  summary: string;
  editorialAttribution: string;
  keyTakeaways: string[];
  sections: CareerArticleSection[];
  relatedCountrySlug?: string;
}

export const CAREER_ARTICLES: CareerArticle[] = [
  {
    slug: 'how-to-find-a-job-in-saudi-arabia',
    title: 'How to Find a Job in Saudi Arabia',
    topic: 'Country Guide',
    readingTime: '6 min read',
    updatedDate: 'November 2026',
    summary:
      'A practical roadmap for local and international candidates targeting roles in Riyadh, Jeddah, Dammam, and across Saudi Arabia’s expanding industrial and service sectors.',
    editorialAttribution: 'Gulfaro Career Editorial Guide',
    relatedCountrySlug: 'saudi-arabia',
    keyTakeaways: [
      'Verify whether your profession requires registration with the Saudi Council of Engineers (SCE), SCFHS, or SOCPA before applying.',
      'Tailor your CV summary to clearly state your current location, notice period, and residency or transferability status.',
      'Contact direct employers politely via email or phone using structured subject lines and attested qualification summaries.',
      'Never pay third parties for visa processing or interview scheduling—official hiring costs are borne by employers under Saudi Labor Law.'
    ],
    sections: [
      {
        heading: 'Understand Demand Hubs Across the Kingdom',
        paragraphs: [
          'Employment opportunities in Saudi Arabia vary considerably by region. Riyadh concentrates corporate headquarters, technology transformation programs, financial institutions, and major mixed-use construction. Jeddah and the Western Region anchor healthcare, commercial trade, logistics, and hospitality services, while Dammam, Khobar, and Jubail remain core hubs for energy, petrochemicals, manufacturing, and heavy industrial engineering.',
          'Targeting cities where your industry is concentrated helps focus your applications and improves response rates from hiring managers who need local operational familiarity.'
        ]
      },
      {
        heading: 'Prepare Mandatory Professional Accreditations Early',
        paragraphs: [
          'Regulated professions in Saudi Arabia require formal credential verification before a work contract or sponsorship transfer can be completed. Completing or initiating your documentation early signals readiness to recruiters.'
        ],
        bullets: [
          'Engineering roles: Register and classify qualifications with the Saudi Council of Engineers (SCE).',
          'Healthcare professionals: Obtain active classification and registration via SCFHS Mumaris+ and DataFlow verification.',
          'Finance and auditing: Highlight familiarity with ZATCA VAT regulations, e-invoicing, and IFRS compliance.',
          'University degree attestation: Keep certified translations and apostille or embassy attestations ready.'
        ]
      },
      {
        heading: 'Communicating Residency & Qiwa Readiness Clearly',
        paragraphs: [
          'If you are already residing in Saudi Arabia, stating clearly whether your Iqama is transferable via Qiwa and noting your standard notice period eliminates initial screening friction. For candidates applying from abroad, focus on demonstrable project metrics, international safety or technical certifications, and clean passport validity.'
        ]
      },
      {
        heading: 'Applying Directly and Protecting Yourself',
        paragraphs: [
          'When reaching out directly to employers listed on Gulfaro by email, include the exact job title and reference code in your subject line, attach a concise two-page PDF CV, and keep your cover note under five sentences. Remember that under Saudi regulations, recruitment, work permit, and visa issuance fees are the responsibility of the employer—any request for advance cash or wire transfers should be treated as fraudulent.'
        ]
      }
    ]
  },
  {
    slug: 'how-to-prepare-a-professional-cv',
    title: 'How to Prepare a Professional CV',
    topic: 'CV Writing',
    readingTime: '5 min read',
    updatedDate: 'November 2026',
    summary:
      'Learn how to structure a clean, ATS-readable, two-page CV tailored for hiring managers across Saudi Arabia, the UAE, Qatar, Kuwait, Bahrain, and Oman.',
    editorialAttribution: 'Gulfaro Career Editorial Guide',
    keyTakeaways: [
      'Keep your CV focused at 1–2 pages with clean reverse-chronological work history.',
      'Open with a concise 3-line professional summary highlighting years of experience, core domain, and GCC readiness.',
      'Replace generic job duties with measurable accomplishments, project scales, and software tools.',
      'Save and send as a cleanly named PDF (e.g., FirstName-LastName-Role-CV.pdf).'
    ],
    sections: [
      {
        heading: 'Use a Clean, Scannable Layout',
        paragraphs: [
          'Hiring managers and HR officers frequently review dozens of candidate CVs in minutes. Multi-column graphics, heavy tables, and decorative progress bars often distort when opened on mobile devices or applicant tracking tools. A single-column layout with clear typography, generous margins, and consistent section headings reads reliably across every screen.'
        ]
      },
      {
        heading: 'Essential Sections in Order of Importance',
        paragraphs: [
          'Place the most decision-critical facts at the top third of your first page so a recruiter sees your fit immediately.'
        ],
        bullets: [
          'Contact Header: Full name, target job title, current city and country, professional email address, and direct phone number with country code.',
          'Professional Summary: Three crisp lines summarizing total experience, sector specialization, and key licenses or languages.',
          'Core Competencies: 8 to 12 concrete technical skills, standards, or software platforms (for example: SAP S/4HANA, AutoCAD, NEBOSH IGC, React, SCFHS).',
          'Work Experience: Company name, city/country, dates (Month Year), and 3 to 5 bullet points focused on results.',
          'Education & Certifications: University degrees, graduation year, and active professional licenses.'
        ]
      },
      {
        heading: 'Turn Passive Duties into Concrete Evidence',
        paragraphs: [
          'Instead of writing "Responsible for managing accounts," specify scope and outcomes: "Managed monthly general ledger closing and quarterly VAT returns for three commercial trading subsidiaries using SAP." For engineering or site roles, mention project budgets, team sizes supervised, or safety milestones achieved.'
        ]
      },
      {
        heading: 'Details Best Kept Concise or Omitted',
        paragraphs: [
          'Do not include sensitive personal identification numbers such as passport numbers, national IDs, or bank details on a public CV. Wait until an employer extends a verified offer and requests onboarding documentation through official channels.'
        ]
      }
    ]
  },
  {
    slug: 'common-interview-questions-and-answers',
    title: 'Common Interview Questions and Answers',
    topic: 'Interview Prep',
    readingTime: '6 min read',
    updatedDate: 'November 2026',
    summary:
      'Structured guidance on answering the most frequent behavioral, technical, and relocation questions asked by GCC recruitment teams.',
    editorialAttribution: 'Gulfaro Career Editorial Guide',
    keyTakeaways: [
      'Use the Situation–Task–Action–Result (STAR) structure to keep answers focused under two minutes.',
      'Prepare real examples demonstrating teamwork in multicultural workplaces.',
      'Research the employer’s industry footprint and local regulations before the conversation.',
      'Ask thoughtful questions about reporting lines, KPIs, and onboarding timelines.'
    ],
    sections: [
      {
        heading: '1. "Tell us about your professional background and why you fit this role."',
        paragraphs: [
          'Hiring managers use this opening question to assess communication clarity and relevance rather than your entire life story. Structure a 60-to-90-second summary covering your current or most recent role, two standout achievements directly aligned with the vacancy requirements, and why this next step matches your technical strengths.'
        ]
      },
      {
        heading: '2. "Describe a challenging project or operational issue you resolved."',
        paragraphs: [
          'Use the STAR method so the interviewer hears concrete ownership rather than vague generalities:'
        ],
        bullets: [
          'Situation: Briefly describe the operational bottleneck, deadline constraint, or compliance problem.',
          'Task: Clarify your specific responsibility in resolving it.',
          'Action: Detail the technical or coordination steps you took personally.',
          'Result: State the measurable outcome—such as reduced downtime, audit compliance, or on-time handover.'
        ]
      },
      {
        heading: '3. "What are your salary expectations and notice period?"',
        paragraphs: [
          'Before your interview, benchmark standard monthly total-package ranges in the target GCC currency (SAR, AED, QAR, KWD, BHD, or OMR), considering whether housing or transportation is separate or bundled. State a realistic range clearly and specify whether you are immediately available or serving a 30-to-60-day notice period.'
        ]
      },
      {
        heading: '4. "Do you have any questions for us?"',
        paragraphs: [
          'Always prepare two constructive questions. Asking "What are the primary milestones for the first 90 days in this role?" and "How does the team collaborate across site and head office functions?" shows genuine operational maturity.'
        ]
      }
    ]
  },
  {
    slug: 'job-search-tips-for-gcc-countries',
    title: 'Job Search Tips for GCC Countries',
    topic: 'GCC Strategy',
    readingTime: '5 min read',
    updatedDate: 'November 2026',
    summary:
      'Proven job search habits for professionals pursuing vacancies across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman.',
    editorialAttribution: 'Gulfaro Career Editorial Guide',
    keyTakeaways: [
      'Apply selectively to roles where you meet at least 75% of mandatory qualifications instead of mass-sending generic emails.',
      'Understand regional hiring calendars—hiring activity typically peaks between January–April and September–November.',
      'Double-check email etiquette, file naming, and telephone responsiveness when applying directly.',
      'Verify company trade names and official labor laws before committing to relocation.'
    ],
    sections: [
      {
        heading: 'Quality and Precision Beat Mass Applications',
        paragraphs: [
          'Sending identical emails to fifty unrelated vacancies reduces your credibility. Employers who post direct contact emails look for candidates who read the requirements carefully. Take five minutes to align your cover email with the vacancy’s core skills, required experience, and location.'
        ]
      },
      {
        heading: 'Align With GCC Hiring Cycles and Working Weeks',
        paragraphs: [
          'Across most GCC countries, the corporate working week runs Sunday through Thursday (with the UAE federal and private financial sectors operating Monday through Friday). Submitting applications in the morning local Gulf Standard Time (GST / AST) places your email near the top of a recruiter’s inbox during active screening hours.'
        ]
      },
      {
        heading: 'Prepare Your Compliance Checklist Before Switching Roles',
        paragraphs: [
          'Every GCC state maintains specific residency and sponsorship guidelines. Reviewing requirements early saves weeks during onboarding:'
        ],
        bullets: [
          'Driving-dependent roles: Note whether a valid local or GCC driving license is mandatory.',
          'Regulated trades & engineering: Keep attested diplomas and national council cards ready in digital PDF form.',
          'Telephone availability: Keep your contact phone active during business hours and answer professionally with your full name.'
        ]
      }
    ]
  },
  {
    slug: 'understanding-employment-contracts',
    title: 'Understanding Employment Contracts',
    topic: 'Labor Contracts',
    readingTime: '6 min read',
    updatedDate: 'November 2026',
    summary:
      'Key clauses every job seeker in the Gulf should review carefully before signing an offer letter or registered labor contract.',
    editorialAttribution: 'Gulfaro Career Editorial Guide',
    keyTakeaways: [
      'Distinguish clearly between basic salary and fixed allowances (housing, transport), as end-of-service gratuity is usually calculated on basic salary or gross salary depending on jurisdiction.',
      'Confirm probation duration, notice period, and annual leave entitlements in writing.',
      'Ensure the contract is formally registered on the country’s official labor portal (Qiwa, MOHRE, MOL, PAM, or LMRA).',
      'Retain personal custody of your passport and original identity documents at all times.'
    ],
    sections: [
      {
        heading: 'Salary Breakdown: Basic vs. Allowances',
        paragraphs: [
          'GCC compensation packages frequently divide total monthly pay into a Basic Salary plus separate Housing, Transportation, or Food allowances. Always confirm how each component is written in the formal contract. In several Gulf labor codes, overtime calculations and end-of-service indemnity (gratuity) formulas are tied directly to the basic wage figure.'
        ]
      },
      {
        heading: 'Probation Period and Notice Rules',
        paragraphs: [
          'Most GCC private-sector contracts include an initial probation period—commonly 90 days (and up to 180 days in certain jurisdictions if mutually agreed in writing). Read the exact notice requirements during probation versus after confirmation, as early resignation rules and flight-ticket obligations can differ.'
        ]
      },
      {
        heading: 'Official Portal Registration & Benefits Verification',
        paragraphs: [
          'Before starting work or resigning from an existing employer, verify that your official contract matches the written job offer:'
        ],
        bullets: [
          'Saudi Arabia: Electronic contracts must be reviewed and accepted by the employee inside Qiwa.',
          'United Arab Emirates: Mainland contracts follow standardized MOHRE offer and contract templates.',
          'Medical Insurance & Leave: Confirm class of health insurance, number of paid annual leave days (typically 21 to 30 days), and air-ticket frequency.',
          'Working Hours: Standard private-sector hours are 8 hours per day (48 hours weekly, reduced during Ramadan).'
        ]
      }
    ]
  },
  {
    slug: 'professional-skills-employers-look-for',
    title: 'Professional Skills Employers Look For',
    topic: 'Career Skills',
    readingTime: '5 min read',
    updatedDate: 'November 2026',
    summary:
      'The technical competencies, safety credentials, and workplace communication habits that distinguish top candidates across GCC employers.',
    editorialAttribution: 'Gulfaro Career Editorial Guide',
    keyTakeaways: [
      'Combine core technical mastery with verifiable certifications recognized in the Gulf.',
      'Clear written and spoken business communication in English—and Arabic where applicable—remains a major advantage.',
      'Cross-cultural adaptability and strict compliance with workplace safety and data privacy set reliable professionals apart.',
      'Demonstrated proficiency with modern digital tools improves productivity across every department.'
    ],
    sections: [
      {
        heading: '1. Industry-Specific Compliance & Safety Credentials',
        paragraphs: [
          'Employers across construction, oil and gas, healthcare, and finance value candidates who reduce operational risk from day one. Certifications such as NEBOSH IGC or IOSH for site operations, PMP for project delivery, ACCA/CPA/SOCPA for accounting, or ISO quality auditing demonstrate standardized competence.'
        ]
      },
      {
        heading: '2. Workplace Communication in Multilingual Teams',
        paragraphs: [
          'Workplaces across the Gulf bring together professionals from dozens of nationalities. Employers prioritize candidates who write concise status updates, document handovers accurately, listen carefully to client requirements, and communicate respectfully across hierarchies.'
        ]
      },
      {
        heading: '3. Digital & Analytical Readiness',
        paragraphs: [
          'Even in traditional operational roles, employers increasingly expect fluency with digital systems:'
        ],
        bullets: [
          'Operations & Logistics: ERP inventory modules, fleet dispatch software, and structured Excel reporting.',
          'Corporate & HR: Cloud document workflows, payroll reconciliation tools, and national e-government compliance platforms.',
          'Technology & Engineering: Version control, cloud security fundamentals, BIM/AutoCAD workflows, and automated QA testing.'
        ]
      }
    ]
  },
  {
    slug: 'how-to-prepare-for-a-job-interview-in-the-uae',
    title: 'How to Prepare for a Job Interview in the UAE',
    topic: 'Interview Prep',
    readingTime: '5 min read',
    updatedDate: 'November 2026',
    relatedCountrySlug: 'uae',
    summary:
      'Practical interview preparation tips for roles in Dubai, Abu Dhabi, and the Northern Emirates—from company research to video interview etiquette and MOHRE basics.',
    editorialAttribution: 'Gulfaro Career Editorial Guide',
    keyTakeaways: [
      'Clarify whether the employer operates under Mainland (MOHRE) or a Free Zone authority such as DIFC, ADGM, DMCC, or JAFZA.',
      'Prepare concise examples showing measurable commercial or operational impact.',
      'For remote video interviews, test lighting, audio, and time-zone accuracy (GST · UTC+4).',
      'Discuss total monthly compensation clearly in AED along with visa and notice timelines.'
    ],
    sections: [
      {
        heading: 'Understand the Employer’s Operating Environment',
        paragraphs: [
          'Before your interview in Dubai, Abu Dhabi, or Sharjah, spend 20 minutes reviewing the company’s sector, regional offices, and recent projects. Note whether the company operates as a UAE Mainland entity regulated by MOHRE or inside a specialized Free Zone such as Dubai Internet City, DIFC, ADGM, or JAFZA, as onboarding procedures and working schedules can reflect that structure.'
        ]
      },
      {
        heading: 'Format & Punctuality Standards',
        paragraphs: [
          'First-stage screening interviews in the UAE often begin with a brief phone conversation or structured video call before an in-person technical assessment.'
        ],
        bullets: [
          'Time Zone Precision: Confirm appointment times in Gulf Standard Time (GST, UTC+4) and join video calls 5 minutes early.',
          'Professional Presentation: Dress formally or business-smart depending on whether the role is corporate office or field engineering.',
          'Portfolio & Credentials: Keep digital copies of attested degrees, trade licenses, or portfolio summaries ready to share by email on request.'
        ]
      },
      {
        heading: 'Questions Specific to UAE Hiring',
        paragraphs: [
          'Expect clear questions about your current visa status (whether on a residence visa with cancellation readiness, golden visa, or applying internationally), your preferred start date, and whether you hold a UAE driving license if the role covers multiple Emirates. Answering factually and transparently helps HR move qualified candidates quickly to final decision makers.'
        ]
      }
    ]
  }
];

export function findArticleBySlug(slug: string): CareerArticle | undefined {
  const clean = decodeURIComponent(slug || '').trim().toLowerCase();
  return CAREER_ARTICLES.find(a => a.slug === clean);
}

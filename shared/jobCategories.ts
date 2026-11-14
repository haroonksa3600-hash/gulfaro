export interface UnifiedJobCategory {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  iconName: string;
  description: string;
  subcategories: string[];
  popularRoles: string[];
  enabled: boolean;
}

export const JOB_CATEGORIES: UnifiedJobCategory[] = [
  {
    id: 'accounting-finance',
    slug: 'accounting-finance',
    name: 'Accounting & Finance',
    nameAr: 'المحاسبة والمالية',
    iconName: 'Calculator',
    description: 'Corporate accounting, VAT/Zakat compliance, auditing, and financial analysis across the GCC.',
    subcategories: [
      'Accountant',
      'Auditor',
      'Financial Analyst',
      'VAT & Tax Specialist',
      'Accounts Payable / Receivable',
      'Finance Manager'
    ],
    popularRoles: ['Accountant', 'Auditor', 'Financial Analyst', 'VAT & Tax Specialist'],
    enabled: true
  },
  {
    id: 'administration-office-support',
    slug: 'administration-office-support',
    name: 'Administration & Office Support',
    nameAr: 'الإدارة والدعم المكتبي',
    iconName: 'ClipboardList',
    description: 'Office administration, executive assistance, data entry, and document control roles.',
    subcategories: [
      'Secretary',
      'Data Entry Operator',
      'Office Assistant',
      'Executive Assistant',
      'Document Controller',
      'Office Manager'
    ],
    popularRoles: ['Secretary', 'Data Entry Operator', 'Office Assistant', 'Document Controller'],
    enabled: true
  },
  {
    id: 'engineering',
    slug: 'engineering',
    name: 'Engineering',
    nameAr: 'الهندسة',
    iconName: 'Compass',
    description: 'Civil, mechanical, electrical, chemical, structural, and industrial engineering vacancies.',
    subcategories: [
      'Civil Engineer',
      'Mechanical Engineer',
      'Electrical Engineer',
      'Chemical Engineer',
      'Structural Engineer',
      'Industrial Engineer'
    ],
    popularRoles: ['Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer', 'Chemical Engineer'],
    enabled: true
  },
  {
    id: 'construction-building',
    slug: 'construction-building',
    name: 'Construction & Building',
    nameAr: 'البناء والتشييد',
    iconName: 'HardHat',
    description: 'Site supervision, skilled building trades, MEP installation, and civil works across the Gulf.',
    subcategories: [
      'Mason',
      'Carpenter',
      'Plumber',
      'Painter',
      'Site Supervisor',
      'Quantity Surveyor',
      'Steel Fixer / Scaffolder'
    ],
    popularRoles: ['Mason', 'Carpenter', 'Plumber', 'Painter', 'Site Supervisor'],
    enabled: true
  },
  {
    id: 'information-technology',
    slug: 'information-technology',
    name: 'Information Technology (IT)',
    nameAr: 'تقنية المعلومات',
    iconName: 'Cpu',
    description: 'Software development, IT support, networking, cloud systems, and cybersecurity.',
    subcategories: [
      'Software Developer',
      'IT Support',
      'Network Engineer',
      'Cybersecurity Analyst',
      'Cloud & DevOps Engineer',
      'System Administrator'
    ],
    popularRoles: ['Software Developer', 'IT Support', 'Network Engineer', 'Cybersecurity Analyst'],
    enabled: true
  },
  {
    id: 'sales-business-development',
    slug: 'sales-business-development',
    name: 'Sales & Business Development',
    nameAr: 'المبيعات وتطوير الأعمال',
    iconName: 'TrendingUp',
    description: 'B2B enterprise sales, field sales representatives, account managers, and business growth.',
    subcategories: [
      'Sales Executive',
      'Sales Manager',
      'Sales Representative',
      'Business Development Executive',
      'Key Account Manager'
    ],
    popularRoles: ['Sales Executive', 'Sales Manager', 'Sales Representative', 'Key Account Manager'],
    enabled: true
  },
  {
    id: 'marketing-advertising',
    slug: 'marketing-advertising',
    name: 'Marketing & Advertising',
    nameAr: 'التسويق والإعلان',
    iconName: 'Megaphone',
    description: 'Digital marketing, social media management, brand strategy, SEO, and advertising campaigns.',
    subcategories: [
      'Digital Marketing Specialist',
      'Social Media Manager',
      'Brand Manager',
      'SEO / Performance Marketer',
      'Public Relations Specialist'
    ],
    popularRoles: ['Digital Marketing Specialist', 'Social Media Manager', 'Brand Manager'],
    enabled: true
  },
  {
    id: 'human-resources',
    slug: 'human-resources',
    name: 'Human Resources (HR)',
    nameAr: 'الموارد البشرية',
    iconName: 'Users',
    description: 'Talent acquisition, HR operations, employee relations, and GCC labor portal compliance.',
    subcategories: [
      'HR Officer',
      'Recruiter',
      'HR Manager',
      'PRO / Government Relations (Qiwa/Muqeem)',
      'Payroll Specialist'
    ],
    popularRoles: ['HR Officer', 'Recruiter', 'HR Manager', 'PRO / Government Relations'],
    enabled: true
  },
  {
    id: 'healthcare-medical',
    slug: 'healthcare-medical',
    name: 'Healthcare & Medical',
    nameAr: 'الرعاية الصحية والطبية',
    iconName: 'Stethoscope',
    description: 'Licensed doctors, nurses, pharmacists, medical technicians, and allied healthcare staff.',
    subcategories: [
      'Doctor',
      'Nurse',
      'Pharmacist',
      'Medical Technician',
      'Dentist',
      'Physiotherapist'
    ],
    popularRoles: ['Doctor', 'Nurse', 'Pharmacist', 'Medical Technician'],
    enabled: true
  },
  {
    id: 'education-training',
    slug: 'education-training',
    name: 'Education & Training',
    nameAr: 'التعليم والتدريس',
    iconName: 'GraduationCap',
    description: 'International school teachers, subject specialists, university faculty, and corporate trainers.',
    subcategories: [
      'School Teacher',
      'Subject Teacher (Math / Science / English)',
      'University Lecturer',
      'Corporate Trainer',
      'Academic Coordinator'
    ],
    popularRoles: ['School Teacher', 'Subject Teacher', 'Corporate Trainer', 'Academic Coordinator'],
    enabled: true
  },
  {
    id: 'hospitality-tourism',
    slug: 'hospitality-tourism',
    name: 'Hospitality & Tourism',
    nameAr: 'الضيافة والسياحة',
    iconName: 'Hotel',
    description: 'Hotel operations, front office reception, housekeeping, guest concierge, and travel agencies.',
    subcategories: [
      'Chef',
      'Waiter',
      'Receptionist',
      'Housekeeping',
      'Hotel Manager',
      'Travel Consultant'
    ],
    popularRoles: ['Chef', 'Waiter', 'Receptionist', 'Housekeeping'],
    enabled: true
  },
  {
    id: 'restaurant-food-services',
    slug: 'restaurant-food-services',
    name: 'Restaurant & Food Services',
    nameAr: 'المطاعم والخدمات الغذائية',
    iconName: 'Utensils',
    description: 'Chefs, line cooks, baristas, catering staff, and restaurant floor management.',
    subcategories: [
      'Head Chef / Sous Chef',
      'Cook / Line Chef',
      'Barista',
      'Restaurant Manager',
      'Waiter / Server',
      'Kitchen Steward'
    ],
    popularRoles: ['Head Chef / Sous Chef', 'Barista', 'Restaurant Manager', 'Waiter / Server'],
    enabled: true
  },
  {
    id: 'customer-service-call-center',
    slug: 'customer-service-call-center',
    name: 'Customer Service & Call Center',
    nameAr: 'خدمة العملاء ومراكز الاتصال',
    iconName: 'Headphones',
    description: 'Bilingual customer care agents, inbound call centers, helpdesk teams, and client support.',
    subcategories: [
      'Customer Service Representative',
      'Call Center Agent',
      'Customer Care Supervisor',
      'Client Support Officer',
      'Reception / Concierge'
    ],
    popularRoles: ['Customer Service Representative', 'Call Center Agent', 'Client Support Officer'],
    enabled: true
  },
  {
    id: 'driving-transportation',
    slug: 'driving-transportation',
    name: 'Driving & Transportation',
    nameAr: 'القيادة والنقل',
    iconName: 'Car',
    description: 'Licensed heavy truck drivers, light vehicle chauffeurs, delivery riders, and fleet drivers.',
    subcategories: [
      'Heavy Driver',
      'Light Driver',
      'Delivery Driver',
      'Trailer / Tanker Driver',
      'Bus / Company Chauffeur'
    ],
    popularRoles: ['Heavy Driver', 'Light Driver', 'Delivery Driver', 'Trailer / Tanker Driver'],
    enabled: true
  },
  {
    id: 'logistics-supply-chain',
    slug: 'logistics-supply-chain',
    name: 'Logistics & Supply Chain',
    nameAr: 'اللوجستيات وسلسلة الإمداد',
    iconName: 'Truck',
    description: 'Warehousing, storekeeping, freight forwarding, customs clearance, and inventory control.',
    subcategories: [
      'Warehouse Supervisor',
      'Storekeeper',
      'Supply Chain Coordinator',
      'Customs Clearance Officer',
      'Forklift Operator'
    ],
    popularRoles: ['Warehouse Supervisor', 'Storekeeper', 'Supply Chain Coordinator', 'Forklift Operator'],
    enabled: true
  },
  {
    id: 'security-safety',
    slug: 'security-safety',
    name: 'Security & Safety',
    nameAr: 'الأمن والسلامة',
    iconName: 'ShieldCheck',
    description: 'HSE safety officers, site security guards, fire safety technicians, and CCTV monitoring.',
    subcategories: [
      'HSE / Safety Officer (NEBOSH)',
      'Security Guard',
      'Security Supervisor',
      'Fire & Safety Technician',
      'CCTV Operator'
    ],
    popularRoles: ['HSE / Safety Officer (NEBOSH)', 'Security Guard', 'Fire & Safety Technician'],
    enabled: true
  },
  {
    id: 'oil-gas-energy',
    slug: 'oil-gas-energy',
    name: 'Oil, Gas & Energy',
    nameAr: 'النفط والغاز والطاقة',
    iconName: 'Flame',
    description: 'Upstream drilling, petroleum engineering, instrumentation, pipelines, and renewable solar.',
    subcategories: [
      'Petroleum / Drilling Engineer',
      'Mud Engineer',
      'Instrumentation Technician',
      'Piping Inspector',
      'Solar / Renewable Energy Specialist'
    ],
    popularRoles: ['Petroleum / Drilling Engineer', 'Mud Engineer', 'Instrumentation Technician'],
    enabled: true
  },
  {
    id: 'manufacturing-production',
    slug: 'manufacturing-production',
    name: 'Manufacturing & Production',
    nameAr: 'التصنيع والإنتاج',
    iconName: 'Factory',
    description: 'Factory operations, machine operation, CNC fabrication, assembly lines, and plant supervision.',
    subcategories: [
      'Production Operator',
      'Machine Operator',
      'Factory / Plant Supervisor',
      'CNC Machinist',
      'Packaging & Assembly Worker'
    ],
    popularRoles: ['Production Operator', 'Machine Operator', 'Factory / Plant Supervisor'],
    enabled: true
  },
  {
    id: 'retail-supermarket',
    slug: 'retail-supermarket',
    name: 'Retail & Supermarket',
    nameAr: 'التجزئة والأسواق المركزية',
    iconName: 'ShoppingBag',
    description: 'Supermarket operations, retail sales associates, cashiers, merchandisers, and store managers.',
    subcategories: [
      'Store Manager',
      'Cashier',
      'Retail Sales Associate',
      'Merchandiser',
      'Inventory Clerk'
    ],
    popularRoles: ['Store Manager', 'Cashier', 'Retail Sales Associate', 'Merchandiser'],
    enabled: true
  },
  {
    id: 'cleaning-maintenance',
    slug: 'cleaning-maintenance',
    name: 'Cleaning & Maintenance',
    nameAr: 'النظافة والصيانة العامة',
    iconName: 'Sparkles',
    description: 'Commercial cleaning staff, building janitorial services, facility upkeep, and sanitation.',
    subcategories: [
      'General Cleaner',
      'Janitorial Supervisor',
      'Building Maintenance Worker',
      'Pest Control Technician',
      'Office Boy / Tea Boy'
    ],
    popularRoles: ['General Cleaner', 'Janitorial Supervisor', 'Building Maintenance Worker'],
    enabled: true
  },
  {
    id: 'electrical-mechanical',
    slug: 'electrical-mechanical',
    name: 'Electrical & Mechanical',
    nameAr: 'الأعمال الكهربائية والميكانيكية',
    iconName: 'Wrench',
    description: 'HVAC chiller technicians, industrial electricians, MEP technicians, welders, and mechanics.',
    subcategories: [
      'HVAC / Chiller Technician',
      'Industrial Electrician',
      'MEP Technician',
      'Auto / Diesel Mechanic',
      'Certified Welder'
    ],
    popularRoles: ['HVAC / Chiller Technician', 'Industrial Electrician', 'MEP Technician', 'Certified Welder'],
    enabled: true
  },
  {
    id: 'architecture-interior-design',
    slug: 'architecture-interior-design',
    name: 'Architecture & Interior Design',
    nameAr: 'العمارة والتصميم الداخلي',
    iconName: 'Ruler',
    description: 'Architects, interior fit-out designers, BIM/CAD drafters, and 3D visualization specialists.',
    subcategories: [
      'Architect',
      'Interior Designer',
      'AutoCAD / BIM Draftsman',
      '3D Visualizer',
      'Landscape Architect'
    ],
    popularRoles: ['Architect', 'Interior Designer', 'AutoCAD / BIM Draftsman'],
    enabled: true
  },
  {
    id: 'legal-compliance',
    slug: 'legal-compliance',
    name: 'Legal & Compliance',
    nameAr: 'الشؤون القانونية والامتثال',
    iconName: 'Scale',
    description: 'Corporate legal counsel, lawyers, contract specialists, and regulatory compliance officers.',
    subcategories: [
      'Corporate Lawyer',
      'Legal Advisor / Counsel',
      'Contract Administrator',
      'Compliance Officer',
      'Paralegal / Legal Translator'
    ],
    popularRoles: ['Corporate Lawyer', 'Legal Advisor / Counsel', 'Contract Administrator'],
    enabled: true
  },
  {
    id: 'real-estate-property-management',
    slug: 'real-estate-property-management',
    name: 'Real Estate & Property Management',
    nameAr: 'العقارات وإدارة الممتلكات',
    iconName: 'Building2',
    description: 'Real estate brokers, leasing consultants, property managers, and community association managers.',
    subcategories: [
      'Real Estate Agent / Broker',
      'Property Manager',
      'Leasing Consultant',
      'Facilities Manager',
      'Real Estate Valuer'
    ],
    popularRoles: ['Real Estate Agent / Broker', 'Property Manager', 'Leasing Consultant'],
    enabled: true
  },
  {
    id: 'procurement-purchasing',
    slug: 'procurement-purchasing',
    name: 'Procurement & Purchasing',
    nameAr: 'المشتريات والتوريد',
    iconName: 'ClipboardCheck',
    description: 'Procurement engineers, purchasing officers, vendor sourcing, and materials control.',
    subcategories: [
      'Procurement Officer',
      'Purchasing Manager',
      'Buyer / Sourcing Specialist',
      'Vendor Coordinator',
      'Materials Controller'
    ],
    popularRoles: ['Procurement Officer', 'Purchasing Manager', 'Buyer / Sourcing Specialist'],
    enabled: true
  },
  {
    id: 'quality-control-assurance',
    slug: 'quality-control-assurance',
    name: 'Quality Control & Assurance',
    nameAr: 'مراقبة وضمان الجودة',
    iconName: 'BadgeCheck',
    description: 'QA/QC inspectors, ISO auditors, manufacturing quality control, and laboratory testing.',
    subcategories: [
      'QA/QC Inspector',
      'Quality Assurance Manager',
      'ISO Compliance Auditor',
      'Food Quality Controller',
      'Lab QA Technician'
    ],
    popularRoles: ['QA/QC Inspector', 'Quality Assurance Manager', 'ISO Compliance Auditor'],
    enabled: true
  },
  {
    id: 'media-design-creative',
    slug: 'media-design-creative',
    name: 'Media, Design & Creative',
    nameAr: 'الإعلام والتصميم والإبداع',
    iconName: 'Palette',
    description: 'Graphic designers, UI/UX designers, video editors, copywriters, and content producers.',
    subcategories: [
      'Graphic Designer',
      'UI/UX Designer',
      'Video Editor / Videographer',
      'Content Writer / Copywriter',
      'Photographer'
    ],
    popularRoles: ['Graphic Designer', 'UI/UX Designer', 'Video Editor / Videographer'],
    enabled: true
  },
  {
    id: 'telecommunications',
    slug: 'telecommunications',
    name: 'Telecommunications',
    nameAr: 'الاتصالات',
    iconName: 'Radio',
    description: 'Telecom network engineers, fiber optic splicers, RF optimization, and tower field teams.',
    subcategories: [
      'Telecom Engineer',
      'Fiber Optic Technician',
      'RF Optimization Engineer',
      'Telecom Rigging / Tower Tech',
      'NOC Engineer'
    ],
    popularRoles: ['Telecom Engineer', 'Fiber Optic Technician', 'RF Optimization Engineer'],
    enabled: true
  },
  {
    id: 'agriculture-farming',
    slug: 'agriculture-farming',
    name: 'Agriculture & Farming',
    nameAr: 'الزراعة والثروة الحيوانية',
    iconName: 'Sprout',
    description: 'Agricultural engineers, greenhouse specialists, irrigation technicians, and farm supervisors.',
    subcategories: [
      'Agricultural Engineer',
      'Farm Manager',
      'Greenhouse Supervisor',
      'Irrigation Technician',
      'Landscaping & Nursery Specialist'
    ],
    popularRoles: ['Agricultural Engineer', 'Farm Manager', 'Irrigation Technician'],
    enabled: true
  },
  {
    id: 'other-jobs',
    slug: 'other-jobs',
    name: 'Other Jobs',
    nameAr: 'وظائف أخرى',
    iconName: 'Briefcase',
    description: 'General roles, multi-disciplinary coordinators, trainees, and specialized opportunities.',
    subcategories: [
      'General Helper / Labor',
      'Operations Coordinator',
      'Intern / Trainee',
      'Specialist Role'
    ],
    popularRoles: ['Operations Coordinator', 'Intern / Trainee', 'General Helper / Labor'],
    enabled: true
  }
];

const CATEGORY_MAP = new Map<string, UnifiedJobCategory>(
  JOB_CATEGORIES.map(c => [c.id, c])
);

const CATEGORY_NAME_LOOKUP = new Map<string, string>(
  JOB_CATEGORIES.map(c => [c.name.toLowerCase().trim(), c.id])
);

export function isValidJobCategoryId(categoryId?: string | null): boolean {
  if (!categoryId || typeof categoryId !== 'string') return false;
  return CATEGORY_MAP.has(categoryId.trim().toLowerCase());
}

/**
 * Resolves any category ID, slug, display name, or legacy category identifier
 * cleanly into one of the 30 canonical category IDs.
 * Missing or unknown categories safely resolve to 'other-jobs' ("Other Jobs").
 */
export function resolveJobCategoryId(
  rawCategory?: string | null,
  context?: { title?: string; subcategory?: string }
): string {
  const raw = String(rawCategory || '').trim().toLowerCase();
  if (!raw) return 'other-jobs';

  // 1. Exact canonical ID match
  if (CATEGORY_MAP.has(raw)) {
    return raw;
  }

  // 2. Exact display name match
  const byName = CATEGORY_NAME_LOOKUP.get(raw);
  if (byName) {
    return byName;
  }

  const hintText = `${context?.title || ''} ${context?.subcategory || ''}`.toLowerCase();

  // 3. Deterministic mapping for legacy categories & previous URL slugs
  switch (raw) {
    case 'engineering-construction':
    case 'construction':
      if (/\b(mason|carpenter|plumber|painter|scaffolder|foreman|site supervisor|construction)\b/i.test(hintText)) {
        return 'construction-building';
      }
      return raw === 'construction' ? 'construction-building' : 'engineering';

    case 'it-software':
      if (/\b(telecom|fiber|rf|bts|tower)\b/i.test(hintText)) {
        return 'telecommunications';
      }
      return 'information-technology';

    case 'sales-marketing':
    case 'sales-and-marketing':
      if (/\b(real estate|broker|property|leasing)\b/i.test(hintText)) {
        return 'real-estate-property-management';
      }
      if (/\b(marketing|seo|social media|brand|advertising)\b/i.test(hintText)) {
        return 'marketing-advertising';
      }
      return 'sales-business-development';

    case 'admin-hr-pro':
      if (/\b(hr|human resources|recruit|talent|qiwa|muqeem|payroll)\b/i.test(hintText)) {
        return 'human-resources';
      }
      return 'administration-office-support';

    case 'administration':
      return 'administration-office-support';

    case 'logistics-drivers':
    case 'transportation-and-logistics':
      if (/\b(driver|chauffeur|truck|trailer|tanker|delivery)\b/i.test(hintText)) {
        return 'driving-transportation';
      }
      return 'logistics-supply-chain';

    case 'hospitality-tourism':
    case 'hospitality':
      if (/\b(barista|chef|cook|waiter|restaurant|cafe|bakery|steward)\b/i.test(hintText)) {
        return 'restaurant-food-services';
      }
      return 'hospitality-tourism';

    case 'education-teaching':
    case 'education':
      return 'education-training';

    case 'customer-support':
      return 'customer-service-call-center';

    case 'skilled-trades':
      if (/\b(hvac|chiller|electrician|mechanic|welder|mep)\b/i.test(hintText)) {
        return 'electrical-mechanical';
      }
      if (/\b(cleaner|janitor|housekeep)\b/i.test(hintText)) {
        return 'cleaning-maintenance';
      }
      return 'electrical-mechanical';

    case 'accounting-and-finance':
      return 'accounting-finance';

    case 'manufacturing':
      return 'manufacturing-production';

    case 'general':
    case 'other':
    case 'others':
      return 'other-jobs';

    default:
      return 'other-jobs';
  }
}

export function getJobCategoryById(
  categoryId?: string | null,
  context?: { title?: string; subcategory?: string }
): UnifiedJobCategory {
  const canonicalId = resolveJobCategoryId(categoryId, context);
  return CATEGORY_MAP.get(canonicalId) || JOB_CATEGORIES[JOB_CATEGORIES.length - 1];
}

export function getJobCategoryName(
  categoryId?: string | null,
  context?: { title?: string; subcategory?: string }
): string {
  return getJobCategoryById(categoryId, context).name;
}

export function getSubcategoriesForCategory(categoryId?: string | null): string[] {
  if (!categoryId) return [];
  const cat = CATEGORY_MAP.get(categoryId.trim().toLowerCase());
  return cat ? cat.subcategories : [];
}

export function jobMatchesCategoryFilter(
  job: { category?: string | null; title?: string; subcategory?: string },
  selectedCategoryId?: string | null
): boolean {
  const selected = String(selectedCategoryId || '').trim().toLowerCase();
  if (!selected || selected === 'all') return true;
  const targetCanonical = resolveJobCategoryId(selected);
  const jobCanonical = resolveJobCategoryId(job.category, {
    title: job.title,
    subcategory: job.subcategory
  });
  return jobCanonical === targetCanonical;
}

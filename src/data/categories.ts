import { JobCategory } from '../types/job';

export const JOB_CATEGORIES: JobCategory[] = [
  {
    id: 'engineering-construction',
    name: 'Engineering & Construction',
    nameAr: 'الهندسة والإنشاءات',
    iconName: 'HardHat',
    description: 'Civil, MEP, Structural, Electrical, Architecture & HSE Site roles',
    popularRoles: ['Civil Site Engineer', 'MEP Coordinator', 'Safety Officer (NEBOSH)', 'AutoCAD Draftsman', 'QA/QC Engineer']
  },
  {
    id: 'it-software',
    name: 'IT, Software & Telecom',
    nameAr: 'تقنية المعلومات والاتصالات',
    iconName: 'Cpu',
    description: 'Software development, cloud, cybersecurity & IT systems infrastructure',
    popularRoles: ['Full-Stack React/Node Engineer', 'Cybersecurity Analyst', 'DevOps AWS/Azure', 'Network Support Engineer']
  },
  {
    id: 'accounting-finance',
    name: 'Accounting & Finance',
    nameAr: 'المحاسبة والمالية',
    iconName: 'Calculator',
    description: 'VAT, Zakat, Auditing, Corporate Ledger, CFO & Financial Planning',
    popularRoles: ['General Accountant (Zakat/VAT)', 'Senior Auditor', 'Financial Analyst', 'Cost Accountant']
  },
  {
    id: 'healthcare-medical',
    name: 'Healthcare & Medical',
    nameAr: 'الرعاية الصحية والطبية',
    iconName: 'Stethoscope',
    description: 'Licensed doctors, nurses (SCFHS, DHA, QCHP, MOH), and clinic staff',
    popularRoles: ['Staff Nurse (SCFHS)', 'DHA Registered Nurse', 'Clinical Pharmacist', 'Physiotherapist']
  },
  {
    id: 'sales-marketing',
    name: 'Sales, Marketing & Real Estate',
    nameAr: 'المبيعات والتسويق والعقارات',
    iconName: 'TrendingUp',
    description: 'B2B corporate sales, FMCG, luxury retail, digital performance & brokers',
    popularRoles: ['B2B Sales Representative', 'Real Estate Agent', 'Digital Marketing Specialist', 'Key Account Manager']
  },
  {
    id: 'admin-hr-pro',
    name: 'Admin, HR & PRO (Government Relations)',
    nameAr: 'الموارد البشرية والعلاقات الحكومية',
    iconName: 'Building2',
    description: 'HR specialists, Muqeem/Qiwa officers, executive secretaries & front desk',
    popularRoles: ['Government Relations Officer (PRO/Mandoob)', 'HR Coordinator', 'Executive Assistant', 'Office Manager']
  },
  {
    id: 'logistics-drivers',
    name: 'Logistics, Warehousing & Drivers',
    nameAr: 'الخدمات اللوجستية والسائقين',
    iconName: 'Truck',
    description: 'Heavy & light vehicle drivers, supply chain planners, dispatch & storekeepers',
    popularRoles: ['Heavy Equipment Driver', 'Light Vehicle Delivery Driver', 'Warehouse Supervisor', 'Storekeeper']
  },
  {
    id: 'hospitality-tourism',
    name: 'Hospitality, Catering & F&B',
    nameAr: 'الضيافة والسياحة والمطاعم',
    iconName: 'Utensils',
    description: 'Chefs, baristas, restaurant managers, hotel operations & catering crew',
    popularRoles: ['Specialty Coffee Barista', 'Sous Chef', 'Restaurant Floor Manager', 'Hotel Front Desk Agent']
  },
  {
    id: 'oil-gas-energy',
    name: 'Oil, Gas & Energy',
    nameAr: 'النفط والغاز والطاقة',
    iconName: 'Flame',
    description: 'Upstream, downstream, drilling, pipeline inspection & renewable solar',
    popularRoles: ['Instrumentation Technician', 'Drilling Supervisor', 'Piping QC Inspector', 'Solar PV Engineer']
  },
  {
    id: 'education-teaching',
    name: 'Education, Teaching & Academics',
    nameAr: 'التعليم والتدريس',
    iconName: 'GraduationCap',
    description: 'International schools (British/American), ESL, universities & tutors',
    popularRoles: ['IGCSE Math/Science Teacher', 'Primary Class Teacher', 'ESL English Instructor', 'Special Education Teacher']
  },
  {
    id: 'customer-support',
    name: 'Customer Support & BPO',
    nameAr: 'خدمة العملاء ومراكز الاتصال',
    iconName: 'Headphones',
    description: 'Bilingual Arabic/English agents, tele-callers, helpdesk & operations',
    popularRoles: ['Bilingual Customer Care Agent', 'Call Center Team Lead', 'Inbound Helpdesk Rep']
  },
  {
    id: 'skilled-trades',
    name: 'Skilled Trades & Maintenance',
    nameAr: 'المهن الفنية والصيانة',
    iconName: 'Wrench',
    description: 'HVAC technicians, industrial electricians, welders, plumbers & mechanics',
    popularRoles: ['HVAC Chiller Technician', 'Industrial Electrician', '6G Certified Welder', 'Facilities Maintenance Tech']
  }
];

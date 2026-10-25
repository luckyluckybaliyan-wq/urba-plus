export interface SampleAccount {
  role: 'citizen' | 'authority' | 'admin';
  roleLabel: string;
  roleBadge: string;
  email: string;
  passwords: string[];
  defaultPassword: string;
  pin?: string;
  name: string;
  department: string;
  description: string;
  portalUrl: string;
}

export const SAMPLE_ACCOUNTS: SampleAccount[] = [
  {
    role: 'citizen',
    roleLabel: 'Citizen (नागरिक)',
    roleBadge: 'Citizen Portal',
    email: 'citizen@crowdcivic.org',
    passwords: ['Citizen@123', 'citizen123', 'citizen', '123456'],
    defaultPassword: 'Citizen@123',
    name: 'Aarav Mehta',
    department: 'Ward 12 Resident',
    description: 'Report civic issues, verify community repairs, and track ticket status.',
    portalUrl: '/citizen',
  },
  {
    role: 'authority',
    roleLabel: 'Municipal Authority (नगर निगम अधिकारी)',
    roleBadge: 'Authority Portal',
    email: 'authority@crowdcivic.org',
    passwords: ['Authority@123', 'authority123', 'authority', '123456'],
    defaultPassword: 'Authority@123',
    pin: '123456',
    name: 'Officer Rajesh Sharma',
    department: 'Public Works & Sanitation Dept',
    description: 'Inspect complaints, record 30s geotagged resolution video, and run AI audit.',
    portalUrl: '/authority',
  },
  {
    role: 'admin',
    roleLabel: 'Super Admin (सिस्टम एडमिन)',
    roleBadge: 'Admin Command Center',
    email: 'admin@crowdcivic.org',
    passwords: ['Admin@123', 'admin123', 'admin', '123456'],
    defaultPassword: 'Admin@123',
    pin: '999999',
    name: 'System Administrator',
    department: 'Municipal e-Governance Command Center',
    description: 'Manage user roles, review security audit logs, and oversee dispute resolutions.',
    portalUrl: '/admin',
  },
];

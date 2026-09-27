const enumLabels: Record<string, string> = {
  BEFS: 'BEFS',
  NETWORKS: 'Networks',
  CLIENT_SOLUTIONS: 'Client solutions',
  RGA: 'RGA',
  BIG_BET: 'Big bet',
  QUICK_WIN: 'Quick win',
  NINJA: 'Ninja',
  STANDARD: 'Standard',
  IDENTIFIED: 'Identified',
  DISCOVERY: 'Discovery',
  EXECUTION: 'Execution',
  HANDOVER: 'Handover',
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  INTERNAL: 'Internal',
  PARTNER: 'Partner',
  HYBRID: 'Hybrid',
  BACKEND: 'Backend',
  FRONTEND: 'Frontend',
  CLOUD: 'Cloud',
  DATA_SCIENCE: 'Data science',
  BACKEND_DEVELOPER: 'Backend developer',
  FRONTEND_DEVELOPER: 'Frontend developer',
  CLOUD_ENGINEER: 'Cloud engineer',
  DATA_SCIENTIST: 'Data scientist',
  AVAILABLE: 'Available',
  LIMITED: 'Limited',
  UNAVAILABLE: 'Unavailable',
  PROJECT: 'Project',
  SUPPORT: 'Support',
  COMMUNITY: 'Community',
  INNOVATION: 'Innovation',
  TRAINING: 'Training',
  HOLIDAY: 'Holiday',
  ABSENCE: 'Absence',
  PRODUCT_OWNER: 'Product owner',
  DIGITAL_MANAGER: 'Digital manager',
  SCRUM_MASTER: 'Scrum master',
  COORDINATOR: 'Coordinator',
  ARCHITECT: 'Architect',
  AI_COMPETENCE_CENTER_REPRESENTATIVE: 'AI competence center representative',
  DESIGNER: 'Designer',
};

export function enumLabel(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return enumLabels[value] ?? sentenceCase(value);
}

function sentenceCase(value: string): string {
  const normalized = value.toLowerCase().replaceAll('_', ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

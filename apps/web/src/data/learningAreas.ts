import type { ComponentType } from 'react';
import {
  AiIcon,
  MachineLearningIcon,
  DataScienceIcon,
  CybersecurityIcon,
  NetworkingIcon,
  CloudComputingIcon,
  BlockchainIcon,
  SoftwareDevelopmentIcon,
  OtherAreaIcon,
} from '@/pages/portal/LearningAreaIcons';

/** Multi-select "areas of interest" cards for the profile-completion wizard's Goals step -- stored as a string array on the backend (Profile.areasOfInterest), not an enum, so this list can grow without a migration. */
export const LEARNING_AREAS: { value: string; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { value: 'ai', label: 'Artificial Intelligence', Icon: AiIcon },
  { value: 'machine_learning', label: 'Machine Learning', Icon: MachineLearningIcon },
  { value: 'data_science', label: 'Data Science', Icon: DataScienceIcon },
  { value: 'cybersecurity', label: 'Cybersecurity', Icon: CybersecurityIcon },
  { value: 'networking', label: 'Networking', Icon: NetworkingIcon },
  { value: 'cloud_computing', label: 'Cloud Computing', Icon: CloudComputingIcon },
  { value: 'blockchain', label: 'Blockchain', Icon: BlockchainIcon },
  { value: 'software_development', label: 'Software Development', Icon: SoftwareDevelopmentIcon },
  { value: 'other', label: 'Other', Icon: OtherAreaIcon },
];

import React from 'react';
import { AboutAndPrivacy } from './AboutAndPrivacy';
import { LanguageKey } from '../utils/translations';

interface PrivacyPolicyProps {
  onBack: () => void;
  language?: LanguageKey;
  initialTab?: 'about' | 'privacy';
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = (props) => {
  return <AboutAndPrivacy {...props} initialTab={props.initialTab || 'privacy'} />;
};

export { AboutAndPrivacy };
export default PrivacyPolicy;

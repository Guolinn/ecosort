import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LegalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'tos' | 'privacy' | 'contact';
}

const tosContent = `
## Terms of Service

**Last Updated: January 2025**

### 1. Acceptance of Terms
By accessing and using EcoSort ("the App"), you agree to be bound by these Terms of Service.

### 2. Description of Service
EcoSort provides waste classification and recycling guidance using AI technology. The service is provided "as is" for informational purposes only.

### 3. User Accounts
- You are responsible for maintaining the confidentiality of your account
- You agree to provide accurate information
- Guest mode stores data locally on your device

### 4. Acceptable Use
You agree not to:
- Use the service for any unlawful purpose
- Attempt to gain unauthorized access to the system
- Upload malicious content or harmful materials

### 5. Intellectual Property
All content, features, and functionality are owned by EcoSort and protected by copyright laws.

### 6. Disclaimer
- Waste classification suggestions are AI-generated and may not be 100% accurate
- Always follow local recycling guidelines
- We are not liable for any damages arising from use of the service

### 7. Changes to Terms
We reserve the right to modify these terms at any time. Continued use constitutes acceptance of changes.

### 8. Contact
For questions about these terms, contact us at guolinn@student.ubc.ca
`;

const privacyContent = `
## Privacy Policy

**Last Updated: January 2025**

### 1. Information We Collect
- **Account Information**: Email, username (if registered)
- **Usage Data**: Scan history, points, and activity
- **Device Information**: Device ID for guest mode

### 2. How We Use Your Information
- Provide and improve our services
- Track your recycling progress and rewards
- Send relevant notifications

### 3. Data Storage
- Registered users: Data stored securely in our cloud database
- Guest users: Data stored locally on your device

### 4. Data Sharing
We do not sell your personal information. We may share data:
- With service providers who assist our operations
- When required by law

### 5. Your Rights
You have the right to:
- Access your personal data
- Request deletion of your account
- Opt out of notifications

### 6. Data Security
We implement industry-standard security measures to protect your information.

### 7. Children's Privacy
Our service is not directed to children under 13. We do not knowingly collect data from children.

### 8. Changes to Policy
We may update this policy periodically. We will notify you of significant changes.

### 9. Contact Us
For privacy concerns, contact: guolinn@student.ubc.ca
`;

const contactContent = `
## Contact Us

We'd love to hear from you! Whether you have questions, feedback, or suggestions, feel free to reach out.

### Email
📧 **guolinn@student.ubc.ca**

### Response Time
We typically respond within 24-48 hours.

### What We Can Help With
- Technical issues and bug reports
- Feature requests and suggestions
- Account-related questions
- Privacy and data concerns
- General inquiries

### About EcoSort
EcoSort is a student project developed at the University of British Columbia, aimed at promoting sustainable waste management through AI-powered classification.

Thank you for using EcoSort and helping make our planet greener! 🌱
`;

// Helper to render **bold** text
const renderBoldText = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

export const LegalDrawer = ({ isOpen, onClose, type }: LegalDrawerProps) => {
  const getTitle = () => {
    switch (type) {
      case 'tos': return 'Terms of Service';
      case 'privacy': return 'Privacy Policy';
      case 'contact': return 'Contact Us';
    }
  };

  const getContent = () => {
    switch (type) {
      case 'tos': return tosContent;
      case 'privacy': return privacyContent;
      case 'contact': return contactContent;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl h-[80vh]">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-left">{getTitle()}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(80vh-80px)] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
            {getContent().split('\n').map((line, i) => {
              if (line.startsWith('## ')) {
                return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace('## ', '')}</h2>;
              }
              if (line.startsWith('### ')) {
                return <h3 key={i} className="text-base font-semibold mt-3 mb-1">{line.replace('### ', '')}</h3>;
              }
              if (line.startsWith('- ')) {
                return <li key={i} className="ml-4 text-muted-foreground">{renderBoldText(line.replace('- ', ''))}</li>;
              }
              if (line.trim() === '') {
                return <br key={i} />;
              }
              return <p key={i} className="text-muted-foreground mb-1">{renderBoldText(line)}</p>;
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

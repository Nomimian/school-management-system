import { useState } from 'react';
import { Send } from 'lucide-react';
import { SectionHeader, Button } from '../components/ui';
import Messenger from '../components/Messenger.jsx';
import OutboundCompose from '../components/OutboundCompose.jsx';

export default function Messaging() {
  const [outboundOpen, setOutboundOpen] = useState(false);
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Messages"
        subtitle="In-app chat with staff & parents, or broadcast via Email / WhatsApp / SMS"
        action={<Button variant="primary" icon={Send} onClick={() => setOutboundOpen(true)}>Send Email / WhatsApp / SMS</Button>}
      />
      <Messenger/>
      <OutboundCompose open={outboundOpen} onClose={() => setOutboundOpen(false)}/>
    </div>
  );
}

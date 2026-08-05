import { useState } from 'react';
import { Send, ScrollText } from 'lucide-react';
import { SectionHeader, Button } from '../components/ui';
import Messenger from '../components/Messenger.jsx';
import OutboundCompose from '../components/OutboundCompose.jsx';
import DeliveryLog from '../components/DeliveryLog.jsx';

export default function Messaging() {
  const [outboundOpen, setOutboundOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Messages"
        subtitle="In-app chat with staff & parents, or broadcast via Email / WhatsApp / SMS"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" icon={ScrollText} onClick={() => setLogOpen(true)}>Delivery Log</Button>
            <Button variant="primary" icon={Send} onClick={() => setOutboundOpen(true)}>Send Email / WhatsApp / SMS</Button>
          </div>
        }
      />
      <Messenger/>
      <OutboundCompose open={outboundOpen} onClose={() => setOutboundOpen(false)}/>
      <DeliveryLog open={logOpen} onClose={() => setLogOpen(false)}/>
    </div>
  );
}

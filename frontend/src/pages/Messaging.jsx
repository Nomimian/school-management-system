import { useState } from 'react';
import { Send, Smartphone } from 'lucide-react';
import { SectionHeader, Button } from '../components/ui';
import Messenger from '../components/Messenger.jsx';
import OutboundCompose from '../components/OutboundCompose.jsx';

export default function Messaging() {
  const [outboundOpen, setOutboundOpen] = useState(false);
  const [initialChannels, setInitialChannels] = useState(null);

  const openCompose = (channels = null) => { setInitialChannels(channels); setOutboundOpen(true); };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Messages"
        subtitle="In-app chat with staff & parents, or broadcast via Email / WhatsApp / SMS"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={Smartphone} onClick={() => openCompose({ sms: true })}>Send SMS</Button>
            <Button variant="primary" icon={Send} onClick={() => openCompose()}>Send Email / WhatsApp / SMS</Button>
          </div>
        }
      />
      <Messenger/>
      <OutboundCompose open={outboundOpen} onClose={() => setOutboundOpen(false)} initialChannels={initialChannels}/>
    </div>
  );
}

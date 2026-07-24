import Messenger from '../../components/Messenger.jsx';

export default function ParentMessages() {
  return (
    <div className="space-y-4 animate-rise">
      <div>
        <h1 className="font-display font-bold text-slate-800 text-2xl">Messages</h1>
        <p className="text-slate-500 text-sm mt-1">Chat privately with your child's school.</p>
      </div>
      <Messenger/>
    </div>
  );
}
